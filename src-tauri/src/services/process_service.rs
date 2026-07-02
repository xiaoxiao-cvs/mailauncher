/// 进程管理服务
///
/// 对应 Python 的 `process_manager.py`，管理实例各组件的进程生命周期。
/// 使用 portable-pty 实现跨平台 PTY 支持（Windows ConPTY / Unix PTY），
/// 使用 sysinfo 获取进程资源使用情况。
///
/// 架构对比：
/// - Python: WebSocket 推送终端输出
/// - Rust/Tauri: Tauri 事件系统推送终端输出
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use sysinfo::{Pid, System};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::{ComponentType, RuntimeKind, RuntimeProfile};
use crate::runtime::{LocalRuntimeAdapter, RuntimeAdapter, TerminalSessionInfo};

// ==================== 进程信息 ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ProcessAttachmentKind {
    Managed,
    External,
}

/// 组件的期望运行态(用户意图),与实际进程存活状态分离。
///
/// 看门狗仅在期望态为 Running 而进程已退时才考虑自动重启,
/// 从而把"用户主动停止"与"进程异常崩溃"区分开:前者期望态为 Stopped,绝不重启。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesiredState {
    Running,
    Stopped,
}

#[derive(Debug, Clone)]
struct ExternalProcessHandle {
    session_id: String,
    runtime_kind: RuntimeKind,
    runtime_profile: RuntimeProfile,
    guest_pid: Option<u32>,
    terminal_session: Option<TerminalSessionInfo>,
}

/// 单个组件的进程信息（对应 Python ProcessInfo）
pub struct ProcessInfo {
    /// 实例 ID
    pub instance_id: String,
    /// 组件类型（main / napcat）
    pub component: String,
    /// 会话 ID（{instance_id}::{component}）
    pub session_id: String,
    /// 运行时类型
    pub runtime_kind: RuntimeKind,
    /// 宿主进程 PID
    pub host_pid: Option<u32>,
    /// 访客进程 PID（WSL2 等场景使用）
    pub guest_pid: Option<u32>,
    /// 兼容旧接口的主 PID 字段（当前等同 host_pid）
    pub pid: Option<u32>,
    /// 启动时间
    pub start_time: DateTime<Utc>,
    /// 终端输出缓冲区
    pub output_buffer: Vec<String>,
    /// 缓冲区最大行数
    pub buffer_size: usize,
    /// 进程接管方式：本地托管 PTY 或外部探测挂载
    attachment_kind: ProcessAttachmentKind,
    /// PTY 子进程句柄（用于 kill/wait）
    child: Option<Box<dyn Child + Send + Sync>>,
    /// PTY 写入端（通过 MasterPty::take_writer() 获取）
    writer: Option<Box<dyn Write + Send>>,
    /// PTY 主端（保留用于 resize 等操作）
    master: Option<Box<dyn MasterPty + Send>>,
    /// 输出解析缓冲区，用于提取元数据标记
    metadata_buffer: String,
    /// 运行时配置（外部接管进程需要它来做探测与停止）
    runtime_profile: Option<RuntimeProfile>,
    /// 终端会话名（如 WSL2 tmux session）
    terminal_session: Option<TerminalSessionInfo>,
}

impl ProcessInfo {
    /// 检查进程是否存活
    pub fn is_alive(&mut self) -> bool {
        if let Some(ref mut child) = self.child {
            // try_wait: 如果进程退出返回 Some(status)，仍在运行返回 Ok(None)
            match child.try_wait() {
                Ok(Some(_status)) => false, // 进程已退出
                Ok(None) => true,           // 进程仍在运行
                Err(_) => false,            // 查询失败，视为已退出
            }
        } else {
            false
        }
    }

    pub fn is_external(&self) -> bool {
        matches!(self.attachment_kind, ProcessAttachmentKind::External)
    }

    /// 获取运行时长（秒）
    pub fn get_uptime(&self) -> Option<f64> {
        if self.is_external() {
            None
        } else {
            Some((Utc::now() - self.start_time).num_milliseconds() as f64 / 1000.0)
        }
    }

    /// 向进程写入输入数据
    pub fn write_input(&mut self, data: &str) -> AppResult<()> {
        if let Some(ref mut writer) = self.writer {
            writer.write_all(data.as_bytes()).map_err(|e| {
                AppError::Process(format!("向进程 {} 写入数据失败: {}", self.session_id, e))
            })?;
            writer.flush().map_err(|e| {
                AppError::Process(format!("刷新进程 {} 写入缓冲失败: {}", self.session_id, e))
            })?;
            Ok(())
        } else {
            Err(AppError::Process(format!(
                "进程 {} 没有可用的写入端，外部接管进程暂不支持终端写入",
                self.session_id
            )))
        }
    }

    fn external_handle(&self) -> Option<ExternalProcessHandle> {
        self.runtime_profile
            .clone()
            .map(|runtime_profile| ExternalProcessHandle {
                session_id: self.session_id.clone(),
                runtime_kind: self.runtime_kind,
                runtime_profile,
                guest_pid: self.guest_pid,
                terminal_session: self.terminal_session.clone(),
            })
    }

    fn mark_stopped(&mut self) {
        self.attachment_kind = ProcessAttachmentKind::Managed;
        self.child = None;
        self.writer = None;
        self.master = None;
        self.pid = None;
        self.host_pid = None;
        self.guest_pid = None;
        self.runtime_profile = None;
        self.terminal_session = None;
        self.metadata_buffer.clear();
    }

    fn from_external(
        instance_id: &str,
        component: &str,
        process: &crate::runtime::DiscoveredRuntimeProcess,
        runtime_profile: &RuntimeProfile,
    ) -> Self {
        Self {
            instance_id: instance_id.to_string(),
            component: component.to_string(),
            session_id: format!("{}::{}", instance_id, component),
            runtime_kind: process.runtime_kind,
            host_pid: process.host_pid,
            guest_pid: process.guest_pid,
            pid: process.host_pid.or(process.guest_pid),
            start_time: Utc::now(),
            output_buffer: vec![external_process_placeholder(process)],
            buffer_size: 1000,
            attachment_kind: ProcessAttachmentKind::External,
            child: None,
            writer: None,
            master: None,
            metadata_buffer: String::new(),
            runtime_profile: Some(runtime_profile.clone()),
            terminal_session: process.terminal_session.clone(),
        }
    }

    fn consume_output_chunk(&mut self, chunk: String) -> Option<String> {
        let combined = if self.metadata_buffer.is_empty() {
            chunk
        } else {
            format!("{}{}", self.metadata_buffer, chunk)
        };

        let mut sanitized = String::new();
        let mut pending_fragment = String::new();

        for segment in combined.split_inclusive('\n') {
            if segment.ends_with('\n') {
                let line = segment.trim_end_matches('\n').trim_end_matches('\r');
                if let Some(pid) = line.strip_prefix("__MAI_GUEST_PID__=") {
                    if let Ok(parsed) = pid.trim().parse::<u32>() {
                        self.guest_pid = Some(parsed);
                    }
                    continue;
                }

                sanitized.push_str(segment);
            } else {
                pending_fragment.push_str(segment);
            }
        }

        self.metadata_buffer = pending_fragment;

        if sanitized.is_empty() {
            None
        } else {
            Some(sanitized)
        }
    }

    /// 终止进程
    pub fn kill(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }
        self.mark_stopped();
    }
}

fn verified_session_name(handle: &ExternalProcessHandle) -> Option<&str> {
    handle
        .terminal_session
        .as_ref()
        .filter(|session| session.verified)
        .map(|session| session.name.as_str())
}

fn external_process_placeholder(process: &crate::runtime::DiscoveredRuntimeProcess) -> String {
    if process
        .terminal_session
        .as_ref()
        .map(|session| session.verified)
        .unwrap_or(false)
    {
        format!(
            "[外部进程接管] 已探测到运行中的 {:?} 组件进程，并确认存在可重连 tmux 会话。\n",
            process.runtime_kind
        )
    } else {
        format!(
            "[外部进程接管] 已探测到运行中的 {:?} 组件进程，当前仅提供状态与停止能力。\n",
            process.runtime_kind
        )
    }
}

// ==================== 进程管理器 ====================

/// 进程管理器内部状态
struct ProcessManagerInner {
    /// session_id -> ProcessInfo
    processes: HashMap<String, ProcessInfo>,
    /// session_id -> 期望运行态(用户意图,看门狗据此决定是否自动重启)
    desired_states: HashMap<String, DesiredState>,
    /// PTY 行数
    pty_rows: u16,
    /// PTY 列数
    pty_cols: u16,
    /// 持久 sysinfo 实例（CPU 采样需跨调用累积）
    system: System,
}

/// 进程管理器（对应 Python ProcessManager 单例）
///
/// 通过 `Arc<Mutex<...>>` 实现线程安全，
/// 作为 Tauri 托管状态在所有命令间共享。
#[derive(Clone)]
pub struct ProcessManager {
    inner: Arc<Mutex<ProcessManagerInner>>,
}

impl ProcessManager {
    /// 创建新的进程管理器
    pub fn new() -> Self {
        let pty_rows = std::env::var("PTY_ROWS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30u16);
        let pty_cols = std::env::var("PTY_COLS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(120u16);

        info!("[进程管理器] 初始化 - PTY: {}x{}", pty_rows, pty_cols);

        Self {
            inner: Arc::new(Mutex::new(ProcessManagerInner {
                processes: HashMap::new(),
                desired_states: HashMap::new(),
                pty_rows,
                pty_cols,
                system: System::new(),
            })),
        }
    }

    /// 生成会话 ID
    fn session_id(instance_id: &str, component: &str) -> String {
        format!("{}::{}", instance_id, component)
    }

    /// 记录组件的期望运行态。
    ///
    /// 用户启动组件时置 Running、停止时置 Stopped;看门狗只重启期望态为 Running 的崩溃组件。
    pub async fn set_desired(&self, instance_id: &str, component: &str, desired: DesiredState) {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        inner.desired_states.insert(session_id, desired);
    }

    /// 读取组件的期望运行态;从未设置过返回 None(看门狗据此跳过未被用户管理过的组件)。
    ///
    /// 看门狗巡检走更高效的 list_desired_running 批量枚举;此单查方法作为期望态公共 API 保留,
    /// 供命令层按需精确查询单组件意图(故标注 allow(dead_code),与本文件其它公共 API 方法一致)。
    #[allow(dead_code)]
    pub async fn get_desired(&self, instance_id: &str, component: &str) -> Option<DesiredState> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner.desired_states.get(&session_id).copied()
    }

    /// 枚举所有期望态为 Running 的 (instance_id, component) 会话,供看门狗轮询巡检。
    ///
    /// 仅返回本地托管(非外部接管)的会话:外部进程的存活与停止由其运行时探测路径管理,
    /// 不在看门狗自动重启职责内。
    pub async fn list_desired_running(&self) -> Vec<(String, String)> {
        let inner = self.inner.lock().await;
        inner
            .desired_states
            .iter()
            .filter(|(_, desired)| matches!(desired, DesiredState::Running))
            .filter_map(|(session_id, _)| {
                // 外部接管会话交给运行时探测,不归看门狗重启
                if inner
                    .processes
                    .get(session_id)
                    .map(|proc| proc.is_external())
                    .unwrap_or(false)
                {
                    return None;
                }
                session_id.split_once("::").map(|(instance_id, component)| {
                    (instance_id.to_string(), component.to_string())
                })
            })
            .collect()
    }

    async fn is_external_process_alive(handle: &ExternalProcessHandle) -> bool {
        match handle.runtime_kind {
            RuntimeKind::Wsl2 => {
                if let Some(pid) = handle.guest_pid {
                    crate::runtime::wsl::probe_guest_process_alive(&handle.runtime_profile, pid)
                        .await
                        .unwrap_or(false)
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    async fn stop_external_process(handle: &ExternalProcessHandle, force: bool) -> AppResult<()> {
        let signal = if force { "KILL" } else { "INT" };

        match handle.runtime_kind {
            RuntimeKind::Wsl2 => {
                let pid = handle.guest_pid.ok_or_else(|| {
                    AppError::Process(format!("外部进程 {} 缺少 guest_pid", handle.session_id))
                })?;
                crate::runtime::wsl::signal_guest_process(&handle.runtime_profile, pid, signal)
                    .await
            }
            _ => Err(AppError::Process(format!(
                "暂不支持停止 {:?} 外部进程",
                handle.runtime_kind
            ))),
        }
    }

    async fn get_external_output_history(
        handle: &ExternalProcessHandle,
        lines: usize,
    ) -> AppResult<Vec<String>> {
        match handle.runtime_kind {
            RuntimeKind::Wsl2 => {
                if let Some(session_name) = verified_session_name(handle) {
                    crate::runtime::wsl::capture_tmux_history(
                        &handle.runtime_profile,
                        session_name,
                        lines,
                    )
                    .await
                } else {
                    Ok(vec![
                        "[外部进程接管] 当前会话没有可重连的 tmux 会话，只能显示探测状态。\n"
                            .to_string(),
                    ])
                }
            }
            _ => Ok(Vec::new()),
        }
    }

    async fn write_to_external_terminal(
        handle: &ExternalProcessHandle,
        data: &str,
    ) -> AppResult<()> {
        match handle.runtime_kind {
            RuntimeKind::Wsl2 => {
                let session_name = verified_session_name(handle).ok_or_else(|| {
                    AppError::Process("当前外部 WSL2 进程没有可重连的 tmux 会话".to_string())
                })?;
                crate::runtime::wsl::send_tmux_input(&handle.runtime_profile, session_name, data)
                    .await
            }
            _ => Err(AppError::Process(
                "当前外部进程暂不支持终端写入".to_string(),
            )),
        }
    }

    async fn resize_external_terminal(
        handle: &ExternalProcessHandle,
        rows: u16,
        cols: u16,
    ) -> AppResult<()> {
        match handle.runtime_kind {
            RuntimeKind::Wsl2 => {
                if let Some(session_name) = verified_session_name(handle) {
                    crate::runtime::wsl::resize_tmux_session(
                        &handle.runtime_profile,
                        session_name,
                        rows,
                        cols,
                    )
                    .await
                } else {
                    Ok(())
                }
            }
            _ => Ok(()),
        }
    }

    async fn clear_session_after_external_stop(&self, session_id: &str) {
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(session_id) {
            proc.mark_stopped();
        }
    }

    async fn remove_stale_external_session(&self, session_id: &str) {
        let mut inner = self.inner.lock().await;
        if inner
            .processes
            .get(session_id)
            .map(|proc| proc.is_external())
            .unwrap_or(false)
        {
            inner.processes.remove(session_id);
        }
    }

    pub async fn sync_external_processes(
        &self,
        instance_id: &str,
        instance: &crate::models::Instance,
        available_components: &[ComponentType],
        discovered: &[crate::runtime::DiscoveredRuntimeProcess],
    ) {
        let mut inner = self.inner.lock().await;

        for component in available_components {
            let component_key = component.internal_key();
            let session_id = Self::session_id(instance_id, component_key);

            if let Some(existing) = inner.processes.get_mut(&session_id) {
                if !existing.is_external() && existing.is_alive() {
                    continue;
                }
            }

            let runtime_profile = instance.get_component_runtime(*component);
            if let Some(process) = discovered
                .iter()
                .find(|process| process.component == *component)
            {
                inner.processes.insert(
                    session_id,
                    ProcessInfo::from_external(
                        instance_id,
                        component_key,
                        process,
                        runtime_profile,
                    ),
                );
            } else if inner
                .processes
                .get(&session_id)
                .map(|proc| proc.is_external())
                .unwrap_or(false)
            {
                inner.processes.remove(&session_id);
            }
        }
    }

    /// 启动组件进程
    ///
    /// 使用 portable-pty 创建跨平台 PTY，启动指定命令。
    /// 成功后将进程信息存入管理器，并返回 PTY 读取端用于输出监听。
    // 参数同时承载会话身份(instance_id/component/runtime_kind)与命令规格
    // (command/args/cwd/env)两类语义，且均为借用切片；收拢为结构体会改变借用契约并牵动调用点，
    // 此处仅为参数个数启发式而非缺陷，故定向放行。
    #[allow(clippy::too_many_arguments)]
    pub async fn start_process(
        &self,
        instance_id: &str,
        component: &str,
        runtime_kind: RuntimeKind,
        command: &str,
        args: &[&str],
        cwd: &Path,
        env: &[(String, String)],
    ) -> AppResult<Option<Box<dyn Read + Send>>> {
        let session_id = Self::session_id(instance_id, component);

        if self.is_component_running(instance_id, component).await {
            info!("进程已在运行: {}", session_id);
            return Ok(None);
        }

        // Phase 1: 锁内 — 检查运行状态、读取 PTY 尺寸、复制旧日志
        let (pty_rows, pty_cols, old_buffer) = {
            let inner = self.inner.lock().await;

            let old_buf = inner.processes.get(&session_id).map(|p| {
                let keep = p.output_buffer.len().min(500);
                p.output_buffer[p.output_buffer.len() - keep..].to_vec()
            });

            (inner.pty_rows, inner.pty_cols, old_buf)
        }; // 锁释放

        // Phase 2: 锁外 — 创建 PTY、启动进程（可能阻塞的系统调用）
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: pty_rows,
                cols: pty_cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| {
                error!("创建 PTY 失败: {}", e);
                AppError::Process(format!("创建 PTY 失败: {}", e))
            })?;

        let mut cmd = CommandBuilder::new(command);
        for arg in args {
            cmd.arg(*arg);
        }
        cmd.cwd(cwd);
        // 强制 Python 子进程使用 UTF-8，避免 Windows GBK 编码导致输出异常
        cmd.env("PYTHONIOENCODING", "utf-8");
        cmd.env("PYTHONUTF8", "1");
        // 组件特定环境变量（如 MaiBot 的 EULA/升级确认），覆盖在通用变量之后注入
        for (key, value) in env {
            cmd.env(key, value);
        }

        let child = pair.slave.spawn_command(cmd).map_err(|e| {
            error!("启动进程失败 {}: {}", session_id, e);
            AppError::Process(format!("启动进程失败 {}: {}", session_id, e))
        })?;

        let pid = child.process_id();
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::Process(format!("克隆 PTY 读取端失败: {}", e)))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::Process(format!("获取 PTY 写入端失败: {}", e)))?;

        // 构造重启分隔标记（与 Python 行为一致）
        let output_buffer = if let Some(mut old) = old_buffer {
            old.push(format!(
                "\n{}\n[进程重启] 新会话开始\n{}\n",
                "=".repeat(50),
                "=".repeat(50)
            ));
            old
        } else {
            vec![format!(
                "\n{}\n[进程启动] 会话开始\n{}\n",
                "=".repeat(50),
                "=".repeat(50)
            )]
        };

        let process_info = ProcessInfo {
            instance_id: instance_id.to_string(),
            component: component.to_string(),
            session_id: session_id.clone(),
            runtime_kind,
            host_pid: pid,
            guest_pid: if matches!(runtime_kind, RuntimeKind::Local) {
                pid
            } else {
                None
            },
            pid,
            start_time: Utc::now(),
            output_buffer,
            buffer_size: 1000,
            attachment_kind: ProcessAttachmentKind::Managed,
            child: Some(child),
            writer: Some(writer),
            master: Some(pair.master),
            metadata_buffer: String::new(),
            runtime_profile: None,
            terminal_session: None,
        };

        // Phase 3: 锁内 — 再次检查竞态后插入 ProcessInfo
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            if proc.is_alive() {
                // 并发 start 已抢先启动，丢弃本次资源
                // process_info drop 时会关闭 PTY 句柄，子进程因 stdin EOF 自行退出
                info!("并发启动检测，放弃本次启动: {}", session_id);
                return Ok(None);
            }
        }

        info!("进程启动成功: {}, PID: {:?}", session_id, pid);
        inner.processes.insert(session_id.clone(), process_info);

        Ok(Some(reader))
    }

    /// 停止组件进程
    ///
    /// `force=false`：先发送 Ctrl+C（\x03）尝试优雅退出，等待最多 10 秒，超时后强制 kill。
    /// `force=true`：直接 kill 进程。
    pub async fn stop_process(
        &self,
        instance_id: &str,
        component: &str,
        force: bool,
    ) -> AppResult<bool> {
        // 优雅停止等待窗口:100 × 100ms = 10s,对齐官方一键包 STOP_FORCE_AFTER_MS=10000。
        // MaiBot 收到 Ctrl+C 后要落盘/断连,2 秒常不够,过早强杀会丢数据或留残连接。
        const GRACE_POLLS: usize = 100;
        let session_id = Self::session_id(instance_id, component);

        let ctrl_c_sent;
        let mut external_handle = None;

        {
            let mut inner = self.inner.lock().await;
            let proc = match inner.processes.get_mut(&session_id) {
                Some(p) => p,
                None => {
                    warn!("进程不存在: {}", session_id);
                    return Ok(true);
                }
            };

            if proc.is_external() {
                external_handle = proc.external_handle();
                ctrl_c_sent = false;
            } else {
                if !proc.is_alive() {
                    warn!("进程已经停止: {}", session_id);
                    proc.mark_stopped();
                    return Ok(true);
                }

                ctrl_c_sent = if force {
                    info!("强制停止进程: {}", session_id);
                    proc.kill();
                    false
                } else {
                    // 尝试优雅停止：发送 Ctrl+C
                    info!("优雅停止进程: {}, 发送 Ctrl+C", session_id);
                    if let Some(ref mut writer) = proc.writer {
                        let _ = writer.write_all(b"\x03");
                        let _ = writer.flush();
                        true
                    } else {
                        // writer 已不可用，直接强制 kill
                        warn!("writer 不可用，回退到强制终止: {}", session_id);
                        proc.kill();
                        false
                    }
                };
            }
        } // 释放锁

        if let Some(handle) = external_handle {
            if force {
                Self::stop_external_process(&handle, true).await?;
            } else {
                Self::stop_external_process(&handle, false).await?;
                let mut exited = false;
                for _ in 0..GRACE_POLLS {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    if !Self::is_external_process_alive(&handle).await {
                        exited = true;
                        break;
                    }
                }

                if !exited {
                    info!("外部进程优雅停止超时，强制终止: {}", handle.session_id);
                    Self::stop_external_process(&handle, true).await?;
                }
            }

            self.clear_session_after_external_stop(&handle.session_id)
                .await;
            info!("外部进程停止成功: {}", handle.session_id);
            return Ok(true);
        }

        if !force && ctrl_c_sent {
            // 锁外等待进程优雅退出，最多 2 秒
            let mut exited = false;
            for _ in 0..GRACE_POLLS {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                let mut inner = self.inner.lock().await;
                if let Some(proc) = inner.processes.get_mut(&session_id) {
                    if !proc.is_alive() {
                        exited = true;
                        break;
                    }
                } else {
                    exited = true;
                    break;
                }
            }

            if !exited {
                // 超时，强制 kill
                info!("优雅停止超时，强制终止进程: {}", session_id);
                let mut inner = self.inner.lock().await;
                if let Some(proc) = inner.processes.get_mut(&session_id) {
                    proc.kill();
                }
            }
        }

        // 短暂等待确认终止
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // 截断已停止进程的输出缓冲区，防止内存无限增长
        {
            let mut inner = self.inner.lock().await;
            if let Some(proc) = inner.processes.get_mut(&session_id) {
                if proc.output_buffer.len() > 500 {
                    let drain_to = proc.output_buffer.len() - 500;
                    proc.output_buffer.drain(..drain_to);
                }
            }
        }

        info!("进程停止成功: {}", session_id);
        Ok(true)
    }

    /// 停止实例的所有进程
    ///
    /// 在单次锁内完成所有 kill 操作，避免循环获取锁的开销。
    #[allow(dead_code)]
    pub async fn stop_all_instance_processes(&self, instance_id: &str) -> HashMap<String, bool> {
        let mut results = HashMap::new();
        let session_ids: Vec<String>;
        let mut external_handles = Vec::new();

        // 单次锁内完成所有 kill
        {
            let mut inner = self.inner.lock().await;
            session_ids = inner
                .processes
                .values()
                .filter(|p| p.instance_id == instance_id)
                .map(|p| p.session_id.clone())
                .collect();

            info!("停止实例 {} 的所有进程: {:?}", instance_id, session_ids);

            for sid in &session_ids {
                if let Some(proc) = inner.processes.get_mut(sid) {
                    if proc.is_external() {
                        if let Some(handle) = proc.external_handle() {
                            external_handles.push(handle);
                            results.insert(proc.component.clone(), true);
                        }
                    } else if proc.is_alive() {
                        proc.kill();
                        results.insert(proc.component.clone(), true);
                    } else {
                        proc.mark_stopped();
                        results.insert(proc.component.clone(), true);
                    }
                }
            }
        }

        for handle in &external_handles {
            if let Err(error) = Self::stop_external_process(handle, true).await {
                warn!("停止外部进程失败 {}: {}", handle.session_id, error);
                results.insert(handle.session_id.clone(), false);
            } else {
                self.clear_session_after_external_stop(&handle.session_id)
                    .await;
            }
        }

        // 锁外轮询确认进程退出，最多等待 1 秒
        for _ in 0..10 {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            let mut inner = self.inner.lock().await;
            let all_dead = session_ids
                .iter()
                .all(|sid| inner.processes.get_mut(sid).map_or(true, |p| !p.is_alive()));
            if all_dead {
                break;
            }
        }

        results
    }

    /// 检查组件是否在运行
    pub async fn is_component_running(&self, instance_id: &str, component: &str) -> bool {
        let session_id = Self::session_id(instance_id, component);
        let external_handle = {
            let mut inner = self.inner.lock().await;
            if let Some(proc) = inner.processes.get_mut(&session_id) {
                if proc.is_external() {
                    proc.external_handle()
                } else if proc.is_alive() {
                    return true;
                } else {
                    proc.mark_stopped();
                    return false;
                }
            } else {
                return false;
            }
        };

        if let Some(handle) = external_handle {
            let alive = Self::is_external_process_alive(&handle).await;
            if !alive {
                self.remove_stale_external_session(&session_id).await;
            }
            alive
        } else {
            false
        }
    }

    /// 检查实例是否有任何组件在运行
    #[allow(dead_code)]
    pub async fn is_instance_running(&self, instance_id: &str) -> bool {
        let mut inner = self.inner.lock().await;
        for proc in inner.processes.values_mut() {
            if proc.instance_id == instance_id && proc.is_alive() {
                return true;
            }
        }
        false
    }

    /// 向进程缓冲区添加输出
    pub async fn add_output(
        &self,
        instance_id: &str,
        component: &str,
        output: String,
    ) -> Option<String> {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            if let Some(sanitized) = proc.consume_output_chunk(output) {
                proc.output_buffer.push(sanitized.clone());
                if proc.output_buffer.len() > proc.buffer_size {
                    let drain_to = proc.output_buffer.len() - proc.buffer_size;
                    proc.output_buffer.drain(..drain_to);
                }
                return Some(sanitized);
            }
        }

        None
    }

    /// 向进程写入输入
    pub async fn write_to_process(
        &self,
        instance_id: &str,
        component: &str,
        data: &str,
    ) -> AppResult<()> {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            if proc.is_external() {
                let handle = proc.external_handle();
                drop(inner);
                if let Some(handle) = handle {
                    Self::write_to_external_terminal(&handle, data).await
                } else {
                    Err(AppError::Process(format!(
                        "进程 {} 无法建立外部终端句柄",
                        session_id
                    )))
                }
            } else {
                proc.write_input(data)
            }
        } else {
            Err(AppError::NotFound(format!("进程 {} 不存在", session_id)))
        }
    }

    /// 获取历史输出
    pub async fn get_output_history(
        &self,
        instance_id: &str,
        component: &str,
        lines: usize,
    ) -> Vec<String> {
        let session_id = Self::session_id(instance_id, component);
        let external_handle = {
            let inner = self.inner.lock().await;
            if let Some(proc) = inner.processes.get(&session_id) {
                if proc.is_external() {
                    proc.external_handle()
                } else {
                    let start = proc.output_buffer.len().saturating_sub(lines);
                    return proc.output_buffer[start..].to_vec();
                }
            } else {
                return Vec::new();
            }
        };

        if let Some(handle) = external_handle {
            match Self::get_external_output_history(&handle, lines).await {
                Ok(history) => history,
                Err(error) => vec![format!("[外部终端] 历史读取失败: {}\n", error)],
            }
        } else {
            Vec::new()
        }
    }

    /// 采样一批运行组件会话的实时资源,按实例聚合返回 instance_id -> (CPU 占整机百分比, 内存 MB, uptime 秒)。
    ///
    /// 关键点:
    /// - 量的是每个会话进程的"子树":PTY 直接拉起的常是 shell/launcher 壳进程(几 MB、CPU≈0),
    ///   真正的 python(MaiBot)/node(NapCat)是其子孙进程;只量壳进程会得到错误读数。
    /// - 单次 refresh 全部进程:既拿到父子关系,又让所有进程的 CPU 采样区间一致(逐会话各刷一次
    ///   会把后续会话的区间压成几 ms 而恒 0)。CPU 首轮仍可能为 0(sysinfo 需两次刷新),随轮询稳定。
    pub async fn sample_instance_resources(
        &self,
        sessions: &[(String, String)],
    ) -> std::collections::HashMap<String, (f64, f64, Option<f64>)> {
        let mut inner = self.inner.lock().await;
        inner
            .system
            .refresh_processes(sysinfo::ProcessesToUpdate::All, true);
        let cores = inner.system.cpus().len().max(1) as f64;

        // 先一次性取出 (pid, parent),释放对 processes() 的借用,后续按子树累加。
        let pairs: Vec<(Pid, Option<Pid>)> = inner
            .system
            .processes()
            .iter()
            .map(|(pid, proc)| (*pid, proc.parent()))
            .collect();

        let mut result: std::collections::HashMap<String, (f64, f64, Option<f64>)> =
            std::collections::HashMap::new();

        for (instance_id, component) in sessions {
            let session_id = Self::session_id(instance_id, component);
            let (root, uptime) = match inner.processes.get(&session_id) {
                Some(info) => (info.pid, info.get_uptime()),
                None => continue,
            };
            let Some(root) = root else { continue };
            let root = Pid::from_u32(root);

            // 收集 root + 全部后代 pid(进程数有限,迭代到不再新增为止)
            let mut subtree: std::collections::HashSet<Pid> = std::collections::HashSet::new();
            subtree.insert(root);
            loop {
                let mut added = false;
                for (pid, parent) in &pairs {
                    if subtree.contains(pid) {
                        continue;
                    }
                    if let Some(parent) = parent {
                        if subtree.contains(parent) {
                            subtree.insert(*pid);
                            added = true;
                        }
                    }
                }
                if !added {
                    break;
                }
            }

            let mut cpu = 0.0;
            let mut mem = 0.0;
            for pid in &subtree {
                if let Some(proc) = inner.system.process(*pid) {
                    cpu += proc.cpu_usage() as f64;
                    mem += proc.memory() as f64;
                }
            }

            let entry = result
                .entry(instance_id.clone())
                .or_insert((0.0, 0.0, None));
            entry.0 += (cpu / cores).min(100.0);
            entry.1 += mem / 1024.0 / 1024.0;
            if let Some(u) = uptime {
                entry.2 = Some(entry.2.map_or(u, |prev| prev.max(u)));
            }
        }

        result
    }

    /// 获取进程启动时间（用于计算 uptime）
    pub async fn get_process_uptime(&self, instance_id: &str, component: &str) -> Option<f64> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .and_then(|p| p.get_uptime())
    }

    /// 获取进程 PID
    pub async fn get_process_pid(&self, instance_id: &str, component: &str) -> Option<u32> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner.processes.get(&session_id).and_then(|p| p.host_pid)
    }

    pub async fn get_process_guest_pid(&self, instance_id: &str, component: &str) -> Option<u32> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner.processes.get(&session_id).and_then(|p| p.guest_pid)
    }

    pub async fn get_process_runtime_kind(
        &self,
        instance_id: &str,
        component: &str,
    ) -> Option<RuntimeKind> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner.processes.get(&session_id).map(|p| p.runtime_kind)
    }

    pub async fn is_process_external(&self, instance_id: &str, component: &str) -> bool {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .map(|process| process.is_external())
            .unwrap_or(false)
    }

    pub async fn is_terminal_reconnectable(&self, instance_id: &str, component: &str) -> bool {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        inner
            .processes
            .get_mut(&session_id)
            .map(|process| {
                if process.is_external() {
                    process
                        .terminal_session
                        .as_ref()
                        .map(|session| session.verified)
                        .unwrap_or(false)
                } else {
                    process.is_alive()
                }
            })
            .unwrap_or(false)
    }

    /// 调整 PTY 大小
    pub async fn resize_pty(
        &self,
        instance_id: &str,
        component: &str,
        rows: u16,
        cols: u16,
    ) -> AppResult<()> {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            if proc.is_external() {
                let handle = proc.external_handle();
                drop(inner);
                if let Some(handle) = handle {
                    Self::resize_external_terminal(&handle, rows, cols).await?;
                }
            } else if let Some(ref master) = proc.master {
                master
                    .resize(PtySize {
                        rows,
                        cols,
                        pixel_width: 0,
                        pixel_height: 0,
                    })
                    .map_err(|e| {
                        AppError::Process(format!("调整 PTY 大小失败 {}: {}", session_id, e))
                    })?;
                info!("PTY 大小已调整: {} → {}x{}", session_id, rows, cols);
            }
        }
        Ok(())
    }

    /// 清理所有进程
    #[allow(dead_code)]
    pub async fn cleanup(&self) {
        info!("[进程管理器] 清理所有进程...");
        let mut inner = self.inner.lock().await;
        for (session_id, proc) in inner.processes.iter_mut() {
            if proc.is_alive() {
                info!("终止进程: {}", session_id);
                proc.kill();
            }
        }
        info!("[进程管理器] 进程清理完成");
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== 命令构建辅助 ====================

/// 根据组件类型构建启动命令和工作目录
///
/// 对应 Python `ProcessManager._get_command_and_cwd`
#[allow(dead_code)]
pub fn build_component_command(
    instance_path: &Path,
    component: &str,
    runtime_profile: &RuntimeProfile,
    qq_account: Option<&str>,
) -> AppResult<(String, Vec<String>, std::path::PathBuf)> {
    let component = ComponentType::from_value(component)
        .ok_or_else(|| AppError::InvalidInput(format!("不支持的组件类型: {}", component)))?;
    let spec = crate::components::ComponentRegistry::new()
        .get(component)
        .ok_or_else(|| {
            AppError::InvalidInput(format!("组件未注册: {}", component.display_name()))
        })?;
    let adapter = LocalRuntimeAdapter;
    let resolved = adapter.resolve_component_command(
        "manual",
        instance_path,
        spec,
        runtime_profile,
        qq_account,
    )?;
    Ok((resolved.command, resolved.args, resolved.cwd))
}

// ==================== 端口冲突检测 ====================

/// NapCat 作为 OneBot 服务端监听的正向 WS 端口。
///
/// 与 `napcat_config::ADAPTER_WS_PORT` 及 `install_service::ADAPTER_DEFAULT_NAPCAT_PORT`
/// 同源(均为 3001):NapCat 在此端口起 WS 服务端,MaiBot 内置适配器作为客户端连入。
/// 若上一轮 NapCat 未退干净仍占着 3001,新进程会因端口被占而起不来,故启动前先探测。
const NAPCAT_FORWARD_WS_PORT: u16 = 3001;

/// 返回某组件启动后会以服务端身份监听的本地端口(用于启动前冲突探测)。
///
/// 仅收录代码库中有确切定义来源的端口:NapCat 的 3001。MaiBot 的 bot.py 不由启动器
/// 绑定固定端口(上游未在本仓暴露 WebUI 端口常量),故返回空,不臆造端口。
fn component_listen_ports(component: ComponentType) -> &'static [u16] {
    match component {
        ComponentType::NapCat => &[NAPCAT_FORWARD_WS_PORT],
        ComponentType::Main => &[],
    }
}

/// 探测 127.0.0.1:port 是否已被占用(能在超时内成功 TCP 连上即视为被占)。
///
/// 抽成纯函数便于单测:传入临时监听 socket 的端口应判定为占用,空闲端口应判定为空闲。
fn is_tcp_port_in_use(port: u16) -> bool {
    use std::net::{Ipv4Addr, SocketAddr, TcpStream};
    use std::time::Duration;

    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    // 短超时:本地回环连接要么立即成功(被占),要么立即 RST(空闲),300ms 足够覆盖偶发抖动。
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

/// 启动组件前校验其将监听的端口是否空闲;任一端口被占即返回清晰错误并指出端口与组件,不启动。
///
/// 与 `ProcessManager::is_component_running` 配合:仅在本组件确认未在运行时才需要此探测
/// (运行中的本组件自身就占着端口,不应误判为冲突),调用点在 process_service 启动路径上把关。
pub fn ensure_component_ports_free(component: ComponentType) -> AppResult<()> {
    for &port in component_listen_ports(component) {
        if is_tcp_port_in_use(port) {
            return Err(AppError::Process(format!(
                "端口 {} 已被占用,无法启动组件 {};请先停止占用该端口的进程(可能是上一轮未退干净的同组件)后重试",
                port,
                component.display_name()
            )));
        }
    }
    Ok(())
}

// ==================== 启动前依赖校验 ====================

/// MaiBot venv 就绪必须存在的关键包目录(取自 maibot-ref/MaiBot/requirements.txt 的核心运行时依赖)。
///
/// 仅做"装没装过依赖"的存在性校验,不校验版本:任一目录缺失即认为 venv 未就绪。
/// 选这几个是因为它们是 MaiBot 启动即 import 的硬依赖,缺失必然导致 bot.py 崩在 import 阶段。
const MAIBOT_REQUIRED_PACKAGE_DIRS: &[&str] = &["fastapi", "uvicorn", "tomlkit", "rich"];

/// 在 venv 的 site-packages 下定位某包的导入目录或 dist-info,判断该包是否已安装。
///
/// 兼容两种布局:包目录(如 `site-packages/fastapi/`)与仅有 dist-info 的情形
/// (如 `site-packages/fastapi-0.x.dist-info/`,namespace/单文件包会走这条)。
fn package_present_in_site_packages(site_packages: &Path, package: &str) -> bool {
    if site_packages.join(package).is_dir() {
        return true;
    }
    // 回退:扫 dist-info 目录。wheel/PEP 503 命名为 "<name>-<version>.dist-info",其中包名段
    // 把 '-' 规范化为 '_'。故取 entry 去掉 .dist-info 后、第一个 '-'(版本分隔符)之前的包名段,
    // 规范化('-'->'_'、小写)后与目标包名比对。不可整体替换连字符,否则会误伤版本分隔符与后缀。
    let normalized = package.replace('-', "_").to_lowercase();
    std::fs::read_dir(site_packages)
        .ok()
        .map(|entries| {
            entries.flatten().any(|entry| {
                entry
                    .file_name()
                    .to_str()
                    .map(|name| {
                        let lower = name.to_lowercase();
                        let Some(stem) = lower.strip_suffix(".dist-info") else {
                            return false;
                        };
                        let pkg_part = stem.split('-').next().unwrap_or("");
                        pkg_part.replace('-', "_") == normalized
                    })
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// 定位 venv 的 site-packages 目录(跨平台:Windows 在 venv/Lib/site-packages,Unix 在
/// venv/lib/pythonX.Y/site-packages)。Unix 下逐个匹配 pythonX.Y 子目录,取第一个含 site-packages 的。
fn locate_site_packages(venv_dir: &Path) -> Option<std::path::PathBuf> {
    if cfg!(target_os = "windows") {
        let candidate = venv_dir.join("Lib").join("site-packages");
        return candidate.is_dir().then_some(candidate);
    }
    let lib_dir = venv_dir.join("lib");
    let entries = std::fs::read_dir(&lib_dir).ok()?;
    for entry in entries.flatten() {
        let candidate = entry.path().join("site-packages");
        if candidate.is_dir() {
            return Some(candidate);
        }
    }
    None
}

/// 启动 MaiBot 前校验其 venv 依赖是否就绪;未就绪返回清晰的可操作错误,指引用户重装实例依赖。
///
/// 设计降级说明:理想路径是缺失时自动补装(复用 install_service::install_dependencies),
/// 但该函数签名需 &AppHandle 且会向前端推送安装事件,属安装流程职责,且 install_service
/// 在本切片不可编辑;故此处降级为"校验 + 报错指引",把自动补装的接线留给主循环/安装流程。
pub fn ensure_maibot_dependencies_ready(instance_root: &Path) -> AppResult<()> {
    let venv_dir = instance_root.join(".venv");
    // venv 本身不存在:实例尚未完成依赖安装,直接给出重装指引。
    if !venv_dir.is_dir() {
        return Err(AppError::Process(format!(
            "MaiBot 运行环境(.venv)不存在: {};请在版本管理中重新安装该实例的依赖后再启动",
            venv_dir.display()
        )));
    }

    let site_packages = locate_site_packages(&venv_dir).ok_or_else(|| {
        AppError::Process(format!(
            "MaiBot venv 缺少 site-packages 目录(环境损坏): {};请重新安装该实例的依赖",
            venv_dir.display()
        ))
    })?;

    let missing: Vec<&str> = MAIBOT_REQUIRED_PACKAGE_DIRS
        .iter()
        .copied()
        .filter(|package| !package_present_in_site_packages(&site_packages, package))
        .collect();

    if !missing.is_empty() {
        return Err(AppError::Process(format!(
            "MaiBot 依赖未就绪,缺少关键包: {};请在版本管理中重新安装该实例的依赖后再启动",
            missing.join(", ")
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::{ProcessInfo, ProcessManager};
    use crate::models::{ComponentType, RuntimeKind, RuntimeProfile};
    use crate::runtime::TerminalSessionInfo;

    use super::ProcessAttachmentKind;

    fn test_process_info(runtime_kind: RuntimeKind) -> ProcessInfo {
        ProcessInfo {
            instance_id: "inst_test".to_string(),
            component: "main".to_string(),
            session_id: "inst_test::main".to_string(),
            runtime_kind,
            host_pid: Some(1234),
            guest_pid: None,
            pid: Some(1234),
            start_time: Utc::now(),
            output_buffer: Vec::new(),
            buffer_size: 1000,
            attachment_kind: ProcessAttachmentKind::Managed,
            child: None,
            writer: None,
            master: None,
            metadata_buffer: String::new(),
            runtime_profile: None,
            terminal_session: None,
        }
    }

    #[test]
    fn consume_output_chunk_extracts_guest_pid_marker() {
        let mut process = test_process_info(RuntimeKind::Wsl2);
        let sanitized = process.consume_output_chunk("__MAI_GUEST_PID__=4321\nhello\n".to_string());

        assert_eq!(process.guest_pid, Some(4321));
        assert_eq!(sanitized.as_deref(), Some("hello\n"));
    }

    #[test]
    fn consume_output_chunk_keeps_partial_marker_buffered() {
        let mut process = test_process_info(RuntimeKind::Wsl2);
        let first = process.consume_output_chunk("__MAI_GUEST_".to_string());
        let second = process.consume_output_chunk("PID__=5678\nready\n".to_string());

        assert!(first.is_none());
        assert_eq!(process.guest_pid, Some(5678));
        assert_eq!(second.as_deref(), Some("ready\n"));
    }

    #[test]
    fn external_process_has_placeholder_history_and_no_uptime() {
        let profile = RuntimeProfile::local("demo", None);
        let process = ProcessInfo::from_external(
            "inst_test",
            "main",
            &crate::runtime::DiscoveredRuntimeProcess {
                component: ComponentType::Main,
                runtime_kind: RuntimeKind::Wsl2,
                status: crate::models::ComponentLifecycleStatus::Running,
                host_pid: None,
                guest_pid: Some(4321),
                terminal_session: Some(TerminalSessionInfo {
                    name: "mailauncher-inst-test-main".to_string(),
                    verified: true,
                }),
            },
            &profile,
        );

        assert!(process.is_external());
        assert_eq!(process.get_uptime(), None);
        assert!(process.output_buffer[0].contains("可重连 tmux 会话"));
    }

    #[test]
    fn external_process_without_verified_session_uses_read_only_placeholder() {
        let profile = RuntimeProfile::local("demo", None);
        let process = ProcessInfo::from_external(
            "inst_test",
            "main",
            &crate::runtime::DiscoveredRuntimeProcess {
                component: ComponentType::Main,
                runtime_kind: RuntimeKind::Wsl2,
                status: crate::models::ComponentLifecycleStatus::Running,
                host_pid: None,
                guest_pid: Some(9527),
                terminal_session: None,
            },
            &profile,
        );

        assert!(process.is_external());
        assert!(process.output_buffer[0].contains("仅提供状态与停止能力"));
    }

    fn test_instance(id: &str) -> crate::models::Instance {
        use chrono::NaiveDateTime;
        crate::models::Instance {
            id: id.to_string(),
            name: "test".to_string(),
            instance_path: Some("demo".to_string()),
            bot_type: "maibot".to_string(),
            bot_version: None,
            description: None,
            status: crate::models::InstanceLifecycleStatus::Stopped,
            python_path: None,
            config_path: None,
            created_at: NaiveDateTime::default(),
            updated_at: NaiveDateTime::default(),
            last_run: None,
            run_time: 0,
            qq_account: None,
            runtime_profile: RuntimeProfile::local("demo", None),
            component_runtime_profiles: std::collections::HashMap::new(),
            last_error: None,
            last_status_reason: None,
            component_states: Vec::new(),
            cpu_usage: None,
            memory_usage: None,
        }
    }

    #[tokio::test]
    async fn sync_external_processes_registers_and_removes_external_sessions() {
        let manager = ProcessManager::new();
        let instance = test_instance("inst_test");

        manager
            .sync_external_processes(
                "inst_test",
                &instance,
                &[ComponentType::Main],
                &[crate::runtime::DiscoveredRuntimeProcess {
                    component: ComponentType::Main,
                    runtime_kind: RuntimeKind::Wsl2,
                    status: crate::models::ComponentLifecycleStatus::Running,
                    host_pid: None,
                    guest_pid: Some(9527),
                    terminal_session: Some(TerminalSessionInfo {
                        name: "mailauncher-inst-test-main".to_string(),
                        verified: true,
                    }),
                }],
            )
            .await;

        let history = manager.get_output_history("inst_test", "main", 10).await;
        assert_eq!(
            manager.get_process_guest_pid("inst_test", "main").await,
            Some(9527)
        );
        assert!(!history.is_empty());

        manager
            .sync_external_processes("inst_test", &instance, &[ComponentType::Main], &[])
            .await;

        assert_eq!(
            manager.get_process_guest_pid("inst_test", "main").await,
            None
        );
        assert!(manager
            .get_output_history("inst_test", "main", 10)
            .await
            .is_empty());
    }

    // ==================== 期望态 ====================

    #[tokio::test]
    async fn desired_state_defaults_to_none_then_roundtrips() {
        use super::DesiredState;
        let manager = ProcessManager::new();

        // 从未设置过 -> None(看门狗据此跳过未被管理的组件)
        assert_eq!(manager.get_desired("inst_x", "main").await, None);

        manager
            .set_desired("inst_x", "main", DesiredState::Running)
            .await;
        assert_eq!(
            manager.get_desired("inst_x", "main").await,
            Some(DesiredState::Running)
        );

        manager
            .set_desired("inst_x", "main", DesiredState::Stopped)
            .await;
        assert_eq!(
            manager.get_desired("inst_x", "main").await,
            Some(DesiredState::Stopped)
        );
    }

    #[tokio::test]
    async fn list_desired_running_returns_only_running_sessions() {
        use super::DesiredState;
        let manager = ProcessManager::new();

        manager
            .set_desired("inst_a", "main", DesiredState::Running)
            .await;
        manager
            .set_desired("inst_a", "napcat", DesiredState::Stopped)
            .await;
        manager
            .set_desired("inst_b", "napcat", DesiredState::Running)
            .await;

        let mut running = manager.list_desired_running().await;
        running.sort();

        assert_eq!(
            running,
            vec![
                ("inst_a".to_string(), "main".to_string()),
                ("inst_b".to_string(), "napcat".to_string()),
            ]
        );
    }

    // ==================== 端口冲突检测 ====================

    #[test]
    fn is_tcp_port_in_use_detects_bound_socket() {
        use std::net::{Ipv4Addr, TcpListener};

        // 临时监听一个 OS 分配的空闲端口,该端口应被判定为占用。
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).expect("绑定临时监听失败");
        let port = listener.local_addr().expect("读取本地端口失败").port();

        assert!(
            super::is_tcp_port_in_use(port),
            "已被监听的端口应判定为占用"
        );

        // 释放监听后,同一端口应判定为空闲。
        drop(listener);
        assert!(!super::is_tcp_port_in_use(port), "释放后的端口应判定为空闲");
    }

    #[test]
    fn napcat_listen_ports_include_forward_ws_and_main_has_none() {
        assert_eq!(
            super::component_listen_ports(ComponentType::NapCat),
            &[super::NAPCAT_FORWARD_WS_PORT]
        );
        // MaiBot 无启动器绑定的固定端口,不臆造。
        assert!(super::component_listen_ports(ComponentType::Main).is_empty());
    }

    #[test]
    fn ensure_component_ports_free_passes_for_main() {
        // Main 无监听端口,任何情况下都应放行。
        assert!(super::ensure_component_ports_free(ComponentType::Main).is_ok());
    }

    // ==================== 依赖预检 ====================

    #[test]
    fn ensure_maibot_dependencies_ready_errors_when_venv_missing() {
        let temp_root =
            std::env::temp_dir().join(format!("mailauncher-dep-novenv-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&temp_root);
        std::fs::create_dir_all(&temp_root).expect("创建测试实例根失败");

        let result = super::ensure_maibot_dependencies_ready(&temp_root);
        assert!(result.is_err(), "缺少 .venv 应报错");
        let message = result.unwrap_err().to_string();
        assert!(
            message.contains(".venv"),
            "错误应指出 .venv 缺失: {}",
            message
        );

        let _ = std::fs::remove_dir_all(&temp_root);
    }

    #[test]
    fn ensure_maibot_dependencies_ready_errors_when_key_package_missing() {
        let temp_root =
            std::env::temp_dir().join(format!("mailauncher-dep-partial-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&temp_root);

        // 构造一个 site-packages,只放一部分关键包,剩余应被判定为缺失。
        let site_packages = if cfg!(target_os = "windows") {
            temp_root.join(".venv").join("Lib").join("site-packages")
        } else {
            temp_root
                .join(".venv")
                .join("lib")
                .join("python3.12")
                .join("site-packages")
        };
        std::fs::create_dir_all(site_packages.join("fastapi")).expect("创建包目录失败");
        std::fs::create_dir_all(site_packages.join("uvicorn")).expect("创建包目录失败");
        // 故意不创建 tomlkit / rich

        let result = super::ensure_maibot_dependencies_ready(&temp_root);
        assert!(result.is_err(), "关键包缺失应报错");
        let message = result.unwrap_err().to_string();
        assert!(message.contains("tomlkit"), "错误应列出缺失包: {}", message);
        assert!(message.contains("rich"), "错误应列出缺失包: {}", message);

        let _ = std::fs::remove_dir_all(&temp_root);
    }

    #[test]
    fn ensure_maibot_dependencies_ready_passes_when_all_present() {
        let temp_root =
            std::env::temp_dir().join(format!("mailauncher-dep-ok-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&temp_root);

        let site_packages = if cfg!(target_os = "windows") {
            temp_root.join(".venv").join("Lib").join("site-packages")
        } else {
            temp_root
                .join(".venv")
                .join("lib")
                .join("python3.12")
                .join("site-packages")
        };
        // fastapi 用包目录,tomlkit 用 dist-info 验证回退路径,其余用包目录。
        std::fs::create_dir_all(site_packages.join("fastapi")).expect("创建包目录失败");
        std::fs::create_dir_all(site_packages.join("uvicorn")).expect("创建包目录失败");
        std::fs::create_dir_all(site_packages.join("tomlkit-0.13.2.dist-info"))
            .expect("创建 dist-info 失败");
        std::fs::create_dir_all(site_packages.join("rich")).expect("创建包目录失败");

        assert!(
            super::ensure_maibot_dependencies_ready(&temp_root).is_ok(),
            "全部关键包就绪应放行"
        );

        let _ = std::fs::remove_dir_all(&temp_root);
    }
}

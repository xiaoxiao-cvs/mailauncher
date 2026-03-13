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
use crate::runtime::{LocalRuntimeAdapter, RuntimeAdapter};

// ==================== 进程信息 ====================

/// 单个组件的进程信息（对应 Python ProcessInfo）
pub struct ProcessInfo {
    /// 实例 ID
    pub instance_id: String,
    /// 组件类型（main / napcat / napcat-ada）
    pub component: String,
    /// 会话 ID（{instance_id}::{component}）
    pub session_id: String,
    /// 运行时类型
    pub runtime_kind: RuntimeKind,
    /// 宿主进程 PID
    pub host_pid: Option<u32>,
    /// 访客进程 PID（WSL2/Docker 等场景使用）
    pub guest_pid: Option<u32>,
    /// 兼容旧接口的主 PID 字段（当前等同 host_pid）
    pub pid: Option<u32>,
    /// 启动时间
    pub start_time: DateTime<Utc>,
    /// 终端输出缓冲区
    pub output_buffer: Vec<String>,
    /// 缓冲区最大行数
    pub buffer_size: usize,
    /// PTY 子进程句柄（用于 kill/wait）
    child: Option<Box<dyn Child + Send + Sync>>,
    /// PTY 写入端（通过 MasterPty::take_writer() 获取）
    writer: Option<Box<dyn Write + Send>>,
    /// PTY 主端（保留用于 resize 等操作）
    master: Option<Box<dyn MasterPty + Send>>,
    /// 输出解析缓冲区，用于提取元数据标记
    metadata_buffer: String,
}

impl ProcessInfo {
    /// 检查进程是否存活
    pub fn is_alive(&mut self) -> bool {
        if let Some(ref mut child) = self.child {
            // try_wait: 如果进程退出返回 Some(status)，仍在运行返回 Ok(None)
            match child.try_wait() {
                Ok(Some(_status)) => false,  // 进程已退出
                Ok(None) => true,            // 进程仍在运行
                Err(_) => false,             // 查询失败，视为已退出
            }
        } else {
            false
        }
    }

    /// 获取运行时长（秒）
    pub fn get_uptime(&self) -> f64 {
        (Utc::now() - self.start_time).num_milliseconds() as f64 / 1000.0
    }

    /// 向进程写入输入数据
    pub fn write_input(&mut self, data: &str) -> AppResult<()> {
        if let Some(ref mut writer) = self.writer {
            writer.write_all(data.as_bytes()).map_err(|e| {
                AppError::Process(format!(
                    "向进程 {} 写入数据失败: {}",
                    self.session_id, e
                ))
            })?;
            writer.flush().map_err(|e| {
                AppError::Process(format!(
                    "刷新进程 {} 写入缓冲失败: {}",
                    self.session_id, e
                ))
            })?;
            Ok(())
        } else {
            Err(AppError::Process(format!(
                "进程 {} 没有可用的写入端",
                self.session_id
            )))
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
        self.writer = None;
        self.master = None;
        self.pid = None;
        self.host_pid = None;
        self.guest_pid = None;
    }
}

// ==================== 进程管理器 ====================

/// 进程管理器内部状态
struct ProcessManagerInner {
    /// session_id -> ProcessInfo
    processes: HashMap<String, ProcessInfo>,
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

        info!(
            "[进程管理器] 初始化 - PTY: {}x{}",
            pty_rows, pty_cols
        );

        Self {
            inner: Arc::new(Mutex::new(ProcessManagerInner {
                processes: HashMap::new(),
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

    /// 启动组件进程
    ///
    /// 使用 portable-pty 创建跨平台 PTY，启动指定命令。
    /// 成功后将进程信息存入管理器，并返回 PTY 读取端用于输出监听。
    pub async fn start_process(
        &self,
        instance_id: &str,
        component: &str,
        runtime_kind: RuntimeKind,
        command: &str,
        args: &[&str],
        cwd: &Path,
    ) -> AppResult<Option<Box<dyn Read + Send>>> {
        let session_id = Self::session_id(instance_id, component);

        // Phase 1: 锁内 — 检查运行状态、读取 PTY 尺寸、复制旧日志
        let (pty_rows, pty_cols, old_buffer) = {
            let mut inner = self.inner.lock().await;

            // 检查是否已在运行
            if let Some(proc) = inner.processes.get_mut(&session_id) {
                if proc.is_alive() {
                    info!("进程已在运行: {}", session_id);
                    return Ok(None);
                }
            }

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

        let child = pair.slave.spawn_command(cmd).map_err(|e| {
            error!("启动进程失败 {}: {}", session_id, e);
            AppError::Process(format!(
                "启动进程失败 {}: {}",
                session_id, e
            ))
        })?;

        let pid = child.process_id();
        let reader = pair.master.try_clone_reader().map_err(|e| {
            AppError::Process(format!("克隆 PTY 读取端失败: {}", e))
        })?;
        let writer = pair.master.take_writer().map_err(|e| {
            AppError::Process(format!("获取 PTY 写入端失败: {}", e))
        })?;

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
            guest_pid: if matches!(runtime_kind, RuntimeKind::Local) { pid } else { None },
            pid,
            start_time: Utc::now(),
            output_buffer,
            buffer_size: 1000,
            child: Some(child),
            writer: Some(writer),
            master: Some(pair.master),
            metadata_buffer: String::new(),
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

        info!(
            "进程启动成功: {}, PID: {:?}",
            session_id, pid
        );
        inner.processes.insert(session_id.clone(), process_info);

        Ok(Some(reader))
    }

    /// 停止组件进程
    ///
    /// `force=false`：先发送 Ctrl+C（\x03）尝试优雅退出，等待最多 2 秒，超时后强制 kill。
    /// `force=true`：直接 kill 进程。
    pub async fn stop_process(
        &self,
        instance_id: &str,
        component: &str,
        force: bool,
    ) -> AppResult<bool> {
        let session_id = Self::session_id(instance_id, component);

        let ctrl_c_sent;

        {
            let mut inner = self.inner.lock().await;
            let proc = match inner.processes.get_mut(&session_id) {
                Some(p) => p,
                None => {
                    warn!("进程不存在: {}", session_id);
                    return Ok(true);
                }
            };

            if !proc.is_alive() {
                warn!("进程已经停止: {}", session_id);
                proc.child = None;
                proc.writer = None;
                proc.master = None;
                proc.pid = None;
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
        } // 释放锁

        if !force && ctrl_c_sent {
            // 锁外等待进程优雅退出，最多 2 秒
            let mut exited = false;
            for _ in 0..20 {
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
    pub async fn stop_all_instance_processes(
        &self,
        instance_id: &str,
    ) -> HashMap<String, bool> {
        let mut results = HashMap::new();
        let session_ids: Vec<String>;

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
                    if proc.is_alive() {
                        proc.kill();
                        results.insert(proc.component.clone(), true);
                    } else {
                        proc.child = None;
                        proc.writer = None;
                        proc.master = None;
                        proc.pid = None;
                        results.insert(proc.component.clone(), true);
                    }
                }
            }
        }

        // 锁外轮询确认进程退出，最多等待 1 秒
        for _ in 0..10 {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            let mut inner = self.inner.lock().await;
            let all_dead = session_ids.iter().all(|sid| {
                inner
                    .processes
                    .get_mut(sid)
                    .map_or(true, |p| !p.is_alive())
            });
            if all_dead {
                break;
            }
        }

        results
    }

    /// 检查组件是否在运行
    pub async fn is_component_running(
        &self,
        instance_id: &str,
        component: &str,
    ) -> bool {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            proc.is_alive()
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
            proc.write_input(data)
        } else {
            Err(AppError::NotFound(format!(
                "进程 {} 不存在",
                session_id
            )))
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
        let inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get(&session_id) {
            let start = proc.output_buffer.len().saturating_sub(lines);
            proc.output_buffer[start..].to_vec()
        } else {
            Vec::new()
        }
    }

    /// 获取进程的 CPU 和内存使用情况
    ///
    /// CPU 使用率需要跨调用累积才能得到有效值（sysinfo 要求至少两次 refresh 的间隔）。
    /// System 实例持久化在 ProcessManagerInner 中以满足此要求。
    #[allow(dead_code)]
    pub async fn get_process_resources(
        &self,
        instance_id: &str,
        component: &str,
    ) -> (f64, f64) {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;

        let pid = inner
            .processes
            .get(&session_id)
            .and_then(|p| p.pid);

        match pid {
            Some(pid) => {
                let pid = Pid::from_u32(pid);
                inner.system.refresh_processes(
                    sysinfo::ProcessesToUpdate::Some(&[pid]),
                    true,
                );
                if let Some(process) = inner.system.process(pid) {
                    let cpu = process.cpu_usage() as f64;
                    let mem = process.memory() as f64 / 1024.0 / 1024.0;
                    (cpu, mem)
                } else {
                    (0.0, 0.0)
                }
            }
            None => (0.0, 0.0),
        }
    }

    /// 获取进程启动时间（用于计算 uptime）
    pub async fn get_process_uptime(
        &self,
        instance_id: &str,
        component: &str,
    ) -> Option<f64> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .map(|p| p.get_uptime())
    }

    /// 获取进程 PID
    pub async fn get_process_pid(
        &self,
        instance_id: &str,
        component: &str,
    ) -> Option<u32> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .and_then(|p| p.host_pid)
    }

    pub async fn get_process_guest_pid(
        &self,
        instance_id: &str,
        component: &str,
    ) -> Option<u32> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .and_then(|p| p.guest_pid)
    }

    pub async fn get_process_runtime_kind(
        &self,
        instance_id: &str,
        component: &str,
    ) -> Option<RuntimeKind> {
        let session_id = Self::session_id(instance_id, component);
        let inner = self.inner.lock().await;
        inner
            .processes
            .get(&session_id)
            .map(|p| p.runtime_kind)
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
            if let Some(ref master) = proc.master {
                master
                    .resize(PtySize {
                        rows,
                        cols,
                        pixel_width: 0,
                        pixel_height: 0,
                    })
                    .map_err(|e| {
                        AppError::Process(format!(
                            "调整 PTY 大小失败 {}: {}",
                            session_id, e
                        ))
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

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::ProcessInfo;
    use crate::models::RuntimeKind;

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
            child: None,
            writer: None,
            master: None,
            metadata_buffer: String::new(),
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
        .ok_or_else(|| AppError::InvalidInput(format!("组件未注册: {}", component.display_name())))?;
    let adapter = LocalRuntimeAdapter;
    let resolved = adapter.resolve_component_command(instance_path, spec, runtime_profile, qq_account)?;
    Ok((resolved.command, resolved.args, resolved.cwd))
}

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
use std::path::{Path, PathBuf};
use std::sync::Arc;

use chrono::{DateTime, Utc};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize, PtySystem};
use sysinfo::{Pid, System};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::errors::{AppError, AppResult};

// ==================== 进程信息 ====================

/// 单个组件的进程信息（对应 Python ProcessInfo）
pub struct ProcessInfo {
    /// 实例 ID
    pub instance_id: String,
    /// 组件类型（main / napcat / napcat-ada）
    pub component: String,
    /// 会话 ID（{instance_id}_{component}）
    pub session_id: String,
    /// 进程 PID
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
    /// 标记读取器是否已启动
    reader_started: bool,
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

    /// 终止进程
    pub fn kill(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }
        self.writer = None;
        self.master = None;
        self.pid = None;
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
            })),
        }
    }

    /// 生成会话 ID
    fn session_id(instance_id: &str, component: &str) -> String {
        format!("{}_{}", instance_id, component)
    }

    /// 启动组件进程
    ///
    /// 使用 portable-pty 创建跨平台 PTY，启动指定命令。
    /// 成功后将进程信息存入管理器，并返回 PTY 读取端用于输出监听。
    pub async fn start_process(
        &self,
        instance_id: &str,
        component: &str,
        command: &str,
        args: &[&str],
        cwd: &Path,
    ) -> AppResult<Option<Box<dyn Read + Send>>> {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;

        // 检查是否已在运行
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            if proc.is_alive() {
                info!("进程已在运行: {}", session_id);
                return Ok(None);
            }
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: inner.pty_rows,
                cols: inner.pty_cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Process(format!("创建 PTY 失败: {}", e)))?;

        let mut cmd = CommandBuilder::new(command);
        for arg in args {
            cmd.arg(*arg);
        }
        cmd.cwd(cwd);

        let child = pair.slave.spawn_command(cmd).map_err(|e| {
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
        let mut output_buffer = Vec::new();
        if let Some(old_proc) = inner.processes.get(&session_id) {
            // 保留旧日志的后半部分（最多 500 行）
            let keep = old_proc.output_buffer.len().min(500);
            output_buffer = old_proc.output_buffer
                [old_proc.output_buffer.len() - keep..]
                .to_vec();
            output_buffer.push(format!(
                "\n{}\n[进程重启] 新会话开始\n{}\n",
                "=".repeat(50),
                "=".repeat(50)
            ));
        } else {
            output_buffer.push(format!(
                "\n{}\n[进程启动] 会话开始\n{}\n",
                "=".repeat(50),
                "=".repeat(50)
            ));
        }

        let process_info = ProcessInfo {
            instance_id: instance_id.to_string(),
            component: component.to_string(),
            session_id: session_id.clone(),
            pid,
            start_time: Utc::now(),
            output_buffer,
            buffer_size: 1000,
            child: Some(child),
            writer: Some(writer),
            master: Some(pair.master),
            reader_started: false,
        };

        info!(
            "进程启动成功: {}, PID: {:?}",
            session_id, pid
        );
        inner.processes.insert(session_id.clone(), process_info);

        Ok(Some(reader))
    }

    /// 停止组件进程
    pub async fn stop_process(
        &self,
        instance_id: &str,
        component: &str,
        force: bool,
    ) -> AppResult<bool> {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;

        let proc = match inner.processes.get_mut(&session_id) {
            Some(p) => p,
            None => {
                info!("进程不存在: {}", session_id);
                return Ok(true);
            }
        };

        if !proc.is_alive() {
            info!("进程已经停止: {}", session_id);
            proc.child = None;
            proc.writer = None;
            proc.master = None;
            proc.pid = None;
            return Ok(true);
        }

        info!("停止进程: {}, 强制: {}", session_id, force);
        proc.kill();

        // 短暂等待确认进程终止
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        info!("进程停止成功: {}", session_id);
        Ok(true)
    }

    /// 停止实例的所有进程
    pub async fn stop_all_instance_processes(
        &self,
        instance_id: &str,
    ) -> HashMap<String, bool> {
        let mut results = HashMap::new();

        // 收集该实例的所有组件名
        let components: Vec<String> = {
            let inner = self.inner.lock().await;
            inner
                .processes
                .values()
                .filter(|p| p.instance_id == instance_id)
                .map(|p| p.component.clone())
                .collect()
        };

        info!("停止实例 {} 的所有进程: {:?}", instance_id, components);

        for component in components {
            let result = self
                .stop_process(instance_id, &component, false)
                .await
                .unwrap_or(false);
            results.insert(component, result);
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
    ) {
        let session_id = Self::session_id(instance_id, component);
        let mut inner = self.inner.lock().await;
        if let Some(proc) = inner.processes.get_mut(&session_id) {
            proc.output_buffer.push(output);
            if proc.output_buffer.len() > proc.buffer_size {
                let drain_to = proc.output_buffer.len() - proc.buffer_size;
                proc.output_buffer.drain(..drain_to);
            }
        }
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
    pub async fn get_process_resources(
        &self,
        instance_id: &str,
        component: &str,
    ) -> (f64, f64) {
        let session_id = Self::session_id(instance_id, component);
        let pid = {
            let inner = self.inner.lock().await;
            inner
                .processes
                .get(&session_id)
                .and_then(|p| p.pid)
        };

        match pid {
            Some(pid) => {
                let mut sys = System::new();
                let pid = Pid::from_u32(pid);
                sys.refresh_processes(
                    sysinfo::ProcessesToUpdate::Some(&[pid]),
                    true,
                );
                if let Some(process) = sys.process(pid) {
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
            .and_then(|p| p.pid)
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

// ==================== 命令构建辅助 ====================

/// 根据组件类型构建启动命令和工作目录
///
/// 对应 Python `ProcessManager._get_command_and_cwd`
pub fn build_component_command(
    instance_path: &Path,
    component: &str,
    python_path: Option<&str>,
    qq_account: Option<&str>,
) -> AppResult<(String, Vec<String>, PathBuf)> {
    match component {
        "main" => {
            // MaiBot 主程序
            let cwd = instance_path.join("MaiBot");
            let bot_script = cwd.join("bot.py");
            if !bot_script.exists() {
                return Err(AppError::NotFound(format!(
                    "MaiBot 启动脚本不存在: {}",
                    bot_script.display()
                )));
            }
            let python = resolve_python(instance_path, python_path);
            Ok((python, vec!["bot.py".to_string()], cwd))
        }
        "napcat" => {
            // NapCat
            let (cmd, args, cwd) = build_napcat_command(instance_path, qq_account)?;
            Ok((cmd, args, cwd))
        }
        "napcat-ada" => {
            // NapCat 适配器
            let cwd = instance_path.join("MaiBot-Napcat-Adapter");
            let script = cwd.join("main.py");
            if !script.exists() {
                return Err(AppError::NotFound(format!(
                    "NapCat 适配器启动脚本不存在: {}",
                    script.display()
                )));
            }
            let python = resolve_python(instance_path, python_path);
            Ok((python, vec!["main.py".to_string()], cwd))
        }
        _ => Err(AppError::InvalidInput(format!(
            "不支持的组件类型: {}",
            component
        ))),
    }
}

/// 解析 Python 路径（对应 Python `resolve_python`）
fn resolve_python(instance_path: &Path, python_path: Option<&str>) -> String {
    if let Some(pp) = python_path {
        return pp.to_string();
    }

    // 尝试虚拟环境
    let venv_python = if cfg!(target_os = "windows") {
        instance_path.join(".venv").join("Scripts").join("python.exe")
    } else {
        instance_path.join(".venv").join("bin").join("python")
    };

    if venv_python.exists() {
        info!("使用虚拟环境 Python: {}", venv_python.display());
        return venv_python.to_string_lossy().to_string();
    }

    // 回退到系统 Python
    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

/// 构建 NapCat 启动命令（对应 Python `build_napcat_command`）
fn build_napcat_command(
    instance_path: &Path,
    qq_account: Option<&str>,
) -> AppResult<(String, Vec<String>, PathBuf)> {
    let napcat_dir = instance_path.join("NapCat");
    let cwd = napcat_dir.clone();

    if cfg!(target_os = "windows") {
        // Windows: 查找 launcher 脚本
        let launcher = if napcat_dir.join("launcher-user.bat").exists() {
            "launcher-user.bat"
        } else if napcat_dir.join("launcher.bat").exists() {
            "launcher.bat"
        } else {
            return Err(AppError::NotFound(format!(
                "NapCat 启动脚本不存在: {}",
                napcat_dir.join("launcher-user.bat").display()
            )));
        };

        let mut args = vec!["/c".to_string(), launcher.to_string()];
        if let Some(account) = qq_account {
            info!("使用 QQ 账号快速启动: {}", account);
            args.push("-q".to_string());
            args.push(account.to_string());
        }
        Ok(("cmd".to_string(), args, cwd))
    } else {
        // Unix: 使用 start.sh
        let start_sh = napcat_dir.join("start.sh");
        if !start_sh.exists() {
            return Err(AppError::NotFound(format!(
                "NapCat 启动脚本不存在: {}",
                start_sh.display()
            )));
        }

        let mut args = vec!["start.sh".to_string()];
        if let Some(account) = qq_account {
            info!("使用 QQ 账号快速启动: {}", account);
            args.push(account.to_string());
        }
        Ok(("bash".to_string(), args, cwd))
    }
}

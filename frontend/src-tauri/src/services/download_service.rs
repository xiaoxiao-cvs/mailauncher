/// 下载管理服务
///
/// 对应 Python 的 download_service.py + download_manager.py + napcat_installer.py。
/// 负责 Git 仓库克隆、NapCat 安装包下载、版本查询等。
/// 通过 Tauri 事件推送进度（替代 Python 的 WebSocket）。
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use chrono::Utc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::download::*;

// ==================== 仓库配置 ====================

/// 组件 Git 仓库地址与目标文件夹
pub struct RepoConfig {
    pub url: &'static str,
    pub folder: &'static str,
}

/// 获取组件仓库配置
pub fn get_repo_config(item_type: &DownloadItemType) -> RepoConfig {
    match item_type {
        DownloadItemType::Maibot => RepoConfig {
            url: "https://github.com/MaiM-with-u/MaiBot.git",
            folder: "MaiBot",
        },
        DownloadItemType::NapcatAdapter => RepoConfig {
            url: "https://github.com/MaiM-with-u/MaiBot-Napcat-Adapter.git",
            folder: "MaiBot-Napcat-Adapter",
        },
        DownloadItemType::Lpmm => RepoConfig {
            url: "https://github.com/MaiM-with-u/MaiMBot-LPMM.git",
            folder: "MaiMBot-LPMM",
        },
        DownloadItemType::Napcat => RepoConfig {
            url: "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip",
            folder: "NapCat",
        },
    }
}

/// NapCat Shell 下载地址
const NAPCAT_SHELL_URL: &str =
    "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip";

// ==================== 下载管理器 ====================

/// 下载管理器（内存态任务管理）
///
/// 对应 Python DownloadManager：管理任务创建、执行和进度推送
#[derive(Clone)]
pub struct DownloadManager {
    inner: Arc<Mutex<DownloadManagerInner>>,
}

struct DownloadManagerInner {
    /// 任务映射表
    tasks: HashMap<String, DownloadTask>,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(DownloadManagerInner {
                tasks: HashMap::new(),
            })),
        }
    }

    /// 创建下载任务
    pub async fn create_task(&self, data: DownloadTaskCreate) -> DownloadTask {
        let task_id = format!("download_{}", &uuid::Uuid::new_v4().to_string()[..12]);
        let deployment_path = data
            .deployment_path
            .unwrap_or_else(|| data.instance_name.clone());
        let now = Utc::now().naive_utc();

        let task = DownloadTask {
            id: task_id.clone(),
            instance_name: data.instance_name,
            deployment_path,
            maibot_version_source: data.maibot_version_source,
            maibot_version_value: data.maibot_version_value,
            selected_items: data.selected_items,
            python_path: data.python_path,
            status: DownloadStatus::Pending,
            progress: DownloadProgress {
                task_id: task_id.clone(),
                status: DownloadStatus::Pending,
                downloaded: 0,
                total: None,
                speed: 0,
                progress: 0.0,
                message: Some("等待开始".to_string()),
                error: None,
            },
            created_at: now,
            started_at: None,
            completed_at: None,
            error_message: None,
            instance_id: None,
            logs: Vec::new(),
        };

        let mut inner = self.inner.lock().await;
        inner.tasks.insert(task_id, task.clone());
        task
    }

    /// 获取任务
    pub async fn get_task(&self, task_id: &str) -> Option<DownloadTask> {
        let inner = self.inner.lock().await;
        inner.tasks.get(task_id).cloned()
    }

    /// 获取所有任务
    pub async fn get_all_tasks(&self) -> Vec<DownloadTask> {
        let inner = self.inner.lock().await;
        inner.tasks.values().cloned().collect()
    }

    /// 更新任务状态
    pub async fn update_task_status(&self, task_id: &str, status: DownloadStatus) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.status = status.clone();
            task.progress.status = status;
        }
    }

    /// 更新任务进度百分比和消息
    pub async fn update_task_progress(&self, task_id: &str, progress: f64, message: String) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.progress.progress = progress;
            task.progress.message = Some(message);
        }
    }

    /// 添加日志
    pub async fn add_log(&self, task_id: &str, log: String) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.logs.push(log);
        }
    }

    /// 标记任务开始
    pub async fn mark_started(&self, task_id: &str) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.status = DownloadStatus::Downloading;
            task.started_at = Some(Utc::now().naive_utc());
            task.progress.status = DownloadStatus::Downloading;
        }
    }

    /// 标记任务完成
    pub async fn mark_completed(&self, task_id: &str, instance_id: Option<String>) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.status = DownloadStatus::Completed;
            task.completed_at = Some(Utc::now().naive_utc());
            task.progress.status = DownloadStatus::Completed;
            task.progress.progress = 100.0;
            task.instance_id = instance_id;
        }
    }

    /// 标记任务失败
    pub async fn mark_failed(&self, task_id: &str, error: String) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.status = DownloadStatus::Failed;
            task.completed_at = Some(Utc::now().naive_utc());
            task.error_message = Some(error.clone());
            task.progress.status = DownloadStatus::Failed;
            task.progress.error = Some(error);
        }
    }
}

// ==================== Git 克隆 ====================

/// 克隆 Git 仓库
///
/// 通过 `git clone` 命令执行，实时推送输出到前端。
/// 对应 Python `DownloadService.clone_repository`。
pub async fn clone_repository(
    repo_url: &str,
    target_dir: &Path,
    branch: Option<&str>,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    if target_dir.exists() {
        warn!("目标目录已存在，将根据 .git 判断是否跳过: {:?}", target_dir);
        if target_dir.join(".git").exists() {
            info!("已有 Git 仓库，跳过克隆: {:?}", target_dir);
            return Ok(());
        }
        // 非 Git 目录，删后重建
        std::fs::remove_dir_all(target_dir)
            .map_err(|e| AppError::FileSystem(format!("清理目标目录失败: {}", e)))?;
    }

    let mut args = vec!["clone", "--progress"];
    if let Some(b) = branch {
        args.push("-b");
        args.push(b);
    }
    args.push(repo_url);
    args.push(
        target_dir
            .to_str()
            .ok_or_else(|| AppError::FileSystem("路径包含非法字符".to_string()))?,
    );

    info!("执行 git clone: {:?}", args);

    let output = run_command_with_output("git", &args, None, app_handle, event_name).await?;

    if !output.success {
        return Err(AppError::Process(format!(
            "Git 克隆失败: {}",
            output.stderr
        )));
    }

    info!("Git 克隆完成: {:?}", target_dir);
    Ok(())
}

/// 下载并解压 NapCat Shell (Windows)
///
/// 对应 Python `NapCatInstaller._download_and_extract_napcat_windows`。
pub async fn download_napcat(
    instance_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    let napcat_dir = instance_dir.join("NapCat");

    // 备份已有配置
    let config_backup = if napcat_dir.join("config").exists() {
        let backup_dir = instance_dir.join("_napcat_config_backup");
        if backup_dir.exists() {
            let _ = std::fs::remove_dir_all(&backup_dir);
        }
        let src = napcat_dir.join("config");
        std::fs::create_dir_all(&backup_dir)
            .map_err(|e| AppError::FileSystem(format!("创建配置备份目录失败: {}", e)))?;
        copy_dir_recursive(&src, &backup_dir)
            .map_err(|e| AppError::FileSystem(format!("备份 NapCat 配置失败: {}", e)))?;
        Some(backup_dir)
    } else {
        None
    };

    // 下载 zip
    let _ = app_handle.emit(event_name, "正在下载 NapCat Shell...");
    let zip_path = instance_dir.join("NapCat.Shell.zip");
    download_file(NAPCAT_SHELL_URL, &zip_path, app_handle, event_name).await?;

    // 解压
    let _ = app_handle.emit(event_name, "正在解压 NapCat Shell...");

    // 清理旧目录
    if napcat_dir.exists() {
        std::fs::remove_dir_all(&napcat_dir)
            .map_err(|e| AppError::FileSystem(format!("清理 NapCat 旧目录失败: {}", e)))?;
    }

    let zip_file = std::fs::File::open(&zip_path)
        .map_err(|e| AppError::FileSystem(format!("打开 zip 文件失败: {}", e)))?;
    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| AppError::FileSystem(format!("解析 zip 文件失败: {}", e)))?;
    archive
        .extract(&napcat_dir)
        .map_err(|e| AppError::FileSystem(format!("解压 NapCat 失败: {}", e)))?;

    // 清理 zip
    let _ = std::fs::remove_file(&zip_path);

    // 恢复配置备份
    if let Some(backup_dir) = config_backup {
        let config_dir = napcat_dir.join("config");
        if !config_dir.exists() {
            std::fs::create_dir_all(&config_dir)
                .map_err(|e| AppError::FileSystem(format!("创建 config 目录失败: {}", e)))?;
        }
        copy_dir_recursive(&backup_dir, &config_dir)
            .map_err(|e| AppError::FileSystem(format!("恢复 NapCat 配置失败: {}", e)))?;
        let _ = std::fs::remove_dir_all(&backup_dir);
    }

    let _ = app_handle.emit(event_name, "NapCat 安装完成");
    info!("NapCat Shell 安装完成: {:?}", napcat_dir);
    Ok(())
}

// ==================== 版本查询 ====================

/// 获取远程 Git 仓库可用版本
///
/// 通过 `git ls-remote` 获取 tags 和 branches。
/// 对应 Python `DownloadService.get_available_versions`。
pub async fn get_available_versions(repo_url: &str) -> AppResult<VersionsResponse> {
    // 获取 tags
    let tags_output = tokio::process::Command::new("git")
        .args(["ls-remote", "--tags", repo_url])
        .output()
        .await
        .map_err(|e| AppError::Process(format!("执行 git ls-remote --tags 失败: {}", e)))?;

    let tags_text = String::from_utf8_lossy(&tags_output.stdout);
    let tags: Vec<String> = tags_text
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() == 2 {
                let ref_name = parts[1].trim_start_matches("refs/tags/");
                // 排除 ^{} 后缀
                if !ref_name.ends_with("^{}") {
                    return Some(ref_name.to_string());
                }
            }
            None
        })
        .collect();

    // 获取 branches
    let branches_output = tokio::process::Command::new("git")
        .args(["ls-remote", "--heads", repo_url])
        .output()
        .await
        .map_err(|e| AppError::Process(format!("执行 git ls-remote --heads 失败: {}", e)))?;

    let branches_text = String::from_utf8_lossy(&branches_output.stdout);
    let branches: Vec<String> = branches_text
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() == 2 {
                let ref_name = parts[1].trim_start_matches("refs/heads/");
                return Some(ref_name.to_string());
            }
            None
        })
        .collect();

    Ok(VersionsResponse { tags, branches })
}

// ==================== HTTP 下载 ====================

/// 下载文件（带进度推送）
async fn download_file(
    url: &str,
    dest: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| AppError::Network(format!("创建 HTTP 客户端失败: {}", e)))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("HTTP 请求失败: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "HTTP 下载失败，状态码: {}",
            response.status()
        )));
    }

    let total_size = response.content_length();
    let mut downloaded: u64 = 0;

    // 确保父目录存在
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::FileSystem(format!("创建下载目录失败: {}", e)))?;
    }

    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| AppError::FileSystem(format!("创建下载文件失败: {}", e)))?;

    use tokio::io::AsyncWriteExt;
    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk =
            chunk.map_err(|e| AppError::Network(format!("下载数据块失败: {}", e)))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| AppError::FileSystem(format!("写入文件失败: {}", e)))?;

        downloaded += chunk.len() as u64;

        // 推送进度
        if let Some(total) = total_size {
            let pct = (downloaded as f64 / total as f64 * 100.0).min(100.0);
            let msg = format!(
                "下载中... {:.1}MB / {:.1}MB ({:.0}%)",
                downloaded as f64 / 1_048_576.0,
                total as f64 / 1_048_576.0,
                pct
            );
            let _ = app_handle.emit(event_name, &msg);
        }
    }

    file.flush()
        .await
        .map_err(|e| AppError::FileSystem(format!("刷新文件失败: {}", e)))?;

    Ok(())
}

// ==================== 命令执行工具 ====================

/// 命令执行结果
pub struct CommandOutput {
    pub success: bool,
    #[allow(dead_code)]
    pub stdout: String,
    pub stderr: String,
}

/// 执行外部命令，实时推送输出
///
/// 通过 Tauri 事件推送标准输出和错误输出的每一行。
pub async fn run_command_with_output(
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<CommandOutput> {
    use tokio::io::{AsyncBufReadExt, BufReader};
    use tokio::process::Command;

    let mut cmd = Command::new(program);
    cmd.args(args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::Process(format!("启动命令 {} 失败: {}", program, e)))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app1 = app_handle.clone();
    let event1 = event_name.to_string();
    let stdout_handle = tokio::spawn(async move {
        let mut lines = Vec::new();
        if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app1.emit(&event1, &line);
                lines.push(line);
            }
        }
        lines.join("\n")
    });

    let app2 = app_handle.clone();
    let event2 = event_name.to_string();
    let stderr_handle = tokio::spawn(async move {
        let mut lines = Vec::new();
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app2.emit(&event2, &line);
                lines.push(line);
            }
        }
        lines.join("\n")
    });

    let status = child
        .wait()
        .await
        .map_err(|e| AppError::Process(format!("等待命令完成失败: {}", e)))?;

    let stdout_text = stdout_handle.await.unwrap_or_default();
    let stderr_text = stderr_handle.await.unwrap_or_default();

    Ok(CommandOutput {
        success: status.success(),
        stdout: stdout_text,
        stderr: stderr_text,
    })
}

// ==================== 目录递归复制 ====================

/// 递归复制目录
pub fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

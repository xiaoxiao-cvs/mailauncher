/// 下载管理服务
///
/// 对应 Python 的 download_service.py + download_manager.py + napcat_installer.py。
/// 负责 Git 仓库克隆、NapCat 安装包下载、版本查询等。
/// 通过 Tauri 事件推送进度（替代 Python 的 WebSocket）。
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use chrono::Utc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tracing::{info, warn};

use sqlx::SqlitePool;

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
    /// 取消信号表：task_id → 取消标记
    cancel_tokens: HashMap<String, Arc<AtomicBool>>,
    pool: SqlitePool,
}

impl DownloadManager {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            inner: Arc::new(Mutex::new(DownloadManagerInner {
                tasks: HashMap::new(),
                cancel_tokens: HashMap::new(),
                pool,
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

        // 持久化到数据库
        let items_json = serde_json::to_string(&task.selected_items).unwrap_or_default();
        let status_str = serde_json::to_string(&task.status).unwrap_or_default().trim_matches('"').to_string();
        if let Err(e) = sqlx::query(
            "INSERT INTO download_tasks (id, instance_name, deployment_path, maibot_version_source, maibot_version_value, selected_items, python_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
            .bind(&task.id)
            .bind(&task.instance_name)
            .bind(&task.deployment_path)
            .bind(task.maibot_version_source.as_ref().map(|s| serde_json::to_string(s).unwrap_or_default().trim_matches('"').to_string()))
            .bind(&task.maibot_version_value)
            .bind(&items_json)
            .bind(&task.python_path)
            .bind(&status_str)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化下载任务失败 ({}): {}", task.id, e);
        }

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
            task.progress.status = status.clone();
        }
        let status_str = serde_json::to_string(&status).unwrap_or_default().trim_matches('"').to_string();
        if let Err(e) = sqlx::query("UPDATE download_tasks SET status = ? WHERE id = ?")
            .bind(&status_str)
            .bind(task_id)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化任务状态失败 ({}): {}", task_id, e);
        }
    }

    /// 更新任务进度百分比和消息
    pub async fn update_task_progress(&self, task_id: &str, progress: f64, message: String) {
        let mut inner = self.inner.lock().await;
        if let Some(task) = inner.tasks.get_mut(task_id) {
            task.progress.progress = progress;
            task.progress.message = Some(message.clone());
        }
        if let Err(e) = sqlx::query("UPDATE download_tasks SET progress = ?, progress_message = ? WHERE id = ?")
            .bind(progress)
            .bind(&message)
            .bind(task_id)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化任务进度失败 ({}): {}", task_id, e);
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
        if let Err(e) = sqlx::query("UPDATE download_tasks SET status = 'downloading', started_at = datetime('now', 'localtime') WHERE id = ?")
            .bind(task_id)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化任务启动状态失败 ({}): {}", task_id, e);
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
            task.instance_id = instance_id.clone();
        }
        if let Err(e) = sqlx::query("UPDATE download_tasks SET status = 'completed', completed_at = datetime('now', 'localtime'), instance_id = ?, progress = 100.0 WHERE id = ?")
            .bind(&instance_id)
            .bind(task_id)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化任务完成状态失败 ({}): {}", task_id, e);
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
            task.progress.error = Some(error.clone());
        }
        if let Err(e) = sqlx::query("UPDATE download_tasks SET status = 'failed', completed_at = datetime('now', 'localtime'), error_message = ? WHERE id = ?")
            .bind(&error)
            .bind(task_id)
            .execute(&inner.pool)
            .await
        {
            warn!("持久化任务失败状态失败 ({}): {}", task_id, e);
        }
    }

    /// 为任务创建取消令牌
    pub async fn create_cancel_token(&self, task_id: &str) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        let mut inner = self.inner.lock().await;
        inner.cancel_tokens.insert(task_id.to_string(), token.clone());
        token
    }

    /// 触发任务取消
    pub async fn cancel_task(&self, task_id: &str) {
        let inner = self.inner.lock().await;
        if let Some(token) = inner.cancel_tokens.get(task_id) {
            token.store(true, Ordering::Relaxed);
        }
    }

    /// 检查任务是否已被取消
    pub fn is_cancelled(token: &Arc<AtomicBool>) -> bool {
        token.load(Ordering::Relaxed)
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

    let mut args = vec!["clone", "--progress", "--depth", "1"];
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
    let mut last_speed_update = std::time::Instant::now();
    let mut bytes_since_last_update: u64 = 0;
    let mut current_speed: u64 = 0; // bytes/sec

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

        bytes_since_last_update += chunk.len() as u64;
        let elapsed = last_speed_update.elapsed();
        if elapsed.as_millis() >= 500 {
            current_speed = (bytes_since_last_update as f64 / elapsed.as_secs_f64()) as u64;
            bytes_since_last_update = 0;
            last_speed_update = std::time::Instant::now();
        }

        // 推送进度
        if let Some(total) = total_size {
            let pct = (downloaded as f64 / total as f64 * 100.0).min(100.0);
            let speed_str = if current_speed > 1_048_576 {
                format!("{:.1} MB/s", current_speed as f64 / 1_048_576.0)
            } else if current_speed > 1024 {
                format!("{:.0} KB/s", current_speed as f64 / 1024.0)
            } else {
                format!("{} B/s", current_speed)
            };
            let msg = format!(
                "下载中... {:.1}MB / {:.1}MB ({:.0}%) - {}",
                downloaded as f64 / 1_048_576.0,
                total as f64 / 1_048_576.0,
                pct,
                speed_str
            );
            let _ = app_handle.emit(event_name, &msg);
        }
    }

    file.flush()
        .await
        .map_err(|e| AppError::FileSystem(format!("刷新文件失败: {}", e)))?;

    // 计算文件 SHA256 校验和
    let file_bytes = tokio::fs::read(dest).await
        .map_err(|e| AppError::FileSystem(format!("读取文件计算校验和失败: {}", e)))?;
    use sha2::{Sha256, Digest};
    let hash = Sha256::digest(&file_bytes);
    let hash_hex = format!("{:x}", hash);
    info!("文件下载完成: {:?}, SHA256: {}", dest, hash_hex);
    let _ = app_handle.emit(event_name, &format!("SHA256: {}", hash_hex));

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
///
/// 跳过符号链接以避免循环引用和跨目录意外复制。
pub fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if file_type.is_symlink() {
            // 跳过符号链接，避免循环引用或复制到意外位置
            tracing::debug!("跳过符号链接: {:?}", src_path);
            continue;
        }

        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migration::run_migrations;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        run_migrations(&pool).await.expect("数据库迁移失败");
        pool
    }

    fn make_task_create(name: &str, items: Vec<DownloadItemType>) -> DownloadTaskCreate {
        DownloadTaskCreate {
            instance_name: name.to_string(),
            deployment_path: None,
            maibot_version_source: None,
            maibot_version_value: None,
            selected_items: items,
            python_path: None,
        }
    }

    // ==================== new() ====================

    #[tokio::test]
    async fn new_manager_has_no_tasks() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);
        let tasks = mgr.get_all_tasks().await;
        assert_eq!(tasks.len(), 0);
    }

    // ==================== create_task ====================

    #[tokio::test]
    async fn create_task_sets_correct_fields() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let data = DownloadTaskCreate {
            instance_name: "my-bot-alpha".to_string(),
            deployment_path: Some("/opt/deploy/alpha".to_string()),
            maibot_version_source: Some(MaibotVersionSource::Tag),
            maibot_version_value: Some("v1.2.3".to_string()),
            selected_items: vec![DownloadItemType::Maibot, DownloadItemType::Napcat],
            python_path: Some("/usr/bin/python3".to_string()),
        };

        let task = mgr.create_task(data).await;

        assert!(task.id.starts_with("download_"), "任务 ID 应以 download_ 开头，实际: {}", task.id);
        assert_eq!(task.id.len(), "download_".len() + 12);
        assert_eq!(task.instance_name, "my-bot-alpha");
        assert_eq!(task.deployment_path, "/opt/deploy/alpha");
        assert_eq!(task.maibot_version_source, Some(MaibotVersionSource::Tag));
        assert_eq!(task.maibot_version_value, Some("v1.2.3".to_string()));
        assert_eq!(task.selected_items, vec![DownloadItemType::Maibot, DownloadItemType::Napcat]);
        assert_eq!(task.python_path, Some("/usr/bin/python3".to_string()));
        assert_eq!(task.status, DownloadStatus::Pending);
        assert_eq!(task.progress.progress, 0.0);
        assert_eq!(task.progress.status, DownloadStatus::Pending);
        assert_eq!(task.progress.message, Some("等待开始".to_string()));
        assert_eq!(task.progress.downloaded, 0);
        assert_eq!(task.progress.speed, 0);
        assert!(task.progress.error.is_none());
        assert!(task.started_at.is_none());
        assert!(task.completed_at.is_none());
        assert!(task.error_message.is_none());
        assert!(task.instance_id.is_none());
        assert_eq!(task.logs.len(), 0);
    }

    #[tokio::test]
    async fn create_task_uses_instance_name_as_deployment_path_when_none() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let data = make_task_create("fallback-instance", vec![DownloadItemType::Lpmm]);
        let task = mgr.create_task(data).await;

        assert_eq!(task.deployment_path, "fallback-instance");
    }

    #[tokio::test]
    async fn create_task_generates_unique_ids() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let t1 = mgr.create_task(make_task_create("inst-1", vec![DownloadItemType::Maibot])).await;
        let t2 = mgr.create_task(make_task_create("inst-2", vec![DownloadItemType::Napcat])).await;
        let t3 = mgr.create_task(make_task_create("inst-3", vec![DownloadItemType::NapcatAdapter])).await;

        assert_ne!(t1.id, t2.id);
        assert_ne!(t2.id, t3.id);
        assert_ne!(t1.id, t3.id);
    }

    // ==================== get_task ====================

    #[tokio::test]
    async fn get_task_returns_created_task() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let created = mgr.create_task(make_task_create("get-test", vec![DownloadItemType::Maibot])).await;
        let fetched = mgr.get_task(&created.id).await;

        assert!(fetched.is_some());
        let fetched = fetched.unwrap();
        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.instance_name, "get-test");
        assert_eq!(fetched.status, DownloadStatus::Pending);
    }

    #[tokio::test]
    async fn get_task_returns_none_for_nonexistent_id() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let result = mgr.get_task("download_does_not_exist").await;
        assert!(result.is_none(), "不存在的任务 ID 应返回 None");
    }

    // ==================== get_all_tasks ====================

    #[tokio::test]
    async fn get_all_tasks_returns_multiple_tasks() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let t1 = mgr.create_task(make_task_create("bot-a", vec![DownloadItemType::Maibot])).await;
        let t2 = mgr.create_task(make_task_create("bot-b", vec![DownloadItemType::Napcat])).await;

        let all = mgr.get_all_tasks().await;
        assert_eq!(all.len(), 2);

        let ids: Vec<&str> = all.iter().map(|t| t.id.as_str()).collect();
        assert!(ids.contains(&t1.id.as_str()));
        assert!(ids.contains(&t2.id.as_str()));
    }

    // ==================== mark_started ====================

    #[tokio::test]
    async fn mark_started_transitions_to_downloading() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("start-test", vec![DownloadItemType::Maibot])).await;
        mgr.mark_started(&task.id).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Downloading);
        assert_eq!(updated.progress.status, DownloadStatus::Downloading);
        assert!(updated.started_at.is_some(), "started_at 应被设置");
    }

    #[tokio::test]
    async fn mark_started_on_nonexistent_task_does_not_panic() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);
        mgr.mark_started("download_ghost_id_00").await;
    }

    // ==================== mark_completed ====================

    #[tokio::test]
    async fn mark_completed_sets_status_and_progress_100() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("complete-test", vec![DownloadItemType::Napcat])).await;
        mgr.mark_started(&task.id).await;
        mgr.mark_completed(&task.id, Some("inst_abc123".to_string())).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Completed);
        assert_eq!(updated.progress.status, DownloadStatus::Completed);
        assert_eq!(updated.progress.progress, 100.0);
        assert_eq!(updated.instance_id, Some("inst_abc123".to_string()));
        assert!(updated.completed_at.is_some(), "completed_at 应被设置");
    }

    #[tokio::test]
    async fn mark_completed_without_instance_id() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("complete-no-inst", vec![DownloadItemType::Lpmm])).await;
        mgr.mark_completed(&task.id, None).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Completed);
        assert!(updated.instance_id.is_none());
    }

    // ==================== mark_failed ====================

    #[tokio::test]
    async fn mark_failed_sets_error_message_and_status() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("fail-test", vec![DownloadItemType::Maibot])).await;
        mgr.mark_started(&task.id).await;
        mgr.mark_failed(&task.id, "网络连接超时".to_string()).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Failed);
        assert_eq!(updated.progress.status, DownloadStatus::Failed);
        assert_eq!(updated.error_message, Some("网络连接超时".to_string()));
        assert_eq!(updated.progress.error, Some("网络连接超时".to_string()));
        assert!(updated.completed_at.is_some(), "失败时 completed_at 应被设置");
    }

    #[tokio::test]
    async fn mark_failed_on_nonexistent_task_does_not_panic() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);
        mgr.mark_failed("download_no_such_id", "some error".to_string()).await;
    }

    // ==================== update_task_progress ====================

    #[tokio::test]
    async fn update_task_progress_sets_percentage_and_message() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("progress-test", vec![DownloadItemType::Maibot])).await;
        mgr.update_task_progress(&task.id, 42.5, "正在克隆仓库...".to_string()).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.progress.progress, 42.5);
        assert_eq!(updated.progress.message, Some("正在克隆仓库...".to_string()));
    }

    #[tokio::test]
    async fn update_task_progress_boundary_values() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("boundary", vec![DownloadItemType::Napcat])).await;

        mgr.update_task_progress(&task.id, 0.0, "刚开始".to_string()).await;
        let t = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(t.progress.progress, 0.0);

        mgr.update_task_progress(&task.id, 100.0, "完成".to_string()).await;
        let t = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(t.progress.progress, 100.0);
        assert_eq!(t.progress.message, Some("完成".to_string()));

        mgr.update_task_progress(&task.id, 99.999, "接近完成".to_string()).await;
        let t = mgr.get_task(&task.id).await.unwrap();
        assert!((t.progress.progress - 99.999).abs() < f64::EPSILON);
    }

    #[tokio::test]
    async fn update_task_progress_on_nonexistent_task_does_not_panic() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);
        mgr.update_task_progress("download_nope_12345", 50.0, "msg".to_string()).await;
    }

    // ==================== update_task_status ====================

    #[tokio::test]
    async fn update_task_status_changes_both_task_and_progress_status() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("status-test", vec![DownloadItemType::NapcatAdapter])).await;

        mgr.update_task_status(&task.id, DownloadStatus::Installing).await;
        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Installing);
        assert_eq!(updated.progress.status, DownloadStatus::Installing);

        mgr.update_task_status(&task.id, DownloadStatus::Configuring).await;
        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Configuring);
        assert_eq!(updated.progress.status, DownloadStatus::Configuring);
    }

    #[tokio::test]
    async fn update_task_status_to_cancelled() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("cancel-test", vec![DownloadItemType::Maibot])).await;
        mgr.update_task_status(&task.id, DownloadStatus::Cancelled).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.status, DownloadStatus::Cancelled);
    }

    // ==================== add_log ====================

    #[tokio::test]
    async fn add_log_accumulates_entries() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("log-test", vec![DownloadItemType::Maibot])).await;

        mgr.add_log(&task.id, "开始克隆 MaiBot 仓库".to_string()).await;
        mgr.add_log(&task.id, "克隆进度 50%".to_string()).await;
        mgr.add_log(&task.id, "克隆完成".to_string()).await;

        let updated = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(updated.logs.len(), 3);
        assert_eq!(updated.logs[0], "开始克隆 MaiBot 仓库");
        assert_eq!(updated.logs[1], "克隆进度 50%");
        assert_eq!(updated.logs[2], "克隆完成");
    }

    #[tokio::test]
    async fn add_log_on_nonexistent_task_does_not_panic() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);
        mgr.add_log("download_nonexistent", "无效日志".to_string()).await;
    }

    // ==================== get_repo_config ====================

    #[test]
    fn get_repo_config_returns_correct_urls_and_folders() {
        let maibot = get_repo_config(&DownloadItemType::Maibot);
        assert_eq!(maibot.folder, "MaiBot");
        assert!(maibot.url.contains("MaiBot.git"), "MaiBot URL 应包含仓库地址");

        let napcat = get_repo_config(&DownloadItemType::Napcat);
        assert_eq!(napcat.folder, "NapCat");
        assert!(napcat.url.contains("NapCat.Shell.zip"), "NapCat URL 应指向 Shell.zip");

        let adapter = get_repo_config(&DownloadItemType::NapcatAdapter);
        assert_eq!(adapter.folder, "MaiBot-Napcat-Adapter");
        assert!(adapter.url.contains("MaiBot-Napcat-Adapter.git"));

        let lpmm = get_repo_config(&DownloadItemType::Lpmm);
        assert_eq!(lpmm.folder, "MaiMBot-LPMM");
        assert!(lpmm.url.contains("MaiMBot-LPMM.git"));
    }

    // ==================== 复合状态转换场景 ====================

    #[tokio::test]
    async fn full_lifecycle_pending_to_completed() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("lifecycle-ok", vec![
            DownloadItemType::Maibot,
            DownloadItemType::Napcat,
            DownloadItemType::NapcatAdapter,
        ])).await;
        assert_eq!(task.status, DownloadStatus::Pending);

        mgr.mark_started(&task.id).await;
        let t = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(t.status, DownloadStatus::Downloading);

        mgr.update_task_progress(&task.id, 30.0, "克隆 MaiBot".to_string()).await;
        mgr.add_log(&task.id, "MaiBot 克隆完成".to_string()).await;

        mgr.update_task_status(&task.id, DownloadStatus::Installing).await;
        mgr.update_task_progress(&task.id, 60.0, "安装 Python 依赖".to_string()).await;
        mgr.add_log(&task.id, "pip install 完成".to_string()).await;

        mgr.update_task_status(&task.id, DownloadStatus::Configuring).await;
        mgr.update_task_progress(&task.id, 90.0, "写入配置文件".to_string()).await;

        mgr.mark_completed(&task.id, Some("inst_lifecycle_ok".to_string())).await;

        let final_task = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(final_task.status, DownloadStatus::Completed);
        assert_eq!(final_task.progress.progress, 100.0);
        assert_eq!(final_task.instance_id, Some("inst_lifecycle_ok".to_string()));
        assert!(final_task.started_at.is_some());
        assert!(final_task.completed_at.is_some());
        assert_eq!(final_task.logs.len(), 2);
        assert_eq!(final_task.selected_items.len(), 3);
    }

    #[tokio::test]
    async fn full_lifecycle_pending_to_failed() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool);

        let task = mgr.create_task(make_task_create("lifecycle-fail", vec![DownloadItemType::Maibot])).await;

        mgr.mark_started(&task.id).await;
        mgr.update_task_progress(&task.id, 15.0, "克隆中".to_string()).await;
        mgr.add_log(&task.id, "git clone 开始".to_string()).await;
        mgr.mark_failed(&task.id, "fatal: repository not found".to_string()).await;

        let final_task = mgr.get_task(&task.id).await.unwrap();
        assert_eq!(final_task.status, DownloadStatus::Failed);
        assert_eq!(final_task.error_message, Some("fatal: repository not found".to_string()));
        assert!(final_task.started_at.is_some());
        assert!(final_task.completed_at.is_some());
        assert_eq!(final_task.logs.len(), 1);
        assert_eq!(final_task.progress.progress, 15.0);
    }

    // ==================== DB 持久化验证 ====================

    #[tokio::test]
    async fn create_task_persists_to_database() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool.clone());

        let task = mgr.create_task(DownloadTaskCreate {
            instance_name: "db-persist".to_string(),
            deployment_path: Some("/data/persist".to_string()),
            maibot_version_source: Some(MaibotVersionSource::Branch),
            maibot_version_value: Some("develop".to_string()),
            selected_items: vec![DownloadItemType::Maibot],
            python_path: Some("C:\\Python311\\python.exe".to_string()),
        }).await;

        let row: (String, String, String, String) = sqlx::query_as(
            "SELECT id, instance_name, deployment_path, status FROM download_tasks WHERE id = ?"
        )
        .bind(&task.id)
        .fetch_one(&pool)
        .await
        .expect("数据库应包含已创建的任务行");

        assert_eq!(row.0, task.id);
        assert_eq!(row.1, "db-persist");
        assert_eq!(row.2, "/data/persist");
        assert_eq!(row.3, "pending");
    }

    #[tokio::test]
    async fn mark_completed_persists_to_database() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool.clone());

        let task = mgr.create_task(make_task_create("db-complete", vec![DownloadItemType::Napcat])).await;
        mgr.mark_completed(&task.id, Some("inst_999".to_string())).await;

        let row: (String, Option<String>, f64) = sqlx::query_as(
            "SELECT status, instance_id, progress FROM download_tasks WHERE id = ?"
        )
        .bind(&task.id)
        .fetch_one(&pool)
        .await
        .expect("数据库应包含已完成的任务行");

        assert_eq!(row.0, "completed");
        assert_eq!(row.1, Some("inst_999".to_string()));
        assert_eq!(row.2, 100.0);
    }

    #[tokio::test]
    async fn mark_failed_persists_error_to_database() {
        let pool = setup_test_db().await;
        let mgr = DownloadManager::new(pool.clone());

        let task = mgr.create_task(make_task_create("db-fail", vec![DownloadItemType::Lpmm])).await;
        mgr.mark_failed(&task.id, "磁盘空间不足".to_string()).await;

        let row: (String, Option<String>) = sqlx::query_as(
            "SELECT status, error_message FROM download_tasks WHERE id = ?"
        )
        .bind(&task.id)
        .fetch_one(&pool)
        .await
        .expect("数据库应包含失败任务行");

        assert_eq!(row.0, "failed");
        assert_eq!(row.1, Some("磁盘空间不足".to_string()));
    }

    // ==================== copy_dir_recursive ====================

    #[test]
    fn copy_dir_recursive_copies_files_and_subdirs() {
        let tmp = tempfile::tempdir().expect("创建临时目录失败");
        let src = tmp.path().join("src");
        let dst = tmp.path().join("dst");
        std::fs::create_dir_all(src.join("sub")).unwrap();
        std::fs::write(src.join("a.txt"), "hello").unwrap();
        std::fs::write(src.join("sub/b.txt"), "world").unwrap();

        copy_dir_recursive(&src, &dst).unwrap();

        assert_eq!(std::fs::read_to_string(dst.join("a.txt")).unwrap(), "hello");
        assert_eq!(std::fs::read_to_string(dst.join("sub/b.txt")).unwrap(), "world");
    }

    #[test]
    fn copy_dir_recursive_skips_symlinks() {
        let tmp = tempfile::tempdir().expect("创建临时目录失败");
        let src = tmp.path().join("src");
        let dst = tmp.path().join("dst");
        std::fs::create_dir_all(&src).unwrap();
        std::fs::write(src.join("real.txt"), "content").unwrap();

        // 创建符号链接（文件级）
        #[cfg(unix)]
        std::os::unix::fs::symlink(src.join("real.txt"), src.join("link.txt")).unwrap();
        #[cfg(windows)]
        {
            // Windows 下创建符号链接可能需要权限，失败则跳过
            if std::os::windows::fs::symlink_file(src.join("real.txt"), src.join("link.txt")).is_err() {
                // 无权限创建符号链接，跳过本测试
                return;
            }
        }

        copy_dir_recursive(&src, &dst).unwrap();

        assert!(dst.join("real.txt").exists(), "普通文件应被复制");
        assert!(!dst.join("link.txt").exists(), "符号链接应被跳过");
    }
}

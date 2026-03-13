/// 前端日志管理服务
///
/// 处理前端日志的保存、查询、导出和清理。
/// 日志以 JSON Lines 格式存储在 mailauncher-data/data/Log/frontend/ 目录下。
use std::fs;
use std::io::Write;
use std::path::PathBuf;

use chrono::Local;
use tracing::info;

use crate::errors::{AppError, AppResult};
use crate::models::log::{LogEntry, LogFile};
use crate::utils::platform;

/// 获取前端日志目录
fn get_frontend_log_dir() -> PathBuf {
    let dir = platform::get_data_root()
        .join("data")
        .join("Log")
        .join("frontend");
    fs::create_dir_all(&dir).ok();
    dir
}

/// 获取当天日志文件路径
fn get_today_log_path() -> PathBuf {
    let date = Local::now().format("%Y%m%d").to_string();
    get_frontend_log_dir().join(format!("frontend_{}.jsonl", date))
}

/// 保存前端日志条目
pub fn save_frontend_logs(logs: Vec<LogEntry>) -> AppResult<()> {
    if logs.is_empty() {
        return Ok(());
    }

    let log_path = get_today_log_path();
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;

    for entry in &logs {
        if let Ok(json) = serde_json::to_string(entry) {
            writeln!(file, "{}", json)?;
        }
    }

    Ok(())
}

/// 获取前端日志文件列表
pub fn list_log_files() -> AppResult<Vec<LogFile>> {
    let log_dir = get_frontend_log_dir();
    let mut files = Vec::new();

    if !log_dir.exists() {
        return Ok(files);
    }

    for entry in fs::read_dir(&log_dir)? {
        let entry = entry?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // 只返回 .jsonl 和 .zip 文件
        if !name.ends_with(".jsonl") && !name.ends_with(".zip") {
            continue;
        }

        let metadata = fs::metadata(&path)?;
        let modified = metadata.modified()
            .map(|t| {
                let dt: chrono::DateTime<Local> = t.into();
                dt.format("%Y-%m-%d %H:%M:%S").to_string()
            })
            .unwrap_or_default();

        files.push(LogFile {
            name,
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            modified,
            compressed: path.extension().map(|e| e == "zip").unwrap_or(false),
        });
    }

    files.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(files)
}

/// 获取日志文件内容
pub fn get_log_content(file_path: &str) -> AppResult<String> {
    let path = PathBuf::from(file_path);

    // 安全检查：确保路径在日志目录下
    let log_dir = get_frontend_log_dir();
    if !path.starts_with(&log_dir) {
        return Err(AppError::InvalidInput("不允许访问日志目录之外的文件".into()));
    }

    if !path.exists() {
        return Err(AppError::NotFound(format!("日志文件不存在: {}", file_path)));
    }

    Ok(fs::read_to_string(&path)?)
}

/// 导出所有前端日志为 zip（返回 zip 文件的字节数据）
pub fn export_logs() -> AppResult<Vec<u8>> {
    let log_dir = get_frontend_log_dir();
    let mut buffer = Vec::new();

    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        if log_dir.exists() {
            for entry in fs::read_dir(&log_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_file() {
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let content = fs::read(&path)?;
                    zip.start_file(&name, options)
                        .map_err(|e| AppError::Internal(format!("创建 zip 条目失败: {}", e)))?;
                    zip.write_all(&content)?;
                }
            }
        }

        zip.finish()
            .map_err(|e| AppError::Internal(format!("完成 zip 文件失败: {}", e)))?;
    }

    info!("[日志] 导出日志 zip，大小: {} 字节", buffer.len());
    Ok(buffer)
}

/// 清除所有前端日志
pub fn clear_logs() -> AppResult<()> {
    let log_dir = get_frontend_log_dir();

    if log_dir.exists() {
        for entry in fs::read_dir(&log_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                fs::remove_file(&path)?;
            }
        }
    }

    info!("[日志] 已清除所有前端日志");
    Ok(())
}

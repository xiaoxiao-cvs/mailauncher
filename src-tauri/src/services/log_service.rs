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
    // 顺带检查跨天压缩:开销仅一次目录扫描(日志文件通常个位数),压缩失败不应阻断本次日志落盘。
    if let Err(e) = compress_stale_logs() {
        tracing::warn!("[日志] 压缩历史前端日志失败: {}", e);
    }

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

/// 压缩包保留上限;超出时删除最旧的压缩包。
const RETAIN_ZIP_COUNT: usize = 7;

/// 压缩非当天的前端日志 jsonl,并清理超出保留数量的旧压缩包。
///
/// 每个日志文件固定命名 `frontend_YYYYMMDD.jsonl`,日期非今天即视为"昨日及更早"。
/// 压缩后原 jsonl 立即删除,避免日志无限堆积;已压缩过(仅剩 .zip)的日期再次调用时会因
/// 找不到同名 jsonl 而自然跳过,天然幂等,不需要额外的"是否已跑过"状态。
pub fn compress_stale_logs() -> AppResult<()> {
    compress_stale_logs_in(&get_frontend_log_dir())
}

fn compress_stale_logs_in(log_dir: &std::path::Path) -> AppResult<()> {
    if !log_dir.exists() {
        return Ok(());
    }

    let today = Local::now().format("%Y%m%d").to_string();

    for entry in fs::read_dir(log_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let Some(date_part) = name
            .strip_prefix("frontend_")
            .and_then(|s| s.strip_suffix(".jsonl"))
        else {
            continue;
        };
        if date_part == today {
            continue;
        }

        let zip_path = log_dir.join(format!("frontend_{}.zip", date_part));
        let content = fs::read(&path)?;
        let mut buffer = Vec::new();
        {
            let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file(&name, options)
                .map_err(|e| AppError::Internal(format!("创建 zip 条目失败: {}", e)))?;
            zip.write_all(&content)?;
            zip.finish()
                .map_err(|e| AppError::Internal(format!("完成 zip 文件失败: {}", e)))?;
        }
        fs::write(&zip_path, &buffer)?;
        fs::remove_file(&path)?;
        info!(
            "[日志] 已压缩历史前端日志: {} -> {}",
            name,
            zip_path.display()
        );
    }

    // 清理超出保留数量的旧压缩包(按修改时间从旧到新排序,删除最旧的)
    let mut zips: Vec<(std::time::SystemTime, PathBuf)> = fs::read_dir(log_dir)?
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "zip").unwrap_or(false))
        .filter_map(|p| {
            fs::metadata(&p)
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| (t, p))
        })
        .collect();
    zips.sort_by_key(|(t, _)| *t);
    if zips.len() > RETAIN_ZIP_COUNT {
        for (_, path) in zips.iter().take(zips.len() - RETAIN_ZIP_COUNT) {
            fs::remove_file(path)?;
            info!("[日志] 已清理超出保留数量的旧日志压缩包: {}", path.display());
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

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // 只返回 .jsonl 和 .zip 文件
        if !name.ends_with(".jsonl") && !name.ends_with(".zip") {
            continue;
        }

        let metadata = fs::metadata(&path)?;
        let modified = metadata
            .modified()
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
        return Err(AppError::InvalidInput(
            "不允许访问日志目录之外的文件".into(),
        ));
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
                    let name = path
                        .file_name()
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

#[cfg(test)]
mod tests {
    use super::*;

    /// 昨日 jsonl 应被压成同名 zip 并删除原文件;今日 jsonl 保持不动。
    #[test]
    fn compress_stale_logs_zips_yesterday_keeps_today() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let dir = tmp.path();

        let today = Local::now().format("%Y%m%d").to_string();
        let yesterday = (Local::now() - chrono::Duration::days(1))
            .format("%Y%m%d")
            .to_string();

        let today_path = dir.join(format!("frontend_{}.jsonl", today));
        let yesterday_path = dir.join(format!("frontend_{}.jsonl", yesterday));
        fs::write(&today_path, b"{\"level\":\"info\"}\n").unwrap();
        fs::write(&yesterday_path, b"{\"level\":\"warn\"}\n").unwrap();

        compress_stale_logs_in(dir).expect("压缩失败");

        assert!(today_path.exists(), "今日日志不应被压缩");
        assert!(!yesterday_path.exists(), "昨日日志原文件应被删除");
        let zip_path = dir.join(format!("frontend_{}.zip", yesterday));
        assert!(zip_path.exists(), "昨日日志应生成对应 zip");

        // zip 内容应与原 jsonl 一致
        let zip_bytes = fs::read(&zip_path).unwrap();
        let mut archive = zip::ZipArchive::new(std::io::Cursor::new(zip_bytes)).unwrap();
        let mut inner = archive
            .by_name(&format!("frontend_{}.jsonl", yesterday))
            .expect("zip 内应含原文件名条目");
        let mut content = String::new();
        std::io::Read::read_to_string(&mut inner, &mut content).unwrap();
        assert_eq!(content, "{\"level\":\"warn\"}\n");
    }

    /// 已压缩过的日期(仅剩 zip,无同名 jsonl)再次调用应自然跳过,不报错、不重复处理。
    #[test]
    fn compress_stale_logs_is_idempotent_when_already_compressed() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let dir = tmp.path();
        let yesterday = (Local::now() - chrono::Duration::days(1))
            .format("%Y%m%d")
            .to_string();
        let zip_path = dir.join(format!("frontend_{}.zip", yesterday));
        fs::write(&zip_path, b"already-a-zip").unwrap();

        compress_stale_logs_in(dir).expect("压缩失败");

        // 无对应 jsonl,压缩逻辑不应触碰已存在的 zip
        assert_eq!(fs::read(&zip_path).unwrap(), b"already-a-zip");
    }

    /// 压缩包数量超出保留上限时,应删除最旧的、只留最近 RETAIN_ZIP_COUNT 个。
    #[test]
    fn compress_stale_logs_prunes_zips_beyond_retain_count() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let dir = tmp.path();

        // 制造 RETAIN_ZIP_COUNT + 3 个 zip,修改时间递增(越晚创建越新)
        let total = RETAIN_ZIP_COUNT + 3;
        let mut paths = Vec::new();
        for i in 0..total {
            let path = dir.join(format!("frontend_2020010{}.zip", i));
            fs::write(&path, b"z").unwrap();
            let mtime = std::time::SystemTime::UNIX_EPOCH
                + std::time::Duration::from_secs(1_000_000 + i as u64 * 10);
            filetime_set(&path, mtime);
            paths.push(path);
        }

        compress_stale_logs_in(dir).expect("压缩失败");

        let remaining: usize = fs::read_dir(dir)
            .unwrap()
            .flatten()
            .filter(|e| e.path().extension().map(|x| x == "zip").unwrap_or(false))
            .count();
        assert_eq!(remaining, RETAIN_ZIP_COUNT, "应只保留最近 N 个压缩包");

        // 最旧的 3 个应被删除,最新的 RETAIN_ZIP_COUNT 个应保留
        for (i, path) in paths.iter().enumerate() {
            if i < total - RETAIN_ZIP_COUNT {
                assert!(!path.exists(), "过旧的压缩包应被清理: {:?}", path);
            } else {
                assert!(path.exists(), "较新的压缩包应保留: {:?}", path);
            }
        }
    }

    /// 无第三方 crate 可直接设置 mtime,这里用 std 提供的 set_file_times 的等价手段:
    /// 通过写文件再 sleep 不现实(慢且脆),故直接用 filetime 语义的系统调用封装。
    /// Windows/Unix 上 std::fs::File::set_modified 均可用(stable since 1.75)。
    fn filetime_set(path: &std::path::Path, time: std::time::SystemTime) {
        let file = fs::OpenOptions::new().write(true).open(path).unwrap();
        file.set_modified(time).unwrap();
    }
}

//! 麦麦(MaiBot)结构化日志读取
//!
//! MaiBot 的 logger 把每条日志以 JSON 行写入 `<instance>/MaiBot/logs/app_*.log.jsonl`
//! (UTF-8,字段 `timestamp` / `level` / `logger_name` / `event`)。相比解析带 ANSI 的 PTY 终端流,
//! 直接读这个结构化文件干净得多——本模块据"游标(文件名 + 已读字节偏移)"做增量读取,前端轮询即得新日志。
//! PTY 仍保留(优雅停止靠它写 \x03),但 MaiBot 的日志**展示**走这里。
//! 注:此文件只含 logger 输出(不含开机 print 横幅),正合我们要的"干净结构化日志"。

use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::errors::{AppError, AppResult};

/// 一条结构化日志(给前端)。
#[derive(Debug, Clone, Serialize)]
pub struct MaibotLogRecord {
    pub ts: String,
    pub level: String,
    pub module: String,
    pub message: String,
}

/// 增量读取游标:来源文件名 + 已读到的字节偏移。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MaibotLogCursor {
    pub file: String,
    pub offset: u64,
}

/// 一次读取的结果:新日志 + 推进后的游标。
#[derive(Debug, Serialize)]
pub struct MaibotLogChunk {
    pub records: Vec<MaibotLogRecord>,
    pub cursor: MaibotLogCursor,
}

/// 麦麦历史日志文件信息(供前端历史日志选择器列出可选文件)。
#[derive(Debug, Clone, Serialize)]
pub struct MaibotLogFileInfo {
    pub name: String,
    pub size: u64,
    pub modified: String,
}

/// 找 `<instance>/MaiBot/logs/` 下按 mtime 最新的 `app_*.log.jsonl`。
fn latest_log_file(instance_root: &Path) -> Option<PathBuf> {
    let dir = instance_root.join("MaiBot").join("logs");
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in std::fs::read_dir(&dir).ok()?.flatten() {
        let path = entry.path();
        let is_log = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("app_") && n.ends_with(".log.jsonl"));
        if !is_log {
            continue;
        }
        let Ok(mtime) = entry.metadata().and_then(|m| m.modified()) else {
            continue;
        };
        if best.as_ref().map_or(true, |(t, _)| mtime > *t) {
            best = Some((mtime, path));
        }
    }
    best.map(|(_, p)| p)
}

/// 解析一行 jsonl → 记录;非 JSON / 缺 event 字段 → None。
fn parse_line(line: &str) -> Option<MaibotLogRecord> {
    let v: serde_json::Value = serde_json::from_str(line.trim()).ok()?;
    let message = v.get("event")?.as_str()?.to_string();
    let level = v
        .get("level")
        .and_then(|x| x.as_str())
        .unwrap_or("info")
        .to_string();
    let module = v
        .get("logger_name")
        .and_then(|x| x.as_str())
        .or_else(|| v.get("module").and_then(|x| x.as_str()))
        .unwrap_or("")
        .to_string();
    let ts = v
        .get("timestamp")
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    Some(MaibotLogRecord {
        ts,
        level,
        module,
        message,
    })
}

/// 增量读取麦麦结构化日志。
///
/// - 首次(`cursor` 为空或指向旧文件):读最新文件,只返回末尾 `tail_limit` 条;
/// - 续读(游标命中当前文件):从 `offset` 读到 EOF 的新完整行(seek,不重读整文件);
/// - 文件轮转(出现更新的 `app_*.jsonl`):游标文件名不匹配 → 按首次处理读新文件尾部。
///   末尾未带换行的半行不消费,留待下次轮询。日志文件尚未出现(未启动)时返回空。
pub fn read_logs(
    instance_root: &Path,
    cursor: Option<MaibotLogCursor>,
    tail_limit: usize,
) -> AppResult<MaibotLogChunk> {
    let Some(file) = latest_log_file(instance_root) else {
        return Ok(MaibotLogChunk {
            records: Vec::new(),
            cursor: cursor.unwrap_or_default(),
        });
    };
    let file_name = file
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or_default()
        .to_string();

    let mut f = std::fs::File::open(&file)?;
    let size = f.metadata()?.len();

    let same_file = cursor
        .as_ref()
        .is_some_and(|c| c.file == file_name && c.offset <= size);
    let start = if same_file {
        cursor.as_ref().map(|c| c.offset).unwrap_or(0)
    } else {
        0
    };

    f.seek(SeekFrom::Start(start))?;
    let mut region = Vec::new();
    f.read_to_end(&mut region)?;

    // 只消费到最后一个换行(完整行);半行留到下次
    let (complete, consumed) = match region.iter().rposition(|&b| b == b'\n') {
        Some(pos) => (&region[..=pos], pos as u64 + 1),
        None => (&region[..0], 0u64),
    };

    let text = String::from_utf8_lossy(complete);
    let mut records: Vec<MaibotLogRecord> = text.lines().filter_map(parse_line).collect();
    // 首次只保留尾部 tail_limit 条,避免一次性吐整文件
    if !same_file && records.len() > tail_limit {
        records.drain(..records.len() - tail_limit);
    }

    Ok(MaibotLogChunk {
        records,
        cursor: MaibotLogCursor {
            file: file_name,
            offset: start + consumed,
        },
    })
}

/// 列出 `<instance>/MaiBot/logs/` 下全部 `app_*.log.jsonl` 历史轮转文件,按修改时间倒序
/// (最新在前,含正在写入的最新文件),供前端历史日志选择器展示。
pub fn list_log_files(instance_root: &Path) -> AppResult<Vec<MaibotLogFileInfo>> {
    let dir = instance_root.join("MaiBot").join("logs");
    let mut files = Vec::new();
    if !dir.exists() {
        return Ok(files);
    }

    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        let is_log = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("app_") && n.ends_with(".log.jsonl"));
        if !is_log {
            continue;
        }
        let metadata = entry.metadata()?;
        let modified = metadata
            .modified()
            .map(|t| {
                let dt: chrono::DateTime<chrono::Local> = t.into();
                dt.format("%Y-%m-%d %H:%M:%S").to_string()
            })
            .unwrap_or_default();
        files.push(MaibotLogFileInfo {
            name: path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string(),
            size: metadata.len(),
            modified,
        });
    }

    files.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(files)
}

/// 一次性读取某个历史日志文件的全部(或末尾 `tail_limit` 条)记录。
///
/// 非增量(与 `read_logs` 的游标增量语义不同),供前端"选中历史文件 -> 整份加载 -> 本地检索"的
/// 场景使用。`file_name` 必须是 `list_log_files` 返回的裸文件名,拒绝任何路径分隔符/`..`,
/// 防止越权访问日志目录之外的文件。
pub fn read_log_file(
    instance_root: &Path,
    file_name: &str,
    tail_limit: Option<usize>,
) -> AppResult<Vec<MaibotLogRecord>> {
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err(AppError::InvalidInput("非法的日志文件名".into()));
    }

    let path = instance_root.join("MaiBot").join("logs").join(file_name);
    if !path.exists() {
        return Err(AppError::NotFound(format!(
            "日志文件不存在: {}",
            file_name
        )));
    }

    let content = std::fs::read_to_string(&path)?;
    let mut records: Vec<MaibotLogRecord> = content.lines().filter_map(parse_line).collect();
    if let Some(limit) = tail_limit {
        if records.len() > limit {
            records.drain(..records.len() - limit);
        }
    }
    Ok(records)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_log(dir: &Path, name: &str, lines: &[&str]) {
        std::fs::write(dir.join(name), lines.join("\n") + "\n").unwrap();
    }

    #[test]
    fn list_log_files_returns_only_app_jsonl_sorted_by_mtime_desc() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let logs_dir = tmp.path().join("MaiBot").join("logs");
        std::fs::create_dir_all(&logs_dir).unwrap();

        write_log(&logs_dir, "app_20260601.log.jsonl", &["{\"event\":\"a\"}"]);
        // 睡眠不现实,直接用 set_modified 精确控制排序,避免测试跑太快导致 mtime 相同。
        let f1 = logs_dir.join("app_20260601.log.jsonl");
        std::fs::File::options()
            .write(true)
            .open(&f1)
            .unwrap()
            .set_modified(std::time::SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(100))
            .unwrap();

        write_log(&logs_dir, "app_20260602.log.jsonl", &["{\"event\":\"b\"}"]);
        let f2 = logs_dir.join("app_20260602.log.jsonl");
        std::fs::File::options()
            .write(true)
            .open(&f2)
            .unwrap()
            .set_modified(std::time::SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(200))
            .unwrap();

        // 非日志文件应被忽略
        std::fs::write(logs_dir.join("other.txt"), b"noise").unwrap();

        let files = list_log_files(tmp.path()).expect("列出失败");
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].name, "app_20260602.log.jsonl", "最新的应排第一");
        assert_eq!(files[1].name, "app_20260601.log.jsonl");
    }

    #[test]
    fn list_log_files_returns_empty_when_dir_missing() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let files = list_log_files(tmp.path()).expect("目录缺失不应报错");
        assert!(files.is_empty());
    }

    #[test]
    fn read_log_file_parses_all_records_when_no_limit() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let logs_dir = tmp.path().join("MaiBot").join("logs");
        std::fs::create_dir_all(&logs_dir).unwrap();
        write_log(
            &logs_dir,
            "app_20260601.log.jsonl",
            &[
                r#"{"timestamp":"2026-06-01T00:00:00","level":"info","logger_name":"core","event":"启动"}"#,
                r#"{"timestamp":"2026-06-01T00:00:01","level":"error","logger_name":"core","event":"崩溃"}"#,
            ],
        );

        let records = read_log_file(tmp.path(), "app_20260601.log.jsonl", None).expect("读取失败");
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].message, "启动");
        assert_eq!(records[1].level, "error");
    }

    #[test]
    fn read_log_file_respects_tail_limit() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let logs_dir = tmp.path().join("MaiBot").join("logs");
        std::fs::create_dir_all(&logs_dir).unwrap();
        let lines: Vec<String> = (0..10)
            .map(|i| format!(r#"{{"level":"info","event":"line{}"}}"#, i))
            .collect();
        let refs: Vec<&str> = lines.iter().map(|s| s.as_str()).collect();
        write_log(&logs_dir, "app_20260601.log.jsonl", &refs);

        let records =
            read_log_file(tmp.path(), "app_20260601.log.jsonl", Some(3)).expect("读取失败");
        assert_eq!(records.len(), 3);
        assert_eq!(records[0].message, "line7");
        assert_eq!(records[2].message, "line9");
    }

    #[test]
    fn read_log_file_rejects_path_traversal() {
        let tmp = tempfile::tempdir().expect("临时目录");
        let err = read_log_file(tmp.path(), "../../etc/passwd", None).unwrap_err();
        assert!(matches!(err, AppError::InvalidInput(_)));
    }

    #[test]
    fn read_log_file_rejects_missing_file() {
        let tmp = tempfile::tempdir().expect("临时目录");
        std::fs::create_dir_all(tmp.path().join("MaiBot").join("logs")).unwrap();
        let err = read_log_file(tmp.path(), "app_missing.log.jsonl", None).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}

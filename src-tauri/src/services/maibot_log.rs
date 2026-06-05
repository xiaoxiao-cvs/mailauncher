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

use crate::errors::AppResult;

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

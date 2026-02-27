/// 日志文件数据模型
use serde::{Deserialize, Serialize};

/// 日志文件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: String,
    pub compressed: bool,
}

/// 前端发送的日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub tag: Option<String>,
    pub message: String,
    pub args: Option<serde_json::Value>,
    pub error: Option<LogEntryError>,
}

/// 日志中的错误信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntryError {
    pub message: String,
    pub stack: Option<String>,
    pub name: Option<String>,
}

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

/// 跨实例聚合的单条日志记录(首页"全局日志墙"供数)。
///
/// 在 MaiBot 结构化日志(MaibotLogRecord:ts/level/module/message)基础上,补上来源实例的
/// id/name,使前端可在一面墙上区分多实例日志。字段采用 snake_case(前端按 snake_case 读)。
#[derive(Debug, Clone, Serialize)]
pub struct AggregatedLogRecord {
    pub instance_id: String,
    pub instance_name: String,
    pub ts: String,
    pub level: String,
    pub module: String,
    pub message: String,
}

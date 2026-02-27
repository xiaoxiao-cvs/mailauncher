/// 消息队列数据模型
///
/// 对应 Python 的 message_queue 相关类型。
/// Phase 1 中仅提供基础结构，实际 WebSocket 监听将在后续阶段实现。
use serde::{Deserialize, Serialize};

/// 消息状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum MessageStatus {
    Pending,
    Planning,
    Generating,
    Sending,
    Sent,
    Failed,
}

/// 消息队列项
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageQueueItem {
    pub id: String,
    pub stream_id: String,
    pub group_name: Option<String>,
    pub status: String,
    pub cycle_count: i64,
    pub retry_count: i64,
    pub retry_reason: Option<String>,
    pub action_type: Option<String>,
    pub start_time: f64,
    pub sent_time: Option<f64>,
    pub message_preview: Option<String>,
}

/// 消息队列响应
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageQueueResponse {
    pub instance_id: String,
    pub instance_name: String,
    pub connected: bool,
    pub messages: Vec<MessageQueueItem>,
    pub total_processed: i64,
    pub error: Option<String>,
}

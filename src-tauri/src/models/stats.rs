/// 统计数据模型
///
/// 对应 Python 的 stats 相关类型，用于查询 MaiBot 实例的 LLM 使用统计。
use serde::{Deserialize, Serialize};

/// 统计摘要
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub total_requests: i64,
    pub total_cost: f64,
    pub total_tokens: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub online_time: f64,
    pub total_messages: i64,
    pub total_replies: i64,
    pub avg_response_time: f64,
    pub cost_per_hour: f64,
    pub tokens_per_hour: f64,
}

/// 模型使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStats {
    pub model_name: String,
    pub display_name: Option<String>,
    pub request_count: i64,
    pub total_tokens: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_cost: f64,
    pub avg_response_time: f64,
}

/// 请求类型统计
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestTypeStats {
    pub request_type: String,
    pub request_count: i64,
    pub total_tokens: i64,
    pub total_cost: f64,
}

/// 单实例统计
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceStats {
    pub instance_id: String,
    pub instance_name: String,
    pub time_range: String,
    pub query_time: String,
    pub summary: StatsSummary,
    pub model_stats: Vec<ModelStats>,
    pub request_type_stats: Vec<RequestTypeStats>,
}

/// 统计概览（首页）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsOverview {
    pub total_instances: i64,
    pub running_instances: i64,
    pub time_range: String,
    pub query_time: String,
    pub summary: StatsSummary,
    pub top_models: Vec<ModelStats>,
}

/// 聚合统计
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedStats {
    pub instance_count: i64,
    pub time_range: String,
    pub query_time: String,
    pub summary: StatsSummary,
    pub by_instance: Vec<InstanceStats>,
    pub model_stats: Vec<ModelStats>,
}

/// 实例模型统计响应
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceModelStatsResponse {
    pub instance_id: String,
    pub time_range: String,
    pub models: Vec<ModelStats>,
}

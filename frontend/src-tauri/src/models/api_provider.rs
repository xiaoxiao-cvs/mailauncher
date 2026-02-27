/// API 供应商与模型数据模型
///
/// 对应 Python 的 ApiProvider、ApiModel 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// AI 模型供应商配置（对应 api_providers 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApiProvider {
    pub id: i64,
    /// 供应商名称
    pub name: String,
    /// API 端点 URL
    pub base_url: String,
    /// API Key（加密存储）
    pub api_key: String,
    /// 是否启用
    pub is_enabled: bool,
    /// 优先级（数字越小优先级越高）
    pub priority: i32,
    /// 账户余额
    pub balance: Option<String>,
    /// 余额更新时间
    pub balance_updated_at: Option<NaiveDateTime>,
    /// 模型列表更新时间
    pub models_updated_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

/// AI 模型缓存（对应 api_models 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApiModel {
    pub id: i64,
    /// 关联的供应商 ID
    pub provider_id: i64,
    /// 模型 ID（如 gpt-4o、claude-3-sonnet）
    pub model_id: String,
    /// 模型显示名称
    pub model_name: Option<String>,
    /// 模型所有者
    pub owned_by: Option<String>,
    /// 模型创建时间戳
    pub created: Option<i64>,
    /// 是否支持视觉
    pub supports_vision: bool,
    /// 是否支持函数调用
    pub supports_function_calling: bool,
    /// 上下文长度
    pub context_length: Option<i64>,
    /// 最大输出 tokens
    pub max_output_tokens: Option<i64>,
    /// 输入价格（每百万 tokens）
    pub input_price: Option<String>,
    /// 输出价格（每百万 tokens）
    pub output_price: Option<String>,
    pub updated_at: NaiveDateTime,
}

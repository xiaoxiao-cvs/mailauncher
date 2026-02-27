/// 实例数据模型
///
/// 对应 Python 的 InstanceDB 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 机器人实例（对应 instances 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Instance {
    /// 实例唯一标识符
    pub id: String,
    /// 实例名称
    pub name: String,
    /// 实例目录路径（相对于 instances_dir）
    pub instance_path: Option<String>,
    /// 机器人类型（maibot / napcat / other）
    pub bot_type: String,
    /// 机器人版本
    pub bot_version: Option<String>,
    /// 实例描述
    pub description: Option<String>,
    /// 实例状态（stopped / running / error 等）
    pub status: String,
    /// Python 路径
    pub python_path: Option<String>,
    /// 配置文件路径
    pub config_path: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    /// 最后运行时间
    pub last_run: Option<NaiveDateTime>,
    /// 总运行时间（秒）
    pub run_time: i64,
    /// QQ 账号（NapCat 快速登录）
    pub qq_account: Option<String>,
}

/// 创建实例请求参数
#[derive(Debug, Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub bot_type: String,
    pub description: Option<String>,
    pub python_path: Option<String>,
}

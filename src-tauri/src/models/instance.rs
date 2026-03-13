/// 实例数据模型
///
/// 对应 Python 的 InstanceDB 表，以及前端 instanceApi.ts 中的接口定义。
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
    /// CPU 使用率（运行时由进程管理器填充，不存储于数据库）
    #[sqlx(skip)]
    pub cpu_usage: Option<f64>,
    /// 内存使用量 MB（运行时由进程管理器填充，不存储于数据库）
    #[sqlx(skip)]
    pub memory_usage: Option<f64>,
}

/// 创建实例请求参数（对应前端 InstanceCreate 接口）
#[derive(Debug, Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub bot_type: Option<String>,
    pub bot_version: Option<String>,
    pub description: Option<String>,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
}

/// 更新实例请求参数（对应前端 InstanceUpdate 接口，全部字段可选）
#[derive(Debug, Deserialize)]
pub struct UpdateInstanceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
    pub qq_account: Option<String>,
}

/// 实例列表响应（对应前端 InstanceList 接口）
#[derive(Debug, Serialize)]
pub struct InstanceList {
    pub total: usize,
    pub instances: Vec<Instance>,
}

/// 实例运行状态响应（对应前端 InstanceStatusResponse 接口）
#[derive(Debug, Serialize)]
pub struct InstanceStatusResponse {
    pub id: String,
    pub status: String,
    pub pid: Option<u32>,
    pub uptime: Option<f64>,
}

/// 组件运行状态（对应前端 ComponentStatus 接口）
#[derive(Debug, Serialize)]
pub struct ComponentStatus {
    pub component: String,
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime: Option<f64>,
}

/// 通用成功响应（对应前端 SuccessResponse 接口）
#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: String,
}

impl SuccessResponse {
    pub fn ok(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
        }
    }
}

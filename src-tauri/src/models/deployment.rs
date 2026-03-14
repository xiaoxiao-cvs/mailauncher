/// 部署数据模型
///
/// 对应 Python 的 DeploymentDB、DeploymentLogDB 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 部署任务（对应 deployments 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct Deployment {
    /// 部署任务唯一标识符
    pub id: String,
    /// 目标实例 ID
    pub instance_id: String,
    /// 部署类型（mods / resourcepack 等）
    pub deployment_type: String,
    /// 部署描述
    pub description: Option<String>,
    /// 部署状态（pending / running / completed / failed）
    pub status: String,
    /// 部署进度百分比
    pub progress: i32,
    pub created_at: NaiveDateTime,
    /// 开始时间
    pub started_at: Option<NaiveDateTime>,
    /// 完成时间
    pub completed_at: Option<NaiveDateTime>,
    /// 错误信息
    pub error_message: Option<String>,
}

/// 部署日志（对应 deployment_logs 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct DeploymentLog {
    pub id: i64,
    /// 关联的部署任务 ID
    pub deployment_id: String,
    /// 日志时间
    pub timestamp: NaiveDateTime,
    /// 日志级别（INFO / WARNING / ERROR）
    pub level: String,
    /// 日志消息
    pub message: String,
}

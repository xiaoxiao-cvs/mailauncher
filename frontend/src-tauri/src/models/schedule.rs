/// 计划任务数据模型
///
/// 对应 Python 的 ScheduleTaskDB 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 计划任务（对应 schedule_tasks 表）
///
/// `schedule_config` 在 SQLite 中存储为 JSON 字符串，
/// 通过 serde_json::Value 映射，前端可直接使用。
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScheduleTask {
    /// 任务唯一标识符（task_xxxxx）
    pub id: String,
    /// 关联的实例 ID
    pub instance_id: String,
    /// 任务名称
    pub name: String,
    /// 执行动作: start / stop / restart
    pub action: String,
    /// 调度类型: once / daily / weekly / monitor
    pub schedule_type: String,
    /// 调度配置（JSON 格式字符串）
    pub schedule_config: String,
    /// 是否启用
    pub enabled: bool,
    /// 最后执行时间
    pub last_run: Option<NaiveDateTime>,
    /// 下次执行时间
    pub next_run: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

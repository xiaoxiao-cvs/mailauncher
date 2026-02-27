/// 版本管理数据模型
///
/// 对应 Python 的 ComponentVersionDB、VersionBackupDB、UpdateHistoryDB 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 组件版本记录（对应 component_versions 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ComponentVersion {
    pub id: i64,
    /// 关联的实例 ID
    pub instance_id: String,
    /// 组件名称（main / napcat / napcat-ada）
    pub component: String,
    /// 版本号或标签
    pub version: Option<String>,
    /// Git commit hash
    pub commit_hash: Option<String>,
    /// 安装方式（release / git / manual）
    pub install_method: String,
    pub installed_at: NaiveDateTime,
}

/// 版本备份记录（对应 version_backups 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct VersionBackup {
    /// 备份唯一标识符
    pub id: String,
    /// 关联的实例 ID
    pub instance_id: String,
    /// 备份的组件
    pub component: String,
    /// 备份时的版本
    pub version: Option<String>,
    /// 备份时的 commit hash
    pub commit_hash: Option<String>,
    /// 备份文件存储路径
    pub backup_path: String,
    /// 备份大小（字节）
    pub backup_size: i64,
    pub created_at: NaiveDateTime,
    /// 备份描述
    pub description: Option<String>,
}

/// 更新历史记录（对应 update_history 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UpdateHistory {
    pub id: i64,
    /// 关联的实例 ID
    pub instance_id: String,
    /// 组件名称
    pub component: String,
    /// 更新前版本
    pub from_version: Option<String>,
    /// 更新后版本
    pub to_version: Option<String>,
    /// 更新前 commit
    pub from_commit: Option<String>,
    /// 更新后 commit
    pub to_commit: Option<String>,
    /// 状态（success / failed / rollback）
    pub status: String,
    /// 关联备份 ID
    pub backup_id: Option<String>,
    /// 错误信息
    pub error_message: Option<String>,
    pub updated_at: NaiveDateTime,
}

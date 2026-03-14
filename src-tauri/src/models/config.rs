/// 配置相关数据模型
///
/// 对应 Python 的 LauncherConfig、PythonEnvironment、MAIBotConfig、PathConfig 表
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 启动器全局配置（对应 launcher_config 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LauncherConfig {
    pub id: i64,
    /// 配置键
    pub key: String,
    /// 配置值
    pub value: Option<String>,
    /// 配置描述
    pub description: Option<String>,
    pub updated_at: NaiveDateTime,
}

/// Python 环境配置（对应 python_environments 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PythonEnvironment {
    pub id: i64,
    /// Python 可执行文件路径
    pub path: String,
    /// 版本字符串（如 "3.11.5"）
    pub version: String,
    /// 主版本号
    pub major: i32,
    /// 次版本号
    pub minor: i32,
    /// 微版本号
    pub micro: i32,
    /// 是否为系统默认 Python
    pub is_default: bool,
    /// 是否为用户选择的 Python
    pub is_selected: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

/// MAIBot 配置（对应 maibot_config 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct MaibotConfig {
    pub id: i64,
    /// MAIBot 安装路径
    pub maibot_path: Option<String>,
    /// MAIBot 配置文件路径
    pub config_path: Option<String>,
    /// MAIBot 数据目录
    pub data_path: Option<String>,
    /// 关联的 Python 环境 ID
    pub python_env_id: Option<i64>,
    /// 是否已安装
    pub is_installed: bool,
    /// MAIBot 版本
    pub version: Option<String>,
    pub updated_at: NaiveDateTime,
}

/// 路径配置（对应 path_config 表）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PathConfig {
    pub id: i64,
    /// 路径名称（如 "git"、"java"、"instances_dir"）
    pub name: String,
    /// 路径值
    pub path: String,
    /// 路径类型: "executable" 或 "directory"
    pub path_type: String,
    /// 是否已验证
    pub is_verified: bool,
    /// 路径描述
    pub description: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

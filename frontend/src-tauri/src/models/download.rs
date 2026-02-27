/// 下载任务数据模型
///
/// 下载任务为内存态，不持久化到数据库。
/// 通过 Tauri 事件向前端推送进度和日志。
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

// ==================== 枚举类型 ====================

/// 下载组件类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DownloadItemType {
    /// MaiBot 本体
    Maibot,
    /// NapCat QQ 框架
    Napcat,
    /// MaiBot-Napcat 适配器
    #[serde(rename = "napcat-adapter")]
    NapcatAdapter,
    /// LPMM (仅 macOS)
    Lpmm,
}

/// MaiBot 版本来源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MaibotVersionSource {
    /// 最新提交
    Latest,
    /// 指定 Tag
    Tag,
    /// 指定分支
    Branch,
}

/// 下载任务状态
///
/// 与 Python DownloadStatus 枚举一致，覆盖完整安装流程
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    /// 等待中
    Pending,
    /// 下载中
    Downloading,
    /// 安装依赖中
    Installing,
    /// 配置中
    Configuring,
    /// 已完成
    Completed,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
}

// ==================== 下载进度 ====================

/// 下载进度事件（通过 Tauri 事件推送给前端）
#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    /// 任务 ID
    pub task_id: String,
    /// 当前状态
    pub status: DownloadStatus,
    /// 已下载字节数
    pub downloaded: u64,
    /// 总字节数（可能未知）
    pub total: Option<u64>,
    /// 下载速度（字节/秒）
    pub speed: u64,
    /// 进度百分比 (0-100)
    pub progress: f64,
    /// 当前步骤描述
    pub message: Option<String>,
    /// 错误信息
    pub error: Option<String>,
}

// ==================== 下载任务 ====================

/// 创建下载任务请求
///
/// 对应 Python `DownloadTaskCreate`，前端表单提交时使用
#[derive(Debug, Clone, Deserialize)]
pub struct DownloadTaskCreate {
    /// 实例名称
    pub instance_name: String,
    /// 部署路径（相对于 deployments 目录）
    pub deployment_path: Option<String>,
    /// MaiBot 版本来源
    pub maibot_version_source: Option<MaibotVersionSource>,
    /// MaiBot 版本值（tag 名或 branch 名）
    pub maibot_version_value: Option<String>,
    /// 选择的组件列表
    pub selected_items: Vec<DownloadItemType>,
    /// Python 解释器路径
    pub python_path: Option<String>,
}

/// 下载任务详情
///
/// 内存中维护的任务状态，对应 Python `DownloadTask`
#[derive(Debug, Clone, Serialize)]
pub struct DownloadTask {
    /// 任务 ID（格式: download_xxxxxxxxxxxx）
    pub id: String,
    /// 实例名称
    pub instance_name: String,
    /// 部署路径
    pub deployment_path: String,
    /// MaiBot 版本来源
    pub maibot_version_source: Option<MaibotVersionSource>,
    /// MaiBot 版本值
    pub maibot_version_value: Option<String>,
    /// 选择的组件列表
    pub selected_items: Vec<DownloadItemType>,
    /// Python 路径
    pub python_path: Option<String>,
    /// 任务状态
    pub status: DownloadStatus,
    /// 当前进度
    pub progress: DownloadProgress,
    /// 创建时间
    pub created_at: NaiveDateTime,
    /// 开始时间
    pub started_at: Option<NaiveDateTime>,
    /// 完成时间
    pub completed_at: Option<NaiveDateTime>,
    /// 错误信息
    pub error_message: Option<String>,
    /// 创建的实例 ID（任务完成后填入）
    pub instance_id: Option<String>,
    /// 任务日志
    pub logs: Vec<String>,
}

// ==================== 版本查询响应 ====================

/// MaiBot 版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct MaibotVersion {
    /// 版本来源类型
    pub source: MaibotVersionSource,
    /// 版本值
    pub value: String,
    /// 显示标签
    pub label: String,
}

/// 可用版本列表响应
#[derive(Debug, Clone, Serialize)]
pub struct VersionsResponse {
    /// Git Tags
    pub tags: Vec<String>,
    /// Git Branches
    pub branches: Vec<String>,
}

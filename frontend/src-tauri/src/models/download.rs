/// 下载任务数据模型
///
/// 下载任务为内存态，不持久化到数据库。
/// 通过 Tauri Channel 向前端推送进度。
use serde::{Deserialize, Serialize};

/// 下载任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    /// 等待中
    Pending,
    /// 下载中
    Downloading,
    /// 已完成
    Completed,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
}

/// 下载进度事件（通过 Channel 推送给前端）
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
    /// 错误信息
    pub error: Option<String>,
}

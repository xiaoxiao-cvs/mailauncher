/// 更新检查与 GitHub Release 数据模型
///
/// 对应 Python 的 update.py 模型，用于启动器自身更新和组件更新检查。
use serde::{Deserialize, Serialize};

// ==================== GitHub Release ====================

/// GitHub Release Asset
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    /// 文件名
    pub name: String,
    /// 下载 URL
    pub download_url: String,
    /// 文件大小（字节）
    pub size: i64,
    /// MIME 类型
    pub content_type: String,
}

/// GitHub Release 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRelease {
    /// 版本 Tag（如 v1.0.0）
    pub tag_name: String,
    /// Release 名称
    pub name: Option<String>,
    /// Release 说明（Markdown）
    pub body: Option<String>,
    /// 是否为草稿
    pub draft: bool,
    /// 是否为预发布
    pub prerelease: bool,
    /// 创建时间
    pub created_at: Option<String>,
    /// 发布时间
    pub published_at: Option<String>,
    /// GitHub 页面 URL
    pub html_url: Option<String>,
    /// 附件列表
    pub assets: Vec<ReleaseAsset>,
}

// ==================== 更新通道 ====================

/// 更新通道定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateChannel {
    /// 通道标识（main / beta / develop）
    pub name: String,
    /// 显示名称
    pub label: String,
    /// 通道描述
    pub description: String,
}

/// 版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    /// 版本号
    pub version: String,
    /// 显示标签
    pub label: Option<String>,
    /// 发布日期
    pub date: Option<String>,
    /// 所属通道
    pub channel: String,
    /// 更新说明
    pub notes: Option<String>,
    /// 下载 URL
    pub download_url: Option<String>,
}

// ==================== 更新检查响应 ====================

/// 更新检查响应
#[derive(Debug, Clone, Serialize)]
pub struct UpdateCheckResponse {
    /// 当前版本号
    pub current_version: String,
    /// 最新版本号
    pub latest_version: Option<String>,
    /// 是否有更新
    pub has_update: bool,
    /// 是否可更新（兼容旧字段）
    pub update_available: bool,
    /// 可用的更新通道
    pub channels: Vec<UpdateChannel>,
}

/// 通道版本列表响应
#[derive(Debug, Clone, Serialize)]
pub struct ChannelVersionsResponse {
    /// 通道名称
    pub channel: String,
    /// 版本列表
    pub versions: Vec<VersionInfo>,
}

// ==================== 组件更新相关 ====================

/// 组件版本检查结果
#[derive(Debug, Clone, Serialize)]
pub struct ComponentUpdateCheck {
    /// 组件名称
    pub component: String,
    /// 当前版本
    pub current_version: Option<String>,
    /// 当前 commit hash
    pub current_commit: Option<String>,
    /// 最新版本
    pub latest_version: Option<String>,
    /// 最新 commit hash
    pub latest_commit: Option<String>,
    /// 是否有更新
    pub has_update: bool,
    /// 更新说明
    pub update_notes: Option<String>,
    /// 提交差异数量
    pub commits_behind: Option<i32>,
}

/// 组件版本信息（给前端展示用）
#[derive(Debug, Clone, Serialize)]
pub struct ComponentVersionInfo {
    /// 组件名称
    pub component: String,
    /// 版本号
    pub version: Option<String>,
    /// Commit hash
    pub commit_hash: Option<String>,
    /// 安装方式
    pub install_method: String,
    /// 安装时间
    pub installed_at: Option<String>,
}

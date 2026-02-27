// 数据模型模块
// 定义数据库行映射与 IPC 传输的序列化结构

pub mod instance;
pub mod deployment;
pub mod config;
pub mod schedule;
pub mod version;
pub mod download;
pub mod update;
pub mod api_provider;
pub mod response;
pub mod stats;
pub mod message_queue;
pub mod log;

// 重导出常用类型
pub use instance::{
    Instance, CreateInstanceRequest, UpdateInstanceRequest,
    InstanceList, InstanceStatusResponse, ComponentStatus, SuccessResponse,
};
#[allow(unused_imports)]
pub use deployment::{Deployment, DeploymentLog};
#[allow(unused_imports)]
pub use config::{LauncherConfig, PythonEnvironment, MaibotConfig, PathConfig};
pub use schedule::ScheduleTask;
#[allow(unused_imports)]
pub use version::{ComponentVersion, VersionBackup, UpdateHistory};
#[allow(unused_imports)]
pub use download::{
    DownloadItemType, MaibotVersionSource, DownloadStatus, DownloadProgress,
    DownloadTaskCreate, DownloadTask, MaibotVersion, VersionsResponse,
};
#[allow(unused_imports)]
pub use update::{
    ReleaseAsset, GitHubRelease, UpdateChannel, VersionInfo,
    UpdateCheckResponse, ChannelVersionsResponse,
    ComponentUpdateCheck, ComponentVersionInfo,
};
#[allow(unused_imports)]
pub use api_provider::{ApiProvider, ApiModel};
#[allow(unused_imports)]
pub use response::ApiResponse;

// 数据模型模块
// 定义数据库行映射与 IPC 传输的序列化结构

pub mod api_provider;
pub mod config;
pub mod deployment;
pub mod download;
pub mod instance;
pub mod log;
pub mod message_queue;
pub mod response;
pub mod schedule;
pub mod stats;
pub mod update;
pub mod version;
pub mod watchdog;

// 重导出常用类型
#[allow(unused_imports)]
pub use api_provider::{ApiModel, ApiProvider};
#[allow(unused_imports)]
pub use config::{LauncherConfig, MaibotConfig, PathConfig, PythonEnvironment};
#[allow(unused_imports)]
pub use deployment::{Deployment, DeploymentLog};
#[allow(unused_imports)]
pub use download::{
    DownloadItemType, DownloadProgress, DownloadStatus, DownloadTask, DownloadTaskCreate,
    MaibotVersion, MaibotVersionSource, VersionsResponse,
};
pub use instance::{
    component_exists, default_runtime_profile_json, ComponentLifecycleStatus, ComponentStatus,
    ComponentType, CreateInstanceRequest, DbInstanceRecord, HostOs, Instance,
    InstanceComponentState, InstanceLifecycleStatus, InstanceList, InstanceStatusResponse,
    PythonMode, RuntimeKind, RuntimeProbeIssue, RuntimeProbeResult, RuntimeProbeSeverity,
    RuntimeProfile, SuccessResponse, UpdateInstanceRequest, WslDistributionInfo,
};
#[allow(unused_imports)]
pub use response::ApiResponse;
pub use schedule::ScheduleTask;
#[allow(unused_imports)]
pub use update::{
    ChannelVersionsResponse, ComponentUpdateCheck, ComponentVersionInfo, GitHubRelease,
    ReleaseAsset, UpdateChannel, UpdateCheckResponse, VersionInfo,
};
#[allow(unused_imports)]
pub use version::{ComponentVersion, UpdateHistory, VersionBackup};

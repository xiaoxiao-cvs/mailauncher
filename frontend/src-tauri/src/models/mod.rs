// 数据模型模块
// 定义数据库行映射与 IPC 传输的序列化结构

pub mod instance;
pub mod deployment;
pub mod config;
pub mod schedule;
pub mod version;
pub mod download;
pub mod api_provider;
pub mod response;

// 重导出常用类型
pub use instance::{
    Instance, CreateInstanceRequest, UpdateInstanceRequest,
    InstanceList, InstanceStatusResponse, ComponentStatus, SuccessResponse,
};
pub use deployment::{Deployment, DeploymentLog};
pub use config::{LauncherConfig, PythonEnvironment, MaibotConfig, PathConfig};
pub use schedule::ScheduleTask;
pub use version::{ComponentVersion, VersionBackup, UpdateHistory};
pub use download::{DownloadProgress, DownloadStatus};
pub use api_provider::{ApiProvider, ApiModel};
pub use response::ApiResponse;

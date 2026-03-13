/// 实例数据模型
///
/// 运行时抽象落地后，数据库行结构与前端传输结构不再完全等同：
/// - `DbInstanceRecord` 对应 SQLite 表结构
/// - `Instance` 对应前端消费的领域模型
use std::path::Path;

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InstanceLifecycleStatus {
    Pending,
    Starting,
    Running,
    Partial,
    Stopping,
    Stopped,
    Failed,
    Unknown,
}

impl InstanceLifecycleStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Starting => "starting",
            Self::Running => "running",
            Self::Partial => "partial",
            Self::Stopping => "stopping",
            Self::Stopped => "stopped",
            Self::Failed => "failed",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_db(value: &str) -> Self {
        match value {
            "pending" => Self::Pending,
            "starting" => Self::Starting,
            "running" => Self::Running,
            "partial" => Self::Partial,
            "stopping" => Self::Stopping,
            "stopped" => Self::Stopped,
            "failed" | "error" => Self::Failed,
            _ => Self::Unknown,
        }
    }

    pub fn is_active(&self) -> bool {
        matches!(self, Self::Pending | Self::Starting | Self::Running | Self::Partial | Self::Stopping)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentLifecycleStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Failed,
    Unknown,
}

impl ComponentLifecycleStatus {
    pub fn is_running(&self) -> bool {
        matches!(self, Self::Running)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ComponentType {
    #[serde(rename = "MaiBot")]
    Main,
    #[serde(rename = "NapCat")]
    NapCat,
    #[serde(rename = "MaiBot-Napcat-Adapter")]
    NapCatAdapter,
}

impl ComponentType {
    #[allow(dead_code)]
    pub const fn all() -> [Self; 3] {
        [Self::Main, Self::NapCat, Self::NapCatAdapter]
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Main => "MaiBot",
            Self::NapCat => "NapCat",
            Self::NapCatAdapter => "MaiBot-Napcat-Adapter",
        }
    }

    pub fn internal_key(&self) -> &'static str {
        match self {
            Self::Main => "main",
            Self::NapCat => "napcat",
            Self::NapCatAdapter => "napcat-ada",
        }
    }

    pub fn relative_dir(&self) -> &'static str {
        match self {
            Self::Main => "MaiBot",
            Self::NapCat => "NapCat",
            Self::NapCatAdapter => "MaiBot-Napcat-Adapter",
        }
    }

    pub fn from_value(value: &str) -> Option<Self> {
        match value {
            "MaiBot" | "main" => Some(Self::Main),
            "NapCat" | "napcat" => Some(Self::NapCat),
            "MaiBot-Napcat-Adapter" | "napcat-ada" => Some(Self::NapCatAdapter),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeKind {
    Local,
    Wsl2,
    Docker,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HostOs {
    Windows,
    Macos,
    Linux,
}

impl HostOs {
    pub fn current() -> Self {
        match std::env::consts::OS {
            "windows" => Self::Windows,
            "macos" => Self::Macos,
            _ => Self::Linux,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GuestOs {
    Linux,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PythonMode {
    Venv,
    System,
    Explicit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PathMappingStrategy {
    Native,
    Explicit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonRuntimeConfig {
    pub mode: PythonMode,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalCapability {
    pub interactive: bool,
    pub supports_resize: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalPolicy {
    pub graceful_stop: String,
    pub force_stop: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeProfile {
    pub kind: RuntimeKind,
    pub host_os: HostOs,
    pub guest_os: Option<GuestOs>,
    pub workspace_root: String,
    pub guest_workspace_root: Option<String>,
    pub python: PythonRuntimeConfig,
    pub terminal: TerminalCapability,
    pub signal_policy: SignalPolicy,
    pub distribution: Option<String>,
    pub user: Option<String>,
    pub path_mapping: PathMappingStrategy,
}

impl RuntimeProfile {
    pub fn local(workspace_root: impl Into<String>, python_path: Option<String>) -> Self {
        let python_mode = if python_path.is_some() {
            PythonMode::Explicit
        } else {
            PythonMode::Venv
        };

        Self {
            kind: RuntimeKind::Local,
            host_os: HostOs::current(),
            guest_os: None,
            workspace_root: workspace_root.into(),
            guest_workspace_root: None,
            python: PythonRuntimeConfig {
                mode: python_mode,
                path: python_path,
            },
            terminal: TerminalCapability {
                interactive: true,
                supports_resize: true,
            },
            signal_policy: SignalPolicy {
                graceful_stop: "ctrl_c".to_string(),
                force_stop: "kill".to_string(),
            },
            distribution: None,
            user: None,
            path_mapping: PathMappingStrategy::Native,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceComponentState {
    pub component: ComponentType,
    pub status: ComponentLifecycleStatus,
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime: Option<f64>,
    pub last_error: Option<String>,
}

/// 机器人实例（前端消费的领域模型）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instance {
    pub id: String,
    pub name: String,
    pub instance_path: Option<String>,
    pub bot_type: String,
    pub bot_version: Option<String>,
    pub description: Option<String>,
    pub status: InstanceLifecycleStatus,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub last_run: Option<NaiveDateTime>,
    pub run_time: i64,
    pub qq_account: Option<String>,
    pub runtime_profile: RuntimeProfile,
    pub last_error: Option<String>,
    pub last_status_reason: Option<String>,
    pub component_states: Vec<InstanceComponentState>,
    pub cpu_usage: Option<f64>,
    pub memory_usage: Option<f64>,
}

/// 数据库存储结构
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct DbInstanceRecord {
    pub id: String,
    pub name: String,
    pub instance_path: Option<String>,
    pub bot_type: String,
    pub bot_version: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub last_run: Option<NaiveDateTime>,
    pub run_time: i64,
    pub qq_account: Option<String>,
    pub runtime_profile: Option<String>,
    pub last_error: Option<String>,
    pub last_status_reason: Option<String>,
    pub component_state: Option<String>,
}

impl DbInstanceRecord {
    pub fn into_instance(self) -> Instance {
        let workspace_root = self
            .instance_path
            .clone()
            .unwrap_or_else(|| self.name.clone());

        let runtime_profile = self
            .runtime_profile
            .as_deref()
            .and_then(|raw| serde_json::from_str::<RuntimeProfile>(raw).ok())
            .unwrap_or_else(|| RuntimeProfile::local(workspace_root.clone(), self.python_path.clone()));

        let component_states = self
            .component_state
            .as_deref()
            .and_then(|raw| serde_json::from_str::<Vec<InstanceComponentState>>(raw).ok())
            .unwrap_or_default();

        Instance {
            id: self.id,
            name: self.name,
            instance_path: Some(workspace_root),
            bot_type: self.bot_type,
            bot_version: self.bot_version,
            description: self.description,
            status: InstanceLifecycleStatus::from_db(&self.status),
            python_path: self.python_path,
            config_path: self.config_path,
            created_at: self.created_at,
            updated_at: self.updated_at,
            last_run: self.last_run,
            run_time: self.run_time,
            qq_account: self.qq_account,
            runtime_profile,
            last_error: self.last_error,
            last_status_reason: self.last_status_reason,
            component_states,
            cpu_usage: None,
            memory_usage: None,
        }
    }
}

pub fn default_runtime_profile_json(instance_path: Option<&str>, python_path: Option<String>) -> String {
    let workspace_root = instance_path.unwrap_or_default();
    serde_json::to_string(&RuntimeProfile::local(workspace_root, python_path))
        .unwrap_or_else(|_| "{}".to_string())
}

pub fn component_exists(instance_root: &Path, component: ComponentType) -> bool {
    instance_root.join(component.relative_dir()).exists()
}

/// 创建实例请求参数（对应前端 InstanceCreate 接口）
#[derive(Debug, Deserialize)]
pub struct CreateInstanceRequest {
    pub name: String,
    pub bot_type: Option<String>,
    pub bot_version: Option<String>,
    pub description: Option<String>,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
}

/// 更新实例请求参数（对应前端 InstanceUpdate 接口，全部字段可选）
#[derive(Debug, Deserialize)]
pub struct UpdateInstanceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub python_path: Option<String>,
    pub config_path: Option<String>,
    pub qq_account: Option<String>,
}

/// 实例列表响应（对应前端 InstanceList 接口）
#[derive(Debug, Serialize)]
pub struct InstanceList {
    pub total: usize,
    pub instances: Vec<Instance>,
}

/// 实例运行状态响应（对应前端 InstanceStatusResponse 接口）
#[derive(Debug, Serialize)]
pub struct InstanceStatusResponse {
    pub id: String,
    pub status: InstanceLifecycleStatus,
    pub pid: Option<u32>,
    pub uptime: Option<f64>,
    pub runtime_profile: RuntimeProfile,
    pub last_error: Option<String>,
    pub last_status_reason: Option<String>,
    pub component_states: Vec<InstanceComponentState>,
}

/// 组件运行状态（对应前端 ComponentStatus 接口）
#[derive(Debug, Serialize)]
pub struct ComponentStatus {
    pub component: ComponentType,
    pub status: ComponentLifecycleStatus,
    pub running: bool,
    pub pid: Option<u32>,
    pub uptime: Option<f64>,
    pub last_error: Option<String>,
}

/// 通用成功响应（对应前端 SuccessResponse 接口）
#[derive(Debug, Serialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: String,
}

impl SuccessResponse {
    pub fn ok(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
        }
    }
}

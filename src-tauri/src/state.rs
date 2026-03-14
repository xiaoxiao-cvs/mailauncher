/// 应用全局状态
///
/// 通过 `app.manage()` 注册到 Tauri，
/// 命令函数通过 `State<'_, AppState>` 参数注入访问。
use sqlx::SqlitePool;

use crate::components::ComponentRegistry;
use crate::runtime::RuntimeResolver;
use crate::services::download_service::DownloadManager;
use crate::services::process_service::ProcessManager;
use crate::services::terminal_stream_service::ChannelTerminalStreamPublisher;

/// 应用状态，持有数据库连接池和进程管理器等共享资源
pub struct AppState {
    /// SQLite 连接池
    pub db: SqlitePool,
    /// 组件注册表（统一组件元数据与依赖关系）
    pub component_registry: ComponentRegistry,
    /// 运行时适配器解析器
    pub runtime_resolver: RuntimeResolver,
    /// 进程管理器（管理所有实例组件的进程生命周期）
    pub process_manager: ProcessManager,
    /// 终端输出发布器（channel 优先，统一转发到前端事件）
    pub terminal_stream_publisher: ChannelTerminalStreamPublisher,
    /// 下载管理器（管理下载任务的生命周期和进度）
    pub download_manager: DownloadManager,
}

/// 应用全局状态
///
/// 通过 `app.manage()` 注册到 Tauri，
/// 命令函数通过 `State<'_, AppState>` 参数注入访问。
use sqlx::SqlitePool;

use crate::components::ComponentRegistry;
use crate::runtime::RuntimeResolver;
use crate::services::download_service::DownloadManager;
use crate::services::maisaka_monitor_service::MaisakaMonitor;
use crate::services::process_service::ProcessManager;
use crate::services::system_stats_service::SystemMonitor;
use crate::services::terminal_stream_service::ChannelTerminalStreamPublisher;
use crate::services::watchdog::WatchdogRegistry;

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
    /// 麦麦活动监控（订阅各运行实例的 MaiBot WebUI WS，提供"正在处理的会话"在途快照）
    pub maisaka_monitor: MaisakaMonitor,
    /// 终端输出发布器（channel 优先，统一转发到前端事件）
    pub terminal_stream_publisher: ChannelTerminalStreamPublisher,
    /// 系统资源监视器（持久 sysinfo 实例，周期采样主机 CPU/内存/磁盘/网络）
    pub system_monitor: SystemMonitor,
    /// 下载管理器（管理下载任务的生命周期和进度）
    pub download_manager: DownloadManager,
    /// 看门狗重启簿记共享态（看门狗循环写、get_watchdog_status 只读，暴露 retry_count/next_attempt_at）
    pub watchdog_registry: WatchdogRegistry,
}

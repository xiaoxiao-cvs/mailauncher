/// 看门狗只读状态模型
///
/// 首页"看门狗健康"卡供数:对每个期望运行的本地托管组件,给出其自动重启偏好、当前存活态
/// 以及看门狗循环的重启簿记(连续重启次数 / 下次允许重启时刻)。
/// 字段采用 snake_case(前端按 snake_case 读)。
use chrono::{DateTime, Utc};
use serde::Serialize;

/// 单个期望运行组件的看门狗只读状态。
///
/// autorestart_enabled:自动重启偏好(config KV "autorestart:<instance_id>",缺省 true)。
/// is_alive:进程实时存活探测。
/// retry_count:看门狗对该会话已连续自动重启的次数(进程存活或用户操作后清零);未被看门狗
///   簿记过的会话(从未崩溃)为 0。
/// next_attempt_at:下次允许尝试自动重启的最早时刻(退避用);无退避计划(可立即尝试或未在簿记中)
///   时为 None,以 null 诚实表达,不用 0 掩盖。
/// port_unreachable:进程存活但组件监听端口连续探测不可达的"假死"判定,取自
///   `services::watchdog::WatchdogRegistry::port_health_snapshot`;未被端口探测周期
///   簿记过(如组件本身无已知监听端口)时为 false。
/// port_probe_consecutive_failures:端口健康探测当前连续失败次数,达到
///   `services::watchdog::PORT_PROBE_FAIL_THRESHOLD` 才会翻转 port_unreachable 为 true;
///   未被簿记时为 0。保留该原始计数(而非只给一个布尔)是为了让前端能展示"探测中/第几次失败"，
///   不必等到判定坐实假死才有任何提示。
#[derive(Debug, Clone, Serialize)]
pub struct WatchdogInstanceStatus {
    pub instance_id: String,
    pub instance_name: String,
    pub component: String,
    pub autorestart_enabled: bool,
    pub is_alive: bool,
    pub retry_count: u32,
    pub next_attempt_at: Option<DateTime<Utc>>,
    pub port_unreachable: bool,
    pub port_probe_consecutive_failures: u32,
}

//! 进程看门狗
//!
//! 在后台 tokio 任务中按固定 tick 巡检所有"期望运行"的本地托管组件:若进程已退、
//! 且该实例的自动重启偏好为开,则带退避地自动拉起,把"用户没主动停却崩了"的进程救回来。
//!
//! 与计划任务执行器(schedule_executor)同构:都是 tauri::async_runtime::spawn 的 tick 循环,
//! 复用 commands::process 命令层做实际启动(单一事实来源,自动复用端口/依赖预检与期望态置位)。
//!
//! 职责边界(为什么这样切):
//! - 期望态(DesiredState)由命令层在用户 start/stop 时置位,看门狗只读不写,从而把"用户主动停"
//!   (期望态 Stopped,绝不重启)与"异常崩溃"(期望态 Running 但进程已退,才重启)区分干净。
//! - 仅管本地托管会话:外部接管(WSL2 探测挂载)进程的存活与停止由其运行时路径负责,
//!   list_desired_running 已过滤掉外部会话,不在看门狗自动重启职责内。
//! - 退避 + 上限:同一组件连续重启最多 MAX_RETRIES 次,间隔按 BACKOFF_SECS 递增;一旦巡检到
//!   该组件存活,或用户手动操作(start 重置期望态/stop 置 Stopped),计数清零,避免无限重启风暴。
//!
//! 端口健康探测(独立周期,与上面的重启巡检解耦):
//! - "进程存活"不等于"服务健康"——NapCat 进程可能因内部异常卡死但宿主进程不退出，此时重启巡检
//!   看到的 is_component_running 仍为 true，不会触发任何动作，用户却看不出组件已经失联。
//! - 因此另起一条按 PORT_PROBE_TICK_SECS(与 TICK_SECS 不同的独立周期)巡检的 TCP 可达性探测：
//!   对有已知监听端口的组件(目前仅 NapCat 的 3001，复用 process_service::component_listen_ports
//!   同一份定义)做连接探测，连续 PORT_PROBE_FAIL_THRESHOLD 次失败即判定为 Unreachable("假死")。
//! - 判定结果只读写在 WatchdogRegistry 的独立簿记里，不影响重启巡检的 should_restart 判断——
//!   假死是"存活但无响应"，贸然用重启逻辑杀掉再拉起属于越权，留给用户/上层按需处理。

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::services::config_service;
use crate::state::AppState;

/// 巡检间隔(秒)
const TICK_SECS: u64 = 10;

/// 同一组件连续自动重启的最大次数(达到后停手,等用户介入)
const MAX_RETRIES: u32 = 3;

/// 每次重启的退避间隔(秒),按已尝试次数取:第 1 次失败后等 5s,第 2 次 15s,第 3 次 45s。
const BACKOFF_SECS: [u64; 3] = [5, 15, 45];

/// 端口健康探测的巡检周期(秒)。
///
/// 刻意与 TICK_SECS(重启巡检周期)取不同值:两者职责独立(存活 vs 健康)，周期也不必绑定——
/// 端口探测是纯本地 TCP 连接、开销小，稍快的周期能更快发现"假死"而不必和重启巡检抢同一个 tick。
const PORT_PROBE_TICK_SECS: u64 = 5;

/// 端口连续探测失败达到该次数才判定为"假死"(Unreachable)。
///
/// 取 3 次而非 1 次:避免组件重启瞬间、或探测本身偶发抖动(如系统一时繁忙)被误判为假死；
/// 与 PORT_PROBE_TICK_SECS=5s 搭配，最快 15s 内识别出真正的假死，足够及时又不会太敏感。
const PORT_PROBE_FAIL_THRESHOLD: u32 = 3;

/// 自动重启偏好的 config KV key 前缀,实际 key 形如 "autorestart:<instance_id>"。
const AUTORESTART_KEY_PREFIX: &str = "autorestart:";

/// 单个组件会话的重启簿记(看门狗内存态,不持久化)。
///
/// 用 chrono::DateTime<Utc> 记 next_attempt_at(而非 std::time::Instant):退避比较 Utc::now() < next_at
/// 与单调时钟等价,但 DateTime<Utc> 可序列化为墙钟时刻,供 get_watchdog_status 直接回前端显示"下次重启时刻"。
#[derive(Debug, Clone)]
pub struct RestartBookkeeping {
    /// 已连续自动重启次数(存活或用户操作后清零)
    pub retry_count: u32,
    /// 下次允许尝试重启的最早时刻(退避用);None 表示可立即尝试。
    pub next_attempt_at: Option<DateTime<Utc>>,
}

impl RestartBookkeeping {
    fn fresh() -> Self {
        Self {
            retry_count: 0,
            next_attempt_at: None,
        }
    }
}

/// 单个组件会话的端口健康探测簿记(看门狗内存态,不持久化)。
///
/// 与 `RestartBookkeeping` 分开存放:两者的清零时机不同——重启簿记在"进程存活"时清零，
/// 端口健康簿记在"端口探测可达"时清零，进程刚重启但端口还没起来的窗口期两者语义不应互相污染。
#[derive(Debug, Clone, Copy, Default)]
pub struct PortHealthBookkeeping {
    /// 当前连续探测失败次数(探测到可达即清零)。
    pub consecutive_failures: u32,
    /// 是否已判定为"假死"(连续失败次数达到 PORT_PROBE_FAIL_THRESHOLD)。
    pub unreachable: bool,
}

/// 看门狗重启簿记与端口健康簿记的共享态。
///
/// 看门狗循环以前把 `HashMap<session_id, RestartBookkeeping>` 私有在 spawn 闭包里,只读命令拿不到。
/// 现搬到此共享态(`Arc<Mutex<..>>`,与 ProcessManager 同构),作为 AppState 字段在看门狗循环与
/// get_watchdog_status 之间共享:循环是唯一写者(读改写簿记),命令只读快照。
/// session_id 形如 "<instance_id>::<component>",与 process_manager 会话 ID 口径一致。
#[derive(Clone, Default)]
pub struct WatchdogRegistry {
    inner: Arc<Mutex<HashMap<String, RestartBookkeeping>>>,
    /// 端口健康探测簿记,由独立周期的 spawn_port_health_loop 读写，与 inner 分开加锁，
    /// 避免端口探测与重启巡检互相阻塞对方的临界区。
    port_health: Arc<Mutex<HashMap<String, PortHealthBookkeeping>>>,
}

impl WatchdogRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// 拷贝指定会话当前簿记快照(只读,不存在返回 None)。
    pub async fn snapshot(&self, session_id: &str) -> Option<RestartBookkeeping> {
        self.inner.lock().await.get(session_id).cloned()
    }

    /// 拷贝指定会话当前端口健康簿记快照(只读,不存在返回 None,调用方应视为"未探测/健康")。
    pub async fn port_health_snapshot(&self, session_id: &str) -> Option<PortHealthBookkeeping> {
        self.port_health.lock().await.get(session_id).copied()
    }
}

/// 纯函数:判定某组件在本 tick 是否应执行自动重启。
///
/// 退避时序(next_attempt_at 是否到点)与上限计数解耦在调用方,这里只判定四个布尔/计数条件的合取:
/// 期望运行 且 进程已退 且 自动重启开启 且 未达重启上限。便于穷举边界做单测。
fn should_restart(
    desired_running: bool,
    alive: bool,
    autorestart_enabled: bool,
    retry_count: u32,
    max_retries: u32,
) -> bool {
    desired_running && !alive && autorestart_enabled && retry_count < max_retries
}

/// 纯函数:给定当前端口健康簿记与本次探测是否可达,计算探测后的新簿记状态。
///
/// 与 should_restart 同样的设计取向——把判定逻辑抽成无副作用纯函数,便于穷举边界
/// (阈值前一次/恰好达阈值/达阈值后又失败/失败后恢复)做单测,不依赖真实 TCP 探测与 tokio 运行时。
/// 一旦判定为假死(unreachable=true)，需显式探测到可达才会清零复位，不会中途"和稀泥"退半步。
fn next_port_health(
    current: PortHealthBookkeeping,
    reachable: bool,
) -> PortHealthBookkeeping {
    if reachable {
        PortHealthBookkeeping {
            consecutive_failures: 0,
            unreachable: false,
        }
    } else {
        let consecutive_failures = current.consecutive_failures + 1;
        PortHealthBookkeeping {
            consecutive_failures,
            unreachable: current.unreachable || consecutive_failures >= PORT_PROBE_FAIL_THRESHOLD,
        }
    }
}

/// 解析实例的自动重启偏好:读 config KV "autorestart:<instance_id>"。
///
/// 缺省(从未设置)视为开启(true):看门狗默认守护,符合"装完即用、崩了自动救"的产品取向。
/// 仅当显式存成 "false" 时关闭。读库失败属基础设施异常,自然冒泡由调用方记录后跳过本实例。
async fn autorestart_enabled(
    pool: &sqlx::SqlitePool,
    instance_id: &str,
) -> crate::errors::AppResult<bool> {
    let key = format!("{}{}", AUTORESTART_KEY_PREFIX, instance_id);
    let value = config_service::get_config(pool, &key).await?;
    // 仅显式 "false" 关闭,缺省/其它值视为开启
    Ok(!matches!(value.as_deref(), Some("false")))
}

/// 启动看门狗后台循环。
///
/// 内部实际拉起两条独立周期的后台任务:重启巡检(spawn_restart_loop,周期 TICK_SECS)与
/// 端口健康探测(spawn_port_health_loop,周期 PORT_PROBE_TICK_SECS)。调用方(lib.rs 启动流程)
/// 只需调这一个入口，两条巡检各自的节奏与失败互不影响对方。
pub fn spawn_watchdog(app_handle: AppHandle) {
    spawn_restart_loop(app_handle.clone());
    spawn_port_health_loop(app_handle);
}

/// 重启巡检后台循环(职责与周期见模块顶部文档)。
fn spawn_restart_loop(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(TICK_SECS));
        info!(
            "[看门狗] 已启动,tick={}s,单组件最多重启 {} 次",
            TICK_SECS, MAX_RETRIES
        );

        loop {
            ticker.tick().await;

            // 克隆出本 tick 需要的句柄,避免把 State 跨 await 借用 AppHandle。
            // registry 是 Arc<Mutex<..>> 的克隆,与 AppState 中的实例共享同一份簿记。
            let (pool, process_manager, registry) = {
                let state = app_handle.state::<AppState>();
                (
                    state.db.clone(),
                    state.process_manager.clone(),
                    state.watchdog_registry.clone(),
                )
            };

            let desired_running = process_manager.list_desired_running().await;

            // 清理已不再期望运行的会话簿记(用户停了/删了),防止 map 无限增长且让计数自然清零。
            let still_tracked: std::collections::HashSet<String> = desired_running
                .iter()
                .map(|(instance_id, component)| format!("{}::{}", instance_id, component))
                .collect();
            {
                let mut book = registry.inner.lock().await;
                book.retain(|session_id, _| still_tracked.contains(session_id));
            }

            for (instance_id, component) in desired_running {
                let session_id = format!("{}::{}", instance_id, component);

                let alive = process_manager
                    .is_component_running(&instance_id, &component)
                    .await;

                // 存活:清零该会话计数(下次崩溃从第 1 次退避重新开始),无需重启。
                if alive {
                    registry.inner.lock().await.remove(&session_id);
                    continue;
                }

                let enabled = match autorestart_enabled(&pool, &instance_id).await {
                    Ok(v) => v,
                    Err(e) => {
                        error!(
                            "[看门狗] 读取 {} 自动重启偏好失败,跳过本轮: {}",
                            instance_id, e
                        );
                        continue;
                    }
                };

                // 先把所需簿记值拷出后随即释放锁,避免把 MutexGuard 跨 start_component 的 await 持有
                // (那会卡住只读命令);await 后再次取锁回写。
                let (retry_count, next_attempt_at) = {
                    let mut book = registry.inner.lock().await;
                    let entry = book
                        .entry(session_id.clone())
                        .or_insert_with(RestartBookkeeping::fresh);
                    (entry.retry_count, entry.next_attempt_at)
                };

                if !should_restart(true, alive, enabled, retry_count, MAX_RETRIES) {
                    // 达上限仅在跨过阈值时提示一次,随后抬高计数避免每个 tick 重复刷屏。
                    if enabled && retry_count == MAX_RETRIES {
                        warn!(
                            "[看门狗] {} 已连续重启 {} 次仍未存活,停止自动重启,等待用户介入",
                            session_id, MAX_RETRIES
                        );
                        if let Some(entry) = registry.inner.lock().await.get_mut(&session_id) {
                            entry.retry_count += 1;
                        }
                    }
                    continue;
                }

                // 退避未到点则本 tick 先不动手。
                if let Some(next_at) = next_attempt_at {
                    if Utc::now() < next_at {
                        continue;
                    }
                }

                let attempt = retry_count + 1;
                info!(
                    "[看门狗] 检测到 {} 已退出,执行第 {}/{} 次自动重启",
                    session_id, attempt, MAX_RETRIES
                );

                // 复用命令层 start_component:自动带上端口/依赖预检与期望态置位(单一事实来源)。
                let state = app_handle.state::<AppState>();
                match crate::commands::process::start_component(
                    app_handle.clone(),
                    state,
                    instance_id.clone(),
                    component.clone(),
                )
                .await
                {
                    Ok(_) => info!("[看门狗] {} 第 {} 次自动重启已触发", session_id, attempt),
                    Err(e) => warn!(
                        "[看门狗] {} 第 {} 次自动重启失败: {}",
                        session_id, attempt, e
                    ),
                }

                // 无论触发成败都计一次并排下次退避:下个 tick 由 is_component_running 复核是否真活了,
                // 真活了会被上面的 alive 分支清零(remove),没活则继续退避到上限。
                let backoff = BACKOFF_SECS
                    .get((attempt as usize).saturating_sub(1))
                    .copied()
                    .unwrap_or(*BACKOFF_SECS.last().unwrap());
                if let Some(entry) = registry.inner.lock().await.get_mut(&session_id) {
                    entry.retry_count = attempt;
                    entry.next_attempt_at =
                        Some(Utc::now() + chrono::Duration::seconds(backoff as i64));
                }
            }
        }
    });
}

/// 端口健康探测后台循环(职责与周期见模块顶部文档)。
///
/// 只对"有已知监听端口"的组件做探测(目前仅 NapCat)：MaiBot 没有启动器可确知的固定端口，
/// 强行探测只会产生恒定误报，故直接跳过并清理其可能残留的簿记。
fn spawn_port_health_loop(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(PORT_PROBE_TICK_SECS));
        info!(
            "[看门狗-端口探测] 已启动,tick={}s,连续 {} 次失败判定假死",
            PORT_PROBE_TICK_SECS, PORT_PROBE_FAIL_THRESHOLD
        );

        loop {
            ticker.tick().await;

            let (process_manager, registry) = {
                let state = app_handle.state::<AppState>();
                (state.process_manager.clone(), state.watchdog_registry.clone())
            };

            let desired_running = process_manager.list_desired_running().await;

            // 清理已不再期望运行的会话簿记,防止 map 无限增长。
            let still_tracked: std::collections::HashSet<String> = desired_running
                .iter()
                .map(|(instance_id, component)| format!("{}::{}", instance_id, component))
                .collect();
            {
                let mut health = registry.port_health.lock().await;
                health.retain(|session_id, _| still_tracked.contains(session_id));
            }

            for (instance_id, component) in desired_running {
                let session_id = format!("{}::{}", instance_id, component);

                let Some(component_type) =
                    crate::models::ComponentType::from_value(&component)
                else {
                    continue;
                };
                let ports = crate::services::process_service::component_listen_ports(component_type);
                if ports.is_empty() {
                    // 无已知监听端口(如 MaiBot):不探测,顺带清掉可能残留的旧簿记。
                    registry.port_health.lock().await.remove(&session_id);
                    continue;
                }

                // 进程本身已不在跑:存活与否交由重启巡检处理,端口探测在此不重复判定,
                // 避免"进程已退"和"假死"两种不同性质的异常混淆成同一个告警。
                let alive = process_manager
                    .is_component_running(&instance_id, &component)
                    .await;
                if !alive {
                    registry.port_health.lock().await.remove(&session_id);
                    continue;
                }

                // 全部已知端口都需可达才算健康;任一端口不可达即计一次失败。
                let reachable = ports
                    .iter()
                    .all(|&port| crate::services::process_service::is_tcp_port_in_use(port));

                let mut health = registry.port_health.lock().await;
                let previous = health.get(&session_id).copied().unwrap_or_default();
                let updated = next_port_health(previous, reachable);

                if updated.unreachable && !previous.unreachable {
                    warn!(
                        "[看门狗-端口探测] {} 连续 {} 次端口不可达,判定为假死(进程存活但服务无响应)",
                        session_id, updated.consecutive_failures
                    );
                } else if !updated.unreachable && previous.unreachable {
                    info!("[看门狗-端口探测] {} 端口已恢复可达,解除假死判定", session_id);
                }

                health.insert(session_id, updated);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_restart_true_when_crashed_and_enabled_under_limit() {
        // 期望运行 + 已退 + 开启 + 未达上限 -> 重启
        assert!(should_restart(true, false, true, 0, MAX_RETRIES));
        assert!(should_restart(
            true,
            false,
            true,
            MAX_RETRIES - 1,
            MAX_RETRIES
        ));
    }

    #[test]
    fn should_restart_false_when_alive() {
        // 进程存活绝不重启(无论其它条件)
        assert!(!should_restart(true, true, true, 0, MAX_RETRIES));
    }

    #[test]
    fn should_restart_false_when_desired_stopped() {
        // 用户主动停(期望态 Stopped)绝不重启,即使进程确实没了
        assert!(!should_restart(false, false, true, 0, MAX_RETRIES));
    }

    #[test]
    fn should_restart_false_when_autorestart_disabled() {
        // 实例关了自动重启:崩了也不救
        assert!(!should_restart(true, false, false, 0, MAX_RETRIES));
    }

    #[test]
    fn should_restart_false_when_retry_limit_reached() {
        // 达到上限后停手
        assert!(!should_restart(true, false, true, MAX_RETRIES, MAX_RETRIES));
        assert!(!should_restart(
            true,
            false,
            true,
            MAX_RETRIES + 1,
            MAX_RETRIES
        ));
    }

    #[tokio::test]
    async fn registry_snapshot_reflects_bookkeeping_and_absence() {
        let registry = WatchdogRegistry::new();

        // 未簿记会话:快照为 None(命令层据此回退 retry_count=0 / next_attempt_at=None)。
        assert!(registry.snapshot("inst_a::main").await.is_none());

        // 写入一条簿记后,快照应取回同样的 retry_count 与 next_attempt_at。
        let next_at = Utc::now() + chrono::Duration::seconds(15);
        registry.inner.lock().await.insert(
            "inst_a::main".to_string(),
            RestartBookkeeping {
                retry_count: 2,
                next_attempt_at: Some(next_at),
            },
        );

        let snap = registry
            .snapshot("inst_a::main")
            .await
            .expect("已写入的会话快照不应为 None");
        assert_eq!(snap.retry_count, 2);
        assert_eq!(snap.next_attempt_at, Some(next_at));

        // 另一未簿记会话仍为 None,确认快照按 session_id 精确取。
        assert!(registry.snapshot("inst_b::napcat").await.is_none());
    }

    // ==================== 端口健康探测 ====================

    #[tokio::test]
    async fn port_health_snapshot_reflects_bookkeeping_and_absence() {
        let registry = WatchdogRegistry::new();

        // 未探测过的会话:快照为 None(命令层据此回退 port_unreachable=false)。
        assert!(registry.port_health_snapshot("inst_a::napcat").await.is_none());

        registry.port_health.lock().await.insert(
            "inst_a::napcat".to_string(),
            PortHealthBookkeeping {
                consecutive_failures: 3,
                unreachable: true,
            },
        );

        let snap = registry
            .port_health_snapshot("inst_a::napcat")
            .await
            .expect("已写入的端口健康簿记不应为 None");
        assert_eq!(snap.consecutive_failures, 3);
        assert!(snap.unreachable);

        // 另一未簿记会话仍为 None。
        assert!(registry.port_health_snapshot("inst_b::napcat").await.is_none());
    }

    #[test]
    fn next_port_health_accumulates_failures_up_to_threshold() {
        let fresh = PortHealthBookkeeping::default();

        // 第 1 次失败:未达阈值,不假死。
        let after_1 = next_port_health(fresh, false);
        assert_eq!(after_1.consecutive_failures, 1);
        assert!(!after_1.unreachable);

        // 第 2 次失败:仍未达阈值(PORT_PROBE_FAIL_THRESHOLD = 3)。
        let after_2 = next_port_health(after_1, false);
        assert_eq!(after_2.consecutive_failures, 2);
        assert!(!after_2.unreachable);

        // 第 3 次失败:恰好达阈值,判定假死。
        let after_3 = next_port_health(after_2, false);
        assert_eq!(after_3.consecutive_failures, 3);
        assert!(after_3.unreachable);

        // 第 4 次失败:已经假死,继续累加计数且保持假死。
        let after_4 = next_port_health(after_3, false);
        assert_eq!(after_4.consecutive_failures, 4);
        assert!(after_4.unreachable);
    }

    #[test]
    fn next_port_health_recovers_immediately_on_reachable() {
        // 已判定假死的会话,一旦探测到可达就立即清零并解除假死,不做"半信半疑"的渐进恢复。
        let unreachable = PortHealthBookkeeping {
            consecutive_failures: 5,
            unreachable: true,
        };
        let recovered = next_port_health(unreachable, true);
        assert_eq!(recovered.consecutive_failures, 0);
        assert!(!recovered.unreachable);
    }

    #[test]
    fn next_port_health_reachable_resets_partial_failure_streak() {
        // 尚未达阈值的失败streak,一次可达探测也应立即清零,不能"抵消一次"这种渐进逻辑。
        let partial = PortHealthBookkeeping {
            consecutive_failures: 2,
            unreachable: false,
        };
        let reset = next_port_health(partial, true);
        assert_eq!(reset.consecutive_failures, 0);
        assert!(!reset.unreachable);
    }

    #[test]
    fn port_probe_fail_threshold_matches_module_doc() {
        // 守护常量语义不漂移:阈值应为正数且与模块文档所述一致(当前设计值 3)。
        assert_eq!(PORT_PROBE_FAIL_THRESHOLD, 3);
    }

    #[test]
    fn backoff_table_covers_all_retries() {
        // 退避表长度须覆盖最大重试次数,否则越界回退到末位(此断言守护配置一致性)。
        assert_eq!(BACKOFF_SECS.len() as u32, MAX_RETRIES);
        // 退避应单调不减,符合"越失败等越久"的意图。
        for window in BACKOFF_SECS.windows(2) {
            assert!(window[1] >= window[0]);
        }
    }

    #[tokio::test]
    async fn autorestart_defaults_to_true_when_unset() {
        let pool = sqlx::SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        sqlx::query(
            "CREATE TABLE launcher_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT,
                description TEXT,
                updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");

        // 从未设置 -> 默认开启
        assert!(autorestart_enabled(&pool, "inst_unset").await.unwrap());

        // 显式 false -> 关闭
        config_service::set_config(&pool, "autorestart:inst_off", "false", None)
            .await
            .expect("写入配置失败");
        assert!(!autorestart_enabled(&pool, "inst_off").await.unwrap());

        // 显式 true -> 开启
        config_service::set_config(&pool, "autorestart:inst_on", "true", None)
            .await
            .expect("写入配置失败");
        assert!(autorestart_enabled(&pool, "inst_on").await.unwrap());
    }
}

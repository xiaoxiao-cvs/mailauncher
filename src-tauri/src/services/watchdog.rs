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

/// 看门狗重启簿记的共享态。
///
/// 看门狗循环以前把 `HashMap<session_id, RestartBookkeeping>` 私有在 spawn 闭包里,只读命令拿不到。
/// 现搬到此共享态(`Arc<Mutex<..>>`,与 ProcessManager 同构),作为 AppState 字段在看门狗循环与
/// get_watchdog_status 之间共享:循环是唯一写者(读改写簿记),命令只读快照。
/// session_id 形如 "<instance_id>::<component>",与 process_manager 会话 ID 口径一致。
#[derive(Clone, Default)]
pub struct WatchdogRegistry {
    inner: Arc<Mutex<HashMap<String, RestartBookkeeping>>>,
}

impl WatchdogRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// 拷贝指定会话当前簿记快照(只读,不存在返回 None)。
    pub async fn snapshot(&self, session_id: &str) -> Option<RestartBookkeeping> {
        self.inner.lock().await.get(session_id).cloned()
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
pub fn spawn_watchdog(app_handle: AppHandle) {
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

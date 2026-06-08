/// 看门狗只读状态命令
///
/// 提供首页"看门狗健康"卡所需的只读快照:对每个"期望运行"的本地托管组件,
/// 给出其自动重启偏好(autorestart_enabled)、当前进程存活态(is_alive),
/// 以及看门狗循环的重启簿记(retry_count / next_attempt_at,从 AppState.watchdog_registry 只读)。
/// 纯查询、无副作用——不写簿记,仅快照拷贝。
use std::collections::HashMap;

use tauri::State;

use crate::errors::AppResult;
use crate::models::watchdog::WatchdogInstanceStatus;
use crate::services::{config_service, instance_service};
use crate::state::AppState;

/// 自动重启偏好的 config KV key 前缀(与 services::watchdog 保持一致),实际 key 形如
/// "autorestart:<instance_id>"。缺省视为开启,仅显式 "false" 关闭。
const AUTORESTART_KEY_PREFIX: &str = "autorestart:";

/// 看门狗只读状态:枚举所有期望运行的本地托管组件,补上自动重启偏好、实时存活态与重启簿记。
///
/// 期望运行集合取自 process_manager.list_desired_running()(已过滤掉外部接管会话);
/// autorestart_enabled 读 config KV "autorestart:<instance_id>"(缺省 true,显式 "false" 关闭);
/// is_alive 用 process_manager.is_component_running 实时探测;
/// retry_count/next_attempt_at 取自 watchdog_registry 簿记快照(从未崩溃过的会话无簿记,
///   retry_count 为 0、next_attempt_at 为 None);
/// instance_name 由 get_all_instances 建 id->name 映射补齐,缺失时回退 instance_id。
#[tauri::command]
pub async fn get_watchdog_status(
    state: State<'_, AppState>,
) -> AppResult<Vec<WatchdogInstanceStatus>> {
    let desired_running = state.process_manager.list_desired_running().await;

    // instance_id -> name 映射,用于给每个会话补上人类可读名称。
    let instances = instance_service::get_all_instances(&state.db)
        .await?
        .instances;
    let name_by_id: HashMap<String, String> =
        instances.into_iter().map(|i| (i.id, i.name)).collect();

    let mut result: Vec<WatchdogInstanceStatus> = Vec::with_capacity(desired_running.len());
    for (instance_id, component) in desired_running {
        let key = format!("{}{}", AUTORESTART_KEY_PREFIX, instance_id);
        let value = config_service::get_config(&state.db, &key).await?;
        // 与 services::watchdog 口径一致:仅显式 "false" 关闭,缺省/其它值视为开启。
        let autorestart_enabled = !matches!(value.as_deref(), Some("false"));

        let is_alive = state
            .process_manager
            .is_component_running(&instance_id, &component)
            .await;

        // 重启簿记快照:未被看门狗簿记过(从未崩溃)的会话视为 0 次、无下次退避计划。
        let session_id = format!("{}::{}", instance_id, component);
        let (retry_count, next_attempt_at) = match state
            .watchdog_registry
            .snapshot(&session_id)
            .await
        {
            Some(b) => (b.retry_count, b.next_attempt_at),
            None => (0, None),
        };

        let instance_name = name_by_id
            .get(&instance_id)
            .cloned()
            .unwrap_or_else(|| instance_id.clone());

        result.push(WatchdogInstanceStatus {
            instance_id,
            instance_name,
            component,
            autorestart_enabled,
            is_alive,
            retry_count,
            next_attempt_at,
        });
    }

    Ok(result)
}

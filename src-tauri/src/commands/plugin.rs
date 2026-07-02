/// 插件管理命令
///
/// 提供实例已装 MaiBot 插件的只读查询接口(P2-25)。
use tauri::State;

use crate::errors::{AppError, AppResult};
use crate::services::instance_service;
use crate::services::plugin_service::{self, InstalledPlugin};
use crate::state::AppState;
use crate::utils::platform;

/// 列出指定实例已装的 MaiBot 插件(读取 `MaiBot/plugins/` 下各目录的
/// `_manifest.json` + `config.toml`)。实例不存在时报错;插件目录不存在则返回空列表。
#[tauri::command]
pub async fn list_installed_plugins(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Vec<InstalledPlugin>> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例不存在: {}", instance_id)))?;

    let instance_root = platform::get_instances_dir().join(
        instance
            .instance_path
            .unwrap_or_else(|| instance.name.clone()),
    );

    Ok(plugin_service::scan_installed_plugins(&instance_root))
}

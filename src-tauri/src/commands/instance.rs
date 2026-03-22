/// 实例管理 Tauri 命令
///
/// 对应前端 `instanceApi.ts` 的方法签名。
/// 每个命令通过 `State<AppState>` 获取数据库连接池，
/// 委托 `instance_service` 执行实际业务逻辑。
use tauri::State;

use crate::errors::{AppError, AppResult};
use crate::models::{
    CreateInstanceRequest, Instance, InstanceList, InstanceStatusResponse, SuccessResponse,
    UpdateInstanceRequest,
};
use crate::services::instance_service;
use crate::state::AppState;

/// 获取所有实例列表
#[tauri::command]
pub async fn get_all_instances(state: State<'_, AppState>) -> AppResult<InstanceList> {
    instance_service::get_all_instances(&state.db).await
}

/// 获取单个实例详情
#[tauri::command]
pub async fn get_instance(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Instance> {
    instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 获取实例运行状态
#[tauri::command]
pub async fn get_instance_status(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<InstanceStatusResponse> {
    instance_service::get_instance_status(
        &state.db,
        &instance_id,
        &state.process_manager,
        &state.component_registry,
    )
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 创建新实例
#[tauri::command]
pub async fn create_instance(
    state: State<'_, AppState>,
    data: CreateInstanceRequest,
) -> AppResult<Instance> {
    instance_service::create_instance(&state.db, data).await
}

/// 更新实例配置
#[tauri::command]
pub async fn update_instance(
    state: State<'_, AppState>,
    instance_id: String,
    data: UpdateInstanceRequest,
) -> AppResult<Instance> {
    instance_service::update_instance(&state.db, &instance_id, data)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 删除实例
#[tauri::command]
pub async fn delete_instance(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    let deleted = instance_service::delete_instance(&state.db, &instance_id).await?;
    if deleted {
        Ok(SuccessResponse::ok(format!("实例 {} 已删除", instance_id)))
    } else {
        Err(AppError::NotFound(format!("实例 {} 不存在", instance_id)))
    }
}

/// NapCat 账号信息
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NapCatAccountsResponse {
    pub accounts: Vec<NapCatAccount>,
}

/// 单个 NapCat 账号
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NapCatAccount {
    pub account: String,
    pub nickname: String,
}

/// 获取 NapCat 已登录账号列表
///
/// 扫描实例目录下 NapCat/config/ 中的数字命名子目录，
/// 每个子目录名即为一个 QQ 账号。
#[tauri::command]
pub async fn get_napcat_accounts(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<NapCatAccountsResponse> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instances_dir = crate::utils::platform::get_instances_dir();
    let instance_path = instance.instance_path.unwrap_or_else(|| instance.name.clone());
    let napcat_config_dir = instances_dir.join(&instance_path).join("NapCat").join("config");

    let mut accounts = Vec::new();

    if napcat_config_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&napcat_config_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                // NapCat 以 QQ 号命名目录（纯数字）
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false)
                    && name.chars().all(|c| c.is_ascii_digit())
                    && !name.is_empty()
                {
                    accounts.push(NapCatAccount {
                        account: name.clone(),
                        nickname: name,
                    });
                }
            }
        }
    }

    Ok(NapCatAccountsResponse { accounts })
}

/// 配置管理 Tauri 命令
///
/// 分两大类：
/// 1. 启动器 KV 配置 — 数据库存储
/// 2. MAIBot TOML 配置 — 文件读写（保留注释/格式）
use tauri::State;

use crate::errors::AppResult;
use crate::models::{LauncherConfig, PathConfig, PythonEnvironment, SuccessResponse};
use crate::services::config_service;
use crate::state::AppState;

// ==================== 启动器 KV 配置 ====================

/// 获取所有启动器配置
#[tauri::command]
pub async fn get_all_configs(
    state: State<'_, AppState>,
) -> AppResult<Vec<LauncherConfig>> {
    config_service::get_all_configs(&state.db).await
}

/// 获取指定配置值
#[tauri::command]
pub async fn get_config(
    state: State<'_, AppState>,
    key: String,
) -> AppResult<Option<String>> {
    config_service::get_config(&state.db, &key).await
}

/// 设置配置值
#[tauri::command]
pub async fn set_config(
    state: State<'_, AppState>,
    key: String,
    value: String,
    description: Option<String>,
) -> AppResult<SuccessResponse> {
    config_service::set_config(&state.db, &key, &value, description.as_deref()).await?;
    Ok(SuccessResponse::ok("配置已保存"))
}

// ==================== Python 环境管理 ====================

/// 获取所有 Python 环境
#[tauri::command]
pub async fn get_python_environments(
    state: State<'_, AppState>,
) -> AppResult<Vec<PythonEnvironment>> {
    config_service::get_python_environments(&state.db).await
}

/// 获取当前选中的 Python 环境
#[tauri::command]
pub async fn get_selected_python(
    state: State<'_, AppState>,
) -> AppResult<Option<PythonEnvironment>> {
    config_service::get_selected_python(&state.db).await
}

/// 选择 Python 环境
#[tauri::command]
pub async fn select_python(
    state: State<'_, AppState>,
    path: String,
) -> AppResult<SuccessResponse> {
    config_service::select_python(&state.db, &path).await?;
    Ok(SuccessResponse::ok("Python 环境已选择"))
}

/// 保存检测到的 Python 环境
#[tauri::command]
pub async fn save_python_environment(
    state: State<'_, AppState>,
    path: String,
    version: String,
) -> AppResult<SuccessResponse> {
    config_service::save_python_environment(&state.db, &path, &version).await?;
    Ok(SuccessResponse::ok("Python 环境已保存"))
}

// ==================== 路径配置管理 ====================

/// 获取所有路径配置
#[tauri::command]
pub async fn get_all_paths(
    state: State<'_, AppState>,
) -> AppResult<Vec<PathConfig>> {
    config_service::get_all_paths(&state.db).await
}

/// 获取指定路径配置
#[tauri::command]
pub async fn get_path(
    state: State<'_, AppState>,
    name: String,
) -> AppResult<Option<PathConfig>> {
    config_service::get_path(&state.db, &name).await
}

/// 设置路径配置
#[tauri::command]
pub async fn set_path(
    state: State<'_, AppState>,
    name: String,
    path: String,
    path_type: String,
    is_verified: bool,
    description: Option<String>,
) -> AppResult<SuccessResponse> {
    config_service::set_path(&state.db, &name, &path, &path_type, is_verified, description.as_deref()).await?;
    Ok(SuccessResponse::ok("路径配置已保存"))
}

// ==================== MAIBot TOML 配置 ====================

/// 获取 TOML 配置（结构化 JSON）
#[tauri::command]
pub async fn get_toml_config(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::read_toml_as_json(&config_path)
}

/// 获取 TOML 配置原始文本
#[tauri::command]
pub async fn get_toml_config_raw(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
) -> AppResult<String> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::read_toml_raw(&config_path)
}

/// 保存 TOML 配置原始文本
#[tauri::command]
pub async fn save_toml_config_raw(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    content: String,
) -> AppResult<SuccessResponse> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::save_toml_raw(&config_path, &content)?;
    Ok(SuccessResponse::ok("配置已保存"))
}

/// 更新 TOML 配置中的指定值
#[tauri::command]
pub async fn update_toml_config_value(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    key_path: String,
    value: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::update_toml_value(&config_path, &key_path, value)
}

/// 删除 TOML 配置中的指定键
#[tauri::command]
pub async fn delete_toml_config_key(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    key_path: String,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::delete_toml_key(&config_path, &key_path)
}

/// 添加 TOML 配置中的新键
#[tauri::command]
pub async fn add_toml_config_key(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    section: Option<String>,
    key: String,
    value: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::add_toml_key(&config_path, section.as_deref(), &key, value)
}

/// 获取 TOML 配置的顶层 section 列表
#[tauri::command]
pub async fn get_toml_config_sections(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
) -> AppResult<Vec<String>> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::get_toml_sections(&config_path)
}

// ==================== TOML 数组操作 ====================

/// 向 TOML 数组追加项
#[tauri::command]
pub async fn add_toml_array_item(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    array_path: String,
    item: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::add_toml_array_item(&config_path, &array_path, item)
}

/// 更新 TOML 数组中的指定项
#[tauri::command]
pub async fn update_toml_array_item(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    array_path: String,
    index: usize,
    updates: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::update_toml_array_item(&config_path, &array_path, index, updates)
}

/// 删除 TOML 数组中的指定项
#[tauri::command]
pub async fn delete_toml_array_item(
    state: State<'_, AppState>,
    instance_id: Option<String>,
    config_type: String,
    filename: String,
    array_path: String,
    index: usize,
) -> AppResult<serde_json::Value> {
    let config_dir = config_service::resolve_config_dir(
        &state.db,
        instance_id.as_deref(),
        &config_type,
    )
    .await?;
    let config_path = config_dir.join(&filename);
    config_service::delete_toml_array_item(&config_path, &array_path, index)
}

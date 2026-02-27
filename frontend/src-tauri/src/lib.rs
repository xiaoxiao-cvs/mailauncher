use tracing::info;

// 模块声明
mod commands;
mod services;
mod models;
mod db;
mod errors;
mod state;
mod utils;

use state::AppState;

/// 初始化 Rust 侧服务（数据库连接池、建表迁移）
async fn init_rust_services() -> AppState {
    // 初始化数据目录
    utils::platform::init_data_directories();

    // 创建数据库连接池
    let pool = db::create_pool()
        .await
        .expect("数据库连接池创建失败");

    // 运行建表迁移
    db::migration::run_migrations(&pool)
        .await
        .expect("数据库迁移失败");

    // 初始化默认数据
    db::migration::init_default_providers(&pool)
        .await
        .expect("默认数据初始化失败");

    info!("[初始化] Rust 服务初始化完成");

    AppState {
        db: pool,
        process_manager: services::process_service::ProcessManager::new(),
        download_manager: services::download_service::DownloadManager::new(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 在 tokio 运行时中初始化 Rust 服务
    let rt = tokio::runtime::Runtime::new().expect("无法创建 Tokio 运行时");
    let app_state = rt.block_on(init_rust_services());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|_app| {
            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // 实例管理
            commands::instance::get_all_instances,
            commands::instance::get_instance,
            commands::instance::get_instance_status,
            commands::instance::create_instance,
            commands::instance::update_instance,
            commands::instance::delete_instance,
            // 进程管理
            commands::process::start_instance,
            commands::process::stop_instance,
            commands::process::restart_instance,
            commands::process::start_component,
            commands::process::stop_component,
            commands::process::get_component_status,
            commands::process::get_instance_components,
            // 终端交互
            commands::process::terminal_write,
            commands::process::terminal_get_history,
            commands::process::terminal_resize,
            // 下载管理
            commands::download::create_download_task,
            commands::download::get_download_task,
            commands::download::get_all_download_tasks,
            commands::download::get_maibot_versions,
            // 版本管理
            commands::version::get_instance_components_version,
            commands::version::check_component_update,
            commands::version::update_component,
            commands::version::get_backups,
            commands::version::restore_backup,
            commands::version::get_update_history,
            commands::version::get_component_releases,
            commands::version::check_launcher_update,
            commands::version::get_channel_versions,
            // 配置管理 — KV
            commands::config::get_all_configs,
            commands::config::get_config,
            commands::config::set_config,
            commands::config::get_python_environments,
            commands::config::get_selected_python,
            commands::config::select_python,
            commands::config::save_python_environment,
            commands::config::get_all_paths,
            commands::config::get_path,
            commands::config::set_path,
            // 配置管理 — TOML
            commands::config::get_toml_config,
            commands::config::get_toml_config_raw,
            commands::config::save_toml_config_raw,
            commands::config::update_toml_config_value,
            commands::config::delete_toml_config_key,
            commands::config::add_toml_config_key,
            commands::config::get_toml_config_sections,
            commands::config::add_toml_array_item,
            commands::config::update_toml_array_item,
            commands::config::delete_toml_array_item,
            // 系统工具
            commands::system::check_git_environment,
            commands::system::check_connectivity,
            // API 供应商管理
            commands::system::get_api_providers,
            commands::system::create_api_provider,
            commands::system::update_api_provider,
            commands::system::delete_api_provider,
            commands::system::save_all_providers,
            commands::system::fetch_provider_models,
            // 计划任务管理
            commands::schedule::list_schedules,
            commands::schedule::get_schedule,
            commands::schedule::create_schedule,
            commands::schedule::update_schedule,
            commands::schedule::delete_schedule,
            commands::schedule::toggle_schedule,
            // 统计数据
            commands::stats::get_stats_overview,
            commands::stats::get_aggregated_stats,
            commands::stats::get_instance_stats,
            commands::stats::get_instance_model_stats,
            // 日志管理
            commands::logs::save_frontend_logs,
            commands::logs::list_log_files,
            commands::logs::get_log_content,
            commands::logs::export_logs,
            commands::logs::clear_logs,
            // 消息队列
            commands::logs::get_instance_message_queue,
            commands::logs::get_all_message_queues,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 应用运行失败");
}

use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;
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

// 后端进程状态（双轨期间保留，用于管理 Python 后端进程）
struct BackendProcess(Mutex<Option<Child>>);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 启动后端进程（双轨期间保留）
fn start_backend(app_handle: &tauri::AppHandle) -> Result<Child, String> {
    #[cfg(debug_assertions)]
    {
        // 开发模式：使用 Python 直接运行
        let backend_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?
            .parent()
            .ok_or("无法获取父目录")?
            .parent()
            .ok_or("无法获取工作区目录")?
            .join("backend");

        println!("开发模式启动后端: {:?}", backend_dir);
        
        Command::new("python3")
            .arg("main.py")
            .current_dir(backend_dir)
            .spawn()
            .map_err(|e| format!("启动后端失败: {}", e))
    }
    
    #[cfg(not(debug_assertions))]
    {
        // 生产模式：使用打包的可执行文件
        let resource_dir = app_handle.path().resource_dir()
            .map_err(|e| format!("无法获取资源目录: {}", e))?;
        
        let backend_exe = if cfg!(target_os = "windows") {
            resource_dir.join("backend-dist").join("mai-backend").join("mai-backend.exe")
        } else {
            resource_dir.join("backend-dist").join("mai-backend").join("mai-backend")
        };

        println!("生产模式启动后端: {:?}", backend_exe);
        
        if !backend_exe.exists() {
            return Err(format!("后端可执行文件不存在: {:?}", backend_exe));
        }

        let app_data_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
        
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("无法创建应用数据目录: {}", e))?;

        Command::new(&backend_exe)
            .current_dir(app_data_dir)
            .spawn()
            .map_err(|e| format!("启动后端失败: {}", e))
    }
}

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
    // 初始化 tracing 日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
        )
        .init();

    // 在 tokio 运行时中初始化 Rust 服务
    let rt = tokio::runtime::Runtime::new().expect("无法创建 Tokio 运行时");
    let app_state = rt.block_on(init_rust_services());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 启动 Python 后端进程（双轨期间保留）
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                
                match start_backend(&app_handle) {
                    Ok(child) => {
                        info!("Python 后端进程已启动，PID: {:?}", child.id());
                        if let Some(backend_state) = app_handle.try_state::<BackendProcess>() {
                            *backend_state.0.lock().unwrap() = Some(child);
                        }
                    }
                    Err(e) => {
                        tracing::error!("启动 Python 后端失败: {}", e);
                    }
                }
            });

            Ok(())
        })
        .manage(app_state)
        .manage(BackendProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
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
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 关闭窗口时终止后端进程
                if let Some(backend_state) = window.app_handle().try_state::<BackendProcess>() {
                    if let Some(mut child) = backend_state.0.lock().unwrap().take() {
                        info!("正在终止 Python 后端进程...");
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Tauri 应用运行失败");
}

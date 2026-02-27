use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;

// 模块声明
mod commands;
mod services;
mod models;
mod db;
mod errors;
mod utils;

// 后端进程状态
struct BackendProcess(Mutex<Option<Child>>);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 启动后端进程
fn start_backend(app_handle: &tauri::AppHandle) -> Result<Child, String> {
    #[cfg(debug_assertions)]
    {
        // 开发模式：使用 Python 直接运行
        let backend_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?
            .parent()
            .ok_or("Failed to get parent directory")?
            .parent()
            .ok_or("Failed to get workspace directory")?
            .join("backend");

        println!("Starting backend in development mode from: {:?}", backend_dir);
        
        Command::new("python3")
            .arg("main.py")
            .current_dir(backend_dir)
            .spawn()
            .map_err(|e| format!("Failed to start backend: {}", e))
    }
    
    #[cfg(not(debug_assertions))]
    {
        // 生产模式：使用打包的可执行文件
        let resource_dir = app_handle.path().resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?;
        
        let backend_exe = if cfg!(target_os = "windows") {
            resource_dir.join("backend-dist").join("mai-backend").join("mai-backend.exe")
        } else {
            resource_dir.join("backend-dist").join("mai-backend").join("mai-backend")
        };

        println!("Starting backend from: {:?}", backend_exe);
        
        if !backend_exe.exists() {
            return Err(format!("Backend executable not found: {:?}", backend_exe));
        }

        // 设置工作目录为应用数据目录，以便后端可以创建 data 文件夹
        let app_data_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        
        // 确保数据目录存在
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;

        Command::new(&backend_exe)
            .current_dir(app_data_dir)
            .spawn()
            .map_err(|e| format!("Failed to start backend: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

            // 启动后端进程
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                // 等待一小段时间确保应用初始化完成
                std::thread::sleep(std::time::Duration::from_millis(500));
                
                match start_backend(&app_handle) {
                    Ok(child) => {
                        println!("Backend process started with PID: {:?}", child.id());
                        if let Some(backend_state) = app_handle.try_state::<BackendProcess>() {
                            *backend_state.0.lock().unwrap() = Some(child);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to start backend: {}", e);
                    }
                }
            });

            Ok(())
        })
        .manage(BackendProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![greet])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // 关闭窗口时终止后端进程
                if let Some(backend_state) = window.app_handle().try_state::<BackendProcess>() {
                    if let Some(mut child) = backend_state.0.lock().unwrap().take() {
                        println!("Terminating backend process...");
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

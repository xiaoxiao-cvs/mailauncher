// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<std::process::Child>>);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())        .setup(|app| {
            // 获取应用目录
            let app_dir = app.path().app_data_dir().expect("无法获取应用目录");            let resource_path = app_dir.parent()
                .unwrap()
                .join("resources")
                .join("backend.exe");
              // 如果资源文件不存在，尝试开发模式路径
            let backend_exe = if resource_path.exists() {
                resource_path
            } else {
                // 开发模式下的路径
                std::env::current_dir()
                    .unwrap()
                    .join("resources")
                    .join("backend.exe")
            };
            
            println!("🔍 尝试启动后端: {:?}", backend_exe);
            
            // 获取用户数据目录用于日志
            let logs_dir = app.path().app_data_dir()
                .expect("无法获取应用数据目录")
                .join("logs");
            
            // 确保日志目录存在
            std::fs::create_dir_all(&logs_dir).ok();
            
            // 启动Python进程（固定端口23456）并设置日志目录
            let backend_process = Command::new(&backend_exe)
                .env("LOGS_DIR", logs_dir.to_string_lossy().to_string())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("启动后端失败");
            
            // 保存进程引用
            app.manage(BackendProcess(Mutex::new(Some(backend_process))));
            
            // 打印启动信息
            println!("✅ 后端进程已启动，端口:23456");
            
            Ok(())
        }).on_window_event(|app_handle, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // 应用关闭时结束后端进程
                let backend_state = app_handle.state::<BackendProcess>();
                let mut process_guard = backend_state.0.lock().unwrap();
                if let Some(mut process) = process_guard.take() {
                    let _ = process.kill();
                    println!("🛑 后端进程已终止");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

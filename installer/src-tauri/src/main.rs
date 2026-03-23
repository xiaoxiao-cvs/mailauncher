// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod install;

use install::InstallProgress;

/// 让用户选择安装目录
#[tauri::command]
async fn select_install_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri::Manager;
    let window = app.get_webview_window("main").ok_or("no main window")?;

    let dialog = tauri::dialog::FileDialogBuilder::new(window.as_ref());
    // 使用 blocking 版本做文件夹选择
    let (tx, rx) = tokio::sync::oneshot::channel();
    dialog.pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });

    rx.await
        .map_err(|e| e.to_string())
}

/// 开始安装流程
#[tauri::command]
async fn start_install(app: tauri::AppHandle, path: String) -> Result<(), String> {
    install::run_install(app, &path).await.map_err(|e| e.to_string())
}

/// 完成安装，可选启动主程序
#[tauri::command]
async fn finish_install(launch: bool) -> Result<(), String> {
    if launch {
        install::launch_app().map_err(|e| e.to_string())?;
    }
    // 退出安装器
    std::process::exit(0);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_install_path,
            start_install,
            finish_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running installer");
}

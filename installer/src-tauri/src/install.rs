use serde::Serialize;
use std::path::Path;
use std::process::Command;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct InstallProgress {
    pub percent: u32,
    pub stage: String,
    pub detail: String,
}

/// 向前端发送进度事件
fn emit_progress(app: &tauri::AppHandle, percent: u32, stage: &str, detail: &str) {
    let _ = app.emit(
        "install-progress",
        InstallProgress {
            percent,
            stage: stage.to_string(),
            detail: detail.to_string(),
        },
    );
}

/// 执行安装流程
///
/// 整体思路：
/// 1. 从自身资源中提取内嵌的主应用 NSIS 安装包
/// 2. 静默运行 NSIS 安装包 (/S /D=path)
/// 3. 做额外的后处理（快捷方式等）
/// 4. 清理临时文件
pub async fn run_install(app: tauri::AppHandle, install_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let install_dir = Path::new(install_path);

    // Step 1: 准备
    emit_progress(&app, 5, "准备中", "正在检查安装环境...");
    std::fs::create_dir_all(install_dir)?;

    // Step 2: 提取内嵌安装包
    emit_progress(&app, 15, "解压文件", "正在提取安装程序...");

    // TODO: 实际实现中，NSIS 安装包会作为 Tauri resource 嵌入
    // 这里先用占位逻辑，后续替换为真实的资源提取代码
    //
    // 示例：
    // let resource_path = app.path().resource_dir()?.join("MAI-Launcher-Setup.exe");
    // let temp_installer = tempfile::Builder::new()
    //     .suffix(".exe")
    //     .tempfile()?;
    // std::fs::copy(&resource_path, temp_installer.path())?;

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Step 3: 执行静默安装
    emit_progress(&app, 30, "安装组件", "正在安装主程序...");

    // TODO: 实际调用 NSIS 静默安装
    //
    // 示例：
    // let status = Command::new(temp_installer.path())
    //     .args(["/S", &format!("/D={}", install_path)])
    //     .status()?;
    // if !status.success() {
    //     return Err("NSIS installer failed".into());
    // }

    // 模拟安装过程的各阶段
    for (pct, stage, detail) in [
        (45, "安装组件", "正在释放程序文件..."),
        (60, "安装组件", "正在安装运行时依赖..."),
        (75, "配置环境", "正在配置应用数据..."),
        (90, "创建快捷方式", "正在创建桌面快捷方式..."),
    ] {
        tokio::time::sleep(tokio::time::Duration::from_millis(600)).await;
        emit_progress(&app, pct, stage, detail);
    }

    // Step 4: 完成
    emit_progress(&app, 100, "安装完成", "所有组件已安装完成");

    Ok(())
}

/// 启动主应用
pub fn launch_app() -> Result<(), Box<dyn std::error::Error>> {
    // TODO: 根据实际安装路径启动主程序
    //
    // 示例：
    // Command::new("C:\\Program Files\\MAI Launcher\\MAI Launcher.exe")
    //     .spawn()?;

    log::info!("Launching MAI Launcher...");
    Ok(())
}

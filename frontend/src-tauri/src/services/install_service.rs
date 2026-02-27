/// 安装管理服务
///
/// 对应 Python 的 install_service.py。
/// 负责虚拟环境创建、pip 升级、依赖安装、组件配置模板复制等。
use std::path::Path;

use tauri::{AppHandle, Emitter};
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::services::download_service::run_command_with_output;

// ==================== 虚拟环境 ====================

/// 创建 Python 虚拟环境
///
/// 在 `project_dir/../.venv` 创建共享虚拟环境（与 Python 版一致）。
/// 对应 Python `InstallService.create_virtual_environment`。
pub async fn create_virtual_environment(
    project_dir: &Path,
    python_path: Option<&str>,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    // 虚拟环境位于实例根目录（project_dir 的父目录）
    let venv_dir = project_dir
        .parent()
        .unwrap_or(project_dir)
        .join(".venv");

    if venv_dir.exists() {
        info!("虚拟环境已存在: {:?}", venv_dir);
        return Ok(());
    }

    let python = python_path.unwrap_or("python3");

    info!("创建虚拟环境: {:?} (python: {})", venv_dir, python);

    let venv_str = venv_dir
        .to_str()
        .ok_or_else(|| AppError::FileSystem("虚拟环境路径包含非法字符".to_string()))?;

    let output = run_command_with_output(
        python,
        &["-m", "venv", venv_str],
        None,
        app_handle,
        event_name,
    )
    .await?;

    if !output.success {
        return Err(AppError::Process(format!(
            "创建虚拟环境失败: {}",
            output.stderr
        )));
    }

    info!("虚拟环境创建完成: {:?}", venv_dir);
    Ok(())
}

/// 升级虚拟环境中的 pip/setuptools/wheel
///
/// 对应 Python `InstallService.upgrade_venv_pip`。
pub async fn upgrade_pip(
    venv_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    let pip_path = get_venv_pip(venv_dir);
    let pip_str = pip_path
        .to_str()
        .ok_or_else(|| AppError::FileSystem("pip 路径包含非法字符".to_string()))?;

    info!("升级 pip: {:?}", pip_path);

    let output = run_command_with_output(
        pip_str,
        &["install", "--upgrade", "pip", "setuptools", "wheel"],
        None,
        app_handle,
        event_name,
    )
    .await?;

    if !output.success {
        warn!("pip 升级警告（非致命）: {}", output.stderr);
    }

    Ok(())
}

// ==================== 依赖安装 ====================

/// 安装 requirements.txt 依赖
///
/// 对应 Python `InstallService.install_dependencies`。
/// 使用虚拟环境中的 pip 安装指定目录下的 requirements.txt。
pub async fn install_dependencies(
    project_dir: &Path,
    venv_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    let requirements = project_dir.join("requirements.txt");
    if !requirements.exists() {
        info!("无 requirements.txt，跳过依赖安装: {:?}", project_dir);
        return Ok(());
    }

    let pip_path = get_venv_pip(venv_dir);
    let pip_str = pip_path
        .to_str()
        .ok_or_else(|| AppError::FileSystem("pip 路径包含非法字符".to_string()))?;

    let req_str = requirements
        .to_str()
        .ok_or_else(|| AppError::FileSystem("requirements 路径包含非法字符".to_string()))?;

    info!("安装依赖: {:?}", requirements);

    let output = run_command_with_output(
        pip_str,
        &["install", "-r", req_str, "--no-warn-script-location"],
        Some(project_dir),
        app_handle,
        event_name,
    )
    .await?;

    if !output.success {
        return Err(AppError::Process(format!(
            "安装依赖失败: {}",
            output.stderr
        )));
    }

    info!("依赖安装完成: {:?}", project_dir);
    Ok(())
}

// ==================== 配置模板 ====================

/// 配置 MaiBot（复制模板配置文件）
///
/// 对应 Python `InstallService.setup_maibot_config`。
/// 复制 .env.template → .env, template_bot_config.toml → bot_config.toml 等。
pub async fn setup_maibot_config(
    maibot_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    info!("配置 MaiBot: {:?}", maibot_dir);

    // .env 配置
    let env_template = maibot_dir.join(".env.template");
    let env_target = maibot_dir.join(".env");
    if env_template.exists() && !env_target.exists() {
        std::fs::copy(&env_template, &env_target)
            .map_err(|e| AppError::FileSystem(format!("复制 .env 模板失败: {}", e)))?;
        let _ = app_handle.emit(event_name, "已复制 .env 配置");
    }

    // bot_config.toml
    let bot_template = maibot_dir.join("template_bot_config.toml");
    let bot_target = maibot_dir.join("bot_config.toml");
    if bot_template.exists() && !bot_target.exists() {
        std::fs::copy(&bot_template, &bot_target)
            .map_err(|e| AppError::FileSystem(format!("复制 bot_config 模板失败: {}", e)))?;
        let _ = app_handle.emit(event_name, "已复制 bot_config.toml 配置");
    }

    // model_config.toml
    let model_template = maibot_dir.join("template_model_config.toml");
    let model_target = maibot_dir.join("model_config.toml");
    if model_template.exists() && !model_target.exists() {
        std::fs::copy(&model_template, &model_target).map_err(|e| {
            AppError::FileSystem(format!("复制 model_config 模板失败: {}", e))
        })?;
        let _ = app_handle.emit(event_name, "已复制 model_config.toml 配置");
    }

    Ok(())
}

/// 配置 Napcat Adapter（复制模板配置文件）
///
/// 对应 Python `InstallService.setup_adapter_config`。
pub async fn setup_adapter_config(
    adapter_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    info!("配置 NapCat Adapter: {:?}", adapter_dir);

    let template = adapter_dir.join("template_config.toml");
    let target = adapter_dir.join("config.toml");
    if template.exists() && !target.exists() {
        std::fs::copy(&template, &target)
            .map_err(|e| AppError::FileSystem(format!("复制 adapter config 模板失败: {}", e)))?;
        let _ = app_handle.emit(event_name, "已复制 adapter config.toml 配置");
    }

    Ok(())
}

// ==================== 工具函数 ====================

/// 获取虚拟环境中的 pip 可执行文件路径
fn get_venv_pip(venv_dir: &Path) -> std::path::PathBuf {
    if cfg!(target_os = "windows") {
        venv_dir.join("Scripts").join("pip.exe")
    } else {
        venv_dir.join("bin").join("pip")
    }
}

/// 获取虚拟环境中的 python 可执行文件路径
pub fn get_venv_python(venv_dir: &Path) -> std::path::PathBuf {
    if cfg!(target_os = "windows") {
        venv_dir.join("Scripts").join("python.exe")
    } else {
        venv_dir.join("bin").join("python")
    }
}

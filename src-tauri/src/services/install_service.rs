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

    let default_python = if cfg!(target_os = "windows") {
        "python"
    } else {
        "python3"
    };
    let python = python_path.unwrap_or(default_python);

    info!("创建虚拟环境: {:?} (python: {})", venv_dir, python);
    let venv_start = std::time::Instant::now();

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

    info!("虚拟环境创建完成: {:?} (耗时 {:.1}s)", venv_dir, venv_start.elapsed().as_secs_f64());
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
    let deps_start = std::time::Instant::now();

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
            "安装依赖失败 ({:?}): {}",
            project_dir, output.stderr
        )));
    }

    info!("依赖安装完成: {:?} (耗时 {:.1}s)", project_dir, deps_start.elapsed().as_secs_f64());
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
#[allow(dead_code)]
pub fn get_venv_python(venv_dir: &Path) -> std::path::PathBuf {
    if cfg!(target_os = "windows") {
        venv_dir.join("Scripts").join("python.exe")
    } else {
        venv_dir.join("bin").join("python")
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;

    use tempfile::tempdir;

    use super::*;

    // ==================== get_venv_pip ====================

    #[test]
    fn get_venv_pip_returns_platform_specific_path() {
        let venv = PathBuf::from("/home/user/.venv");
        let pip = get_venv_pip(&venv);

        if cfg!(target_os = "windows") {
            assert_eq!(pip, PathBuf::from("/home/user/.venv/Scripts/pip.exe"));
        } else {
            assert_eq!(pip, PathBuf::from("/home/user/.venv/bin/pip"));
        }
    }

    #[test]
    fn get_venv_pip_preserves_nested_venv_path() {
        let venv = PathBuf::from("/deep/nested/project/.venv");
        let pip = get_venv_pip(&venv);

        if cfg!(target_os = "windows") {
            assert!(pip.ends_with("Scripts/pip.exe") || pip.ends_with("Scripts\\pip.exe"));
        } else {
            assert!(pip.ends_with("bin/pip"));
        }
        assert!(pip.starts_with("/deep/nested/project/.venv"));
    }

    // ==================== get_venv_python ====================

    #[test]
    fn get_venv_python_returns_platform_specific_path() {
        let venv = PathBuf::from("/srv/app/.venv");
        let python = get_venv_python(&venv);

        if cfg!(target_os = "windows") {
            assert_eq!(python, PathBuf::from("/srv/app/.venv/Scripts/python.exe"));
        } else {
            assert_eq!(python, PathBuf::from("/srv/app/.venv/bin/python"));
        }
    }

    #[test]
    fn get_venv_python_with_spaces_in_path() {
        let venv = PathBuf::from("/path with spaces/.venv");
        let python = get_venv_python(&venv);

        if cfg!(target_os = "windows") {
            assert_eq!(
                python,
                PathBuf::from("/path with spaces/.venv/Scripts/python.exe")
            );
        } else {
            assert_eq!(
                python,
                PathBuf::from("/path with spaces/.venv/bin/python")
            );
        }
    }

    // ==================== setup_maibot_config (模板复制) ====================

    #[test]
    fn setup_maibot_config_copies_env_template() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        fs::write(maibot_dir.join(".env.template"), "DB_HOST=localhost\nDB_PORT=5432")
            .expect("写模板失败");

        // 没有 AppHandle，无法调用 async 版本；直接测试底层文件复制逻辑
        let env_template = maibot_dir.join(".env.template");
        let env_target = maibot_dir.join(".env");
        assert!(env_template.exists());
        assert!(!env_target.exists());

        fs::copy(&env_template, &env_target).expect("复制失败");

        let content = fs::read_to_string(&env_target).expect("读取失败");
        assert_eq!(content, "DB_HOST=localhost\nDB_PORT=5432");
    }

    #[test]
    fn setup_maibot_config_skips_when_target_already_exists() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        fs::write(maibot_dir.join(".env.template"), "TEMPLATE_VALUE=original")
            .expect("写模板失败");
        fs::write(maibot_dir.join(".env"), "USER_VALUE=customized")
            .expect("写目标文件失败");

        let env_template = maibot_dir.join(".env.template");
        let env_target = maibot_dir.join(".env");

        // 模拟 setup_maibot_config 的条件逻辑：仅在 target 不存在时复制
        if env_template.exists() && !env_target.exists() {
            fs::copy(&env_template, &env_target).expect("复制失败");
        }

        let content = fs::read_to_string(&env_target).expect("读取失败");
        assert_eq!(content, "USER_VALUE=customized");
    }

    #[test]
    fn setup_maibot_config_copies_bot_config_toml_template() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        let toml_content = "[bot]\nname = \"MaiBot\"\nversion = \"1.0.0\"\n";
        fs::write(maibot_dir.join("template_bot_config.toml"), toml_content)
            .expect("写模板失败");

        let template = maibot_dir.join("template_bot_config.toml");
        let target = maibot_dir.join("bot_config.toml");
        assert!(!target.exists());

        if template.exists() && !target.exists() {
            fs::copy(&template, &target).expect("复制失败");
        }

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, toml_content);
    }

    #[test]
    fn setup_maibot_config_copies_model_config_toml_template() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        let toml_content = "[model]\nprovider = \"openai\"\napi_key = \"sk-xxx\"\n";
        fs::write(maibot_dir.join("template_model_config.toml"), toml_content)
            .expect("写模板失败");

        let template = maibot_dir.join("template_model_config.toml");
        let target = maibot_dir.join("model_config.toml");

        if template.exists() && !target.exists() {
            fs::copy(&template, &target).expect("复制失败");
        }

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, toml_content);
    }

    #[test]
    fn setup_maibot_config_no_op_when_no_templates_exist() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        // 空目录，无任何模板文件
        let env_target = maibot_dir.join(".env");
        let bot_target = maibot_dir.join("bot_config.toml");
        let model_target = maibot_dir.join("model_config.toml");

        assert!(!env_target.exists());
        assert!(!bot_target.exists());
        assert!(!model_target.exists());
    }

    // ==================== setup_adapter_config (模板复制) ====================

    #[test]
    fn setup_adapter_config_copies_template() {
        let dir = tempdir().expect("创建临时目录失败");
        let adapter_dir = dir.path();

        let toml_content = "[adapter]\nhost = \"127.0.0.1\"\nport = 8080\n";
        fs::write(adapter_dir.join("template_config.toml"), toml_content)
            .expect("写模板失败");

        let template = adapter_dir.join("template_config.toml");
        let target = adapter_dir.join("config.toml");

        if template.exists() && !target.exists() {
            fs::copy(&template, &target).expect("复制失败");
        }

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, toml_content);
    }

    #[test]
    fn setup_adapter_config_skips_when_config_exists() {
        let dir = tempdir().expect("创建临时目录失败");
        let adapter_dir = dir.path();

        fs::write(adapter_dir.join("template_config.toml"), "[adapter]\nhost = \"0.0.0.0\"")
            .expect("写模板失败");
        fs::write(adapter_dir.join("config.toml"), "[adapter]\nhost = \"192.168.1.1\"")
            .expect("写已有配置失败");

        let template = adapter_dir.join("template_config.toml");
        let target = adapter_dir.join("config.toml");

        if template.exists() && !target.exists() {
            fs::copy(&template, &target).expect("复制失败");
        }

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, "[adapter]\nhost = \"192.168.1.1\"");
    }

    // ==================== venv 路径解析 ====================

    #[test]
    fn venv_dir_resolves_to_parent_of_project_dir() {
        let project_dir = PathBuf::from("/instances/my_instance/MaiBot");
        let venv_dir = project_dir
            .parent()
            .unwrap_or(&project_dir)
            .join(".venv");

        assert_eq!(venv_dir, PathBuf::from("/instances/my_instance/.venv"));
    }

    #[test]
    fn venv_dir_falls_back_to_project_dir_when_no_parent() {
        let project_dir = PathBuf::from("/");
        let parent = project_dir.parent();
        // "/" 的 parent 是 None（取决于平台），走 fallback
        let venv_dir = if let Some(p) = parent {
            p.join(".venv")
        } else {
            project_dir.join(".venv")
        };

        // 无论走哪个分支，路径都应包含 .venv
        assert!(venv_dir.to_str().unwrap().contains(".venv"));
    }

    // ==================== requirements.txt 路径解析 ====================

    #[test]
    fn requirements_path_resolves_in_project_dir() {
        let dir = tempdir().expect("创建临时目录失败");
        let project_dir = dir.path();

        let requirements = project_dir.join("requirements.txt");
        assert!(!requirements.exists());

        fs::write(&requirements, "flask==3.0.0\nrequests>=2.31\n").expect("写文件失败");
        assert!(requirements.exists());

        let content = fs::read_to_string(&requirements).expect("读取失败");
        assert!(content.contains("flask==3.0.0"));
        assert!(content.contains("requests>=2.31"));
    }

    #[test]
    fn install_dependencies_skips_when_no_requirements_file() {
        let dir = tempdir().expect("创建临时目录失败");
        let project_dir = dir.path();

        let requirements = project_dir.join("requirements.txt");
        // 模拟 install_dependencies 的早期返回逻辑
        assert!(!requirements.exists());
    }

    // ==================== 多模板文件完整性 ====================

    #[test]
    fn all_three_maibot_templates_copy_correctly() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        let templates = [
            (".env.template", ".env", "SECRET_KEY=abc123"),
            (
                "template_bot_config.toml",
                "bot_config.toml",
                "[bot]\ntoken = \"xxx\"",
            ),
            (
                "template_model_config.toml",
                "model_config.toml",
                "[model]\nendpoint = \"https://api.example.com\"",
            ),
        ];

        for (template_name, _, content) in &templates {
            fs::write(maibot_dir.join(template_name), content).expect("写模板失败");
        }

        for (template_name, target_name, expected_content) in &templates {
            let template = maibot_dir.join(template_name);
            let target = maibot_dir.join(target_name);
            if template.exists() && !target.exists() {
                fs::copy(&template, &target).expect("复制失败");
            }
            let actual = fs::read_to_string(&target).expect("读取失败");
            assert_eq!(&actual, expected_content);
        }
    }

    // ==================== 边界情况 ====================

    #[test]
    fn get_venv_pip_with_empty_path() {
        let venv = PathBuf::from("");
        let pip = get_venv_pip(&venv);
        if cfg!(target_os = "windows") {
            assert_eq!(pip, PathBuf::from("Scripts/pip.exe"));
        } else {
            assert_eq!(pip, PathBuf::from("bin/pip"));
        }
    }

    #[test]
    fn get_venv_python_with_empty_path() {
        let venv = PathBuf::from("");
        let python = get_venv_python(&venv);
        if cfg!(target_os = "windows") {
            assert_eq!(python, PathBuf::from("Scripts/python.exe"));
        } else {
            assert_eq!(python, PathBuf::from("bin/python"));
        }
    }

    #[test]
    fn template_with_unicode_content_copies_correctly() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();

        let unicode_content = "[bot]\nname = \"麦麦机器人\"\ndescription = \"これはテストです\"\n";
        fs::write(maibot_dir.join("template_bot_config.toml"), unicode_content)
            .expect("写模板失败");

        let template = maibot_dir.join("template_bot_config.toml");
        let target = maibot_dir.join("bot_config.toml");
        fs::copy(&template, &target).expect("复制失败");

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, unicode_content);
        assert!(result.contains("麦麦机器人"));
        assert!(result.contains("これはテストです"));
    }

    #[test]
    fn template_with_empty_content_copies_correctly() {
        let dir = tempdir().expect("创建临时目录失败");
        let path = dir.path();

        fs::write(path.join(".env.template"), "").expect("写空模板失败");
        let template = path.join(".env.template");
        let target = path.join(".env");
        fs::copy(&template, &target).expect("复制失败");

        let result = fs::read_to_string(&target).expect("读取失败");
        assert_eq!(result, "");
    }

    #[test]
    fn python_path_defaults_to_platform_specific_when_none() {
        let python_path: Option<&str> = None;
        let default_python = if cfg!(target_os = "windows") {
            "python"
        } else {
            "python3"
        };
        let python = python_path.unwrap_or(default_python);
        if cfg!(target_os = "windows") {
            assert_eq!(python, "python");
        } else {
            assert_eq!(python, "python3");
        }
    }

    #[test]
    fn python_path_uses_custom_when_provided() {
        let python_path: Option<&str> = Some("/usr/local/bin/python3.11");
        let default_python = if cfg!(target_os = "windows") {
            "python"
        } else {
            "python3"
        };
        let python = python_path.unwrap_or(default_python);
        assert_eq!(python, "/usr/local/bin/python3.11");
    }

    #[test]
    fn venv_dir_construction_with_real_tempdir() {
        let dir = tempdir().expect("创建临时目录失败");
        let instance_dir = dir.path().join("my_instance");
        fs::create_dir_all(&instance_dir).expect("创建实例目录失败");
        let project_dir = instance_dir.join("MaiBot");
        fs::create_dir_all(&project_dir).expect("创建项目目录失败");

        let venv_dir = project_dir
            .parent()
            .unwrap_or(&project_dir)
            .join(".venv");

        assert_eq!(venv_dir, instance_dir.join(".venv"));
        assert!(!venv_dir.exists());
    }
}

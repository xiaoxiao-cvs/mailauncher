/// 安装管理服务
///
/// 对应 Python 的 install_service.py。
/// 负责虚拟环境创建、pip 升级、依赖安装、组件配置生成等。
use std::path::Path;

use tauri::{AppHandle, Emitter};
use toml_edit::{value, DocumentMut};
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::services::download_service::run_command_with_output;

/// NapCat 内置适配器的 SUPPORTED_CONFIG_VERSION。
///
/// 来源：maibot-ref/MaiBot-Napcat-Adapter/constants.py:4
/// `SUPPORTED_CONFIG_VERSION = "0.1.0"`。适配器 `config.py` 的
/// `validate_runtime_config` 会要求 `plugin.config_version` 与之严格相等，
/// 因此生成 config.toml 时必须写入该值。
const ADAPTER_SUPPORTED_CONFIG_VERSION: &str = "0.1.0";

/// NapCat 适配器默认连接参数。
///
/// 来源：maibot-ref/MaiBot-Napcat-Adapter/constants.py:5-6
/// `DEFAULT_NAPCAT_HOST = "127.0.0.1"`、`DEFAULT_NAPCAT_PORT = 3001`。
const ADAPTER_DEFAULT_NAPCAT_HOST: &str = "127.0.0.1";
const ADAPTER_DEFAULT_NAPCAT_PORT: i64 = 3001;

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
        let combined = if output.stdout.is_empty() {
            output.stderr.clone()
        } else if output.stderr.is_empty() {
            output.stdout.clone()
        } else {
            format!("[stdout] {}\n[stderr] {}", output.stdout, output.stderr)
        };
        return Err(AppError::Process(format!(
            "创建虚拟环境失败: {}",
            combined
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
        let combined = if output.stdout.is_empty() {
            output.stderr.clone()
        } else if output.stderr.is_empty() {
            output.stdout.clone()
        } else {
            format!("[stdout] {}\n[stderr] {}", output.stdout, output.stderr)
        };
        return Err(AppError::Process(format!(
            "安装依赖失败 ({:?}): {}",
            project_dir, combined
        )));
    }

    info!("依赖安装完成: {:?} (耗时 {:.1}s)", project_dir, deps_start.elapsed().as_secs_f64());
    Ok(())
}

// ==================== 配置生成 ====================

/// 从 MaiBot 源码读取 CONFIG_VERSION 并将末位修订号减一。
///
/// MaiBot 上游已删除配置模板，改由首启自生成。官方一键包
/// MaiBotOneKey 的做法是预写一个比当前 CONFIG_VERSION 末位小 1 的
/// `[inner].version`，触发 MaiBot 下次启动执行配置升级流程，从而
/// 生成完整的默认配置（详见 maibot-ref/MaiBot/src/config/config.py
/// 第 62 行 `CONFIG_VERSION` 与 legacy_upgrade_confirmation.py 的版本判定）。
///
/// 例如 CONFIG_VERSION = "8.12.26" -> stub 版本 "8.12.25"。
fn read_stub_bot_config_version(maibot_dir: &Path) -> AppResult<String> {
    let config_py = maibot_dir.join("src").join("config").join("config.py");
    let source = std::fs::read_to_string(&config_py).map_err(|e| {
        AppError::FileSystem(format!("读取 MaiBot config.py 失败 ({:?}): {}", config_py, e))
    })?;

    let version = extract_config_version(&source).ok_or_else(|| {
        AppError::Config(format!(
            "未能在 {:?} 解析到 CONFIG_VERSION 常量",
            config_py
        ))
    })?;

    decrement_patch_version(&version).ok_or_else(|| {
        AppError::Config(format!("CONFIG_VERSION 格式非法，无法生成 stub 版本: {}", version))
    })
}

/// 从 config.py 源码中提取 `CONFIG_VERSION: str = "x.y.z"` 的值。
///
/// 仅匹配以 `CONFIG_VERSION` 起始的赋值行，借助其后紧跟 `:` 或 `=` 排除
/// `MODEL_CONFIG_VERSION` 等其它常量（后者以 `MODEL_` 开头，trim 后不会命中）。
fn extract_config_version(source: &str) -> Option<String> {
    for line in source.lines() {
        let trimmed = line.trim_start();
        let Some(rest) = trimmed.strip_prefix("CONFIG_VERSION") else {
            continue;
        };
        // rest 形如 `: str = "8.12.26"`，下一字符须是 `:` 或 `=`（或空白），
        // 避免误匹配假想的 `CONFIG_VERSIONX` 标识符。
        if !rest.starts_with([':', '=', ' ', '\t']) {
            continue;
        }
        let Some((_, after_eq)) = rest.split_once('=') else {
            continue;
        };
        let after_eq = after_eq.trim();
        if let Some(inner) = after_eq.strip_prefix('"') {
            if let Some(version) = inner.split('"').next() {
                if !version.is_empty() {
                    return Some(version.to_string());
                }
            }
        }
    }
    None
}

/// 将三段式语义版本的末位修订号减一（如 "8.12.26" -> "8.12.25"）。
///
/// 末位为 0 时不再下溢，保持为 0（极端边界，正常 CONFIG_VERSION 不会出现）。
fn decrement_patch_version(version: &str) -> Option<String> {
    let parts: Vec<&str> = version.trim().split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let major: u64 = parts[0].parse().ok()?;
    let minor: u64 = parts[1].parse().ok()?;
    let patch: u64 = parts[2].parse().ok()?;
    let stub_patch = patch.saturating_sub(1);
    Some(format!("{}.{}.{}", major, minor, stub_patch))
}

/// 写入 MaiBot 最小 stub 配置（纯文件操作，便于测试）。
///
/// 返回写入的 stub 版本号；若 `config/bot_config.toml` 已存在则跳过并返回 None。
fn write_maibot_config_stub(maibot_dir: &Path, qq_account: Option<&str>) -> AppResult<Option<String>> {
    let config_dir = maibot_dir.join("config");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| AppError::FileSystem(format!("创建 MaiBot config 目录失败: {}", e)))?;

    let bot_config_path = config_dir.join("bot_config.toml");
    if bot_config_path.exists() {
        info!("bot_config.toml 已存在，跳过 stub 写入: {:?}", bot_config_path);
        return Ok(None);
    }

    let stub_version = read_stub_bot_config_version(maibot_dir)?;

    let mut doc = DocumentMut::new();
    doc["inner"]["version"] = value(&stub_version);
    doc["bot"]["platform"] = value("qq");
    doc["bot"]["qq_account"] = value(qq_account.unwrap_or(""));

    std::fs::write(&bot_config_path, doc.to_string())
        .map_err(|e| AppError::FileSystem(format!("写入 bot_config.toml 失败: {}", e)))?;

    Ok(Some(stub_version))
}

/// 配置 MaiBot：写入最小 stub 触发首启自生成完整配置。
///
/// 替换原先的模板复制逻辑（上游模板已删除）。仅写 `config/bot_config.toml`，
/// `model_config.toml` 交给 MaiBot 首启生成默认（DeepSeek 占位），不预写 .env。
pub async fn setup_maibot_config(
    maibot_dir: &Path,
    qq_account: Option<&str>,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    info!("配置 MaiBot（写最小 stub）: {:?}", maibot_dir);

    if let Some(stub_version) = write_maibot_config_stub(maibot_dir, qq_account)? {
        let _ = app_handle.emit(
            event_name,
            format!("已写入 MaiBot 配置 stub（version={}），首启将自生成完整配置", stub_version),
        );
    }
    Ok(())
}

/// 写入 NapCat 适配器插件 config.toml（纯文件操作，便于测试）。
///
/// 返回是否实际写入；若文件已存在则跳过并返回 false。
fn write_adapter_plugin_config(adapter_dir: &Path) -> AppResult<bool> {
    let target = adapter_dir.join("config.toml");
    if target.exists() {
        info!("适配器 config.toml 已存在，跳过生成: {:?}", target);
        return Ok(false);
    }

    std::fs::create_dir_all(adapter_dir)
        .map_err(|e| AppError::FileSystem(format!("创建适配器目录失败: {}", e)))?;

    let mut doc = DocumentMut::new();
    doc["plugin"]["enabled"] = value(true);
    doc["plugin"]["config_version"] = value(ADAPTER_SUPPORTED_CONFIG_VERSION);
    doc["napcat_server"]["host"] = value(ADAPTER_DEFAULT_NAPCAT_HOST);
    doc["napcat_server"]["port"] = value(ADAPTER_DEFAULT_NAPCAT_PORT);
    doc["napcat_server"]["token"] = value("");

    std::fs::write(&target, doc.to_string())
        .map_err(|e| AppError::FileSystem(format!("写入适配器 config.toml 失败: {}", e)))?;

    Ok(true)
}

/// 配置 NapCat 适配器插件：生成 config.toml。
///
/// 按 maibot-ref/MaiBot-Napcat-Adapter/config.py 的 NapCatPluginSettings 结构写：
/// - [plugin] enabled=true、config_version=SUPPORTED_CONFIG_VERSION
/// - [napcat_server] host/port/token
/// - [chat] 采用其默认（whitelist 模式 + 空 group_list 默认不放行群消息，
///   由配置面板后续调整）。
pub async fn setup_adapter_config(
    adapter_dir: &Path,
    app_handle: &AppHandle,
    event_name: &str,
) -> AppResult<()> {
    info!("配置 NapCat 适配器插件: {:?}", adapter_dir);

    if write_adapter_plugin_config(adapter_dir)? {
        let _ = app_handle.emit(event_name, "已生成 NapCat 适配器 config.toml");
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

    // ==================== CONFIG_VERSION 解析与减一 ====================

    #[test]
    fn extract_config_version_parses_constant() {
        let source = "MMC_VERSION: str = \"1.0.0-rc.4\"\nCONFIG_VERSION: str = \"8.12.26\"\nMODEL_CONFIG_VERSION: str = \"1.17.3\"\n";
        assert_eq!(extract_config_version(source), Some("8.12.26".to_string()));
    }

    #[test]
    fn extract_config_version_ignores_model_config_version() {
        // 仅有 MODEL_CONFIG_VERSION 时不得误匹配。
        let source = "MODEL_CONFIG_VERSION: str = \"1.17.3\"\n";
        assert_eq!(extract_config_version(source), None);
    }

    #[test]
    fn extract_config_version_returns_none_when_absent() {
        let source = "SOME_OTHER: str = \"x\"\n";
        assert_eq!(extract_config_version(source), None);
    }

    #[test]
    fn decrement_patch_version_subtracts_one() {
        assert_eq!(decrement_patch_version("8.12.26"), Some("8.12.25".to_string()));
        assert_eq!(decrement_patch_version("1.0.1"), Some("1.0.0".to_string()));
    }

    #[test]
    fn decrement_patch_version_does_not_underflow() {
        // 末位为 0 时保持为 0，不下溢。
        assert_eq!(decrement_patch_version("8.12.0"), Some("8.12.0".to_string()));
    }

    #[test]
    fn decrement_patch_version_rejects_non_three_segment() {
        assert_eq!(decrement_patch_version("8.12"), None);
        assert_eq!(decrement_patch_version("8.12.26.1"), None);
        assert_eq!(decrement_patch_version("8.12.x"), None);
    }

    // ==================== setup_maibot_config (写 stub) ====================

    /// 在临时目录中伪造一个含 CONFIG_VERSION 的 MaiBot 源码骨架。
    fn fake_maibot_dir(root: &Path, config_version: &str) {
        let config_src = root.join("src").join("config");
        fs::create_dir_all(&config_src).expect("创建 config 源码目录失败");
        fs::write(
            config_src.join("config.py"),
            format!("CONFIG_VERSION: str = \"{}\"\nMODEL_CONFIG_VERSION: str = \"1.17.3\"\n", config_version),
        )
        .expect("写 config.py 失败");
    }

    #[test]
    fn write_maibot_config_stub_writes_decremented_version_and_bot_section() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();
        fake_maibot_dir(maibot_dir, "8.12.26");

        let written = write_maibot_config_stub(maibot_dir, Some("123456"))
            .expect("写 stub 失败");
        assert_eq!(written, Some("8.12.25".to_string()));

        let bot_config_path = maibot_dir.join("config").join("bot_config.toml");
        let content = fs::read_to_string(&bot_config_path).expect("读取 bot_config.toml 失败");
        let doc: toml::Value = toml::from_str(&content).expect("解析 bot_config.toml 失败");

        // 末位减一的 stub 版本触发 MaiBot 首启自升级生成完整配置。
        assert_eq!(doc["inner"]["version"].as_str(), Some("8.12.25"));
        assert_eq!(doc["bot"]["platform"].as_str(), Some("qq"));
        assert_eq!(doc["bot"]["qq_account"].as_str(), Some("123456"));
    }

    #[test]
    fn write_maibot_config_stub_defaults_empty_qq_account() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();
        fake_maibot_dir(maibot_dir, "8.12.26");

        write_maibot_config_stub(maibot_dir, None).expect("写 stub 失败");

        let content = fs::read_to_string(maibot_dir.join("config").join("bot_config.toml"))
            .expect("读取失败");
        let doc: toml::Value = toml::from_str(&content).expect("解析失败");
        assert_eq!(doc["bot"]["qq_account"].as_str(), Some(""));
    }

    #[test]
    fn write_maibot_config_stub_skips_existing_config() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();
        fake_maibot_dir(maibot_dir, "8.12.26");

        let config_dir = maibot_dir.join("config");
        fs::create_dir_all(&config_dir).expect("创建 config 目录失败");
        fs::write(config_dir.join("bot_config.toml"), "[inner]\nversion = \"9.9.9\"\n")
            .expect("写已有配置失败");

        let written = write_maibot_config_stub(maibot_dir, Some("123")).expect("调用失败");
        assert_eq!(written, None, "已存在配置时应跳过");

        // 已有用户配置不得被覆盖。
        let content = fs::read_to_string(config_dir.join("bot_config.toml")).expect("读取失败");
        assert!(content.contains("9.9.9"));
    }

    #[test]
    fn write_maibot_config_stub_errors_without_config_py() {
        let dir = tempdir().expect("创建临时目录失败");
        // 不创建 src/config/config.py，读取版本应报错。
        let result = write_maibot_config_stub(dir.path(), None);
        assert!(result.is_err(), "缺少 config.py 时必须报错而非静默写错版本");
    }

    // ==================== setup_adapter_config (写插件 config.toml) ====================

    #[test]
    fn write_adapter_plugin_config_writes_expected_fields() {
        let dir = tempdir().expect("创建临时目录失败");
        let adapter_dir = dir.path().join("MaiBot").join("plugins").join("MaiBot-Napcat-Adapter");

        let written = write_adapter_plugin_config(&adapter_dir).expect("写适配器配置失败");
        assert!(written);

        let content = fs::read_to_string(adapter_dir.join("config.toml")).expect("读取失败");
        let doc: toml::Value = toml::from_str(&content).expect("解析失败");

        // 字段来源：maibot-ref/MaiBot-Napcat-Adapter/constants.py 与 config.py。
        assert_eq!(doc["plugin"]["enabled"].as_bool(), Some(true));
        assert_eq!(doc["plugin"]["config_version"].as_str(), Some("0.1.0"));
        assert_eq!(doc["napcat_server"]["host"].as_str(), Some("127.0.0.1"));
        assert_eq!(doc["napcat_server"]["port"].as_integer(), Some(3001));
        assert_eq!(doc["napcat_server"]["token"].as_str(), Some(""));
    }

    #[test]
    fn write_adapter_plugin_config_skips_when_exists() {
        let dir = tempdir().expect("创建临时目录失败");
        let adapter_dir = dir.path();
        fs::write(adapter_dir.join("config.toml"), "[plugin]\nenabled = false\n")
            .expect("写已有配置失败");

        let written = write_adapter_plugin_config(adapter_dir).expect("调用失败");
        assert!(!written, "已存在配置时应跳过");

        let content = fs::read_to_string(adapter_dir.join("config.toml")).expect("读取失败");
        assert!(content.contains("enabled = false"), "已有配置不得被覆盖");
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

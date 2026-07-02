/// 已装插件扫描服务
///
/// 扫描实例 `MaiBot/plugins/` 目录下各插件目录,读取 `_manifest.json` 取展示信息
/// (name/version/author/description),读取同目录 `config.toml` 的 `[plugin].enabled`
/// 取启用态。manifest 缺失或解析失败的插件目录降级为"无法解析"占位项,而不是让
/// 整体扫描失败——单个坏插件不应拖垮已装插件列表(对齐 P2-25)。
use std::path::Path;

use serde::{Deserialize, Serialize};

/// 单个已装插件的展示信息
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InstalledPlugin {
    /// 插件目录名(plugins/<dir_name>);manifest 缺失时是唯一可用标识
    pub dir_name: String,
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub enabled: bool,
    /// manifest 缺失或解析失败时置 true,前端据此展示降级提示而非当作正常插件渲染
    pub manifest_invalid: bool,
}

/// `_manifest.json` 的 `author` 字段(对象形式,对齐 MaiBot manifest_validator 的
/// `{ "name": ..., "url": ... }` 结构)
#[derive(Debug, Deserialize)]
struct ManifestAuthor {
    name: Option<String>,
}

/// `_manifest.json` 精简结构:仅取展示所需字段,其余(capabilities/i18n/urls 等)不关心
#[derive(Debug, Deserialize)]
struct ManifestFile {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    author: Option<ManifestAuthor>,
}

/// 插件目录下的保留名(非插件、运行时数据目录),扫描时跳过,
/// 对齐 MaiBot `manifest_validator.is_reserved_plugin_directory` 的约定。
const RESERVED_DIR_NAMES: &[&str] = &["data"];

/// 扫描实例 `MaiBot/plugins/` 下的已装插件。
///
/// `instance_root` 为实例根目录(`get_instances_dir().join(instance_path)`),本函数自行
/// 拼接 `MaiBot/plugins`。插件目录不存在(实例尚未装 MaiBot 或从未装过任何插件)时
/// 返回空 Vec,而非报错——这是正常空态,不是异常。
pub fn scan_installed_plugins(instance_root: &Path) -> Vec<InstalledPlugin> {
    let plugins_dir = instance_root.join("MaiBot").join("plugins");
    let Ok(entries) = std::fs::read_dir(&plugins_dir) else {
        return Vec::new();
    };

    let mut plugins: Vec<InstalledPlugin> = entries
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .filter_map(|entry| {
            let dir_name = entry.file_name().to_string_lossy().to_string();
            if RESERVED_DIR_NAMES.contains(&dir_name.as_str()) {
                return None;
            }
            Some(read_plugin_dir(&entry.path(), &dir_name))
        })
        .collect();

    plugins.sort_by(|a, b| a.name.cmp(&b.name));
    plugins
}

/// 读取单个插件目录:manifest 缺失/损坏时降级为 `manifest_invalid` 占位项,
/// enabled 态独立于 manifest 是否有效读取(config.toml 缺失时按"未配置=默认启用"处理)。
fn read_plugin_dir(path: &Path, dir_name: &str) -> InstalledPlugin {
    let manifest = std::fs::read_to_string(path.join("_manifest.json"))
        .ok()
        .and_then(|content| serde_json::from_str::<ManifestFile>(&content).ok());
    let enabled = read_enabled_flag(&path.join("config.toml"));

    match manifest {
        Some(m) => InstalledPlugin {
            dir_name: dir_name.to_string(),
            name: m.name.unwrap_or_else(|| dir_name.to_string()),
            version: m.version.unwrap_or_else(|| "0.0.0".to_string()),
            author: m.author.and_then(|a| a.name),
            description: m.description,
            enabled,
            manifest_invalid: false,
        },
        None => InstalledPlugin {
            dir_name: dir_name.to_string(),
            name: dir_name.to_string(),
            version: "未知".to_string(),
            author: None,
            description: None,
            enabled,
            manifest_invalid: true,
        },
    }
}

/// 读取插件 `config.toml` 的 `[plugin].enabled`;文件缺失/字段缺失/解析失败均默认 `true`
/// (插件尚未生成配置时视为沿用 MaiBot 加载器"首次加载即启用"的默认行为)。
fn read_enabled_flag(config_path: &Path) -> bool {
    let Ok(content) = std::fs::read_to_string(config_path) else {
        return true;
    };
    let Ok(value) = toml::from_str::<toml::Value>(&content) else {
        return true;
    };
    value
        .get("plugin")
        .and_then(|p| p.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write_manifest(dir: &Path, name: &str, version: &str, author: &str) {
        let content = format!(
            r#"{{
                "manifest_version": 2,
                "version": "{version}",
                "name": "{name}",
                "description": "测试插件",
                "author": {{ "name": "{author}" }},
                "id": "test.{name}"
            }}"#
        );
        fs::write(dir.join("_manifest.json"), content).expect("写 manifest 失败");
    }

    fn write_config(dir: &Path, enabled: bool) {
        let content = format!("[plugin]\nenabled = {enabled}\nconfig_version = \"1.0.0\"\n");
        fs::write(dir.join("config.toml"), content).expect("写 config.toml 失败");
    }

    #[test]
    fn scan_returns_empty_when_plugins_dir_missing() {
        let root = tempfile::tempdir().expect("创建临时目录失败");
        // 不创建 MaiBot/plugins,模拟尚未安装任何插件的实例
        let plugins = scan_installed_plugins(root.path());
        assert!(plugins.is_empty());
    }

    #[test]
    fn scan_parses_valid_manifest_and_config() {
        let root = tempfile::tempdir().expect("创建临时目录失败");
        let plugin_dir = root.path().join("MaiBot").join("plugins").join("demo");
        fs::create_dir_all(&plugin_dir).expect("创建插件目录失败");
        write_manifest(&plugin_dir, "Demo 插件", "1.2.3", "张三");
        write_config(&plugin_dir, false);

        let plugins = scan_installed_plugins(root.path());

        assert_eq!(plugins.len(), 1);
        let p = &plugins[0];
        assert_eq!(p.dir_name, "demo");
        assert_eq!(p.name, "Demo 插件");
        assert_eq!(p.version, "1.2.3");
        assert_eq!(p.author.as_deref(), Some("张三"));
        assert!(!p.enabled, "config.toml 显式 enabled=false 应被识别");
        assert!(!p.manifest_invalid);
    }

    #[test]
    fn scan_downgrades_corrupt_manifest_without_failing_whole_scan() {
        let root = tempfile::tempdir().expect("创建临时目录失败");
        let good_dir = root.path().join("MaiBot").join("plugins").join("good");
        let bad_dir = root.path().join("MaiBot").join("plugins").join("bad");
        fs::create_dir_all(&good_dir).expect("创建插件目录失败");
        fs::create_dir_all(&bad_dir).expect("创建插件目录失败");
        write_manifest(&good_dir, "Good 插件", "0.1.0", "李四");
        write_config(&good_dir, true);
        // 损坏的 JSON:非法语法
        fs::write(bad_dir.join("_manifest.json"), "{ not valid json").expect("写坏 manifest 失败");

        let mut plugins = scan_installed_plugins(root.path());
        plugins.sort_by(|a, b| a.dir_name.cmp(&b.dir_name));

        assert_eq!(plugins.len(), 2, "损坏 manifest 不应导致整体扫描失败或跳过该插件");
        let bad = plugins.iter().find(|p| p.dir_name == "bad").unwrap();
        assert!(bad.manifest_invalid);
        assert_eq!(bad.name, "bad", "manifest 无法解析时降级用目录名占位");
        let good = plugins.iter().find(|p| p.dir_name == "good").unwrap();
        assert!(!good.manifest_invalid);
        assert!(good.enabled);
    }

    #[test]
    fn scan_skips_reserved_data_directory() {
        let root = tempfile::tempdir().expect("创建临时目录失败");
        let data_dir = root.path().join("MaiBot").join("plugins").join("data");
        fs::create_dir_all(&data_dir).expect("创建 data 目录失败");

        let plugins = scan_installed_plugins(root.path());
        assert!(plugins.is_empty(), "data 是运行时保留目录,不应被当作插件");
    }

    #[test]
    fn missing_config_toml_defaults_to_enabled() {
        let root = tempfile::tempdir().expect("创建临时目录失败");
        let plugin_dir = root.path().join("MaiBot").join("plugins").join("no_config");
        fs::create_dir_all(&plugin_dir).expect("创建插件目录失败");
        write_manifest(&plugin_dir, "无配置插件", "1.0.0", "王五");
        // 不写 config.toml

        let plugins = scan_installed_plugins(root.path());
        assert_eq!(plugins.len(), 1);
        assert!(
            plugins[0].enabled,
            "尚未生成 config.toml 时应默认视为启用"
        );
    }
}

//! NapCat OneBot 网络配置注入
//!
//! NapCat 默认不开任何 OneBot 网络;而 MaiBot 内置的 napcat 适配器是 WS 客户端,需要 NapCat 开一个
//! 正向 WS 服务端(127.0.0.1:3001)供其连入。NapCat 的 `onebot11_<QQ>.json` 在用户首次扫码登录后
//! 才生成(且默认 `network.websocketServers` 为空),所以本模块幂等地往其中补一条 3001 正向 WS,
//! 让"装完即启即用",免去手动去 NapCat WebUI 配。
//!
//! 注入条目的 schema 取自 NapCat 真实写出的字段(2026-06-05 对照真机 onebot11 配置),不臆造。
//! 注意是 `websocketServers`(正向/NapCat 当服务端),不是 `websocketClients`(反向)。

use std::path::Path;

use tracing::{info, warn};

use crate::errors::{AppError, AppResult};

/// 为实例推导正向 WS 的鉴权 token。
///
/// NapCat 服务端与 MaiBot 适配器客户端两侧的 token 必须一致才能鉴权连上。两处配置在不同时机
/// 写入(适配器 config 在安装期、NapCat onebot 在登录后),无法互相读取,故用实例目录名 + 域分隔
/// 经 sha256 确定性推导:同一实例两侧算出的 token 恒等、非空,且不同实例互不相同。取实例目录名而非
/// 绝对路径,避免两侧路径写法差异(分隔符/末尾斜杠)导致不一致。
pub fn derive_ws_token(instance_root: &Path) -> String {
    derive_token(instance_root, b"|mailauncher-onebot-ws")
}

/// 为实例推导 NapCat WebUI 登录 token(与 WS token 同法但换域,避免两者复用同一值)。
/// 仅在启动器预创建 webui.json 时使用;若 webui.json 已由 NapCat 生成则保留其自带 token。
pub fn derive_webui_token(instance_root: &Path) -> String {
    derive_token(instance_root, b"|mailauncher-napcat-webui")
}

/// 按实例目录名 + 域分隔经 sha256 确定性推导 32 位 token。取目录名而非绝对路径,避免两侧路径
/// 写法差异(分隔符/末尾斜杠)导致不一致。
fn derive_token(instance_root: &Path, domain: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let seed = instance_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| instance_root.to_string_lossy().to_string());
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    hasher.update(domain);
    let hex: String = hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect();
    hex[..32].to_string()
}

/// 幂等确保实例下所有 NapCat onebot11 配置都开了 127.0.0.1:`port` 正向 WS;返回是否有文件被改动。
///
/// 端口取该实例分配的 `napcat_ws`(G10-1),不再全局硬编码 3001,使多实例各自监听独立端口。
/// 扫描 `<instance_root>/NapCat/config/onebot11_*.json`,若已存在 mailauncher 注入的正向 WS
/// 条目则把其端口对齐为 `port`(实例基址变更时纠偏),缺失则补一条。config 目录不存在(尚未登录)
/// 时返回 `Ok(false)`。单个文件损坏只记日志跳过、不阻断其余文件,也不阻断启动。
pub fn ensure_napcat_ws(instance_root: &Path, port: u16) -> AppResult<bool> {
    let config_dir = instance_root.join("NapCat").join("config");
    if !config_dir.is_dir() {
        return Ok(false);
    }

    let token = derive_ws_token(instance_root);
    let mut patched_any = false;
    for entry in std::fs::read_dir(&config_dir)?.flatten() {
        let path = entry.path();
        let is_onebot = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("onebot11_") && n.ends_with(".json"));
        if !is_onebot {
            continue;
        }
        match patch_onebot_file(&path, &token, port) {
            Ok(true) => {
                patched_any = true;
                info!("已为 NapCat 注入/对齐 {} 正向 WS: {:?}", port, path);
            }
            Ok(false) => {}
            Err(e) => warn!("处理 NapCat 配置 {:?} 失败,跳过: {}", path, e),
        }
    }
    Ok(patched_any)
}

/// 往单个 onebot11 文件注入/对齐 `port` 正向 WS,返回是否改动。
///
/// 认 `name == "mailauncher"` 的条目为启动器自管条目:存在则把端口对齐为 `port`(端口已一致则不改),
/// 不存在则追加一条。整文件读入 serde_json::Value 后只改 websocketServers 数组,其余字段原样保留。
fn patch_onebot_file(path: &Path, token: &str, port: u16) -> AppResult<bool> {
    let text = std::fs::read_to_string(path)?;
    let mut root: serde_json::Value = serde_json::from_str(&text)?;

    let servers = root
        .get_mut("network")
        .and_then(|n| n.get_mut("websocketServers"))
        .and_then(|s| s.as_array_mut())
        .ok_or_else(|| {
            AppError::Config("NapCat onebot11 缺少 network.websocketServers 数组".to_string())
        })?;

    let port_i64 = port as i64;
    // 已有启动器自管条目(name=mailauncher):端口不一致则对齐,一致则不动。
    if let Some(existing) = servers
        .iter_mut()
        .find(|s| s.get("name").and_then(|n| n.as_str()) == Some("mailauncher"))
    {
        if existing.get("port").and_then(|p| p.as_i64()) == Some(port_i64) {
            return Ok(false);
        }
        existing["port"] = serde_json::json!(port_i64);
        existing["token"] = serde_json::json!(token);
        std::fs::write(path, serde_json::to_string_pretty(&root)?)?;
        return Ok(true);
    }

    servers.push(serde_json::json!({
        "enable": true,
        "name": "mailauncher",
        "host": "127.0.0.1",
        "port": port_i64,
        "reportSelfMessage": false,
        "enableForcePushEvent": false,
        "messagePostFormat": "array",
        "token": token,
        "debug": false,
        "heartInterval": 30000
    }));

    std::fs::write(path, serde_json::to_string_pretty(&root)?)?;
    Ok(true)
}

/// 幂等把 MaiBot 内置 NapCat 适配器 config.toml 的 `[napcat_server].port` 对齐为 `port`(客户端连入口)。
///
/// 适配器装在 `<instance_root>/MaiBot/plugins/<repo>/config.toml`(含 `[napcat_server]` 段),这里
/// 按模式发现该文件(不硬编码插件夹名):扫 `MaiBot/plugins/*/config.toml`,取首个含 `[napcat_server]`
/// 段的即适配器配置。端口已一致则不改。文件/目录缺失(适配器未装)返回 `Ok(false)`,非致命。
fn patch_adapter_napcat_port(instance_root: &Path, port: u16) -> AppResult<bool> {
    use toml_edit::{value, DocumentMut};

    let plugins_dir = instance_root.join("MaiBot").join("plugins");
    if !plugins_dir.is_dir() {
        return Ok(false);
    }

    for entry in std::fs::read_dir(&plugins_dir)?.flatten() {
        let config_path = entry.path().join("config.toml");
        if !config_path.is_file() {
            continue;
        }
        let text = std::fs::read_to_string(&config_path)?;
        let mut doc = match text.parse::<DocumentMut>() {
            Ok(doc) => doc,
            Err(e) => {
                warn!("解析插件 config.toml {:?} 失败,跳过: {}", config_path, e);
                continue;
            }
        };
        // 仅认含 [napcat_server] 段的插件配置为适配器配置。
        if doc.get("napcat_server").is_none() {
            continue;
        }
        let current = doc["napcat_server"]["port"].as_integer();
        if current == Some(port as i64) {
            return Ok(false);
        }
        doc["napcat_server"]["port"] = value(port as i64);
        std::fs::write(&config_path, doc.to_string())?;
        info!("已对齐适配器 napcat_server.port -> {}: {:?}", port, config_path);
        return Ok(true);
    }
    Ok(false)
}

/// 幂等把 NapCat 自身 WebUI(扫码登录面板)端口对齐为本实例分配的 `napcat_webui`。
///
/// NapCat 启动即读 `<root>/NapCat/config/webui.json` 绑定 WebUI 端口,故必须启动前就位。既有文件
/// 仅改 `port`、保留 token 等其余字段;文件缺失(首启前)则按官方一键包同款 schema 预创建(附派生
/// token 使直登开箱即用),赶在 NapCat 首启绑定默认 6099 之前。NapCat 尊重既有 webui.json 不覆盖。
/// `<root>/NapCat` 目录不存在(未安装 NapCat)返回 `Ok(false)`,非致命。
fn patch_napcat_webui_port(instance_root: &Path, port: u16) -> AppResult<bool> {
    let napcat_dir = instance_root.join("NapCat");
    if !napcat_dir.is_dir() {
        return Ok(false);
    }
    let config_dir = napcat_dir.join("config");
    let path = config_dir.join("webui.json");

    if path.is_file() {
        let text = std::fs::read_to_string(&path)?;
        let mut root: serde_json::Value = serde_json::from_str(&text)?;
        if root.get("port").and_then(|p| p.as_u64()) == Some(port as u64) {
            return Ok(false);
        }
        root["port"] = serde_json::json!(port);
        std::fs::write(&path, serde_json::to_string_pretty(&root)?)?;
        info!("已对齐 NapCat WebUI 端口 -> {}: {:?}", port, path);
        return Ok(true);
    }

    std::fs::create_dir_all(&config_dir)?;
    let token = derive_webui_token(instance_root);
    let doc = serde_json::json!({
        "host": "127.0.0.1",
        "port": port,
        "token": token,
        "loginRate": 10,
        "autoLoginAccount": "",
        "theme": { "dark": {}, "light": {} },
        "disableWebUI": false,
        "disableNonLANAccess": false
    });
    std::fs::write(&path, serde_json::to_string_pretty(&doc)?)?;
    info!("已预创建 NapCat WebUI 配置(port={}): {:?}", port, path);
    Ok(true)
}

/// 按实例分配端口对齐 NapCat 侧全部端口(G10-1):
/// 正向 WS 契约两侧(onebot11 服务端 + 适配器客户端 config.toml,均 `napcat_ws`)+ NapCat WebUI
/// (`napcat_webui`)。逐项幂等、缺文件即跳过、吞错只 warn,均非致命,不阻断启动。
pub fn reconcile_napcat_ports(
    instance_root: &Path,
    napcat_ws: u16,
    napcat_webui: u16,
) -> AppResult<()> {
    if let Err(e) = ensure_napcat_ws(instance_root, napcat_ws) {
        warn!("对齐 NapCat onebot11 正向 WS 端口出错(忽略): {}", e);
    }
    if let Err(e) = patch_adapter_napcat_port(instance_root, napcat_ws) {
        warn!("对齐适配器 napcat_server.port 出错(忽略): {}", e);
    }
    if let Err(e) = patch_napcat_webui_port(instance_root, napcat_webui) {
        warn!("对齐 NapCat WebUI 端口出错(忽略): {}", e);
    }
    Ok(())
}

/// NapCat 启动后调用:后台轮询补首次登录才生成的 onebot11(NapCat 监测到文件变更会热重载生效)。
/// 每 3s 一次,补上一次即停,否则约 5 分钟后停止。幂等无副作用,故不必绑定 NapCat 生命周期。
pub fn spawn_ws_watcher(instance_root: std::path::PathBuf, port: u16) {
    tokio::spawn(async move {
        for _ in 0..100 {
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            match ensure_napcat_ws(&instance_root, port) {
                Ok(true) => {
                    info!("NapCat 登录后已自动注入 {} 正向 WS,适配器即将连上", port);
                    break;
                }
                Ok(false) => {}
                Err(e) => warn!("NapCat WS 自动注入轮询出错: {}", e),
            }
        }
    });
}

/// 拼出 NapCat WebUI 的 token 直登 URL:`http://{host}:{port}/webui/web_login?token={token}`。
///
/// 读 `<instance_root>/NapCat/config/webui.json`(NapCat 首次运行后才生成)。文件不存在、
/// token 为空时返回 None(NapCat 尚未起过/未登录)。host=0.0.0.0 归一为 127.0.0.1。
/// URL 与字段格式对照 maibot-ref/MaiBotOneKey(service-manager.ts:1485、init-manager.ts:2356)。
pub(crate) fn build_napcat_webui_url(instance_root: &Path) -> Option<String> {
    let path = instance_root
        .join("NapCat")
        .join("config")
        .join("webui.json");
    let text = std::fs::read_to_string(&path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    let token = value
        .get("token")
        .and_then(|t| t.as_str())
        .filter(|s| !s.is_empty())?;
    let host = value
        .get("host")
        .and_then(|h| h.as_str())
        .unwrap_or("127.0.0.1");
    let host = if host.is_empty() || host == "0.0.0.0" {
        "127.0.0.1"
    } else {
        host
    };
    let port = value.get("port").and_then(|p| p.as_u64()).unwrap_or(6099);
    Some(format!("http://{host}:{port}/webui/web_login?token={token}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn derive_ws_token_is_deterministic_and_nonempty() {
        let a = derive_ws_token(&PathBuf::from("/data/instances/inst_alpha"));
        let b = derive_ws_token(&PathBuf::from("/data/instances/inst_alpha"));
        assert_eq!(a, b, "同一实例两侧推导的 token 必须相等");
        assert_eq!(a.len(), 32);
    }

    #[test]
    fn derive_ws_token_depends_only_on_instance_name() {
        // 前缀不同、实例目录名相同 → token 相同(两侧路径写法差异不影响一致性)
        let a = derive_ws_token(&PathBuf::from("/opt/x/instances/inst_alpha"));
        let b = derive_ws_token(&PathBuf::from("/var/data/inst_alpha"));
        assert_eq!(a, b);
        // 不同实例名 → token 不同
        let c = derive_ws_token(&PathBuf::from("/opt/x/instances/inst_beta"));
        assert_ne!(a, c);
    }

    fn mailauncher_entry(config_dir: &Path) -> serde_json::Value {
        let content =
            std::fs::read_to_string(config_dir.join("onebot11_123.json")).expect("读取");
        let root: serde_json::Value = serde_json::from_str(&content).expect("解析");
        root["network"]["websocketServers"]
            .as_array()
            .expect("数组")
            .iter()
            .find(|s| s["name"].as_str() == Some("mailauncher"))
            .expect("应有 mailauncher 条目")
            .clone()
    }

    #[test]
    fn ensure_napcat_ws_injects_instance_port_with_derived_token() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let config_dir = instance_root.join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(
            config_dir.join("onebot11_123.json"),
            r#"{"network":{"websocketServers":[]}}"#,
        )
        .expect("写 onebot json");

        assert!(ensure_napcat_ws(instance_root, 21200).expect("注入失败"));

        let entry = mailauncher_entry(&config_dir);
        // 注入的端口是传入的实例端口,不是硬编码 3001。
        assert_eq!(entry["port"].as_i64(), Some(21200));
        let token = entry["token"].as_str().expect("token 字段");
        assert!(!token.is_empty(), "token 必须非空");
        // 与适配器侧相同 instance_root 的确定性推导一致 → 两侧 token 相等
        assert_eq!(token, derive_ws_token(instance_root));
    }

    #[test]
    fn ensure_napcat_ws_realigns_existing_entry_port_on_base_change() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let config_dir = instance_root.join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(
            config_dir.join("onebot11_123.json"),
            r#"{"network":{"websocketServers":[]}}"#,
        )
        .expect("写 onebot json");

        assert!(ensure_napcat_ws(instance_root, 21200).expect("首次注入"));
        // 端口未变:幂等不改动。
        assert!(!ensure_napcat_ws(instance_root, 21200).expect("再次同端口"));
        // 端口变化:对齐既有 mailauncher 条目而非追加重复条目。
        assert!(ensure_napcat_ws(instance_root, 21210).expect("端口变更对齐"));

        let content =
            std::fs::read_to_string(config_dir.join("onebot11_123.json")).expect("读取");
        let root: serde_json::Value = serde_json::from_str(&content).expect("解析");
        let servers = root["network"]["websocketServers"].as_array().expect("数组");
        let mailauncher_entries = servers
            .iter()
            .filter(|s| s["name"].as_str() == Some("mailauncher"))
            .count();
        assert_eq!(mailauncher_entries, 1, "端口变更应对齐而非重复追加条目");
        assert_eq!(mailauncher_entry(&config_dir)["port"].as_i64(), Some(21210));
    }

    #[test]
    fn patch_adapter_napcat_port_aligns_only_config_with_napcat_server_section() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let plugins = instance_root.join("MaiBot").join("plugins");
        let adapter_dir = plugins.join("napcat-adapter");
        let other_dir = plugins.join("some-other-plugin");
        std::fs::create_dir_all(&adapter_dir).expect("建适配器目录");
        std::fs::create_dir_all(&other_dir).expect("建其他插件目录");
        std::fs::write(
            adapter_dir.join("config.toml"),
            "[napcat_server]\nhost = \"127.0.0.1\"\nport = 3001\n",
        )
        .expect("写适配器 config");
        std::fs::write(
            other_dir.join("config.toml"),
            "[plugin]\nenabled = true\nport = 3001\n",
        )
        .expect("写其他插件 config");

        assert!(patch_adapter_napcat_port(instance_root, 21200).expect("对齐失败"));

        let adapter = std::fs::read_to_string(adapter_dir.join("config.toml")).expect("读适配器");
        let adapter_doc = adapter.parse::<toml_edit::DocumentMut>().expect("解析");
        assert_eq!(adapter_doc["napcat_server"]["port"].as_integer(), Some(21200));

        // 无 [napcat_server] 段的其他插件不被误改。
        let other = std::fs::read_to_string(other_dir.join("config.toml")).expect("读其他");
        assert!(other.contains("port = 3001"), "非适配器插件不应被改动");

        // 幂等:端口已一致再调不改动。
        assert!(!patch_adapter_napcat_port(instance_root, 21200).expect("幂等调用"));
    }

    #[test]
    fn build_napcat_webui_url_normalizes_host_and_builds_login_path() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let config_dir = instance_root.join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(
            config_dir.join("webui.json"),
            r#"{"host":"0.0.0.0","port":6099,"token":"abc123"}"#,
        )
        .expect("写 webui.json");

        assert_eq!(
            build_napcat_webui_url(instance_root),
            Some("http://127.0.0.1:6099/webui/web_login?token=abc123".to_string())
        );
    }

    #[test]
    fn patch_napcat_webui_port_creates_config_with_derived_token_when_missing() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        // NapCat 已装(目录存在)但 config/webui.json 尚未生成(首启前)。
        std::fs::create_dir_all(instance_root.join("NapCat")).expect("建 NapCat 目录");

        assert!(patch_napcat_webui_port(instance_root, 21203).expect("预创建失败"));

        let path = instance_root
            .join("NapCat")
            .join("config")
            .join("webui.json");
        let root: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).expect("读取")).expect("解析");
        assert_eq!(root["port"].as_u64(), Some(21203));
        // 直登可用:token 非空且等于确定性派生值。
        let token = root["token"].as_str().expect("token");
        assert!(!token.is_empty());
        assert_eq!(token, derive_webui_token(instance_root));
    }

    #[test]
    fn patch_napcat_webui_port_aligns_existing_and_preserves_token() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let config_dir = instance_root.join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(
            config_dir.join("webui.json"),
            r#"{"host":"0.0.0.0","port":6099,"token":"napcatowntoken"}"#,
        )
        .expect("写 webui.json");

        assert!(patch_napcat_webui_port(instance_root, 21203).expect("对齐失败"));
        let root: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(config_dir.join("webui.json")).expect("读取"),
        )
        .expect("解析");
        assert_eq!(root["port"].as_u64(), Some(21203));
        // 只改端口,NapCat 自带 token 保留。
        assert_eq!(root["token"].as_str(), Some("napcatowntoken"));

        // 幂等:端口已一致再调不改动。
        assert!(!patch_napcat_webui_port(instance_root, 21203).expect("幂等调用"));
    }

    #[test]
    fn patch_napcat_webui_port_noop_when_napcat_absent() {
        let dir = tempfile::tempdir().expect("临时目录");
        // 未安装 NapCat(无 NapCat 目录)时非致命 no-op。
        assert!(!patch_napcat_webui_port(dir.path(), 21203).expect("缺 NapCat 应 no-op"));
    }

    #[test]
    fn build_napcat_webui_url_none_when_absent_or_tokenless() {
        let dir = tempfile::tempdir().expect("临时目录");
        // 无配置
        assert_eq!(build_napcat_webui_url(dir.path()), None);
        // 有配置但 token 空
        let config_dir = dir.path().join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(config_dir.join("webui.json"), r#"{"port":6099,"token":""}"#)
            .expect("写 webui.json");
        assert_eq!(build_napcat_webui_url(dir.path()), None);
    }
}

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

/// 适配器连入的端口,须与 `install_service` 写给适配器 config.toml 的 `napcat_server.port` 一致。
const ADAPTER_WS_PORT: i64 = 3001;

/// 为实例推导正向 WS 的鉴权 token。
///
/// NapCat 服务端与 MaiBot 适配器客户端两侧的 token 必须一致才能鉴权连上。两处配置在不同时机
/// 写入(适配器 config 在安装期、NapCat onebot 在登录后),无法互相读取,故用实例目录名 + 域分隔
/// 经 sha256 确定性推导:同一实例两侧算出的 token 恒等、非空,且不同实例互不相同。取实例目录名而非
/// 绝对路径,避免两侧路径写法差异(分隔符/末尾斜杠)导致不一致。
pub fn derive_ws_token(instance_root: &Path) -> String {
    use sha2::{Digest, Sha256};
    let seed = instance_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| instance_root.to_string_lossy().to_string());
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    hasher.update(b"|mailauncher-onebot-ws");
    let hex: String = hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect();
    hex[..32].to_string()
}

/// 幂等确保实例下所有 NapCat onebot11 配置都开了 127.0.0.1:3001 正向 WS;返回是否有文件被改动。
///
/// 扫描 `<instance_root>/NapCat/config/onebot11_*.json`,`network.websocketServers` 里缺 3001
/// 条目的就补一条。config 目录不存在(尚未登录)时返回 `Ok(false)`。单个文件损坏只记日志跳过、
/// 不阻断其余文件,也不阻断启动。
pub fn ensure_napcat_ws(instance_root: &Path) -> AppResult<bool> {
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
        match patch_onebot_file(&path, &token) {
            Ok(true) => {
                patched_any = true;
                info!("已为 NapCat 注入 {} 正向 WS: {:?}", ADAPTER_WS_PORT, path);
            }
            Ok(false) => {}
            Err(e) => warn!("处理 NapCat 配置 {:?} 失败,跳过: {}", path, e),
        }
    }
    Ok(patched_any)
}

/// 往单个 onebot11 文件注入 3001 正向 WS(已存在该端口条目则不动),返回是否改动。
/// 整文件读入 serde_json::Value 后只往 websocketServers 数组追加,其余字段原样保留。
fn patch_onebot_file(path: &Path, token: &str) -> AppResult<bool> {
    let text = std::fs::read_to_string(path)?;
    let mut root: serde_json::Value = serde_json::from_str(&text)?;

    let servers = root
        .get_mut("network")
        .and_then(|n| n.get_mut("websocketServers"))
        .and_then(|s| s.as_array_mut())
        .ok_or_else(|| {
            AppError::Config("NapCat onebot11 缺少 network.websocketServers 数组".to_string())
        })?;

    let exists = servers
        .iter()
        .any(|s| s.get("port").and_then(|p| p.as_i64()) == Some(ADAPTER_WS_PORT));
    if exists {
        return Ok(false);
    }

    servers.push(serde_json::json!({
        "enable": true,
        "name": "mailauncher",
        "host": "127.0.0.1",
        "port": ADAPTER_WS_PORT,
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

/// NapCat 启动后调用:后台轮询补首次登录才生成的 onebot11(NapCat 监测到文件变更会热重载生效)。
/// 每 3s 一次,补上一次即停,否则约 5 分钟后停止。幂等无副作用,故不必绑定 NapCat 生命周期。
pub fn spawn_ws_watcher(instance_root: std::path::PathBuf) {
    tokio::spawn(async move {
        for _ in 0..100 {
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            match ensure_napcat_ws(&instance_root) {
                Ok(true) => {
                    info!(
                        "NapCat 登录后已自动注入 {} 正向 WS,适配器即将连上",
                        ADAPTER_WS_PORT
                    );
                    break;
                }
                Ok(false) => {}
                Err(e) => warn!("NapCat WS 自动注入轮询出错: {}", e),
            }
        }
    });
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

    #[test]
    fn ensure_napcat_ws_injects_derived_nonempty_token() {
        let dir = tempfile::tempdir().expect("临时目录");
        let instance_root = dir.path();
        let config_dir = instance_root.join("NapCat").join("config");
        std::fs::create_dir_all(&config_dir).expect("建 config 目录");
        std::fs::write(
            config_dir.join("onebot11_123.json"),
            r#"{"network":{"websocketServers":[]}}"#,
        )
        .expect("写 onebot json");

        assert!(ensure_napcat_ws(instance_root).expect("注入失败"));

        let content =
            std::fs::read_to_string(config_dir.join("onebot11_123.json")).expect("读取");
        let root: serde_json::Value = serde_json::from_str(&content).expect("解析");
        let entry = root["network"]["websocketServers"]
            .as_array()
            .expect("数组")
            .iter()
            .find(|s| s["port"].as_i64() == Some(ADAPTER_WS_PORT))
            .expect("应有 3001 条目")
            .clone();
        let token = entry["token"].as_str().expect("token 字段");
        assert!(!token.is_empty(), "token 必须非空");
        // 与适配器侧相同 instance_root 的确定性推导一致 → 两侧 token 相等
        assert_eq!(token, derive_ws_token(instance_root));
    }
}

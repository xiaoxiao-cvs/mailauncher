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
        match patch_onebot_file(&path) {
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
fn patch_onebot_file(path: &Path) -> AppResult<bool> {
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
        "token": "",
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

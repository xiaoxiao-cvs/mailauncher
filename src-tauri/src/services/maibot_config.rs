//! MaiBot bot_config.toml 端口对齐(G10-1,与 napcat_config 对称,负责 MaiBot 侧端口)。
//!
//! MaiBot WebUI(uvicorn,默认 8001)与 maim_message 旧版对外 WS server(默认 8000)的端口都写在
//! `<instance_root>/MaiBot/config/bot_config.toml` 的 `[webui].port` / `[maim_message].ws_server_port`。
//! 多实例并发时若都用默认端口,第二个 MaiBot 核心会在 uvicorn `assert_port_available` 处绑定失败。
//!
//! MaiBot 的 `load_config_from_file` 用 `from_dict` 保留既有值、仅对缺失字段填默认(且仅在版本变更/
//! 迁移时才回写、回写也保留值)。因此启动器只需在 MaiBot 加载前把端口写进 bot_config.toml,MaiBot 就
//! 会读取并绑定到该端口。关键:安装期的 stub 只有 `[inner]/[bot]`、缺 `[webui]/[maim_message]`,若不
//! 补齐,MaiBot 首启会用默认 8001/8000 → 第二实例撞车。故这里"缺段则创建",赶在首次加载前把端口就位。

use std::path::Path;

use tracing::info;

use crate::errors::AppResult;

/// 幂等把 `<instance_root>/MaiBot/config/bot_config.toml` 的 `[maim_message].ws_server_port` 与
/// `[webui].port` 对齐为本实例分配的端口;缺段则创建。返回是否改动。
///
/// 文件缺失(MaiBot 未装)返回 `Ok(false)`,非致命。仅设置端口字段,其余字段留给 MaiBot 的
/// `from_dict` 用默认回填,不越权写入 host/enabled 等。
pub fn patch_maibot_ports(instance_root: &Path, maim: u16, maibot_webui: u16) -> AppResult<bool> {
    use toml_edit::DocumentMut;

    let path = instance_root
        .join("MaiBot")
        .join("config")
        .join("bot_config.toml");
    if !path.is_file() {
        return Ok(false);
    }

    let text = std::fs::read_to_string(&path)?;
    let mut doc = text.parse::<DocumentMut>()?;
    let mut changed = false;

    if set_port_if_needed(&mut doc, "maim_message", "ws_server_port", maim) {
        changed = true;
    }
    if set_port_if_needed(&mut doc, "webui", "port", maibot_webui) {
        changed = true;
    }

    if changed {
        std::fs::write(&path, doc.to_string())?;
        info!(
            "已对齐 MaiBot 端口 maim_message.ws_server_port={} webui.port={}: {:?}",
            maim, maibot_webui, path
        );
    }
    Ok(changed)
}

/// 在文档里把 `[section].key` 设为 `port`;缺 section 则创建空表。已一致返回 false,改动返回 true。
fn set_port_if_needed(doc: &mut toml_edit::DocumentMut, section: &str, key: &str, port: u16) -> bool {
    let target = port as i64;
    if doc.get(section).is_none() {
        doc[section] = toml_edit::table();
    }
    if doc[section].get(key).and_then(|v| v.as_integer()) == Some(target) {
        return false;
    }
    doc[section][key] = toml_edit::value(target);
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_bot_config(instance_root: &Path, body: &str) -> std::path::PathBuf {
        let dir = instance_root.join("MaiBot").join("config");
        std::fs::create_dir_all(&dir).expect("建 config 目录");
        let path = dir.join("bot_config.toml");
        std::fs::write(&path, body).expect("写 bot_config");
        path
    }

    fn read_port(path: &Path, section: &str, key: &str) -> Option<i64> {
        let text = std::fs::read_to_string(path).expect("读取");
        let doc = text.parse::<toml_edit::DocumentMut>().expect("解析");
        doc.get(section)
            .and_then(|s| s.get(key))
            .and_then(|v| v.as_integer())
    }

    #[test]
    fn patches_existing_sections_to_instance_ports() {
        let dir = tempfile::tempdir().expect("临时目录");
        let path = write_bot_config(
            dir.path(),
            "[maim_message]\nws_server_port = 8000\n\n[webui]\nport = 8001\nenabled = true\n",
        );

        assert!(patch_maibot_ports(dir.path(), 21201, 21202).expect("对齐失败"));
        assert_eq!(read_port(&path, "maim_message", "ws_server_port"), Some(21201));
        assert_eq!(read_port(&path, "webui", "port"), Some(21202));
        // [webui] 其余字段不被越权改动。
        let text = std::fs::read_to_string(&path).expect("读取");
        assert!(text.contains("enabled = true"), "非端口字段应原样保留");
    }

    #[test]
    fn creates_missing_sections_from_stub() {
        let dir = tempfile::tempdir().expect("临时目录");
        // 模拟安装期 stub:只有 [inner]/[bot],缺 [webui]/[maim_message]。
        let path = write_bot_config(
            dir.path(),
            "[inner]\nversion = \"1.0.0\"\n\n[bot]\nqq_account = \"10086\"\n",
        );

        assert!(patch_maibot_ports(dir.path(), 21201, 21202).expect("对齐失败"));
        // 缺段被创建并写入实例端口,赶在 MaiBot 首启填默认之前。
        assert_eq!(read_port(&path, "maim_message", "ws_server_port"), Some(21201));
        assert_eq!(read_port(&path, "webui", "port"), Some(21202));
        // 既有段保留。
        let text = std::fs::read_to_string(&path).expect("读取");
        assert!(text.contains("qq_account"), "既有 [bot] 段应保留");
    }

    #[test]
    fn idempotent_when_already_aligned() {
        let dir = tempfile::tempdir().expect("临时目录");
        write_bot_config(
            dir.path(),
            "[maim_message]\nws_server_port = 21201\n\n[webui]\nport = 21202\n",
        );
        assert!(!patch_maibot_ports(dir.path(), 21201, 21202).expect("幂等调用"));
    }

    #[test]
    fn missing_file_is_noop() {
        let dir = tempfile::tempdir().expect("临时目录");
        assert!(!patch_maibot_ports(dir.path(), 21201, 21202).expect("缺文件应非致命"));
    }
}

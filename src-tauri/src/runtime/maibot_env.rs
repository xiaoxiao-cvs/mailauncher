//! MaiBot(Main) 启动环境变量。
//!
//! MaiBot 1.0.0 的 `bot.py` 在启动早期会调用 `check_eula()` 与
//! `require_legacy_upgrade_confirmation()`，二者在未确认时都会用 `input()`
//! 阻塞等待终端输入。启动器以非交互方式拉起 MaiBot，因此必须预先注入对应
//! 的确认环境变量绕过阻塞。依据 maibot-ref：
//!
//! - `MAIBOT_LEGACY_0X_UPGRADE_CONFIRMED=1`
//!   绕过 0.x -> 1.0.0 升级确认（`src/config/legacy_upgrade_confirmation.py`
//!   常量 `LEGACY_UPGRADE_CONFIRM_ENV`，`require_legacy_upgrade_confirmation`
//!   在该值为 "1" 时直接返回）。
//! - `MAIBOT_LOCALE=zh-CN`
//!   `bot.py` 第 23 行 `set_locale(os.getenv("MAIBOT_LOCALE", "zh-CN"))`。
//! - `EULA_AGREE` / `PRIVACY_AGREE`
//!   `bot.py` 的 `check_eula()`：对 `EULA.md` / `PRIVACY.md` 计算 MD5
//!   （`_calculate_file_hash` 以 `encoding="utf-8"` 文本模式读取后
//!   `hashlib.md5(content.encode("utf-8"))`）。文本模式读取会做 universal
//!   newlines 归一（CRLF/CR -> LF），随后 `_check_agreement_status` 用
//!   `file_hash == os.getenv(env_var)` 判定已确认。

use std::path::Path;

use md5::{Digest, Md5};
use tracing::warn;

/// MaiBot 升级确认环境变量名（与 legacy_upgrade_confirmation.py 一致）。
const LEGACY_UPGRADE_CONFIRM_ENV: &str = "MAIBOT_LEGACY_0X_UPGRADE_CONFIRMED";

/// 计算与 MaiBot `bot.py` `_calculate_file_hash` 一致的 MD5。
///
/// Python 以文本模式（universal newlines）读取，会把 `\r\n` 与单独的 `\r`
/// 归一为 `\n`，再以 utf-8 编码计算 MD5。这里复刻该行为。
fn maibot_agreement_md5(path: &Path) -> Option<String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) => {
            warn!("读取 MaiBot 协议文件失败 {:?}: {}", path, error);
            return None;
        }
    };

    let content = match String::from_utf8(bytes) {
        Ok(content) => content,
        Err(error) => {
            warn!("MaiBot 协议文件非 UTF-8 {:?}: {}", path, error);
            return None;
        }
    };

    // universal newlines 归一：先 CRLF -> LF，再把残留的单独 CR -> LF。
    let normalized = content.replace("\r\n", "\n").replace('\r', "\n");

    let mut hasher = Md5::new();
    hasher.update(normalized.as_bytes());
    Some(format!("{:x}", hasher.finalize()))
}

/// 构造启动 MaiBot(Main) 需要注入的环境变量。
///
/// `maibot_dir` 为实例下的 `MaiBot` 组件目录（EULA.md / PRIVACY.md 所在处）。
/// 协议文件缺失时跳过对应变量，让 MaiBot 自行按其逻辑处理（不掩盖问题）。
pub fn maibot_startup_env(maibot_dir: &Path) -> Vec<(String, String)> {
    let mut env = vec![
        (LEGACY_UPGRADE_CONFIRM_ENV.to_string(), "1".to_string()),
        ("MAIBOT_LOCALE".to_string(), "zh-CN".to_string()),
    ];

    if let Some(eula_hash) = maibot_agreement_md5(&maibot_dir.join("EULA.md")) {
        env.push(("EULA_AGREE".to_string(), eula_hash));
    }
    if let Some(privacy_hash) = maibot_agreement_md5(&maibot_dir.join("PRIVACY.md")) {
        env.push(("PRIVACY_AGREE".to_string(), privacy_hash));
    }

    env
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::*;

    #[test]
    fn md5_normalizes_crlf_to_lf() {
        let dir = tempdir().expect("创建临时目录失败");
        let crlf_path = dir.path().join("crlf.md");
        let lf_path = dir.path().join("lf.md");
        fs::write(&crlf_path, b"line1\r\nline2\r\n").expect("写 CRLF 文件失败");
        fs::write(&lf_path, b"line1\nline2\n").expect("写 LF 文件失败");

        let crlf_hash = maibot_agreement_md5(&crlf_path).expect("计算 CRLF 哈希失败");
        let lf_hash = maibot_agreement_md5(&lf_path).expect("计算 LF 哈希失败");

        // 归一后 CRLF 与 LF 必须得到相同 MD5（与 bot.py 文本模式读取一致）。
        assert_eq!(crlf_hash, lf_hash);
    }

    #[test]
    fn md5_matches_known_python_value() {
        let dir = tempdir().expect("创建临时目录失败");
        let path = dir.path().join("EULA.md");
        // hashlib.md5("hello\n".encode("utf-8")).hexdigest() == b1946ac92492d2347c6235b4d2611184
        fs::write(&path, b"hello\r\n").expect("写文件失败");

        let hash = maibot_agreement_md5(&path).expect("计算哈希失败");
        assert_eq!(hash, "b1946ac92492d2347c6235b4d2611184");
    }

    #[test]
    fn startup_env_contains_confirmation_vars() {
        let dir = tempdir().expect("创建临时目录失败");
        let maibot_dir = dir.path();
        fs::write(maibot_dir.join("EULA.md"), b"eula\n").expect("写 EULA 失败");
        fs::write(maibot_dir.join("PRIVACY.md"), b"privacy\n").expect("写 PRIVACY 失败");

        let env = maibot_startup_env(maibot_dir);
        let map: std::collections::HashMap<_, _> = env.into_iter().collect();

        assert_eq!(
            map.get(LEGACY_UPGRADE_CONFIRM_ENV).map(String::as_str),
            Some("1")
        );
        assert_eq!(map.get("MAIBOT_LOCALE").map(String::as_str), Some("zh-CN"));
        // hashlib.md5("eula\n".encode("utf-8")).hexdigest()
        assert_eq!(
            map.get("EULA_AGREE").map(String::as_str),
            Some("f508f35531f12c51b62fbe3284d1a475")
        );
        assert!(map.contains_key("PRIVACY_AGREE"));
    }

    #[test]
    fn startup_env_skips_missing_agreement_files() {
        let dir = tempdir().expect("创建临时目录失败");
        let env = maibot_startup_env(dir.path());
        let map: std::collections::HashMap<_, _> = env.into_iter().collect();

        // 协议文件不存在时只保留两个固定变量，不注入空哈希。
        assert!(map.contains_key(LEGACY_UPGRADE_CONFIRM_ENV));
        assert!(map.contains_key("MAIBOT_LOCALE"));
        assert!(!map.contains_key("EULA_AGREE"));
        assert!(!map.contains_key("PRIVACY_AGREE"));
    }
}

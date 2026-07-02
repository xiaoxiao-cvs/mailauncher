/// 网络代理与下载源管理服务
///
/// 对标官方一键包的"换源/代理"能力，把出站统一收口到三处注入点：
/// 1. git clone（GitHub 前缀镜像 + 代理 env）
/// 2. pip install（PyPI --index-url/--trusted-host + 代理 env）
/// 3. reqwest（GitHub API 客户端代理）
///
/// 配置全部存入既有 config KV（launcher_config 表），不新增列、不写迁移：
/// - key "network_proxy"  -> NetworkProxy 的 JSON
/// - key "source_config"  -> SourceConfig 的 JSON
///
/// 首次无配置时返回内置种子默认（官方直连优先），保证装完即用。
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::errors::AppResult;
use crate::services::config_service;

/// config KV 中代理配置的键名
pub const KEY_NETWORK_PROXY: &str = "network_proxy";
/// config KV 中下载源配置的键名
pub const KEY_SOURCE_CONFIG: &str = "source_config";

// ==================== 数据模型 ====================

/// 网络代理（Clash/Mihomo 风格 host:port，仅 HTTP 代理）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NetworkProxy {
    /// 是否启用代理
    pub enabled: bool,
    /// 代理主机
    pub host: String,
    /// 代理端口
    pub port: u16,
}

impl Default for NetworkProxy {
    fn default() -> Self {
        // 默认指向本机 Clash/Mihomo 常用端口，但默认不启用，避免无代理环境下出站全断。
        Self {
            enabled: false,
            host: "127.0.0.1".to_string(),
            port: 7890,
        }
    }
}

/// GitHub 前缀镜像源
///
/// 采用前缀拼接式：实际 clone URL = prefix + 原始 github url。
/// prefix 为空串表示官方直连（原样返回）。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GithubMirror {
    /// 唯一标识（前端增删/排序用）
    pub id: String,
    /// 展示名
    pub name: String,
    /// 拼接前缀（形如 "https://gh-proxy.com/"），空串=官方直连
    pub prefix: String,
    /// 优先级（数值越大越优先；启用且优先级最高者生效）
    pub priority: i32,
    /// 是否启用
    pub enabled: bool,
}

/// PyPI 源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PypiSource {
    /// 唯一标识
    pub id: String,
    /// 展示名
    pub name: String,
    /// index-url（形如 "https://pypi.org/simple"）
    pub index_url: String,
    /// 优先级（数值越大越优先）
    pub priority: i32,
    /// 是否启用
    pub enabled: bool,
}

/// 下载源整体配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SourceConfig {
    pub github: Vec<GithubMirror>,
    pub pypi: Vec<PypiSource>,
}

impl Default for SourceConfig {
    fn default() -> Self {
        Self {
            github: seed_github_mirrors(),
            pypi: seed_pypi_sources(),
        }
    }
}

// ==================== 种子数据 ====================

/// 内置 GitHub 镜像种子：官方直连默认启用且优先级最高。
fn seed_github_mirrors() -> Vec<GithubMirror> {
    vec![
        GithubMirror {
            id: "github-official".to_string(),
            name: "GitHub 官方直连".to_string(),
            prefix: String::new(),
            priority: 100,
            enabled: true,
        },
        GithubMirror {
            id: "github-ghproxy-com".to_string(),
            name: "gh-proxy.com".to_string(),
            prefix: "https://gh-proxy.com/".to_string(),
            priority: 90,
            enabled: false,
        },
        GithubMirror {
            id: "github-ghproxy-vip".to_string(),
            name: "ghproxy.vip".to_string(),
            prefix: "https://ghproxy.vip/".to_string(),
            priority: 80,
            enabled: false,
        },
        GithubMirror {
            id: "github-mrhjx".to_string(),
            name: "gitproxy.mrhjx.cn".to_string(),
            prefix: "https://gitproxy.mrhjx.cn/".to_string(),
            priority: 70,
            enabled: false,
        },
    ]
}

/// 内置 PyPI 源种子：官方默认启用且优先级最高。
fn seed_pypi_sources() -> Vec<PypiSource> {
    vec![
        PypiSource {
            id: "pypi-official".to_string(),
            name: "PyPI 官方".to_string(),
            index_url: "https://pypi.org/simple".to_string(),
            priority: 100,
            enabled: true,
        },
        PypiSource {
            id: "pypi-tuna".to_string(),
            name: "清华 TUNA".to_string(),
            index_url: "https://pypi.tuna.tsinghua.edu.cn/simple".to_string(),
            priority: 90,
            enabled: false,
        },
        PypiSource {
            id: "pypi-aliyun".to_string(),
            name: "阿里云".to_string(),
            index_url: "https://mirrors.aliyun.com/pypi/simple".to_string(),
            priority: 80,
            enabled: false,
        },
    ]
}

// ==================== 配置读写（config KV） ====================

/// 读取网络代理配置；无配置时返回种子默认。
pub async fn get_network_proxy(pool: &SqlitePool) -> AppResult<NetworkProxy> {
    match config_service::get_config(pool, KEY_NETWORK_PROXY).await? {
        Some(raw) => Ok(serde_json::from_str(&raw)?),
        None => Ok(NetworkProxy::default()),
    }
}

/// 保存网络代理配置。
///
/// 持久化后立即同步进程代理环境变量，使无 DB 池的 reqwest 出站路径
/// （GitHub API 客户端）即刻生效，无需重启。
pub async fn save_network_proxy(pool: &SqlitePool, proxy: &NetworkProxy) -> AppResult<()> {
    let raw = serde_json::to_string(proxy)?;
    config_service::set_config(pool, KEY_NETWORK_PROXY, &raw, Some("网络代理配置")).await?;
    apply_proxy_to_process_env(proxy);
    Ok(())
}

/// 读取下载源配置；无配置时返回种子默认。
pub async fn get_source_config(pool: &SqlitePool) -> AppResult<SourceConfig> {
    match config_service::get_config(pool, KEY_SOURCE_CONFIG).await? {
        Some(raw) => Ok(serde_json::from_str(&raw)?),
        None => Ok(SourceConfig::default()),
    }
}

/// 保存下载源配置。
pub async fn save_source_config(pool: &SqlitePool, config: &SourceConfig) -> AppResult<()> {
    let raw = serde_json::to_string(config)?;
    config_service::set_config(pool, KEY_SOURCE_CONFIG, &raw, Some("下载源配置")).await
}

/// 解析当前生效的 GitHub 镜像前缀(启用且优先级最高者的 prefix)。
///
/// 无启用镜像、命中官方源(prefix 为空)或读取失败时返回空串,配合 [`apply_github_mirror`]
/// 即为官方直连。所有走 GitHub 出站的下载路径(git clone / uv / NapCat / 启动器自更新资产)
/// 都应经此统一解析,避免各处各写一套导致镜像只覆盖部分下载。
pub async fn resolve_active_github_prefix(pool: &SqlitePool) -> String {
    match get_source_config(pool).await {
        Ok(config) => pick_active_github(&config.github)
            .map(|m| m.prefix.clone())
            .unwrap_or_default(),
        Err(e) => {
            tracing::warn!("读取下载源配置失败,GitHub 走官方直连: {}", e);
            String::new()
        }
    }
}

// ==================== 纯函数：注入用 ====================

/// 用 GitHub 镜像前缀重写仓库 URL。
///
/// prefix 为空（trim 后）时原样返回（官方直连）。
/// 非空时直接拼接 prefix + original_url（前缀镜像约定自带末尾斜杠）。
pub fn apply_github_mirror(original_url: &str, prefix: &str) -> String {
    let prefix = prefix.trim();
    if prefix.is_empty() {
        return original_url.to_string();
    }
    format!("{}{}", prefix, original_url)
}

/// 构造代理环境变量列表。
///
/// 代理启用时给出 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY（含大小写两套，
/// 兼容 git/curl/python 等对环境变量大小写敏感度不一的工具）= http://host:port；
/// 未启用时返回空列表（调用方据此不注入任何代理环境变量）。
pub fn build_proxy_env(proxy: &NetworkProxy) -> Vec<(String, String)> {
    if !proxy.enabled {
        return Vec::new();
    }
    let url = format!("http://{}:{}", proxy.host.trim(), proxy.port);
    vec![
        ("HTTP_PROXY".to_string(), url.clone()),
        ("HTTPS_PROXY".to_string(), url.clone()),
        ("ALL_PROXY".to_string(), url.clone()),
        ("http_proxy".to_string(), url.clone()),
        ("https_proxy".to_string(), url.clone()),
        ("all_proxy".to_string(), url),
    ]
}

/// 将代理写入/清除当前进程的代理环境变量。
///
/// 用于覆盖那些拿不到 DB 池、又依赖 reqwest 默认 env 代理探测的出站路径
/// （version_service 的 GitHub API 客户端：launcher 更新检查等命令签名受限无 State）。
/// 在"保存代理"与"应用启动"两处调用，使持久化的代理对全进程 reqwest 生效。
///
/// 启用时设置 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY（大小写两套）；未启用时一并移除，
/// 确保从"开"切到"关"后不残留陈旧代理。
///
/// 安全性说明：此处修改进程级环境变量。代理配置本就是"全局出站策略"，
/// 且仅在用户显式保存/启动时触发，调用频率低，无并发竞态风险。
pub fn apply_proxy_to_process_env(proxy: &NetworkProxy) {
    let keys = [
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ];
    let env = build_proxy_env(proxy);
    if env.is_empty() {
        for key in keys {
            std::env::remove_var(key);
        }
    } else {
        for (key, val) in env {
            std::env::set_var(key, val);
        }
    }
}

/// 在 GitHub 镜像列表中挑选"启用且优先级最高"的一个。
///
/// 同优先级时取列表中先出现者（与前端 pickActive 一致：靠前者胜）。
/// 无启用项时返回 None（调用方退化为官方直连）。
pub fn pick_active_github(list: &[GithubMirror]) -> Option<&GithubMirror> {
    // 注：std 的 max_by_key 在并列时返回最后一个，与"靠前者胜"语义相反，
    // 故用 fold 显式实现"严格更高才替换"，保证并列取先出现者。
    list.iter()
        .filter(|m| m.enabled)
        .fold(None, |best: Option<&GithubMirror>, cur| match best {
            Some(b) if b.priority >= cur.priority => Some(b),
            _ => Some(cur),
        })
}

/// 在 PyPI 源列表中挑选"启用且优先级最高"的一个。
///
/// 同优先级时取列表中先出现者（与前端一致）。
pub fn pick_active_pypi(list: &[PypiSource]) -> Option<&PypiSource> {
    list.iter()
        .filter(|s| s.enabled)
        .fold(None, |best: Option<&PypiSource>, cur| match best {
            Some(b) if b.priority >= cur.priority => Some(b),
            _ => Some(cur),
        })
}

/// 从 index_url 中提取主机名（供 pip --trusted-host 用）。
///
/// 仅在 http:// 明文源时需要 trusted-host；https 源返回 None。
/// 解析失败（无主机段）时返回 None，由调用方决定是否仍注入 index-url。
pub fn trusted_host_for(index_url: &str) -> Option<String> {
    let url = index_url.trim();
    let rest = url.strip_prefix("http://")?;
    // 截取 authority 段（host[:port]），到首个 '/'、'?' 或 '#' 为止。
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("").trim();
    if authority.is_empty() {
        return None;
    }
    Some(authority.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
        sqlx::query(
            "CREATE TABLE launcher_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT,
                description TEXT,
                updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");
        pool
    }

    // ==================== apply_github_mirror ====================

    #[test]
    fn apply_github_mirror_empty_prefix_returns_original() {
        let original = "https://github.com/Mai-with-u/MaiBot.git";
        assert_eq!(apply_github_mirror(original, ""), original);
    }

    #[test]
    fn apply_github_mirror_whitespace_prefix_returns_original() {
        // 纯空白前缀等同官方直连。
        let original = "https://github.com/Mai-with-u/MaiBot.git";
        assert_eq!(apply_github_mirror(original, "   "), original);
    }

    #[test]
    fn apply_github_mirror_prepends_prefix() {
        let original = "https://github.com/Mai-with-u/MaiBot.git";
        assert_eq!(
            apply_github_mirror(original, "https://gh-proxy.com/"),
            "https://gh-proxy.com/https://github.com/Mai-with-u/MaiBot.git"
        );
    }

    #[test]
    fn apply_github_mirror_trims_surrounding_whitespace_in_prefix() {
        let original = "https://github.com/x/y.git";
        assert_eq!(
            apply_github_mirror(original, "  https://gh-proxy.com/  "),
            "https://gh-proxy.com/https://github.com/x/y.git"
        );
    }

    // ==================== build_proxy_env ====================

    #[test]
    fn build_proxy_env_disabled_returns_empty() {
        let proxy = NetworkProxy {
            enabled: false,
            host: "127.0.0.1".to_string(),
            port: 7890,
        };
        assert!(build_proxy_env(&proxy).is_empty());
    }

    #[test]
    fn build_proxy_env_enabled_sets_all_proxy_vars() {
        let proxy = NetworkProxy {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 7890,
        };
        let env = build_proxy_env(&proxy);
        let url = "http://127.0.0.1:7890";
        // 大小写两套各三个，共 6 项。
        assert_eq!(env.len(), 6);
        for key in [
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "ALL_PROXY",
            "http_proxy",
            "https_proxy",
            "all_proxy",
        ] {
            let found = env
                .iter()
                .find(|(k, _)| k == key)
                .unwrap_or_else(|| panic!("缺少环境变量 {}", key));
            assert_eq!(found.1, url, "{} 的值应为 {}", key, url);
        }
    }

    #[test]
    fn build_proxy_env_trims_host_whitespace() {
        let proxy = NetworkProxy {
            enabled: true,
            host: "  10.0.0.1  ".to_string(),
            port: 1080,
        };
        let env = build_proxy_env(&proxy);
        assert_eq!(env[0].1, "http://10.0.0.1:1080");
    }

    // ==================== pick_active_github ====================

    #[test]
    fn pick_active_github_empty_list_returns_none() {
        assert!(pick_active_github(&[]).is_none());
    }

    #[test]
    fn pick_active_github_no_enabled_returns_none() {
        let list = vec![
            GithubMirror {
                id: "a".into(),
                name: "A".into(),
                prefix: String::new(),
                priority: 100,
                enabled: false,
            },
            GithubMirror {
                id: "b".into(),
                name: "B".into(),
                prefix: "https://m/".into(),
                priority: 90,
                enabled: false,
            },
        ];
        assert!(pick_active_github(&list).is_none());
    }

    #[test]
    fn pick_active_github_picks_highest_priority_enabled() {
        let list = vec![
            GithubMirror {
                id: "low".into(),
                name: "low".into(),
                prefix: "https://low/".into(),
                priority: 10,
                enabled: true,
            },
            GithubMirror {
                id: "high".into(),
                name: "high".into(),
                prefix: "https://high/".into(),
                priority: 99,
                enabled: true,
            },
            GithubMirror {
                id: "disabled-top".into(),
                name: "disabled-top".into(),
                prefix: "https://disabled/".into(),
                priority: 200,
                enabled: false,
            },
        ];
        let picked = pick_active_github(&list).expect("应选出启用项");
        assert_eq!(
            picked.id, "high",
            "应跳过禁用的高优先级项，取启用项中最高优先级"
        );
    }

    #[test]
    fn pick_active_github_tie_prefers_first_in_list() {
        // 两个启用项同优先级时，取列表中先出现者（与前端一致）。
        let list = vec![
            GithubMirror {
                id: "first".into(),
                name: "first".into(),
                prefix: "https://first/".into(),
                priority: 50,
                enabled: true,
            },
            GithubMirror {
                id: "second".into(),
                name: "second".into(),
                prefix: "https://second/".into(),
                priority: 50,
                enabled: true,
            },
        ];
        assert_eq!(pick_active_github(&list).expect("应选出").id, "first");
    }

    // ==================== pick_active_pypi ====================

    #[test]
    fn pick_active_pypi_picks_highest_priority_enabled() {
        let list = vec![
            PypiSource {
                id: "official".into(),
                name: "PyPI".into(),
                index_url: "https://pypi.org/simple".into(),
                priority: 100,
                enabled: false,
            },
            PypiSource {
                id: "tuna".into(),
                name: "TUNA".into(),
                index_url: "https://pypi.tuna.tsinghua.edu.cn/simple".into(),
                priority: 90,
                enabled: true,
            },
        ];
        let picked = pick_active_pypi(&list).expect("应选出启用项");
        assert_eq!(picked.id, "tuna");
    }

    #[test]
    fn pick_active_pypi_empty_returns_none() {
        assert!(pick_active_pypi(&[]).is_none());
    }

    // ==================== trusted_host_for ====================

    #[test]
    fn trusted_host_for_https_returns_none() {
        assert_eq!(trusted_host_for("https://pypi.org/simple"), None);
    }

    #[test]
    fn trusted_host_for_http_extracts_host() {
        assert_eq!(
            trusted_host_for("http://mirrors.example.com/pypi/simple"),
            Some("mirrors.example.com".to_string())
        );
    }

    #[test]
    fn trusted_host_for_http_preserves_port() {
        assert_eq!(
            trusted_host_for("http://192.168.1.10:8081/simple"),
            Some("192.168.1.10:8081".to_string())
        );
    }

    #[test]
    fn trusted_host_for_http_without_path_extracts_host() {
        assert_eq!(
            trusted_host_for("http://devpi.local"),
            Some("devpi.local".to_string())
        );
    }

    #[test]
    fn trusted_host_for_non_url_returns_none() {
        assert_eq!(trusted_host_for("ftp://x/simple"), None);
        assert_eq!(trusted_host_for("pypi.org/simple"), None);
    }

    // ==================== apply_proxy_to_process_env ====================

    // 注：直接操作进程级环境变量。为避免与其它读 env 的并发测试相互踩踏，
    // 这里用一组本测试专属断言并在结尾清理；启用→禁用两态都覆盖。
    #[test]
    fn apply_proxy_to_process_env_sets_then_clears() {
        let keys = [
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "ALL_PROXY",
            "http_proxy",
            "https_proxy",
            "all_proxy",
        ];
        // 先确保干净起点。
        for k in keys {
            std::env::remove_var(k);
        }

        let enabled = NetworkProxy {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 7890,
        };
        apply_proxy_to_process_env(&enabled);
        for k in keys {
            assert_eq!(
                std::env::var(k).ok(),
                Some("http://127.0.0.1:7890".to_string()),
                "{} 应被设置为代理地址",
                k
            );
        }

        let disabled = NetworkProxy {
            enabled: false,
            host: "127.0.0.1".to_string(),
            port: 7890,
        };
        apply_proxy_to_process_env(&disabled);
        for k in keys {
            assert!(
                std::env::var(k).is_err(),
                "{} 在禁用后应被移除，不得残留",
                k
            );
        }
    }

    // ==================== 默认值 ====================

    #[test]
    fn network_proxy_default_is_disabled_clash_port() {
        let d = NetworkProxy::default();
        assert!(!d.enabled);
        assert_eq!(d.host, "127.0.0.1");
        assert_eq!(d.port, 7890);
    }

    #[test]
    fn source_config_default_enables_only_official() {
        let d = SourceConfig::default();
        // GitHub: 官方直连唯一启用项，且 prefix 为空。
        let active_gh = pick_active_github(&d.github).expect("应有启用的 GitHub 源");
        assert_eq!(active_gh.id, "github-official");
        assert!(active_gh.prefix.is_empty());
        assert_eq!(d.github.iter().filter(|m| m.enabled).count(), 1);

        // PyPI: 官方唯一启用项。
        let active_pypi = pick_active_pypi(&d.pypi).expect("应有启用的 PyPI 源");
        assert_eq!(active_pypi.id, "pypi-official");
        assert_eq!(d.pypi.iter().filter(|s| s.enabled).count(), 1);
    }

    // ==================== 配置读写往返 ====================

    #[tokio::test]
    async fn get_network_proxy_returns_default_when_absent() {
        let pool = setup_test_db().await;
        let proxy = get_network_proxy(&pool).await.expect("读取失败");
        assert_eq!(proxy, NetworkProxy::default());
    }

    #[tokio::test]
    async fn network_proxy_save_then_get_roundtrip() {
        let pool = setup_test_db().await;
        let proxy = NetworkProxy {
            enabled: true,
            host: "10.1.2.3".to_string(),
            port: 1081,
        };
        save_network_proxy(&pool, &proxy).await.expect("保存失败");
        let loaded = get_network_proxy(&pool).await.expect("读取失败");
        assert_eq!(loaded, proxy);
    }

    #[tokio::test]
    async fn get_source_config_returns_seed_when_absent() {
        let pool = setup_test_db().await;
        let config = get_source_config(&pool).await.expect("读取失败");
        assert_eq!(config, SourceConfig::default());
    }

    #[tokio::test]
    async fn source_config_save_then_get_roundtrip() {
        let pool = setup_test_db().await;
        let config = SourceConfig {
            github: vec![GithubMirror {
                id: "custom".to_string(),
                name: "自定义镜像".to_string(),
                prefix: "https://mirror.internal/".to_string(),
                priority: 50,
                enabled: true,
            }],
            pypi: vec![PypiSource {
                id: "custom-pypi".to_string(),
                name: "内网 PyPI".to_string(),
                index_url: "http://devpi.internal:3141/root/pypi/+simple".to_string(),
                priority: 60,
                enabled: true,
            }],
        };
        save_source_config(&pool, &config).await.expect("保存失败");
        let loaded = get_source_config(&pool).await.expect("读取失败");
        assert_eq!(loaded, config);
    }

    // ==================== resolve_active_github_prefix ====================

    #[tokio::test]
    async fn resolve_active_github_prefix_returns_enabled_mirror_prefix() {
        let pool = setup_test_db().await;
        let config = SourceConfig {
            github: vec![
                GithubMirror {
                    id: "official".to_string(),
                    name: "官方".to_string(),
                    prefix: String::new(),
                    priority: 10,
                    enabled: false,
                },
                GithubMirror {
                    id: "custom".to_string(),
                    name: "自定义镜像".to_string(),
                    prefix: "https://gh.internal/".to_string(),
                    priority: 90,
                    enabled: true,
                },
            ],
            pypi: vec![],
        };
        save_source_config(&pool, &config).await.expect("保存失败");

        let prefix = resolve_active_github_prefix(&pool).await;
        assert_eq!(prefix, "https://gh.internal/");
        // 与 apply_github_mirror 组合后应真正改写 URL
        assert_eq!(
            apply_github_mirror("https://github.com/x/y/releases/download/v1/a.zip", &prefix),
            "https://gh.internal/https://github.com/x/y/releases/download/v1/a.zip"
        );
    }

    #[tokio::test]
    async fn resolve_active_github_prefix_empty_when_only_official_enabled() {
        let pool = setup_test_db().await;
        let config = SourceConfig {
            github: vec![GithubMirror {
                id: "official".to_string(),
                name: "官方".to_string(),
                prefix: String::new(),
                priority: 10,
                enabled: true,
            }],
            pypi: vec![],
        };
        save_source_config(&pool, &config).await.expect("保存失败");

        let prefix = resolve_active_github_prefix(&pool).await;
        assert_eq!(prefix, "");
    }
}

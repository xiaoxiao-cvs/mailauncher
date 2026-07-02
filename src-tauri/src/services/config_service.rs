/// 配置管理服务
///
/// 对应 Python 的 config_service.py + maibot_config_service.py。
///
/// 分为两部分：
/// 1. 启动器 KV 配置 — 数据库持久化（LauncherConfig / PythonEnvironment / PathConfig）
/// 2. MAIBot TOML 配置 — 直接读写 TOML 文件（bot_config.toml / model_config.toml / adapter config.toml）
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use chrono::Local;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use toml_edit::DocumentMut;
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::config::*;
use crate::utils::platform;

/// `import_external_file` 的导入目标：三种可覆盖写入的实例文件。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImportConfigTarget {
    BotConfig,
    ModelConfig,
    MaibotDb,
}

/// 结构化 TOML 配置 + 官方字段说明（取自 TOML 源文件中键值上方的 `#` 注释）。
///
/// `comments` 以点分 key_path 为键（数组项形如 `api_providers[0].base_url`），
/// 与前端 groupBotConfig/groupModelConfig 构建 TreeNode 时使用的 path 格式一致。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TomlConfigWithComments {
    pub data: serde_json::Value,
    pub comments: HashMap<String, String>,
}

// ==================== 1. 启动器 KV 配置 ====================

/// 获取所有 KV 配置
pub async fn get_all_configs(pool: &SqlitePool) -> AppResult<Vec<LauncherConfig>> {
    let rows = sqlx::query_as::<_, LauncherConfig>("SELECT * FROM launcher_config ORDER BY key")
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询配置失败: {}", e)))?;
    Ok(rows)
}

/// 获取单个配置值
pub async fn get_config(pool: &SqlitePool, key: &str) -> AppResult<Option<String>> {
    let row = sqlx::query_as::<_, LauncherConfig>("SELECT * FROM launcher_config WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询配置失败: {}", e)))?;
    Ok(row.and_then(|r| r.value))
}

/// 设置配置值（存在则更新，不存在则插入）
pub async fn set_config(
    pool: &SqlitePool,
    key: &str,
    value: &str,
    description: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO launcher_config (key, value, description, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = COALESCE(excluded.description, description), updated_at = datetime('now')",
    )
    .bind(key)
    .bind(value)
    .bind(description)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("保存配置失败: {}", e)))?;
    Ok(())
}

// ==================== Python 环境管理 ====================

/// 获取所有 Python 环境
pub async fn get_python_environments(pool: &SqlitePool) -> AppResult<Vec<PythonEnvironment>> {
    let mut rows = sqlx::query_as::<_, PythonEnvironment>(
        "SELECT * FROM python_environments ORDER BY is_selected DESC, path",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询 Python 环境失败: {}", e)))?;
    // meets_maibot_requirement 非数据库列，按存储的 major/minor 回填
    for env in &mut rows {
        env.meets_maibot_requirement = compute_meets_maibot_requirement(env);
    }
    Ok(rows)
}

/// 获取当前选中的 Python 环境
pub async fn get_selected_python(pool: &SqlitePool) -> AppResult<Option<PythonEnvironment>> {
    let row = sqlx::query_as::<_, PythonEnvironment>(
        "SELECT * FROM python_environments WHERE is_selected = 1 LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询选中 Python 环境失败: {}", e)))?;
    Ok(row.map(|mut env| {
        env.meets_maibot_requirement = compute_meets_maibot_requirement(&env);
        env
    }))
}

/// 根据 PythonEnvironment 存储的 major/minor 计算是否满足 MaiBot 要求
fn compute_meets_maibot_requirement(env: &PythonEnvironment) -> bool {
    crate::services::system_service::meets_maibot_requirement(
        env.major.max(0) as u32,
        env.minor.max(0) as u32,
    )
}

/// 选择 Python 环境
pub async fn select_python(pool: &SqlitePool, path: &str) -> AppResult<()> {
    // 先取消所有选中
    sqlx::query("UPDATE python_environments SET is_selected = 0")
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
    // 选中指定路径
    sqlx::query("UPDATE python_environments SET is_selected = 1 WHERE path = ?")
        .bind(path)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
    info!("选择 Python 环境: {}", path);
    Ok(())
}

/// 保存检测到的 Python 环境
///
/// 自动从版本字符串解析 major/minor/micro。
pub async fn save_python_environment(
    pool: &SqlitePool,
    path: &str,
    version: &str,
) -> AppResult<()> {
    let (major, minor, micro) = parse_python_version(version);
    sqlx::query(
        "INSERT INTO python_environments (path, version, major, minor, micro, is_default, is_selected)
         VALUES (?, ?, ?, ?, ?, 0, 0)
         ON CONFLICT(path) DO UPDATE SET version = excluded.version, major = excluded.major, minor = excluded.minor, micro = excluded.micro",
    )
    .bind(path)
    .bind(version)
    .bind(major)
    .bind(minor)
    .bind(micro)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("保存 Python 环境失败: {}", e)))?;
    Ok(())
}

/// 解析 Python 版本字符串（如 "3.11.5" → (3, 11, 5)）
fn parse_python_version(version: &str) -> (i32, i32, i32) {
    let parts: Vec<i32> = version.split('.').filter_map(|s| s.parse().ok()).collect();
    (
        parts.first().copied().unwrap_or(0),
        parts.get(1).copied().unwrap_or(0),
        parts.get(2).copied().unwrap_or(0),
    )
}

// ==================== 路径配置管理 ====================

/// 获取所有路径配置
pub async fn get_all_paths(pool: &SqlitePool) -> AppResult<Vec<PathConfig>> {
    let rows = sqlx::query_as::<_, PathConfig>("SELECT * FROM path_config ORDER BY name")
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询路径配置失败: {}", e)))?;
    Ok(rows)
}

/// 获取指定路径配置
pub async fn get_path(pool: &SqlitePool, name: &str) -> AppResult<Option<PathConfig>> {
    let row = sqlx::query_as::<_, PathConfig>("SELECT * FROM path_config WHERE name = ?")
        .bind(name)
        .fetch_optional(pool)
        .await
        .map_err(|e| AppError::Database(format!("查询路径配置失败: {}", e)))?;
    Ok(row)
}

/// 设置路径配置
pub async fn set_path(
    pool: &SqlitePool,
    name: &str,
    path: &str,
    path_type: &str,
    is_verified: bool,
    description: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO path_config (name, path, path_type, is_verified, description, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET path = excluded.path, path_type = excluded.path_type, is_verified = excluded.is_verified, description = COALESCE(excluded.description, description), updated_at = datetime('now')",
    )
    .bind(name)
    .bind(path)
    .bind(path_type)
    .bind(is_verified)
    .bind(description)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("保存路径配置失败: {}", e)))?;
    Ok(())
}

// ==================== 2. MAIBot TOML 配置 ====================

/// 解析实例的配置目录
///
/// 对应 Python `_get_instance_config_dir`。  
/// 配置路径：`{instances_dir}/{instance_path}/MaiBot/config/`
pub async fn resolve_config_dir(
    pool: &SqlitePool,
    instance_id: Option<&str>,
    config_type: &str,
) -> AppResult<PathBuf> {
    if let Some(id) = instance_id {
        let instance = crate::services::instance_service::get_instance(pool, id).await?;
        if let Some(inst) = instance {
            let instance_path = inst.instance_path.unwrap_or_else(|| inst.name.clone());
            let instances_dir = platform::get_instances_dir();
            let config_dir = match config_type {
                "bot" | "model" => instances_dir
                    .join(&instance_path)
                    .join("MaiBot")
                    .join("config"),
                // 适配器作为 MaiBot 插件，其 config.toml 位于 MaiBot/plugins 下。
                "adapter" => instances_dir
                    .join(&instance_path)
                    .join("MaiBot")
                    .join("plugins")
                    .join("MaiBot-Napcat-Adapter"),
                _ => {
                    return Err(AppError::InvalidInput(format!(
                        "未知配置类型: {}",
                        config_type
                    )));
                }
            };
            if config_dir.exists() {
                return Ok(config_dir);
            }
            warn!("实例配置目录不存在: {:?}", config_dir);
        }
    }
    // 回退到默认配置目录
    Err(AppError::NotFound("配置目录不存在".to_string()))
}

/// 获取 TOML 配置（结构化 JSON）
///
/// 对应 Python `get_bot_config / get_model_config / get_adapter_config`。
/// 使用 `toml_edit` 解析后转为 JSON 返回。
pub fn read_toml_as_json(config_path: &Path) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;

    // 将 TOML 转为 serde_json::Value
    let value: toml::Value = toml::from_str(&content)
        .map_err(|e| AppError::Config(format!("TOML 反序列化失败: {}", e)))?;
    let json = serde_json::to_value(&value)
        .map_err(|e| AppError::Config(format!("JSON 序列化失败: {}", e)))?;
    Ok(json)
}

/// 获取 TOML 配置（结构化 JSON + 官方字段说明）
///
/// 用 `toml_edit` 解析以保留每个键的 decor（前置注释），叠加到 `read_toml_as_json`
/// 产出的结构化数据上，供前端 tree 模式渲染字段说明（Info 提示气泡）。
pub fn read_toml_with_comments(config_path: &Path) -> AppResult<TomlConfigWithComments> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let mut comments = HashMap::new();
    collect_toml_comments(doc.as_table(), "", &mut comments);

    let data = read_toml_as_json(config_path)?;
    Ok(TomlConfigWithComments { data, comments })
}

/// 递归遍历 TOML 表，把每个键上方的注释按点分路径收集进 `out`。
///
/// 数组表（`[[section]]`）按索引展开为 `section[0]`、`section[1]`……与前端
/// groupModelConfig/buildTreeData 构建 api_providers[N].xxx 叶子路径的写法保持一致。
fn collect_toml_comments(table: &toml_edit::Table, prefix: &str, out: &mut HashMap<String, String>) {
    for (key, item) in table.iter() {
        let path = if prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}.{}", prefix, key)
        };
        if let Some(key_ref) = table.key(key) {
            if let Some(comment) = extract_comment(key_ref.leaf_decor()) {
                out.insert(path.clone(), comment);
            }
        }
        if let Some(sub_table) = item.as_table() {
            collect_toml_comments(sub_table, &path, out);
        } else if let Some(array) = item.as_array_of_tables() {
            for (idx, sub_table) in array.iter().enumerate() {
                collect_toml_comments(sub_table, &format!("{}[{}]", path, idx), out);
            }
        }
    }
}

/// 从 decor 的 prefix（键前的原始空白与注释文本）中抽出注释正文。
///
/// 逐行剥离 `#` 前缀与首尾空白，忽略非注释的空行；多行注释按行拼接，无注释返回 `None`。
fn extract_comment(decor: &toml_edit::Decor) -> Option<String> {
    let prefix = decor.prefix()?.as_str()?;
    let lines: Vec<&str> = prefix
        .lines()
        .map(str::trim)
        .filter(|line| line.starts_with('#'))
        .map(|line| line.trim_start_matches('#').trim())
        .filter(|line| !line.is_empty())
        .collect();
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

/// 获取 TOML 配置原始文本
pub fn read_toml_raw(config_path: &Path) -> AppResult<String> {
    std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))
}

/// 保存 TOML 原始文本
///
/// 先验证语法，再对原文件打时间戳快照备份，最后覆盖写入，便于手动回滚。
pub fn save_toml_raw(config_path: &Path, content: &str) -> AppResult<()> {
    // 验证 TOML 语法
    content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 语法错误: {}", e)))?;
    backup_existing_file(config_path)?;
    // 写入文件
    std::fs::write(config_path, content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;
    info!("保存 TOML 配置: {:?}", config_path);
    Ok(())
}

/// 为已存在的文件生成时间戳快照备份（`<path>.bak.<YYYYMMDD_HHMMSS>`）。
///
/// 文件尚不存在（如首次部署、目标文件从未生成过）视为无需备份，返回 `Ok(None)`。
fn backup_existing_file(path: &Path) -> AppResult<Option<PathBuf>> {
    if !path.exists() {
        return Ok(None);
    }
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = PathBuf::from(format!("{}.bak.{}", path.display(), timestamp));
    std::fs::copy(path, &backup_path)
        .map_err(|e| AppError::FileSystem(format!("备份文件失败: {}", e)))?;
    info!("已备份文件: {:?} -> {:?}", path, backup_path);
    Ok(Some(backup_path))
}

/// 把 source 复制到 dest；dest 已存在时先打快照备份再覆盖，dest 所在目录不存在则自动创建
/// （兼容尚未运行过一次、MaiBot/data 目录还未生成的实例）。
fn copy_with_backup(source: &Path, dest: &Path) -> AppResult<()> {
    if !source.is_file() {
        return Err(AppError::InvalidInput(format!(
            "源文件不存在或不是文件: {:?}",
            source
        )));
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::FileSystem(format!("创建目标目录失败: {}", e)))?;
    }
    backup_existing_file(dest)?;
    std::fs::copy(source, dest)
        .map_err(|e| AppError::FileSystem(format!("导入文件失败: {}", e)))?;
    Ok(())
}

/// 从外部文件导入配置或数据库到实例目录
///
/// 覆盖前对已存在的目标文件打时间戳备份；要求实例处于非活跃状态（未在运行/启动/停止中），
/// 避免导入内容与运行中进程的读写产生竞争。返回导入后的目标文件路径。
pub async fn import_external_file(
    pool: &SqlitePool,
    instance_id: &str,
    target: ImportConfigTarget,
    source_path: &Path,
) -> AppResult<PathBuf> {
    let instance = crate::services::instance_service::get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例不存在: {}", instance_id)))?;

    if instance.status.is_active() {
        return Err(AppError::InvalidInput(
            "实例运行中，请先停止实例后再导入配置".to_string(),
        ));
    }

    let dest_path = match target {
        ImportConfigTarget::BotConfig => resolve_config_dir(pool, Some(instance_id), "bot")
            .await?
            .join("bot_config.toml"),
        ImportConfigTarget::ModelConfig => resolve_config_dir(pool, Some(instance_id), "model")
            .await?
            .join("model_config.toml"),
        ImportConfigTarget::MaibotDb => {
            let instance_path = instance
                .instance_path
                .clone()
                .unwrap_or_else(|| instance.name.clone());
            // 已存在的库沿用其真实候选路径（大小写历史差异）；否则回退到现代 schema 的规范路径
            crate::services::stats_service::resolve_maibot_db(&instance_path).unwrap_or_else(|| {
                platform::get_instances_dir()
                    .join(&instance_path)
                    .join("MaiBot")
                    .join("data")
                    .join("MaiBot.db")
            })
        }
    };

    copy_with_backup(source_path, &dest_path)?;
    info!("导入外部文件: {:?} -> {:?}", source_path, dest_path);
    Ok(dest_path)
}

/// 更新 TOML 中的某个值（通过 key_path）
///
/// 对应 Python `set_value(key_path, value)`。
/// key_path 格式：`section.key` 或 `section.sub.key`。
pub fn update_toml_value(
    config_path: &Path,
    key_path: &str,
    value: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let mut doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    // 解析 key_path
    let parts: Vec<&str> = key_path.split('.').collect();
    set_toml_value(&mut doc, &parts, &value)?;

    // 保存并返回新的结构化配置
    let new_content = doc.to_string();
    std::fs::write(config_path, &new_content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;

    read_toml_as_json(config_path)
}

/// 删除 TOML 中的某个键
pub fn delete_toml_key(config_path: &Path, key_path: &str) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let mut doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let parts: Vec<&str> = key_path.split('.').collect();
    remove_toml_key(&mut doc, &parts)?;

    let new_content = doc.to_string();
    std::fs::write(config_path, &new_content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;

    read_toml_as_json(config_path)
}

/// 添加 TOML 中的新键
pub fn add_toml_key(
    config_path: &Path,
    section: Option<&str>,
    key: &str,
    value: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let key_path = if let Some(sec) = section {
        format!("{}.{}", sec, key)
    } else {
        key.to_string()
    };
    update_toml_value(config_path, &key_path, value)
}

/// 获取 TOML 文件的顶层 section 列表
pub fn get_toml_sections(config_path: &Path) -> AppResult<Vec<String>> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let sections: Vec<String> = doc.as_table().iter().map(|(k, _)| k.to_string()).collect();
    Ok(sections)
}

// ==================== 数组操作 ====================

/// 向 TOML 数组追加项
pub fn add_toml_array_item(
    config_path: &Path,
    array_path: &str,
    item: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let mut doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let parts: Vec<&str> = array_path.split('.').collect();
    let array = navigate_to_array_mut(&mut doc, &parts)?;

    let toml_value = json_to_toml_value(&item);
    array.push(toml_value);

    let new_content = doc.to_string();
    std::fs::write(config_path, &new_content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;

    read_toml_as_json(config_path)
}

/// 更新 TOML 数组中的指定项
pub fn update_toml_array_item(
    config_path: &Path,
    array_path: &str,
    index: usize,
    updates: serde_json::Value,
) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let mut doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let parts: Vec<&str> = array_path.split('.').collect();
    let array = navigate_to_array_mut(&mut doc, &parts)?;

    if index >= array.len() {
        return Err(AppError::InvalidInput(format!(
            "数组索引越界: {} >= {}",
            index,
            array.len()
        )));
    }

    // 获取现有项并更新字段
    if let Some(existing) = array.get_mut(index) {
        if let Some(obj) = updates.as_object() {
            if let Some(table) = existing.as_inline_table_mut() {
                for (k, v) in obj {
                    table.insert(k, json_to_toml_value(v));
                }
            }
        } else {
            // 非对象类型，直接替换
            *existing = json_to_toml_value(&updates);
        }
    }

    let new_content = doc.to_string();
    std::fs::write(config_path, &new_content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;

    read_toml_as_json(config_path)
}

/// 删除 TOML 数组中的指定项
pub fn delete_toml_array_item(
    config_path: &Path,
    array_path: &str,
    index: usize,
) -> AppResult<serde_json::Value> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))?;
    let mut doc = content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 解析失败: {}", e)))?;

    let parts: Vec<&str> = array_path.split('.').collect();
    let array = navigate_to_array_mut(&mut doc, &parts)?;

    if index >= array.len() {
        return Err(AppError::InvalidInput(format!(
            "数组索引越界: {} >= {}",
            index,
            array.len()
        )));
    }
    array.remove(index);

    let new_content = doc.to_string();
    std::fs::write(config_path, &new_content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;

    read_toml_as_json(config_path)
}

// ==================== 内部辅助函数 ====================

/// 在 TOML Document 中设置值
fn set_toml_value(
    doc: &mut DocumentMut,
    parts: &[&str],
    value: &serde_json::Value,
) -> AppResult<()> {
    if parts.is_empty() {
        return Err(AppError::InvalidInput("空 key_path".to_string()));
    }

    if parts.len() == 1 {
        doc[parts[0]] = json_to_toml_item(value);
        return Ok(());
    }

    // 导航到父节点
    let mut current = doc.as_table_mut() as &mut dyn toml_edit::TableLike;
    for &part in &parts[..parts.len() - 1] {
        let entry = current.entry(part);
        let item = entry.or_insert(toml_edit::Item::Table(toml_edit::Table::new()));
        current = item
            .as_table_like_mut()
            .ok_or_else(|| AppError::Config(format!("路径 '{}' 不是表", part)))?;
    }

    let last_key = parts[parts.len() - 1];
    current.insert(last_key, json_to_toml_item(value));
    Ok(())
}

/// 在 TOML Document 中删除键
fn remove_toml_key(doc: &mut DocumentMut, parts: &[&str]) -> AppResult<()> {
    if parts.is_empty() {
        return Err(AppError::InvalidInput("空 key_path".to_string()));
    }

    if parts.len() == 1 {
        doc.remove(parts[0]);
        return Ok(());
    }

    let mut current = doc.as_table_mut() as &mut dyn toml_edit::TableLike;
    for &part in &parts[..parts.len() - 1] {
        current = current
            .get_mut(part)
            .and_then(|item| item.as_table_like_mut())
            .ok_or_else(|| AppError::Config(format!("路径 '{}' 不存在", part)))?;
    }

    current.remove(parts[parts.len() - 1]);
    Ok(())
}

/// 导航到数组并返回可变引用
fn navigate_to_array_mut<'a>(
    doc: &'a mut DocumentMut,
    parts: &[&str],
) -> AppResult<&'a mut toml_edit::Array> {
    if parts.is_empty() {
        return Err(AppError::InvalidInput("空 array_path".to_string()));
    }

    if parts.len() == 1 {
        return doc
            .get_mut(parts[0])
            .and_then(|item| item.as_array_mut())
            .ok_or_else(|| AppError::Config(format!("'{}' 不是数组", parts[0])));
    }

    let mut current: &mut dyn toml_edit::TableLike = doc.as_table_mut();
    for &part in &parts[..parts.len() - 1] {
        current = current
            .get_mut(part)
            .and_then(|item| item.as_table_like_mut())
            .ok_or_else(|| AppError::Config(format!("路径 '{}' 不存在", part)))?;
    }

    current
        .get_mut(parts[parts.len() - 1])
        .and_then(|item| item.as_array_mut())
        .ok_or_else(|| AppError::Config(format!("'{}' 不是数组", parts[parts.len() - 1])))
}

/// 将 JSON 值转为 toml_edit::Item
fn json_to_toml_item(value: &serde_json::Value) -> toml_edit::Item {
    toml_edit::Item::Value(json_to_toml_value(value))
}

/// 将 JSON 值转为 toml_edit::Value
fn json_to_toml_value(value: &serde_json::Value) -> toml_edit::Value {
    match value {
        serde_json::Value::Null => toml_edit::Value::from(""),
        serde_json::Value::Bool(b) => toml_edit::Value::from(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                toml_edit::Value::from(i)
            } else if let Some(f) = n.as_f64() {
                toml_edit::Value::from(f)
            } else {
                toml_edit::Value::from(n.to_string())
            }
        }
        serde_json::Value::String(s) => toml_edit::Value::from(s.as_str()),
        serde_json::Value::Array(arr) => {
            let mut toml_arr = toml_edit::Array::new();
            for item in arr {
                toml_arr.push(json_to_toml_value(item));
            }
            toml_edit::Value::Array(toml_arr)
        }
        serde_json::Value::Object(obj) => {
            let mut table = toml_edit::InlineTable::new();
            for (k, v) in obj {
                table.insert(k, json_to_toml_value(v));
            }
            toml_edit::Value::InlineTable(table)
        }
    }
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

        sqlx::query(
            "CREATE TABLE python_environments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                version TEXT,
                major INTEGER,
                minor INTEGER,
                micro INTEGER,
                is_default BOOLEAN DEFAULT 0,
                is_selected BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT (datetime('now', 'localtime'))
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");

        sqlx::query(
            "CREATE TABLE path_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                path TEXT NOT NULL,
                path_type VARCHAR(50) DEFAULT 'custom',
                is_verified BOOLEAN DEFAULT 0,
                description TEXT,
                updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");

        // 供 import_external_file 测试复用：与 instance_service 测试模块同构的 instances 表
        sqlx::query(
            "CREATE TABLE instances (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                instance_path VARCHAR(500),
                bot_type VARCHAR(20) NOT NULL,
                bot_version VARCHAR(50),
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'stopped',
                python_path VARCHAR(500),
                config_path VARCHAR(500),
                created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
                last_run DATETIME,
                run_time INTEGER NOT NULL DEFAULT 0,
                qq_account VARCHAR(20),
                runtime_profile TEXT,
                component_runtime_profiles TEXT,
                last_error TEXT,
                last_status_reason TEXT,
                component_state TEXT
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");

        pool
    }

    /// 插入一条测试用实例记录，返回其 id
    async fn insert_instance(pool: &SqlitePool, id: &str, status: &str) {
        sqlx::query(
            "INSERT INTO instances (id, name, instance_path, bot_type, status, run_time)
             VALUES (?, ?, ?, 'maibot', ?, 0)",
        )
        .bind(id)
        .bind(id)
        .bind(id)
        .bind(status)
        .execute(pool)
        .await
        .expect("插入实例失败");
    }

    #[tokio::test]
    async fn set_and_get_config_roundtrip() {
        let pool = setup_test_db().await;
        set_config(&pool, "theme", "dark", Some("UI 主题"))
            .await
            .expect("写入配置失败");
        let value = get_config(&pool, "theme").await.expect("读取配置失败");
        assert_eq!(value, Some("dark".to_string()));
    }

    #[tokio::test]
    async fn set_config_upserts_existing_key() {
        let pool = setup_test_db().await;
        set_config(&pool, "lang", "en", None)
            .await
            .expect("首次写入失败");
        set_config(&pool, "lang", "zh", None)
            .await
            .expect("更新写入失败");
        let value = get_config(&pool, "lang").await.expect("读取配置失败");
        assert_eq!(value, Some("zh".to_string()));
    }

    #[tokio::test]
    async fn get_config_returns_none_for_missing_key() {
        let pool = setup_test_db().await;
        let value = get_config(&pool, "nonexistent").await.expect("查询失败");
        assert!(value.is_none());
    }

    #[tokio::test]
    async fn get_all_configs_returns_sorted_list() {
        let pool = setup_test_db().await;
        set_config(&pool, "zzz", "last", None).await.unwrap();
        set_config(&pool, "aaa", "first", None).await.unwrap();
        let configs = get_all_configs(&pool).await.expect("查询失败");
        assert_eq!(configs.len(), 2);
        assert_eq!(configs[0].key, "aaa");
        assert_eq!(configs[1].key, "zzz");
    }

    // ==================== P1-12: save_toml_raw 覆盖前备份 ====================

    #[test]
    fn save_toml_raw_backs_up_existing_file_before_overwrite() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let config_path = dir.path().join("bot_config.toml");
        std::fs::write(&config_path, "a = 1\n").expect("写入初始文件失败");

        save_toml_raw(&config_path, "a = 2\n").expect("保存失败");

        // 主文件已更新为新内容
        assert_eq!(std::fs::read_to_string(&config_path).unwrap(), "a = 2\n");

        // 目录下应出现且仅出现一份 .bak. 快照，内容为覆盖前的原文
        let backups: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains(".bak."))
            .collect();
        assert_eq!(backups.len(), 1, "应恰好生成一份备份文件");
        let backup_content = std::fs::read_to_string(backups[0].path()).unwrap();
        assert_eq!(backup_content, "a = 1\n");
    }

    #[test]
    fn save_toml_raw_skips_backup_when_file_did_not_exist() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let config_path = dir.path().join("new_config.toml");

        save_toml_raw(&config_path, "a = 1\n").expect("保存失败");

        let entries: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(entries.len(), 1, "首次写入不应产生备份文件");
    }

    #[test]
    fn save_toml_raw_rejects_invalid_syntax_without_touching_disk() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let config_path = dir.path().join("bot_config.toml");
        std::fs::write(&config_path, "a = 1\n").expect("写入初始文件失败");

        let err = save_toml_raw(&config_path, "a = [1, 2").unwrap_err();
        assert!(matches!(err, AppError::Config(_)));
        // 语法校验失败应在写入前拦截，原文件必须原封不动
        assert_eq!(std::fs::read_to_string(&config_path).unwrap(), "a = 1\n");
    }

    // ==================== P1-11: import_external_file ====================

    #[tokio::test]
    async fn import_external_file_returns_not_found_for_missing_instance() {
        let pool = setup_test_db().await;
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let source = dir.path().join("source.toml");
        std::fs::write(&source, "a = 1\n").unwrap();

        let err = import_external_file(
            &pool,
            "inst_missing",
            ImportConfigTarget::BotConfig,
            &source,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[tokio::test]
    async fn import_external_file_rejects_running_instance() {
        let pool = setup_test_db().await;
        insert_instance(&pool, "inst_running", "running").await;
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let source = dir.path().join("source.toml");
        std::fs::write(&source, "a = 1\n").unwrap();

        let err = import_external_file(
            &pool,
            "inst_running",
            ImportConfigTarget::BotConfig,
            &source,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AppError::InvalidInput(_)));
    }

    #[test]
    fn copy_with_backup_backs_up_existing_dest_and_copies_new_content() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let source = dir.path().join("source.toml");
        let dest = dir.path().join("bot_config.toml");
        std::fs::write(&source, "new content\n").unwrap();
        std::fs::write(&dest, "old content\n").unwrap();

        copy_with_backup(&source, &dest).expect("导入失败");

        assert_eq!(std::fs::read_to_string(&dest).unwrap(), "new content\n");
        let backups: Vec<_> = std::fs::read_dir(dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains(".bak."))
            .collect();
        assert_eq!(backups.len(), 1);
        assert_eq!(
            std::fs::read_to_string(backups[0].path()).unwrap(),
            "old content\n"
        );
    }

    #[test]
    fn copy_with_backup_creates_missing_dest_dir() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let source = dir.path().join("source.db");
        std::fs::write(&source, b"DBDATA").unwrap();
        let dest = dir.path().join("MaiBot").join("data").join("MaiBot.db");

        copy_with_backup(&source, &dest).expect("导入失败");

        assert_eq!(std::fs::read(&dest).unwrap(), b"DBDATA");
    }

    #[test]
    fn copy_with_backup_rejects_missing_source() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let source = dir.path().join("does_not_exist.toml");
        let dest = dir.path().join("bot_config.toml");

        let err = copy_with_backup(&source, &dest).unwrap_err();
        assert!(matches!(err, AppError::InvalidInput(_)));
        assert!(!dest.exists());
    }

    // ==================== P2-31: TOML 注释透传 ====================

    #[test]
    fn read_toml_with_comments_extracts_nested_and_array_of_tables_comments() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let config_path = dir.path().join("model_config.toml");
        std::fs::write(
            &config_path,
            r#"
# 机器人昵称
nickname = "麦麦"

[personality]
# 人格描述，建议详细填写
personality = "开朗活泼"

[[api_providers]]
# API 基础地址
base_url = "https://example.com"

[[api_providers]]
base_url = "https://example2.com"
"#,
        )
        .unwrap();

        let result = read_toml_with_comments(&config_path).expect("解析失败");

        assert_eq!(
            result.comments.get("nickname").map(String::as_str),
            Some("机器人昵称")
        );
        assert_eq!(
            result.comments.get("personality.personality").map(String::as_str),
            Some("人格描述，建议详细填写")
        );
        assert_eq!(
            result
                .comments
                .get("api_providers[0].base_url")
                .map(String::as_str),
            Some("API 基础地址")
        );
        // 第二个数组项没有注释，不应被误插入
        assert!(!result.comments.contains_key("api_providers[1].base_url"));
        // 结构化数据应与 read_toml_as_json 等价，字段本身可正常读到
        assert_eq!(result.data["nickname"].clone(), serde_json::json!("麦麦"));
    }

    #[test]
    fn read_toml_with_comments_ignores_blank_line_prefix() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let config_path = dir.path().join("bot_config.toml");
        std::fs::write(&config_path, "\n\na = 1\n").unwrap();

        let result = read_toml_with_comments(&config_path).expect("解析失败");
        assert!(result.comments.is_empty(), "纯空白前缀不应生成注释");
    }
}

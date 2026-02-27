/// 配置管理服务
///
/// 对应 Python 的 config_service.py + maibot_config_service.py。
///
/// 分为两部分：
/// 1. 启动器 KV 配置 — 数据库持久化（LauncherConfig / PythonEnvironment / PathConfig）
/// 2. MAIBot TOML 配置 — 直接读写 TOML 文件（bot_config.toml / model_config.toml / adapter config.toml）
use std::path::{Path, PathBuf};

use sqlx::SqlitePool;
use toml_edit::DocumentMut;
use tracing::{info, warn};

use crate::errors::{AppError, AppResult};
use crate::models::config::*;
use crate::utils::platform;

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
    let row = sqlx::query_as::<_, LauncherConfig>(
        "SELECT * FROM launcher_config WHERE key = ?",
    )
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
    let rows = sqlx::query_as::<_, PythonEnvironment>(
        "SELECT * FROM python_environments ORDER BY is_selected DESC, path",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询 Python 环境失败: {}", e)))?;
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
    Ok(row)
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
    let parts: Vec<i32> = version
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    (
        parts.first().copied().unwrap_or(0),
        parts.get(1).copied().unwrap_or(0),
        parts.get(2).copied().unwrap_or(0),
    )
}

// ==================== 路径配置管理 ====================

/// 获取所有路径配置
pub async fn get_all_paths(pool: &SqlitePool) -> AppResult<Vec<PathConfig>> {
    let rows = sqlx::query_as::<_, PathConfig>(
        "SELECT * FROM path_config ORDER BY name",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询路径配置失败: {}", e)))?;
    Ok(rows)
}

/// 获取指定路径配置
pub async fn get_path(pool: &SqlitePool, name: &str) -> AppResult<Option<PathConfig>> {
    let row = sqlx::query_as::<_, PathConfig>(
        "SELECT * FROM path_config WHERE name = ?",
    )
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
                "bot" | "model" => instances_dir.join(&instance_path).join("MaiBot").join("config"),
                "adapter" => instances_dir.join(&instance_path).join("MaiBot-Napcat-Adapter"),
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

/// 获取 TOML 配置原始文本
pub fn read_toml_raw(config_path: &Path) -> AppResult<String> {
    std::fs::read_to_string(config_path)
        .map_err(|e| AppError::FileSystem(format!("读取配置文件失败: {}", e)))
}

/// 保存 TOML 原始文本
///
/// 先验证语法再写入文件。
pub fn save_toml_raw(config_path: &Path, content: &str) -> AppResult<()> {
    // 验证 TOML 语法
    content
        .parse::<DocumentMut>()
        .map_err(|e| AppError::Config(format!("TOML 语法错误: {}", e)))?;
    // 写入文件
    std::fs::write(config_path, content)
        .map_err(|e| AppError::FileSystem(format!("写入配置文件失败: {}", e)))?;
    info!("保存 TOML 配置: {:?}", config_path);
    Ok(())
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
pub fn delete_toml_key(
    config_path: &Path,
    key_path: &str,
) -> AppResult<serde_json::Value> {
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

    let sections: Vec<String> = doc
        .as_table()
        .iter()
        .map(|(k, _)| k.to_string())
        .collect();
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

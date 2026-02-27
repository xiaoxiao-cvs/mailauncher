/// API 供应商管理服务
///
/// 对应 Python 的 api_provider_service.py。
/// 管理 AI 模型供应商（OpenAI、Anthropic 等）的 CRUD 操作，
/// 以及远程获取模型列表。
use sqlx::SqlitePool;
use tracing::info;

use crate::errors::{AppError, AppResult};
use crate::models::api_provider::{ApiModel, ApiProvider};

// ==================== 供应商 CRUD ====================

/// 获取所有 API 供应商
pub async fn get_all_providers(pool: &SqlitePool) -> AppResult<Vec<ApiProvider>> {
    let rows = sqlx::query_as::<_, ApiProvider>(
        "SELECT * FROM api_providers ORDER BY priority ASC, name ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询 API 供应商失败: {}", e)))?;
    Ok(rows)
}

/// 获取单个 API 供应商
pub async fn get_provider(pool: &SqlitePool, id: i64) -> AppResult<Option<ApiProvider>> {
    let row = sqlx::query_as::<_, ApiProvider>(
        "SELECT * FROM api_providers WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询 API 供应商失败: {}", e)))?;
    Ok(row)
}

/// 创建 API 供应商
pub async fn create_provider(
    pool: &SqlitePool,
    name: &str,
    base_url: &str,
    api_key: &str,
    is_enabled: bool,
) -> AppResult<ApiProvider> {
    let id = sqlx::query(
        "INSERT INTO api_providers (name, base_url, api_key, is_enabled, priority)
         VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(priority), 0) + 1 FROM api_providers))",
    )
    .bind(name)
    .bind(base_url)
    .bind(api_key)
    .bind(is_enabled)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("创建 API 供应商失败: {}", e)))?
    .last_insert_rowid();

    info!("创建 API 供应商: {} (id={})", name, id);

    get_provider(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound("刚创建的供应商未找到".to_string()))
}

/// 更新 API 供应商
pub async fn update_provider(
    pool: &SqlitePool,
    id: i64,
    name: Option<&str>,
    base_url: Option<&str>,
    api_key: Option<&str>,
    is_enabled: Option<bool>,
) -> AppResult<ApiProvider> {
    // 先检查是否存在
    let existing = get_provider(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("API 供应商 {} 不存在", id)))?;

    let name = name.unwrap_or(&existing.name);
    let base_url = base_url.unwrap_or(&existing.base_url);
    let api_key = api_key.unwrap_or(&existing.api_key);
    let is_enabled = is_enabled.unwrap_or(existing.is_enabled);

    sqlx::query(
        "UPDATE api_providers SET name = ?, base_url = ?, api_key = ?, is_enabled = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(name)
    .bind(base_url)
    .bind(api_key)
    .bind(is_enabled)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(format!("更新 API 供应商失败: {}", e)))?;

    info!("更新 API 供应商: {} (id={})", name, id);

    get_provider(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("API 供应商 {} 不存在", id)))
}

/// 删除 API 供应商（级联删除其模型缓存）
pub async fn delete_provider(pool: &SqlitePool, id: i64) -> AppResult<()> {
    // 先删除关联模型
    sqlx::query("DELETE FROM api_models WHERE provider_id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(format!("删除关联模型失败: {}", e)))?;

    let result = sqlx::query("DELETE FROM api_providers WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(format!("删除 API 供应商失败: {}", e)))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("API 供应商 {} 不存在", id)));
    }

    info!("删除 API 供应商: id={}", id);
    Ok(())
}

/// 批量保存供应商（替换全部）
pub async fn save_all_providers(
    pool: &SqlitePool,
    providers: Vec<ProviderInput>,
) -> AppResult<Vec<ApiProvider>> {
    // 在事务中操作
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Database(format!("开启事务失败: {}", e)))?;

    // 清空现有供应商和模型
    sqlx::query("DELETE FROM api_models")
        .execute(&mut *tx)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;
    sqlx::query("DELETE FROM api_providers")
        .execute(&mut *tx)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    // 逐个插入
    for (i, p) in providers.iter().enumerate() {
        sqlx::query(
            "INSERT INTO api_providers (name, base_url, api_key, is_enabled, priority)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&p.name)
        .bind(&p.base_url)
        .bind(&p.api_key)
        .bind(p.is_enabled)
        .bind(i as i32 + 1)
        .execute(&mut *tx)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(format!("插入供应商 {} 失败: {}", p.name, e)))?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Database(format!("提交事务失败: {}", e)))?;

    info!("批量保存 {} 个 API 供应商", providers.len());

    get_all_providers(pool).await
}

// ==================== 模型管理 ====================

/// 获取供应商的模型列表（从本地缓存）
pub async fn get_provider_models(pool: &SqlitePool, provider_id: i64) -> AppResult<Vec<ApiModel>> {
    let rows = sqlx::query_as::<_, ApiModel>(
        "SELECT * FROM api_models WHERE provider_id = ? ORDER BY model_id",
    )
    .bind(provider_id)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("查询模型列表失败: {}", e)))?;
    Ok(rows)
}

/// 从远程 API 获取模型列表并缓存到数据库
///
/// 调用供应商的 `/v1/models` 端点获取模型列表。
pub async fn fetch_and_cache_models(pool: &SqlitePool, provider_id: i64) -> AppResult<Vec<String>> {
    let provider = get_provider(pool, provider_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("供应商 {} 不存在", provider_id)))?;

    // 调用 OpenAI 兼容的模型列表 API
    let url = format!("{}/v1/models", provider.base_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", provider.api_key))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| AppError::Network(format!("获取模型列表失败: {}", e)))?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "获取模型列表失败: HTTP {}",
            response.status()
        )));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Network(format!("解析模型列表失败: {}", e)))?;

    let models: Vec<String> = body["data"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
        .collect();

    // 清空旧缓存并插入新模型
    sqlx::query("DELETE FROM api_models WHERE provider_id = ?")
        .bind(provider_id)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    for model_id in &models {
        let owned_by = body["data"]
            .as_array()
            .and_then(|arr| arr.iter().find(|m| m["id"].as_str() == Some(model_id)))
            .and_then(|m| m["owned_by"].as_str())
            .map(|s| s.to_string());

        sqlx::query(
            "INSERT INTO api_models (provider_id, model_id, model_name, owned_by) VALUES (?, ?, ?, ?)",
        )
        .bind(provider_id)
        .bind(model_id)
        .bind(model_id) // model_name 默认同 model_id
        .bind(&owned_by)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(format!("缓存模型失败: {}", e)))?;
    }

    // 更新供应商的模型更新时间
    sqlx::query("UPDATE api_providers SET models_updated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
        .bind(provider_id)
        .execute(pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

    info!("获取到 {} 个模型 (供应商 id={})", models.len(), provider_id);
    Ok(models)
}

// ==================== 辅助类型 ====================

/// 批量保存时使用的输入结构
#[derive(Debug, serde::Deserialize)]
pub struct ProviderInput {
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub is_enabled: bool,
}

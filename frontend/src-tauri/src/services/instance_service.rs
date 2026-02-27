/// 实例管理服务
///
/// 对应 Python 的 `instance_service.py`，提供实例的 CRUD 操作。
/// 进程管理（启动/停止/重启）将在 M1.3 中实现。
use chrono::Utc;
use sqlx::SqlitePool;
use tracing::{info, warn};
use uuid::Uuid;

use crate::errors::{AppError, AppResult};
use crate::models::{
    CreateInstanceRequest, Instance, InstanceList, InstanceStatusResponse, UpdateInstanceRequest,
};
use crate::utils::platform;

/// 生成实例 ID（格式: inst_xxxxxxxxxxxx，与 Python 一致）
fn generate_instance_id() -> String {
    let hex = Uuid::new_v4().to_string().replace("-", "");
    format!("inst_{}", &hex[..12])
}

/// 获取所有实例列表
pub async fn get_all_instances(pool: &SqlitePool) -> AppResult<InstanceList> {
    let instances = sqlx::query_as::<_, Instance>(
        "SELECT * FROM instances ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;

    let total = instances.len();
    Ok(InstanceList { total, instances })
}

/// 获取单个实例
pub async fn get_instance(pool: &SqlitePool, id: &str) -> AppResult<Option<Instance>> {
    let instance =
        sqlx::query_as::<_, Instance>("SELECT * FROM instances WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    Ok(instance)
}

/// 创建新实例
///
/// 逻辑与 Python `InstanceService.create_instance` 保持一致：
/// 1. 校验名称唯一性
/// 2. 生成 inst_xxx ID
/// 3. 创建实例目录
/// 4. 写入数据库
pub async fn create_instance(
    pool: &SqlitePool,
    data: CreateInstanceRequest,
) -> AppResult<Instance> {
    // 1. 校验名称唯一性
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM instances WHERE name = ?")
        .bind(&data.name)
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        return Err(AppError::InvalidInput(format!(
            "实例名称 '{}' 已存在",
            data.name
        )));
    }

    // 2. 生成 ID
    let id = generate_instance_id();
    let bot_type = data.bot_type.unwrap_or_else(|| "maibot".to_string());
    let now = Utc::now().naive_utc();

    // 3. 创建实例目录
    let instances_dir = platform::get_instances_dir();
    let instance_dir = instances_dir.join(&data.name);
    std::fs::create_dir_all(&instance_dir).map_err(|e| {
        AppError::FileSystem(format!("创建实例目录失败: {}", e))
    })?;

    // 4. 写入数据库
    sqlx::query(
        r#"INSERT INTO instances
           (id, name, instance_path, bot_type, bot_version, description,
            status, python_path, config_path, created_at, updated_at, run_time)
           VALUES (?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?, ?, 0)"#,
    )
    .bind(&id)
    .bind(&data.name)
    .bind(&data.name) // instance_path = name（与 Python 一致）
    .bind(&bot_type)
    .bind(&data.bot_version)
    .bind(&data.description)
    .bind(&data.python_path)
    .bind(&data.config_path)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    info!("创建实例: {} ({})", data.name, id);

    // 返回完整实例数据
    let instance = get_instance(pool, &id)
        .await?
        .expect("刚创建的实例查询不应为空");
    Ok(instance)
}

/// 更新实例（部分更新，仅更新非 None 字段）
///
/// 与 Python `InstanceService.update_instance` 行为一致：
/// 前端未提供的字段保持原值。
pub async fn update_instance(
    pool: &SqlitePool,
    id: &str,
    data: UpdateInstanceRequest,
) -> AppResult<Option<Instance>> {
    // 获取现有实例
    let existing = match get_instance(pool, id).await? {
        Some(inst) => inst,
        None => return Ok(None),
    };

    // 合并字段：提供了新值则更新，否则保持原值
    let name = data.name.unwrap_or(existing.name);
    let description = data.description.or(existing.description);
    let python_path = data.python_path.or(existing.python_path);
    let config_path = data.config_path.or(existing.config_path);
    let qq_account = data.qq_account.or(existing.qq_account);
    let now = Utc::now().naive_utc();

    sqlx::query(
        r#"UPDATE instances
           SET name = ?, description = ?, python_path = ?,
               config_path = ?, qq_account = ?, updated_at = ?
           WHERE id = ?"#,
    )
    .bind(&name)
    .bind(&description)
    .bind(&python_path)
    .bind(&config_path)
    .bind(&qq_account)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;

    info!("更新实例: {}", id);

    get_instance(pool, id).await
}

/// 删除实例
///
/// 与 Python `InstanceService.delete_instance` 行为一致：
/// 运行中的实例不允许删除。
pub async fn delete_instance(pool: &SqlitePool, id: &str) -> AppResult<bool> {
    let instance = match get_instance(pool, id).await? {
        Some(inst) => inst,
        None => return Ok(false),
    };

    // 运行中的实例不允许删除
    if instance.status == "running" || instance.status == "starting" {
        return Err(AppError::InvalidInput(format!(
            "实例 {} 正在运行，请先停止后再删除",
            id
        )));
    }

    sqlx::query("DELETE FROM instances WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;

    info!("删除实例: {} ({})", instance.name, id);

    // 尝试删除实例目录（非关键操作，失败仅记录警告）
    let instance_path = instance.instance_path.unwrap_or(instance.name.clone());
    let instance_dir = platform::get_instances_dir().join(&instance_path);
    if instance_dir.exists() {
        if let Err(e) = std::fs::remove_dir_all(&instance_dir) {
            warn!(
                "删除实例目录失败（非致命）: {} - {}",
                instance_dir.display(),
                e
            );
        }
    }

    Ok(true)
}

/// 获取实例运行状态
///
/// 目前返回数据库中记录的状态。
/// M1.3 实现进程管理后，会同步实际进程状态。
pub async fn get_instance_status(
    pool: &SqlitePool,
    id: &str,
) -> AppResult<Option<InstanceStatusResponse>> {
    let instance = match get_instance(pool, id).await? {
        Some(inst) => inst,
        None => return Ok(None),
    };

    // TODO(M1.3): 从进程管理器获取实际 PID 和运行时间
    Ok(Some(InstanceStatusResponse {
        id: instance.id,
        status: instance.status,
        pid: None,
        uptime: None,
    }))
}
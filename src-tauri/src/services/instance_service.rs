/// 实例管理服务
///
/// 对应 Python 的 `instance_service.py`，提供实例的 CRUD 操作。
/// 进程管理（启动/停止/重启）将在 M1.3 中实现。
use chrono::Utc;
use sqlx::SqlitePool;
use tracing::{info, warn};
use uuid::Uuid;

use crate::components::ComponentRegistry;
use crate::errors::{AppError, AppResult};
use crate::models::{
    default_runtime_profile_json, CreateInstanceRequest, DbInstanceRecord, Instance, InstanceList,
    InstanceStatusResponse, UpdateInstanceRequest,
};
use crate::services::lifecycle_service;
use crate::utils::platform;

/// 生成实例 ID（格式: inst_xxxxxxxxxxxx，与 Python 一致）
fn generate_instance_id() -> String {
    let hex = Uuid::new_v4().to_string().replace("-", "");
    format!("inst_{}", &hex[..12])
}

/// 获取所有实例列表
pub async fn get_all_instances(pool: &SqlitePool) -> AppResult<InstanceList> {
    let rows =
        sqlx::query_as::<_, DbInstanceRecord>("SELECT * FROM instances ORDER BY created_at DESC")
            .fetch_all(pool)
            .await?;

    let instances = rows
        .into_iter()
        .map(DbInstanceRecord::into_instance)
        .collect::<Vec<_>>();

    let total = instances.len();
    Ok(InstanceList { total, instances })
}

/// 获取单个实例
pub async fn get_instance(pool: &SqlitePool, id: &str) -> AppResult<Option<Instance>> {
    let record = sqlx::query_as::<_, DbInstanceRecord>("SELECT * FROM instances WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(record.map(DbInstanceRecord::into_instance))
}

/// Windows 保留设备名(不区分大小写,带任意扩展名也仍被保留)。
const WINDOWS_RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// 校验实例名能否安全用作磁盘目录名。
///
/// 实例名直接作为目录名(instance_path = name)。未消毒会导致:路径穿越(`..`)、
/// 落到非预期目录(含分隔符)、Windows 上创建失败(非法字符/保留名)或被静默改写
/// (结尾点或空格被去除,造成目录名与数据库记录不一致)。非法即拒绝并给出明确原因,不静默改写。
pub fn validate_instance_name(name: &str) -> AppResult<()> {
    if name.trim().is_empty() {
        return Err(AppError::InvalidInput("实例名不能为空".to_string()));
    }
    if name.trim() != name {
        return Err(AppError::InvalidInput("实例名首尾不能包含空白字符".to_string()));
    }
    if name.chars().count() > 64 {
        return Err(AppError::InvalidInput("实例名过长(最多 64 字符)".to_string()));
    }
    if name.contains('/') || name.contains('\\') {
        return Err(AppError::InvalidInput(
            "实例名不能包含路径分隔符 / 或 \\".to_string(),
        ));
    }
    if name.contains("..") {
        return Err(AppError::InvalidInput("实例名不能包含 '..'".to_string()));
    }
    const INVALID_CHARS: &[char] = &[':', '*', '?', '"', '<', '>', '|'];
    if let Some(c) = name
        .chars()
        .find(|c| INVALID_CHARS.contains(c) || c.is_control())
    {
        return Err(AppError::InvalidInput(format!(
            "实例名不能包含非法字符 '{}'",
            c
        )));
    }
    if name.ends_with('.') || name.ends_with(' ') {
        return Err(AppError::InvalidInput("实例名不能以点或空格结尾".to_string()));
    }
    // 保留名判定取第一个点之前的主名(Windows 下 "CON.txt" 同样被保留)
    let stem = name.split('.').next().unwrap_or(name);
    if WINDOWS_RESERVED_NAMES
        .iter()
        .any(|r| r.eq_ignore_ascii_case(stem))
    {
        return Err(AppError::InvalidInput(format!(
            "实例名 '{}' 是系统保留名,请换一个",
            name
        )));
    }
    Ok(())
}

/// 查询除 `exclude_instance_id` 外,还有哪些实例配置了相同的 QQ 号(返回实例名)。
///
/// 用于"同一 QQ 配到多个实例"的软提示:两个实例用同一 QQ 同时在线会互相把对方顶下线。
/// 这是提示而非硬限制(用户可能只是想切换、不会同时开),故只返回冲突方名单交由前端预警。
/// 空 QQ 号直接返回空(未配号不算冲突)。
pub async fn find_qq_account_conflicts(
    pool: &SqlitePool,
    qq_account: &str,
    exclude_instance_id: &str,
) -> AppResult<Vec<String>> {
    if qq_account.trim().is_empty() {
        return Ok(Vec::new());
    }
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT name FROM instances WHERE qq_account = ? AND id != ? ORDER BY name")
            .bind(qq_account)
            .bind(exclude_instance_id)
            .fetch_all(pool)
            .await?;
    Ok(rows.into_iter().map(|(name,)| name).collect())
}

/// 创建新实例
///
/// 逻辑与 Python `InstanceService.create_instance` 保持一致：
/// 1. 校验名称合法与唯一性
/// 2. 生成 inst_xxx ID
/// 3. 创建实例目录
/// 4. 写入数据库
pub async fn create_instance(
    pool: &SqlitePool,
    data: CreateInstanceRequest,
) -> AppResult<Instance> {
    // 0. 校验名称合法(实例名将直接作为磁盘目录名,须防路径穿越/非法字符/保留名)
    validate_instance_name(&data.name)?;

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
    std::fs::create_dir_all(&instance_dir)
        .map_err(|e| AppError::FileSystem(format!("创建实例目录失败: {}", e)))?;

    let runtime_profile_json =
        default_runtime_profile_json(Some(&data.name), data.python_path.clone());

    // 4. 写入数据库
    sqlx::query(
        r#"INSERT INTO instances
           (id, name, instance_path, bot_type, bot_version, description,
            status, python_path, config_path, created_at, updated_at, run_time,
            runtime_profile, component_state)
           VALUES (?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?, ?, 0, ?, '[]')"#,
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
    .bind(runtime_profile_json)
    .execute(pool)
    .await?;

    // 创建即分配独立端口块(G10-1),使多实例并发运行时端口不撞;其余 INSERT 路径由启动前
    // reconcile 惰性兜底分配。
    crate::services::instance_ports::ensure_instance_ports(pool, &id).await?;

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
    let runtime_profile_json =
        default_runtime_profile_json(existing.instance_path.as_deref(), python_path.clone());

    sqlx::query(
        r#"UPDATE instances
           SET name = ?, description = ?, python_path = ?,
               config_path = ?, qq_account = ?, runtime_profile = ?, updated_at = ?
           WHERE id = ?"#,
    )
    .bind(&name)
    .bind(&description)
    .bind(&python_path)
    .bind(&config_path)
    .bind(&qq_account)
    .bind(runtime_profile_json)
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
    if instance.status.is_active() {
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

/// 内部版本：直接向内存数据库插入实例行，跳过文件系统操作。
/// 仅用于单元测试。
#[cfg(test)]
async fn insert_instance_row(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    bot_type: &str,
) -> AppResult<()> {
    let now = Utc::now().naive_utc();
    let runtime_profile_json = crate::models::default_runtime_profile_json(Some(name), None);
    sqlx::query(
        r#"INSERT INTO instances
           (id, name, instance_path, bot_type, status, created_at, updated_at, run_time,
            runtime_profile, component_state)
           VALUES (?, ?, ?, ?, 'stopped', ?, ?, 0, ?, '[]')"#,
    )
    .bind(id)
    .bind(name)
    .bind(name)
    .bind(bot_type)
    .bind(now)
    .bind(now)
    .bind(runtime_profile_json)
    .execute(pool)
    .await?;
    Ok(())
}

/// 获取实例运行状态
///
/// 同步数据库状态与实际进程状态：
/// - 从 ProcessManager 查询实际进程 PID、运行时间
/// - DB 状态为 running 但进程已死时，自动更新为 stopped
pub async fn get_instance_status(
    pool: &SqlitePool,
    id: &str,
    process_manager: &crate::services::process_service::ProcessManager,
    component_registry: &ComponentRegistry,
) -> AppResult<Option<InstanceStatusResponse>> {
    let instance = match get_instance(pool, id).await? {
        Some(inst) => inst,
        None => return Ok(None),
    };

    let instance_path_str = instance
        .instance_path
        .clone()
        .unwrap_or_else(|| instance.name.clone());
    let instance_root = platform::get_instances_dir().join(&instance_path_str);

    let status = lifecycle_service::sync_instance_state(
        pool,
        process_manager,
        component_registry,
        id,
        &instance_root,
        &instance.runtime_profile,
        instance.last_error.clone(),
        instance.last_status_reason.clone(),
    )
    .await?;

    let pid = process_manager.get_process_pid(id, "main").await;
    let guest_pid = process_manager.get_process_guest_pid(id, "main").await;
    let uptime = process_manager.get_process_uptime(id, "main").await;

    let refreshed = get_instance(pool, id).await?.unwrap_or(instance);

    Ok(Some(InstanceStatusResponse {
        id: refreshed.id,
        status,
        pid,
        host_pid: pid,
        guest_pid,
        uptime,
        runtime_profile: refreshed.runtime_profile,
        last_error: refreshed.last_error,
        last_status_reason: refreshed.last_status_reason,
        component_states: refreshed.component_states,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    #[test]
    fn validate_instance_name_accepts_normal_names() {
        for name in ["my_bot", "麦麦-01", "bot.v2", "Instance 01 内含空格"] {
            assert!(validate_instance_name(name).is_ok(), "应接受: {name}");
        }
    }

    #[test]
    fn validate_instance_name_rejects_dangerous_names() {
        for name in [
            "",
            "   ",
            "../evil",
            "a/b",
            "a\\b",
            "CON",
            "nul.txt",
            "trailing ",
            "trailingdot.",
            "a:b",
            "a*b",
            "a|b",
        ] {
            assert!(
                validate_instance_name(name).is_err(),
                "应拒绝: {name:?}"
            );
        }
    }

    #[tokio::test]
    async fn find_qq_account_conflicts_excludes_self_and_empty() {
        let pool = setup_test_db().await;
        for (id, qq) in [("inst_a", "1001"), ("inst_b", "1001"), ("inst_c", "2002")] {
            sqlx::query(
                "INSERT INTO instances (id, name, instance_path, bot_type, qq_account, status, run_time)
                 VALUES (?, ?, ?, 'maibot', ?, 'stopped', 0)",
            )
            .bind(id)
            .bind(id)
            .bind(id)
            .bind(qq)
            .execute(&pool)
            .await
            .expect("插入实例失败");
        }

        // inst_a 视角:1001 还被 inst_b 占用
        let conflicts = find_qq_account_conflicts(&pool, "1001", "inst_a")
            .await
            .expect("查询失败");
        assert_eq!(conflicts, vec!["inst_b".to_string()]);

        // 2002 只有 inst_c 自己 → 排除自己后无冲突
        let none = find_qq_account_conflicts(&pool, "2002", "inst_c")
            .await
            .expect("查询失败");
        assert!(none.is_empty());

        // 空 QQ 不算冲突
        let empty = find_qq_account_conflicts(&pool, "", "inst_a")
            .await
            .expect("查询失败");
        assert!(empty.is_empty());
    }

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("创建内存数据库失败");
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
                component_state TEXT,
                port_base INTEGER
            )",
        )
        .execute(&pool)
        .await
        .expect("建表失败");
        pool
    }

    #[tokio::test]
    async fn create_instance_generates_inst_prefix_id() {
        let pool = setup_test_db().await;
        let req = CreateInstanceRequest {
            name: "test-bot".to_string(),
            bot_type: Some("maibot".to_string()),
            bot_version: None,
            description: None,
            python_path: None,
            config_path: None,
        };
        let instance = create_instance(&pool, req).await.expect("创建实例失败");
        assert!(
            instance.id.starts_with("inst_"),
            "ID 应以 inst_ 开头, 实际: {}",
            instance.id
        );
        assert_eq!(instance.name, "test-bot");
        assert_eq!(instance.bot_type, "maibot");

        // 清理：删除创建的目录
        let instance_dir = platform::get_instances_dir().join("test-bot");
        let _ = std::fs::remove_dir_all(&instance_dir);
    }

    #[tokio::test]
    async fn create_instance_rejects_duplicate_name() {
        let pool = setup_test_db().await;
        // 先用 insert_instance_row 插入一条，避免文件系统副作用
        insert_instance_row(&pool, "inst_aaaaaaaaaaaa", "dup-bot", "maibot")
            .await
            .expect("插入失败");

        let req = CreateInstanceRequest {
            name: "dup-bot".to_string(),
            bot_type: None,
            bot_version: None,
            description: None,
            python_path: None,
            config_path: None,
        };
        let result = create_instance(&pool, req).await;
        assert!(result.is_err(), "应拒绝重复名称");
    }

    #[tokio::test]
    async fn get_all_instances_returns_correct_total() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_000000000001", "bot-a", "maibot")
            .await
            .unwrap();
        insert_instance_row(&pool, "inst_000000000002", "bot-b", "maibot")
            .await
            .unwrap();

        let list = get_all_instances(&pool).await.expect("查询失败");
        assert_eq!(list.total, 2);
        assert_eq!(list.instances.len(), 2);
    }

    #[tokio::test]
    async fn get_instance_returns_none_for_missing_id() {
        let pool = setup_test_db().await;
        let result = get_instance(&pool, "inst_nonexistent")
            .await
            .expect("查询失败");
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn delete_instance_removes_from_db() {
        let pool = setup_test_db().await;
        insert_instance_row(&pool, "inst_to_delete_01", "del-bot", "maibot")
            .await
            .unwrap();

        let deleted = delete_instance(&pool, "inst_to_delete_01")
            .await
            .expect("删除失败");
        assert!(deleted);

        let after = get_instance(&pool, "inst_to_delete_01")
            .await
            .expect("查询失败");
        assert!(after.is_none(), "删除后应查不到实例");
    }

    #[tokio::test]
    async fn delete_instance_returns_false_for_missing_id() {
        let pool = setup_test_db().await;
        let deleted = delete_instance(&pool, "inst_nonexistent")
            .await
            .expect("删除失败");
        assert!(!deleted);
    }
}

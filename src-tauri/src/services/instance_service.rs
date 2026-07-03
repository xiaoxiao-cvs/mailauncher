/// 实例管理服务
///
/// 对应 Python 的 `instance_service.py`，提供实例的 CRUD 操作。
/// 进程管理（启动/停止/重启）将在 M1.3 中实现。
use std::path::Path;

use chrono::Utc;
use sqlx::SqlitePool;
use tracing::{info, warn};
use uuid::Uuid;

use crate::components::ComponentRegistry;
use crate::errors::{AppError, AppResult};
use crate::models::{
    default_runtime_profile_json, ComponentType, CreateInstanceRequest, DbInstanceRecord, Instance,
    InstanceList, InstanceStatusResponse, UpdateInstanceRequest,
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

/// 若 `stored` 位于 `old_root` 之内,返回把前缀替换为 `new_root` 后的新路径;否则返回 None(应保持原值)。
///
/// 迁移实例目录时,指向旧实例目录内部的派生路径(如 config_path/python_path 指向 `<实例>/...`)需随目录
/// 一起重指;而指向实例目录之外的路径(例如系统级 Python 解释器)必须原样保留,不能被误改。strip_prefix
/// 只在 `stored` 确实以 `old_root` 为前缀(逐路径分量匹配)时成功,天然区分这两种情况。
fn rewrite_path_prefix(stored: &str, old_root: &Path, new_root: &Path) -> Option<String> {
    let rel = Path::new(stored).strip_prefix(old_root).ok()?;
    Some(new_root.join(rel).to_string_lossy().to_string())
}

/// 把实例部署目录从旧的相对路径迁移到新的相对路径,并同步更新数据库中的派生路径。
///
/// 破坏性操作(移动磁盘上的既有目录)。安全保证:
/// - 前置守卫:数据库记录仍为活动态(is_active)时直接拒绝,与 delete_instance 一致,防止移动使用中的目录;
/// - 目录移动前先校验源目录存在、目标目录不存在,不覆盖既有数据;
/// - 采用同盘 `rename` 原子移动(新旧目录同在 instances_dir 下,必为同一文件系统),失败时磁盘无半迁移残留;
/// - 移动成功后若数据库写入失败,把目录移回原位再冒泡错误,保证磁盘与 DB 始终一致。
///
/// `instances_dir` 显式传入(而非内部取 get_instances_dir),使单元测试可指向临时目录,不污染真实部署目录。
async fn migrate_instance_directory(
    pool: &SqlitePool,
    existing: &Instance,
    new_path: &str,
    instances_dir: &Path,
) -> AppResult<Instance> {
    // 破坏性操作守卫:DB 记录为活动态(pending/starting/running/partial/stopping)即拒绝。
    // 与 delete_instance 同一安全语义——不迁移一个仍被认为在运行的实例。
    if existing.status.is_active() {
        return Err(AppError::InvalidInput(format!(
            "实例 {} 处于活动状态,请先停止后再迁移部署路径",
            existing.id
        )));
    }

    // 新路径同样直接作为磁盘目录名,须过与创建时同一套消毒(防路径穿越/非法字符/保留名)
    validate_instance_name(new_path)?;

    let old_path = existing
        .instance_path
        .clone()
        .unwrap_or_else(|| existing.name.clone());

    if new_path == old_path {
        return Err(AppError::InvalidInput(
            "新部署路径与当前路径相同,无需迁移".to_string(),
        ));
    }

    // 目标不能与其它实例的部署目录冲突(即便对方目录此刻缺失也拒绝,避免两条记录指向同一目录)
    let conflict: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM instances WHERE instance_path = ? AND id != ?")
            .bind(new_path)
            .bind(&existing.id)
            .fetch_one(pool)
            .await?;
    if conflict.0 > 0 {
        return Err(AppError::InvalidInput(format!(
            "部署路径 '{}' 已被其它实例占用",
            new_path
        )));
    }

    let old_dir = instances_dir.join(&old_path);
    let new_dir = instances_dir.join(new_path);

    // 源目录缺失则无从迁移文件,直接报错,而不是把 DB 静默重指到另一个不存在的位置
    if !old_dir.exists() {
        return Err(AppError::FileSystem(format!(
            "源实例目录不存在,无法迁移: {}",
            old_dir.display()
        )));
    }
    // 目标已存在则拒绝,避免覆盖既有数据(前置校验,保证移动前状态干净)
    if new_dir.exists() {
        return Err(AppError::InvalidInput(format!(
            "目标目录已存在,拒绝覆盖: {}",
            new_dir.display()
        )));
    }

    // 派生值全部在移动前算好(纯计算,不触盘),移动与 DB 写入才是仅有的两处状态变更。
    // 重写指向旧目录内部的派生路径;指向别处(如系统 Python)的保持不变。
    let new_config_path = existing
        .config_path
        .as_deref()
        .map(|p| rewrite_path_prefix(p, &old_dir, &new_dir).unwrap_or_else(|| p.to_string()));
    let new_python_path = existing
        .python_path
        .as_deref()
        .map(|p| rewrite_path_prefix(p, &old_dir, &new_dir).unwrap_or_else(|| p.to_string()));
    // 保留既有 runtime_profile 的其余字段(kind/host_os/WSL 设置等),仅重指 workspace_root 与 python.path
    let mut profile = existing.runtime_profile.clone();
    profile.workspace_root = new_path.to_string();
    profile.python.path = new_python_path.clone();
    let runtime_profile_json = serde_json::to_string(&profile)?;

    // 组件级运行时覆盖也须同步重指,否则迁移后 component_runtime_profiles 里指向旧目录的 python.path
    // 变成悬空引用——get_component_runtime 优先取组件级覆盖,启动该组件会拉起已随迁移移走的旧解释器而失败。
    // 与实例级同款处理:workspace_root 对齐新路径、python.path 指向旧目录内部的重指到新目录。
    let component_profiles = existing
        .component_runtime_profiles
        .iter()
        .map(|(component, profile)| {
            let mut p = profile.clone();
            p.workspace_root = new_path.to_string();
            let rewritten_python = p.python.path.as_deref().map(|path| {
                rewrite_path_prefix(path, &old_dir, &new_dir).unwrap_or_else(|| path.to_string())
            });
            p.python.path = rewritten_python;
            (*component, p)
        })
        .collect::<std::collections::HashMap<_, _>>();
    let component_profiles_json = serde_json::to_string(&component_profiles)?;
    let now = Utc::now().naive_utc();

    // 同盘 rename 原子移动:失败时磁盘无半迁移残留
    std::fs::rename(&old_dir, &new_dir).map_err(|e| {
        AppError::FileSystem(format!(
            "移动实例目录失败({} -> {}): {}",
            old_dir.display(),
            new_dir.display(),
            e
        ))
    })?;

    let update = sqlx::query(
        r#"UPDATE instances
           SET instance_path = ?, config_path = ?, python_path = ?,
               runtime_profile = ?, component_runtime_profiles = ?, updated_at = ?
           WHERE id = ?"#,
    )
    .bind(new_path)
    .bind(&new_config_path)
    .bind(&new_python_path)
    .bind(&runtime_profile_json)
    .bind(&component_profiles_json)
    .bind(now)
    .bind(&existing.id)
    .execute(pool)
    .await;

    // DB 写入失败:把目录移回原位,保证磁盘与 DB 一致(不留半迁移状态),再冒泡错误
    if let Err(e) = update {
        if let Err(rollback_err) = std::fs::rename(&new_dir, &old_dir) {
            warn!(
                "迁移回滚失败,目录已在新位置 {} 但 DB 未更新: {}",
                new_dir.display(),
                rollback_err
            );
        }
        return Err(AppError::from(e));
    }

    info!(
        "迁移实例部署目录: {} ({} -> {})",
        existing.id, old_path, new_path
    );

    get_instance(pool, &existing.id)
        .await?
        .ok_or_else(|| AppError::Internal("迁移后重新查询实例失败".to_string()))
}

/// 迁移实例部署目录到新的相对路径(重命名/改部署位置时保持磁盘与数据库一致)。
///
/// 命令层入口。破坏性操作的实时安全守卫:两个运行时组件(main/napcat)任一仍在运行即拒绝——复用
/// `ProcessManager::is_component_running` 实时探测(比 DB 状态更权威,能拦住"DB 记为已停但进程实际还活着"
/// 的情况)。通过实时探测后,交由 `migrate_instance_directory` 完成目录移动与 DB 更新(其内部另有基于 DB
/// 活动态的兜底守卫与回滚)。实例不存在返回 Ok(None),交由命令层映射为 NotFound。
pub async fn migrate_instance_path(
    pool: &SqlitePool,
    process_manager: &crate::services::process_service::ProcessManager,
    id: &str,
    new_path: &str,
) -> AppResult<Option<Instance>> {
    let existing = match get_instance(pool, id).await? {
        Some(inst) => inst,
        None => return Ok(None),
    };

    for component in ComponentType::all() {
        if process_manager
            .is_component_running(id, component.internal_key())
            .await
        {
            return Err(AppError::InvalidInput(format!(
                "实例 {} 的 {} 组件仍在运行,请先停止后再迁移部署路径",
                id,
                component.display_name()
            )));
        }
    }

    let migrated =
        migrate_instance_directory(pool, &existing, new_path, &platform::get_instances_dir())
            .await?;
    Ok(Some(migrated))
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

    // ==================== 部署目录迁移(G1-5) ====================

    /// 在给定 instances_dir 下建出实例目录并放一个标记文件,用于验证目录随迁移整体搬运。
    fn seed_instance_dir(instances_dir: &Path, rel: &str, marker: &str) {
        let dir = instances_dir.join(rel);
        std::fs::create_dir_all(&dir).expect("建实例目录失败");
        std::fs::write(dir.join(marker), b"payload").expect("写标记文件失败");
    }

    /// 插入一条可迁移的实例行,允许指定 instance_path 与 status。
    async fn insert_migratable_row(
        pool: &SqlitePool,
        id: &str,
        name: &str,
        instance_path: &str,
        status: &str,
    ) {
        let now = Utc::now().naive_utc();
        let runtime_profile_json =
            crate::models::default_runtime_profile_json(Some(instance_path), None);
        sqlx::query(
            r#"INSERT INTO instances
               (id, name, instance_path, bot_type, status, created_at, updated_at, run_time,
                runtime_profile, component_state)
               VALUES (?, ?, ?, 'maibot', ?, ?, ?, 0, ?, '[]')"#,
        )
        .bind(id)
        .bind(name)
        .bind(instance_path)
        .bind(status)
        .bind(now)
        .bind(now)
        .bind(runtime_profile_json)
        .execute(pool)
        .await
        .expect("插入实例失败");
    }

    #[test]
    fn rewrite_path_prefix_rewrites_inner_and_ignores_outer() {
        let old_root = Path::new("/data/deploy/old");
        let new_root = Path::new("/data/deploy/new");

        // 指向旧目录内部 → 前缀被重指到新目录(用 Path 比较,规避平台分隔符差异)
        let inner_src = old_root.join(".venv").join("python");
        let rewritten = rewrite_path_prefix(&inner_src.to_string_lossy(), old_root, new_root)
            .expect("内部路径应被重写");
        assert_eq!(Path::new(&rewritten), new_root.join(".venv").join("python"));

        // 指向实例目录之外(系统级)→ 保持原值(返回 None)
        let outer = if cfg!(windows) {
            "C:/Python/python.exe"
        } else {
            "/usr/bin/python3"
        };
        assert!(rewrite_path_prefix(outer, old_root, new_root).is_none());
    }

    #[tokio::test]
    async fn migrate_instance_directory_moves_dir_and_updates_db() {
        let pool = setup_test_db().await;
        let tmp = tempfile::tempdir().expect("建临时目录失败");
        let root = tmp.path();
        seed_instance_dir(root, "old_deploy", "bot.py");
        insert_migratable_row(&pool, "inst_mig_ok01", "mig-bot", "old_deploy", "stopped").await;

        let existing = get_instance(&pool, "inst_mig_ok01")
            .await
            .unwrap()
            .expect("实例应存在");
        let migrated = migrate_instance_directory(&pool, &existing, "new_deploy", root)
            .await
            .expect("停止态实例迁移应成功");

        // 返回值与 DB 均指向新路径,runtime_profile 的 workspace_root 同步
        assert_eq!(migrated.instance_path.as_deref(), Some("new_deploy"));
        let reloaded = get_instance(&pool, "inst_mig_ok01")
            .await
            .unwrap()
            .expect("实例应存在");
        assert_eq!(reloaded.instance_path.as_deref(), Some("new_deploy"));
        assert_eq!(reloaded.runtime_profile.workspace_root, "new_deploy");

        // 磁盘:旧目录消失,新目录连同原文件出现
        assert!(!root.join("old_deploy").exists(), "旧目录应已不存在");
        assert!(
            root.join("new_deploy").join("bot.py").exists(),
            "文件应随目录迁移到新位置"
        );
    }

    #[tokio::test]
    async fn migrate_instance_directory_rejects_active_instance() {
        let pool = setup_test_db().await;
        let tmp = tempfile::tempdir().expect("建临时目录失败");
        let root = tmp.path();
        seed_instance_dir(root, "busy_deploy", "bot.py");
        insert_migratable_row(&pool, "inst_mig_run01", "run-bot", "busy_deploy", "running").await;

        let existing = get_instance(&pool, "inst_mig_run01")
            .await
            .unwrap()
            .expect("实例应存在");
        let result = migrate_instance_directory(&pool, &existing, "new_deploy", root).await;
        assert!(result.is_err(), "活动(running)实例应拒绝迁移");

        // 拒绝后磁盘与 DB 均无改动
        assert!(
            root.join("busy_deploy").join("bot.py").exists(),
            "旧目录应原样保留"
        );
        assert!(!root.join("new_deploy").exists(), "不应创建新目录");
        let reloaded = get_instance(&pool, "inst_mig_run01")
            .await
            .unwrap()
            .expect("实例应存在");
        assert_eq!(
            reloaded.instance_path.as_deref(),
            Some("busy_deploy"),
            "DB 部署路径不应变更"
        );
    }

    #[tokio::test]
    async fn migrate_instance_directory_rejects_existing_target() {
        let pool = setup_test_db().await;
        let tmp = tempfile::tempdir().expect("建临时目录失败");
        let root = tmp.path();
        seed_instance_dir(root, "src_deploy", "bot.py");
        // 目标目录已存在且含数据,迁移必须拒绝以免覆盖
        seed_instance_dir(root, "taken_deploy", "other.py");
        insert_migratable_row(&pool, "inst_mig_dup01", "dup-bot", "src_deploy", "stopped").await;

        let existing = get_instance(&pool, "inst_mig_dup01")
            .await
            .unwrap()
            .expect("实例应存在");
        let result = migrate_instance_directory(&pool, &existing, "taken_deploy", root).await;
        assert!(result.is_err(), "目标已存在应报错");

        // 两个目录内容都完好,DB 未变
        assert!(root.join("src_deploy").join("bot.py").exists(), "源目录应保留");
        assert!(
            root.join("taken_deploy").join("other.py").exists(),
            "目标目录内容不能被覆盖"
        );
        let reloaded = get_instance(&pool, "inst_mig_dup01")
            .await
            .unwrap()
            .expect("实例应存在");
        assert_eq!(reloaded.instance_path.as_deref(), Some("src_deploy"));
    }

    #[tokio::test]
    async fn migrate_instance_directory_rewrites_inner_derived_paths_only() {
        let pool = setup_test_db().await;
        let tmp = tempfile::tempdir().expect("建临时目录失败");
        let root = tmp.path();
        seed_instance_dir(root, "old_deploy", "bot.py");

        // python_path 指向旧目录内部(应随迁移重指),config_path 指向系统级(应保持不变)
        let inner_python = root.join("old_deploy").join(".venv").join("python");
        let inner_python_str = inner_python.to_string_lossy().to_string();
        let system_config = if cfg!(windows) {
            "C:/etc/mai/bot_config.toml"
        } else {
            "/etc/mai/bot_config.toml"
        };
        let now = Utc::now().naive_utc();
        let runtime_profile_json = crate::models::default_runtime_profile_json(
            Some("old_deploy"),
            Some(inner_python_str.clone()),
        );
        sqlx::query(
            r#"INSERT INTO instances
               (id, name, instance_path, bot_type, status, python_path, config_path,
                created_at, updated_at, run_time, runtime_profile, component_state)
               VALUES (?, ?, ?, 'maibot', 'stopped', ?, ?, ?, ?, 0, ?, '[]')"#,
        )
        .bind("inst_mig_paths1")
        .bind("paths-bot")
        .bind("old_deploy")
        .bind(&inner_python_str)
        .bind(system_config)
        .bind(now)
        .bind(now)
        .bind(runtime_profile_json)
        .execute(&pool)
        .await
        .expect("插入实例失败");

        let existing = get_instance(&pool, "inst_mig_paths1")
            .await
            .unwrap()
            .expect("实例应存在");
        let migrated = migrate_instance_directory(&pool, &existing, "new_deploy", root)
            .await
            .expect("迁移应成功");

        // 指向旧目录内部的 python_path 被重指到新目录
        let expected_python = root.join("new_deploy").join(".venv").join("python");
        assert_eq!(
            migrated.python_path.as_deref().map(Path::new),
            Some(expected_python.as_path()),
            "内部 python_path 应重指到新目录"
        );
        // runtime_profile.python.path 同步重指
        assert_eq!(
            migrated.runtime_profile.python.path.as_deref().map(Path::new),
            Some(expected_python.as_path()),
            "runtime_profile 的 python.path 应同步"
        );
        // 指向实例目录之外的 config_path 保持不变
        assert_eq!(
            migrated.config_path.as_deref(),
            Some(system_config),
            "系统级 config_path 不应被改写"
        );
    }

    #[tokio::test]
    async fn migrate_instance_directory_rewrites_component_override_python_path() {
        let pool = setup_test_db().await;
        let tmp = tempfile::tempdir().expect("建临时目录失败");
        let root = tmp.path();
        seed_instance_dir(root, "old_deploy", "bot.py");

        // 组件级覆盖:Main 组件用实例目录内的自定义解释器(组件级覆盖的典型用途)。
        let inner_python = root.join("old_deploy").join("py-custom").join("python");
        let inner_python_str = inner_python.to_string_lossy().to_string();
        let mut comp: std::collections::HashMap<ComponentType, crate::models::RuntimeProfile> =
            std::collections::HashMap::new();
        comp.insert(
            ComponentType::Main,
            crate::models::RuntimeProfile::local("old_deploy", Some(inner_python_str.clone())),
        );
        let comp_json = serde_json::to_string(&comp).expect("序列化组件覆盖");

        let now = Utc::now().naive_utc();
        let runtime_profile_json =
            crate::models::default_runtime_profile_json(Some("old_deploy"), None);
        sqlx::query(
            r#"INSERT INTO instances
               (id, name, instance_path, bot_type, status, created_at, updated_at, run_time,
                runtime_profile, component_runtime_profiles, component_state)
               VALUES (?, ?, ?, 'maibot', 'stopped', ?, ?, 0, ?, ?, '[]')"#,
        )
        .bind("inst_mig_comp1")
        .bind("comp-bot")
        .bind("old_deploy")
        .bind(now)
        .bind(now)
        .bind(runtime_profile_json)
        .bind(&comp_json)
        .execute(&pool)
        .await
        .expect("插入实例失败");

        let existing = get_instance(&pool, "inst_mig_comp1")
            .await
            .unwrap()
            .expect("实例应存在");
        // 前置:组件级覆盖确实指向旧目录内解释器
        assert_eq!(
            existing
                .component_runtime_profiles
                .get(&ComponentType::Main)
                .and_then(|p| p.python.path.as_deref()),
            Some(inner_python_str.as_str()),
        );

        let migrated = migrate_instance_directory(&pool, &existing, "new_deploy", root)
            .await
            .expect("迁移应成功");

        // 组件级覆盖的 python.path 随迁移重指到新目录(修复前此列不写,覆盖仍悬空指向旧目录)
        let expected = root.join("new_deploy").join("py-custom").join("python");
        assert_eq!(
            migrated
                .component_runtime_profiles
                .get(&ComponentType::Main)
                .and_then(|p| p.python.path.as_deref())
                .map(Path::new),
            Some(expected.as_path()),
            "组件级覆盖 python.path 应随迁移重指到新目录",
        );
    }

    #[tokio::test]
    async fn migrate_instance_path_returns_none_for_missing_id() {
        let pool = setup_test_db().await;
        let pm = crate::services::process_service::ProcessManager::new();
        let result = migrate_instance_path(&pool, &pm, "inst_missing", "whatever")
            .await
            .expect("查询不应失败");
        assert!(result.is_none(), "不存在的实例应返回 None");
    }
}

/// 数据库迁移
///
/// 使用原始 SQL 建表，与 Python SQLAlchemy 模型生成的表结构完全兼容。
/// 采用 `CREATE TABLE IF NOT EXISTS` 保证幂等性。
use sqlx::SqlitePool;
use tracing::info;

use crate::errors::AppError;

/// 运行所有建表迁移
///
/// 按依赖顺序创建表：先创建无外键依赖的表，再创建有外键关联的表。
pub async fn run_migrations(pool: &SqlitePool) -> Result<(), AppError> {
    info!("[数据库] 开始执行建表迁移...");

    // 启用外键约束
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(pool)
        .await?;

    // ===== 无外键依赖的表 =====

    // 启动器全局配置
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS launcher_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key VARCHAR(100) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query("CREATE INDEX IF NOT EXISTS ix_launcher_config_key ON launcher_config (key)")
        .execute(pool)
        .await?;

    // Python 环境配置
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS python_environments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path VARCHAR(500) NOT NULL UNIQUE,
            version VARCHAR(50) NOT NULL,
            major INTEGER NOT NULL,
            minor INTEGER NOT NULL,
            micro INTEGER NOT NULL,
            is_default BOOLEAN NOT NULL DEFAULT 0,
            is_selected BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_python_environments_path ON python_environments (path)")
        .execute(pool)
        .await?;

    // MAIBot 配置
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS maibot_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            maibot_path VARCHAR(500),
            config_path VARCHAR(500),
            data_path VARCHAR(500),
            python_env_id INTEGER,
            is_installed BOOLEAN NOT NULL DEFAULT 0,
            version VARCHAR(50),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    // 路径配置
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS path_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            path VARCHAR(500) NOT NULL,
            path_type VARCHAR(50) NOT NULL,
            is_verified BOOLEAN NOT NULL DEFAULT 0,
            description TEXT,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_path_config_name ON path_config (name)")
        .execute(pool)
        .await?;

    // API 供应商配置
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            base_url VARCHAR(500) NOT NULL,
            api_key TEXT NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT 1,
            priority INTEGER NOT NULL DEFAULT 0,
            balance VARCHAR(100),
            balance_updated_at DATETIME,
            models_updated_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_api_providers_name ON api_providers (name)")
        .execute(pool)
        .await?;

    // AI 模型缓存
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id INTEGER NOT NULL REFERENCES api_providers(id),
            model_id VARCHAR(200) NOT NULL,
            model_name VARCHAR(200),
            owned_by VARCHAR(200),
            created INTEGER,
            supports_vision BOOLEAN NOT NULL DEFAULT 0,
            supports_function_calling BOOLEAN NOT NULL DEFAULT 0,
            context_length INTEGER,
            max_output_tokens INTEGER,
            input_price VARCHAR(50),
            output_price VARCHAR(50),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_api_models_provider_id ON api_models (provider_id)")
        .execute(pool)
        .await?;

    // ===== 实例相关表 =====

    // 实例
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS instances (
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
            qq_account VARCHAR(20)
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_instances_name ON instances (name)")
        .execute(pool)
        .await?;

    // 部署任务
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS deployments (
            id VARCHAR(50) PRIMARY KEY,
            instance_id VARCHAR(50) NOT NULL,
            deployment_type VARCHAR(20) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            progress INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            started_at DATETIME,
            completed_at DATETIME,
            error_message TEXT
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_deployments_instance_id ON deployments (instance_id)")
        .execute(pool)
        .await?;

    // 部署日志
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS deployment_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deployment_id VARCHAR(50) NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            level VARCHAR(20) NOT NULL,
            message TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_deployment_logs_deployment_id ON deployment_logs (deployment_id)")
        .execute(pool)
        .await?;

    // 计划任务
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schedule_tasks (
            id VARCHAR(50) PRIMARY KEY,
            instance_id VARCHAR(50) NOT NULL REFERENCES instances(id),
            name VARCHAR(100) NOT NULL,
            action VARCHAR(20) NOT NULL,
            schedule_type VARCHAR(20) NOT NULL,
            schedule_config TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            last_run DATETIME,
            next_run DATETIME,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_schedule_tasks_instance_id ON schedule_tasks (instance_id)")
        .execute(pool)
        .await?;

    // 组件版本记录
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS component_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id VARCHAR(50) NOT NULL REFERENCES instances(id),
            component VARCHAR(50) NOT NULL,
            version VARCHAR(100),
            commit_hash VARCHAR(40),
            install_method VARCHAR(20) NOT NULL,
            installed_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_component_versions_instance_id ON component_versions (instance_id)")
        .execute(pool)
        .await?;

    // 版本备份记录
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS version_backups (
            id VARCHAR(50) PRIMARY KEY,
            instance_id VARCHAR(50) NOT NULL REFERENCES instances(id),
            component VARCHAR(50) NOT NULL,
            version VARCHAR(100),
            commit_hash VARCHAR(40),
            backup_path VARCHAR(500) NOT NULL,
            backup_size INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
            description TEXT
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_version_backups_instance_id ON version_backups (instance_id)")
        .execute(pool)
        .await?;

    // 更新历史记录
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS update_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id VARCHAR(50) NOT NULL REFERENCES instances(id),
            component VARCHAR(50) NOT NULL,
            from_version VARCHAR(100),
            to_version VARCHAR(100),
            from_commit VARCHAR(40),
            to_commit VARCHAR(40),
            status VARCHAR(20) NOT NULL,
            backup_id VARCHAR(50) REFERENCES version_backups(id),
            error_message TEXT,
            updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS ix_update_history_instance_id ON update_history (instance_id)")
        .execute(pool)
        .await?;

    info!("[数据库] 建表迁移完成（13 张表）");
    Ok(())
}

/// 初始化默认 API 供应商
///
/// 如果 api_providers 表为空，插入三个预设供应商（与 Python 后端一致）。
pub async fn init_default_providers(pool: &SqlitePool) -> Result<(), AppError> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM api_providers")
        .fetch_one(pool)
        .await?;

    if count.0 > 0 {
        return Ok(());
    }

    info!("[数据库] 初始化默认 API 供应商...");

    let providers = [
        ("硅基流动", "https://api.siliconflow.cn/v1", 1),
        ("阿里百炼", "https://dashscope.aliyuncs.com/compatible-mode/v1", 2),
        ("DeepSeek", "https://api.deepseek.com/v1", 3),
    ];

    for (name, base_url, priority) in providers {
        sqlx::query(
            "INSERT INTO api_providers (name, base_url, api_key, is_enabled, priority) VALUES (?, ?, '', 1, ?)"
        )
        .bind(name)
        .bind(base_url)
        .bind(priority)
        .execute(pool)
        .await?;
    }

    info!("[数据库] 已初始化 {} 个默认 API 供应商", providers.len());
    Ok(())
}

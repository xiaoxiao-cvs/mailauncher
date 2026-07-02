//! 每实例端口分配 —— 让多个 MaiBot 实例并发运行时各用独立端口,消除 NapCat 正向 WS(3001)、
//! maim_message(8000)、MaiBot WebUI(8001)、NapCat WebUI(6099)在跨实例复用同一硬编码端口时的冲突。
//!
//! 设计:每个实例分配一个连续端口块的基址 `port_base`(存于 `instances.port_base`),四个端口按固定
//! 偏移派生。这把此前散落在 process_service / napcat_config / install_service 三处、仅靠注释声明
//! "同源"的硬编码 3001 收敛为单一派生源,任一改动不再需要三处手工同步。

use sqlx::SqlitePool;

use crate::errors::{AppError, AppResult};

/// 端口块起始基址。避开常见默认端口(3001/6099/8000/8001),给多实例各留独立区间。
pub const PORT_BASE_START: i64 = 21200;

/// 相邻实例基址步长:每实例占用 4 个端口,预留 6 个冗余位便于日后扩展端口种类而不必迁移。
pub const PORT_BASE_STRIDE: i64 = 10;

/// 单实例的四个端口(由 `port_base` 按固定偏移派生)。
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct InstancePorts {
    /// NapCat 正向 WS 服务端:NapCat 监听、MaiBot 内置适配器作为客户端连入(两侧须一致,均由启动器写)。
    pub napcat_ws: u16,
    /// MaiBot maim_message 旧版对外 WS server(bot_config.toml `[maim_message].ws_server_port`)。
    pub maim: u16,
    /// MaiBot WebUI(uvicorn),maisaka 监控 WS 与 token 直登共用此口(bot_config.toml `[webui].port`)。
    pub maibot_webui: u16,
    /// NapCat 自身 WebUI(扫码登录面板,NapCat/config/webui.json 的 `port`)。
    pub napcat_webui: u16,
}

impl InstancePorts {
    /// 按基址派生四端口。偏移固定,保证任意两实例(基址相差 >= `PORT_BASE_STRIDE`)端口区间不重叠。
    ///
    /// 调用方须先保证 `base + 3 <= u16::MAX`(见 [`ensure_instance_ports`] 的守卫),否则 `as u16` 会截断。
    pub fn from_base(base: i64) -> Self {
        Self {
            napcat_ws: base as u16,
            maim: (base + 1) as u16,
            maibot_webui: (base + 2) as u16,
            napcat_webui: (base + 3) as u16,
        }
    }
}

/// 幂等确保实例已分配 `port_base`;未分配(NULL)时原子分配下一个空闲基址并落库,返回该实例四端口。
///
/// 分配用单条 UPDATE 内子查询取 `MAX(port_base) + STRIDE`,依赖 SQLite 单写者串行化避免并发撞号
/// (两个并发分配会被写锁串行,后者子查询能读到前者已提交的新 MAX)。已分配则直接读回,不重复分配。
pub async fn ensure_instance_ports(
    pool: &SqlitePool,
    instance_id: &str,
) -> AppResult<InstancePorts> {
    // 仅当 port_base 当前为 NULL 时原子分配;已分配的行 WHERE 不命中,保持幂等。
    sqlx::query(
        r#"UPDATE instances
           SET port_base = (
               SELECT COALESCE(MAX(port_base), ?1 - ?2) + ?2 FROM instances
           )
           WHERE id = ?3 AND port_base IS NULL"#,
    )
    .bind(PORT_BASE_START)
    .bind(PORT_BASE_STRIDE)
    .bind(instance_id)
    .execute(pool)
    .await?;

    let base: Option<i64> = sqlx::query_scalar("SELECT port_base FROM instances WHERE id = ?")
        .bind(instance_id)
        .fetch_optional(pool)
        .await?
        .flatten();

    let base = base.ok_or_else(|| {
        AppError::NotFound(format!("实例 {} 不存在,无法分配端口", instance_id))
    })?;

    // 端口用 u16,基址派生的最高端口不得越界(否则 as u16 截断会静默撞号)。现实中不可达,越界即报错止损。
    if base + 3 > u16::MAX as i64 {
        return Err(AppError::Internal(format!(
            "实例端口基址 {} 越界(base+3 超过 {}),端口池已耗尽",
            base,
            u16::MAX
        )));
    }

    Ok(InstancePorts::from_base(base))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    /// 内存库:in-memory sqlite 每连接独立,故限 1 连接保证同一库;建最小 instances 表(仅需 id/port_base)。
    async fn mem_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("建内存库失败");
        sqlx::query("CREATE TABLE instances (id TEXT PRIMARY KEY, port_base INTEGER)")
            .execute(&pool)
            .await
            .expect("建表失败");
        pool
    }

    async fn insert_instance(pool: &SqlitePool, id: &str) {
        sqlx::query("INSERT INTO instances (id, port_base) VALUES (?, NULL)")
            .bind(id)
            .execute(pool)
            .await
            .expect("插入实例失败");
    }

    #[test]
    fn from_base_derives_four_contiguous_ports() {
        let p = InstancePorts::from_base(21200);
        assert_eq!(p.napcat_ws, 21200);
        assert_eq!(p.maim, 21201);
        assert_eq!(p.maibot_webui, 21202);
        assert_eq!(p.napcat_webui, 21203);
    }

    #[tokio::test]
    async fn first_instance_gets_start_base_second_gets_next_stride() {
        let pool = mem_pool().await;
        insert_instance(&pool, "inst_a").await;
        insert_instance(&pool, "inst_b").await;

        let a = ensure_instance_ports(&pool, "inst_a").await.unwrap();
        let b = ensure_instance_ports(&pool, "inst_b").await.unwrap();

        // 第一个拿起始基址,第二个拿 +STRIDE,两实例端口区间不重叠。
        assert_eq!(a.napcat_ws, PORT_BASE_START as u16);
        assert_eq!(b.napcat_ws, (PORT_BASE_START + PORT_BASE_STRIDE) as u16);
        assert_ne!(a.napcat_webui, b.napcat_ws, "相邻实例端口区间不得重叠");
    }

    #[tokio::test]
    async fn allocation_is_idempotent() {
        let pool = mem_pool().await;
        insert_instance(&pool, "inst_a").await;

        let first = ensure_instance_ports(&pool, "inst_a").await.unwrap();
        let second = ensure_instance_ports(&pool, "inst_a").await.unwrap();
        // 二次调用不重新分配,返回同一端口块。
        assert_eq!(first, second);
    }

    #[tokio::test]
    async fn missing_instance_errors() {
        let pool = mem_pool().await;
        assert!(ensure_instance_ports(&pool, "nope").await.is_err());
    }
}

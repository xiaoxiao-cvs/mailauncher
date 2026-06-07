/// 消息队列服务
///
/// Phase 1 基础实现：提供消息队列的查询接口。
/// 消息队列数据来自正在运行的 MaiBot 实例，通过读取实例日志实现。
/// 完整的 WebSocket 实时监听将在 Phase 2 实现。
use sqlx::SqlitePool;

use crate::errors::AppResult;
use crate::models::message_queue::MessageQueueResponse;
use crate::services::maisaka_monitor_service::MaisakaMonitor;

/// 获取单个实例的消息队列
///
/// Phase 1: 返回基础结构，connected 根据实例状态判断
pub async fn get_instance_queue(
    pool: &SqlitePool,
    monitor: &MaisakaMonitor,
    instance_id: &str,
) -> AppResult<MessageQueueResponse> {
    #[derive(sqlx::FromRow)]
    struct InstanceInfo {
        name: String,
        status: String,
        instance_path: Option<String>,
    }

    let instance = sqlx::query_as::<_, InstanceInfo>(
        "SELECT name, status, instance_path FROM instances WHERE id = ?",
    )
    .bind(instance_id)
    .fetch_optional(pool)
    .await?;

    match instance {
        Some(info) => {
            let running = info.status == "running";
            // "已处理":近 24h 该实例的消息数(读 MaiBot.db,口径与首页统计卡一致;无库/表缺失回退 0)。
            // 在途列表(messages)走 WebSocket 桥(maisaka_monitor),将在后续接入,此处暂留空。
            let path = info.instance_path.unwrap_or_else(|| info.name.clone());
            let total_processed =
                crate::services::stats_service::count_instance_messages(&path, "24h")
                    .await
                    .0;
            // 在途会话来自 maisaka_monitor WS 桥(WS 连上才有;未连/未运行为空)。
            let (ws_connected, messages) = monitor.snapshot(instance_id).await;
            Ok(MessageQueueResponse {
                instance_id: instance_id.to_string(),
                instance_name: info.name,
                connected: running || ws_connected,
                messages,
                total_processed,
                error: if running {
                    None
                } else {
                    Some("实例未运行".into())
                },
            })
        }
        None => Ok(MessageQueueResponse {
            instance_id: instance_id.to_string(),
            instance_name: "未知".to_string(),
            connected: false,
            messages: vec![],
            total_processed: 0,
            error: Some(format!("实例不存在: {}", instance_id)),
        }),
    }
}

/// 获取所有实例的消息队列
pub async fn get_all_queues(
    pool: &SqlitePool,
    monitor: &MaisakaMonitor,
) -> AppResult<Vec<MessageQueueResponse>> {
    let instance_ids: Vec<(String,)> = sqlx::query_as("SELECT id FROM instances")
        .fetch_all(pool)
        .await?;

    let mut result = Vec::new();
    for (id,) in instance_ids {
        let queue = get_instance_queue(pool, monitor, &id).await?;
        result.push(queue);
    }
    Ok(result)
}

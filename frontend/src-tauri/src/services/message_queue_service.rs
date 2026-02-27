/// 消息队列服务
///
/// Phase 1 基础实现：提供消息队列的查询接口。
/// 消息队列数据来自正在运行的 MaiBot 实例，通过读取实例日志实现。
/// 完整的 WebSocket 实时监听将在 Phase 2 实现。
use sqlx::SqlitePool;
use tracing::warn;

use crate::errors::AppResult;
use crate::models::message_queue::MessageQueueResponse;

/// 获取单个实例的消息队列
///
/// Phase 1: 返回基础结构，connected 根据实例状态判断
pub async fn get_instance_queue(
    pool: &SqlitePool,
    instance_id: &str,
) -> AppResult<MessageQueueResponse> {
    #[derive(sqlx::FromRow)]
    struct InstanceInfo {
        name: String,
        status: String,
    }

    let instance = sqlx::query_as::<_, InstanceInfo>(
        "SELECT name, status FROM instances WHERE id = ?"
    )
    .bind(instance_id)
    .fetch_optional(pool)
    .await?;

    match instance {
        Some(info) => Ok(MessageQueueResponse {
            instance_id: instance_id.to_string(),
            instance_name: info.name,
            connected: info.status == "running",
            messages: vec![],
            total_processed: 0,
            error: if info.status != "running" {
                Some("实例未运行，消息队列监听未启动".into())
            } else {
                Some("消息队列实时监听将在 Phase 2 实现".into())
            },
        }),
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
) -> AppResult<Vec<MessageQueueResponse>> {
    let instance_ids: Vec<(String,)> = sqlx::query_as("SELECT id FROM instances")
        .fetch_all(pool)
        .await?;

    let mut result = Vec::new();
    for (id,) in instance_ids {
        let queue = get_instance_queue(pool, &id).await?;
        result.push(queue);
    }
    Ok(result)
}

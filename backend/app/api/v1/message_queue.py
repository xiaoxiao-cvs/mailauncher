"""
消息队列 API 路由
获取 MaiBot 实例的消息处理队列状态
"""
from typing import Dict
from fastapi import APIRouter

from ...services.message_queue_service import get_message_queue_service
from ...models.message_queue import MessageQueueResponse

router = APIRouter()


@router.get(
    "/instances/{instance_id}/message-queue",
    response_model=MessageQueueResponse,
    summary="获取实例消息队列",
    description="获取指定 MaiBot 实例的消息处理队列状态，包括正在处理的消息、重试次数等",
)
async def get_instance_message_queue(
    instance_id: str,
) -> MessageQueueResponse:
    """获取单个实例的消息队列状态"""
    mq_service = get_message_queue_service()
    return mq_service.get_queue(instance_id)


@router.get(
    "/message-queue",
    response_model=Dict[str, MessageQueueResponse],
    summary="获取所有实例消息队列",
    description="获取所有正在运行的 MaiBot 实例的消息处理队列状态",
)
async def get_all_message_queues() -> Dict[str, MessageQueueResponse]:
    """获取所有实例的消息队列状态"""
    mq_service = get_message_queue_service()
    return mq_service.get_all_queues()

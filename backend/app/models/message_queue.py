"""
消息队列监控数据模型
用于展示 MaiBot 正在处理的消息状态
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class MessageStatus(str, Enum):
    """消息处理状态"""
    PENDING = "pending"         # 等待处理
    PLANNING = "planning"       # 规划器思考中
    GENERATING = "generating"   # LLM 生成中
    SENDING = "sending"         # 发送中
    SENT = "sent"               # 已发送
    FAILED = "failed"           # 失败


class MessageQueueItem(BaseModel):
    """消息队列项"""
    id: str = Field(..., description="消息唯一标识")
    stream_id: str = Field(..., description="聊天流ID (如 qq:123456:group)")
    group_name: Optional[str] = Field(None, description="群名/用户名")
    status: MessageStatus = Field(default=MessageStatus.PENDING, description="处理状态")
    cycle_count: int = Field(default=1, description="思考次数(第N次思考)")
    retry_count: int = Field(default=0, description="API重试次数")
    retry_reason: Optional[str] = Field(None, description="重试原因 (如 429 rate limit)")
    action_type: Optional[str] = Field(None, description="决定执行的动作类型")
    start_time: float = Field(..., description="开始处理时间戳")
    sent_time: Optional[float] = Field(None, description="发送完成时间戳")
    message_preview: Optional[str] = Field(None, description="消息预览 (截断)")
    
    class Config:
        use_enum_values = True


class MessageQueueResponse(BaseModel):
    """消息队列响应"""
    instance_id: str = Field(..., description="实例ID")
    instance_name: str = Field(..., description="实例名称")
    connected: bool = Field(default=False, description="是否已连接到 MaiBot WebSocket")
    messages: List[MessageQueueItem] = Field(default_factory=list, description="消息队列")
    total_processed: int = Field(default=0, description="已处理消息总数")
    error: Optional[str] = Field(None, description="错误信息")


class MessageQueueStats(BaseModel):
    """消息队列统计"""
    pending_count: int = Field(default=0, description="等待中")
    processing_count: int = Field(default=0, description="处理中")
    sent_count: int = Field(default=0, description="已发送")
    failed_count: int = Field(default=0, description="失败")
    retry_count: int = Field(default=0, description="重试总次数")

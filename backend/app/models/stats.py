"""
统计数据模型
定义 MaiBot 实例统计信息的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TimeRange(str, Enum):
    """时间范围枚举"""
    HOUR_1 = "1h"
    HOUR_6 = "6h"
    HOUR_12 = "12h"
    HOUR_24 = "24h"
    DAY_7 = "7d"
    DAY_30 = "30d"
    
    def to_hours(self) -> int:
        """转换为小时数"""
        mapping = {
            "1h": 1,
            "6h": 6,
            "12h": 12,
            "24h": 24,
            "7d": 168,
            "30d": 720,
        }
        return mapping[self.value]


class StatsSummary(BaseModel):
    """统计摘要数据"""
    total_requests: int = Field(0, description="总请求数")
    total_cost: float = Field(0.0, description="总花费（元）")
    total_tokens: int = Field(0, description="总 Token 数")
    input_tokens: int = Field(0, description="输入 Token 数")
    output_tokens: int = Field(0, description="输出 Token 数")
    online_time: float = Field(0.0, description="在线时间（秒）")
    total_messages: int = Field(0, description="总消息数")
    total_replies: int = Field(0, description="总回复数")
    avg_response_time: float = Field(0.0, description="平均响应时间（秒）")
    cost_per_hour: float = Field(0.0, description="每小时花费（元）")
    tokens_per_hour: float = Field(0.0, description="每小时 Token 数")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_requests": 1024,
                "total_cost": 12.58,
                "total_tokens": 156000,
                "input_tokens": 120000,
                "output_tokens": 36000,
                "online_time": 86400.0,
                "total_messages": 520,
                "total_replies": 180,
                "avg_response_time": 2.5,
                "cost_per_hour": 0.52,
                "tokens_per_hour": 6500.0,
            }
        }


class ModelStats(BaseModel):
    """模型使用统计"""
    model_name: str = Field(..., description="模型名称")
    display_name: Optional[str] = Field(None, description="显示名称")
    request_count: int = Field(0, description="请求次数")
    total_tokens: int = Field(0, description="总 Token 数")
    input_tokens: int = Field(0, description="输入 Token 数")
    output_tokens: int = Field(0, description="输出 Token 数")
    total_cost: float = Field(0.0, description="总花费（元）")
    avg_response_time: float = Field(0.0, description="平均响应时间（秒）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "deepseek-chat",
                "display_name": "DeepSeek Chat",
                "request_count": 256,
                "total_tokens": 45000,
                "input_tokens": 35000,
                "output_tokens": 10000,
                "total_cost": 3.25,
                "avg_response_time": 1.8,
            }
        }


class RequestTypeStats(BaseModel):
    """请求类型统计"""
    request_type: str = Field(..., description="请求类型")
    request_count: int = Field(0, description="请求次数")
    total_tokens: int = Field(0, description="总 Token 数")
    total_cost: float = Field(0.0, description="总花费（元）")


class InstanceStats(BaseModel):
    """单实例完整统计"""
    instance_id: str = Field(..., description="实例 ID")
    instance_name: str = Field(..., description="实例名称")
    time_range: str = Field(..., description="统计时间范围")
    query_time: datetime = Field(default_factory=datetime.now, description="查询时间")
    summary: StatsSummary = Field(default_factory=StatsSummary, description="摘要统计")
    model_stats: List[ModelStats] = Field(default_factory=list, description="按模型统计")
    request_type_stats: List[RequestTypeStats] = Field(default_factory=list, description="按请求类型统计")
    
    class Config:
        json_schema_extra = {
            "example": {
                "instance_id": "inst_abc123",
                "instance_name": "我的麦麦",
                "time_range": "24h",
                "query_time": "2025-01-15T10:30:00",
                "summary": StatsSummary.Config.json_schema_extra["example"],
                "model_stats": [ModelStats.Config.json_schema_extra["example"]],
                "request_type_stats": [],
            }
        }


class AggregatedStats(BaseModel):
    """聚合统计（多实例汇总）"""
    instance_count: int = Field(0, description="实例数量")
    time_range: str = Field(..., description="统计时间范围")
    query_time: datetime = Field(default_factory=datetime.now, description="查询时间")
    summary: StatsSummary = Field(default_factory=StatsSummary, description="汇总摘要")
    by_instance: List[InstanceStats] = Field(default_factory=list, description="按实例分组统计")
    model_stats: List[ModelStats] = Field(default_factory=list, description="汇总模型统计")


class StatsOverview(BaseModel):
    """统计概览（首页展示用）"""
    total_instances: int = Field(0, description="总实例数")
    running_instances: int = Field(0, description="运行中实例数")
    time_range: str = Field(..., description="统计时间范围")
    query_time: datetime = Field(default_factory=datetime.now, description="查询时间")
    summary: StatsSummary = Field(default_factory=StatsSummary, description="全局摘要")
    top_models: List[ModelStats] = Field(default_factory=list, description="使用量最高的模型（Top 5）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_instances": 3,
                "running_instances": 1,
                "time_range": "24h",
                "query_time": "2025-01-15T10:30:00",
                "summary": StatsSummary.Config.json_schema_extra["example"],
                "top_models": [ModelStats.Config.json_schema_extra["example"]],
            }
        }

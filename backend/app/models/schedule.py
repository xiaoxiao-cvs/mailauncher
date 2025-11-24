"""
计划任务模型 - 定义计划任务的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime


class ScheduleConfigBase(BaseModel):
    """计划任务配置基础字段"""
    hour: Optional[int] = Field(None, ge=0, le=23, description="小时 (0-23)")
    minute: Optional[int] = Field(None, ge=0, le=59, description="分钟 (0-59)")
    weekdays: Optional[list[int]] = Field(None, description="星期几 (0=周一, 6=周日)")
    date: Optional[str] = Field(None, description="单次执行的日期时间 (ISO 8601)")


class ScheduleCreate(BaseModel):
    """创建计划任务请求"""
    instance_id: str = Field(..., description="实例 ID")
    name: str = Field(..., min_length=1, max_length=100, description="任务名称")
    action: Literal["start", "stop", "restart"] = Field(..., description="执行动作")
    schedule_type: Literal["once", "daily", "weekly", "monitor"] = Field(..., description="触发类型")
    schedule_config: Dict[str, Any] = Field(default_factory=dict, description="调度配置")
    enabled: bool = Field(default=True, description="是否启用")


class ScheduleUpdate(BaseModel):
    """更新计划任务请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="任务名称")
    action: Optional[Literal["start", "stop", "restart"]] = Field(None, description="执行动作")
    schedule_type: Optional[Literal["once", "daily", "weekly", "monitor"]] = Field(None, description="触发类型")
    schedule_config: Optional[Dict[str, Any]] = Field(None, description="调度配置")
    enabled: Optional[bool] = Field(None, description="是否启用")


class Schedule(BaseModel):
    """计划任务响应模型"""
    id: str
    instance_id: str
    name: str
    action: Literal["start", "stop", "restart"]
    schedule_type: Literal["once", "daily", "weekly", "monitor"]
    schedule_config: Dict[str, Any]
    enabled: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleToggle(BaseModel):
    """切换计划任务启用状态"""
    enabled: bool = Field(..., description="是否启用")

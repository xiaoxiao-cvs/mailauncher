"""
实例数据模型
定义 MaiBot 机器人实例的数据结构
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InstanceStatus(str, Enum):
    """实例状态枚举"""
    STOPPED = "stopped"
    RUNNING = "running"
    STARTING = "starting"
    STOPPING = "stopping"
    ERROR = "error"


class BotType(str, Enum):
    """机器人类型"""
    MAIBOT = "maibot"
    NAPCAT = "napcat"
    OTHER = "other"


class InstanceBase(BaseModel):
    """实例基础信息"""
    name: str = Field(..., min_length=1, max_length=100, description="实例名称")
    bot_type: BotType = Field(default=BotType.MAIBOT, description="机器人类型")
    bot_version: Optional[str] = Field(None, description="机器人版本")
    description: Optional[str] = Field(None, max_length=500, description="实例描述")


class InstanceCreate(InstanceBase):
    """创建实例请求模型"""
    python_path: Optional[str] = Field(None, description="Python 路径")
    config_path: Optional[str] = Field(None, description="配置文件路径")


class InstanceUpdate(BaseModel):
    """更新实例请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    python_path: Optional[str] = None
    config_path: Optional[str] = None


class Instance(InstanceBase):
    """实例完整信息"""
    id: str = Field(..., description="实例唯一标识符")
    instance_path: Optional[str] = Field(None, description="实例目录路径")
    status: InstanceStatus = Field(default=InstanceStatus.STOPPED, description="实例状态")
    python_path: Optional[str] = None
    config_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    last_run: Optional[datetime] = Field(None, description="最后运行时间")
    run_time: int = Field(default=0, description="总运行时间（秒）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "inst_1234567890",
                "name": "MaiBot 生产实例",
                "bot_type": "maibot",
                "bot_version": "1.0.0",
                "description": "主要的机器人实例",
                "status": "stopped",
                "python_path": "/usr/bin/python3",
                "config_path": "/path/to/config.json",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            }
        }


class InstanceStatusResponse(BaseModel):
    """实例状态响应模型"""
    id: str
    status: InstanceStatus
    pid: Optional[int] = Field(None, description="进程 ID")
    uptime: Optional[int] = Field(None, description="运行时间（秒）")


class InstanceList(BaseModel):
    """实例列表响应模型"""
    total: int = Field(..., description="总实例数")
    instances: List[Instance] = Field(..., description="实例列表")

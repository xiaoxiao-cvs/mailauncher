"""
实例数据模型
定义 Minecraft 实例的数据结构
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


class ModLoader(str, Enum):
    """模组加载器类型"""
    VANILLA = "vanilla"
    FORGE = "forge"
    FABRIC = "fabric"
    QUILT = "quilt"


class InstanceBase(BaseModel):
    """实例基础信息"""
    name: str = Field(..., min_length=1, max_length=100, description="实例名称")
    minecraft_version: str = Field(..., description="Minecraft 版本")
    mod_loader: ModLoader = Field(default=ModLoader.VANILLA, description="模组加载器")
    mod_loader_version: Optional[str] = Field(None, description="模组加载器版本")
    description: Optional[str] = Field(None, max_length=500, description="实例描述")


class InstanceCreate(InstanceBase):
    """创建实例请求模型"""
    java_path: Optional[str] = Field(None, description="Java 路径")
    min_memory: int = Field(default=2048, ge=512, description="最小内存 (MB)")
    max_memory: int = Field(default=4096, ge=1024, description="最大内存 (MB)")


class InstanceUpdate(BaseModel):
    """更新实例请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    min_memory: Optional[int] = Field(None, ge=512)
    max_memory: Optional[int] = Field(None, ge=1024)
    java_path: Optional[str] = None


class Instance(InstanceBase):
    """实例完整信息"""
    id: str = Field(..., description="实例唯一标识符")
    status: InstanceStatus = Field(default=InstanceStatus.STOPPED, description="实例状态")
    java_path: Optional[str] = None
    min_memory: int
    max_memory: int
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    last_played: Optional[datetime] = Field(None, description="最后游玩时间")
    play_time: int = Field(default=0, description="总游玩时间（秒）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "inst_1234567890",
                "name": "我的世界 1.20.1",
                "minecraft_version": "1.20.1",
                "mod_loader": "fabric",
                "mod_loader_version": "0.15.0",
                "description": "带有优化模组的生存实例",
                "status": "stopped",
                "min_memory": 2048,
                "max_memory": 4096,
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

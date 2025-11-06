"""
部署数据模型
定义部署任务的数据结构
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DeploymentStatus(str, Enum):
    """部署状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DeploymentType(str, Enum):
    """部署类型枚举"""
    MODS = "mods"  # 模组部署
    RESOURCEPACK = "resourcepack"  # 资源包部署
    SHADERPACK = "shaderpack"  # 光影包部署
    WORLD = "world"  # 世界部署
    CONFIG = "config"  # 配置文件部署


class DeploymentBase(BaseModel):
    """部署基础信息"""
    instance_id: str = Field(..., description="目标实例 ID")
    deployment_type: DeploymentType = Field(..., description="部署类型")
    description: Optional[str] = Field(None, max_length=500, description="部署描述")


class DeploymentCreate(DeploymentBase):
    """创建部署请求模型"""
    resources: List[str] = Field(..., min_length=1, description="资源文件路径列表")
    auto_start: bool = Field(default=False, description="部署完成后自动启动实例")
    overwrite: bool = Field(default=False, description="是否覆盖已存在的文件")


class Deployment(DeploymentBase):
    """部署完整信息"""
    id: str = Field(..., description="部署任务唯一标识符")
    status: DeploymentStatus = Field(default=DeploymentStatus.PENDING, description="部署状态")
    progress: int = Field(default=0, ge=0, le=100, description="部署进度百分比")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    error_message: Optional[str] = Field(None, description="错误信息")
    deployed_files: List[str] = Field(default_factory=list, description="已部署文件列表")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "deploy_1234567890",
                "instance_id": "inst_1234567890",
                "deployment_type": "mods",
                "description": "部署优化模组包",
                "status": "completed",
                "progress": 100,
                "created_at": "2024-01-01T00:00:00",
                "completed_at": "2024-01-01T00:01:00",
            }
        }


class DeploymentList(BaseModel):
    """部署列表响应模型"""
    total: int = Field(..., description="总部署任务数")
    deployments: List[Deployment] = Field(..., description="部署任务列表")


class DeploymentLog(BaseModel):
    """部署日志模型"""
    timestamp: datetime = Field(default_factory=datetime.now, description="日志时间")
    level: str = Field(..., description="日志级别")
    message: str = Field(..., description="日志消息")


class DeploymentLogResponse(BaseModel):
    """部署日志响应模型"""
    deployment_id: str
    logs: List[DeploymentLog] = Field(..., description="日志列表")

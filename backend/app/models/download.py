"""
下载相关的数据模型
"""
from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class DownloadItemType(str, Enum):
    """下载项类型"""
    MAIBOT = "maibot"
    NAPCAT_ADAPTER = "napcat-adapter"
    NAPCAT = "napcat"
    LPMM = "lpmm"


class MaibotVersionSource(str, Enum):
    """Maibot 版本来源"""
    TAG = "tag"
    BRANCH = "branch"
    LATEST = "latest"


class DownloadStatus(str, Enum):
    """下载状态"""
    PENDING = "pending"        # 等待中
    DOWNLOADING = "downloading"  # 下载中
    INSTALLING = "installing"  # 安装中
    CONFIGURING = "configuring"  # 配置中
    COMPLETED = "completed"    # 已完成
    FAILED = "failed"          # 失败
    CANCELLED = "cancelled"    # 已取消


class DownloadProgress(BaseModel):
    """下载进度"""
    current: int = Field(default=0, description="当前进度")
    total: int = Field(default=100, description="总进度")
    message: str = Field(default="", description="进度消息")
    percentage: float = Field(default=0.0, description="百分比")


class DownloadTask(BaseModel):
    """下载任务"""
    id: str = Field(..., description="任务ID")
    instance_name: str = Field(..., description="实例名称")
    deployment_path: str = Field(..., description="部署路径")
    
    # 选择的组件
    maibot_version_source: MaibotVersionSource = Field(
        default=MaibotVersionSource.LATEST,
        description="Maibot版本来源"
    )
    maibot_version_value: str = Field(default="main", description="Maibot版本值")
    selected_items: List[DownloadItemType] = Field(
        default_factory=list,
        description="选中的下载项"
    )
    
    # 虚拟环境配置
    venv_type: str = Field(default="venv", description="虚拟环境类型: venv, uv, conda")
    python_path: Optional[str] = Field(default=None, description="Python 可执行文件路径（用户选择的版本）")
    
    # 状态信息
    status: DownloadStatus = Field(
        default=DownloadStatus.PENDING,
        description="下载状态"
    )
    progress: DownloadProgress = Field(
        default_factory=DownloadProgress,
        description="下载进度"
    )
    
    # 时间信息
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="创建时间"
    )
    started_at: Optional[datetime] = Field(default=None, description="开始时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    
    # 错误信息
    error_message: Optional[str] = Field(default=None, description="错误消息")
    
    # 实例关联
    instance_id: Optional[str] = Field(default=None, description="关联的实例ID（安装完成后创建）")
    
    # 日志
    logs: List[str] = Field(default_factory=list, description="任务日志")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "download_abc123",
                "instance_name": "我的机器人",
                "deployment_path": "/Users/user/MaiM-with-u",
                "maibot_version_source": "tag",
                "maibot_version_value": "v1.0.0",
                "selected_items": ["maibot", "napcat-adapter", "napcat"],
                "status": "pending",
                "progress": {
                    "current": 0,
                    "total": 100,
                    "message": "等待开始",
                    "percentage": 0.0
                }
            }
        }


class DownloadTaskCreate(BaseModel):
    """创建下载任务的请求"""
    instance_name: str = Field(..., min_length=1, max_length=50, description="实例名称")
    deployment_path: str = Field(..., description="部署路径")
    
    maibot_version_source: MaibotVersionSource = Field(
        default=MaibotVersionSource.LATEST,
        description="Maibot版本来源"
    )
    maibot_version_value: str = Field(default="main", description="Maibot版本值")
    selected_items: List[DownloadItemType] = Field(
        ...,
        min_length=1,
        description="选中的下载项"
    )
    
    # 虚拟环境配置（已废弃：后端会自动从数据库读取用户在引导页配置的值）
    venv_type: Optional[str] = Field(
        default=None, 
        description="[已废弃] 虚拟环境类型，后端会从数据库读取用户配置"
    )
    python_path: Optional[str] = Field(
        default=None,
        description="[已废弃] Python路径，后端会从数据库读取用户配置"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "instance_name": "我的机器人",
                "deployment_path": "/Users/user/MaiM-with-u",
                "maibot_version_source": "tag",
                "maibot_version_value": "v1.0.0",
                "selected_items": ["maibot", "napcat-adapter", "napcat"]
            }
        }


class MaibotVersion(BaseModel):
    """Maibot 版本信息"""
    source: MaibotVersionSource = Field(..., description="版本来源")
    value: str = Field(..., description="版本值")
    label: str = Field(..., description="显示标签")

    class Config:
        json_schema_extra = {
            "example": {
                "source": "tag",
                "value": "v1.0.0",
                "label": "v1.0.0 (稳定版)"
            }
        }


class VersionsResponse(BaseModel):
    """版本列表响应"""
    tags: List[str] = Field(default_factory=list, description="标签列表")
    branches: List[str] = Field(default_factory=list, description="分支列表")

    class Config:
        json_schema_extra = {
            "example": {
                "tags": ["v1.0.0", "v0.9.0", "v0.8.0"],
                "branches": ["main", "dev", "feature/new-ui"]
            }
        }

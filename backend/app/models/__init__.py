"""
数据模型包初始化
"""
from .instance import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceStatus,
    InstanceStatusResponse,
    InstanceList,
    BotType,
)
from .deployment import (
    Deployment,
    DeploymentCreate,
    DeploymentStatus,
    DeploymentType,
    DeploymentList,
    DeploymentLog,
    DeploymentLogResponse,
)
from .download import (
    DownloadTask,
    DownloadTaskCreate,
    DownloadStatus,
    DownloadItemType,
    DownloadProgress,
    MaibotVersion,
    MaibotVersionSource,
    VersionsResponse,
)
from .response import ResponseBase, ErrorResponse, SuccessResponse

__all__ = [
    # Instance models
    "Instance",
    "InstanceCreate",
    "InstanceUpdate",
    "InstanceStatus",
    "InstanceStatusResponse",
    "InstanceList",
    "BotType",
    # Deployment models
    "Deployment",
    "DeploymentCreate",
    "DeploymentStatus",
    "DeploymentType",
    "DeploymentList",
    "DeploymentLog",
    "DeploymentLogResponse",
    # Download models
    "DownloadTask",
    "DownloadTaskCreate",
    "DownloadStatus",
    "DownloadItemType",
    "DownloadProgress",
    "MaibotVersion",
    "MaibotVersionSource",
    "VersionsResponse",
    # Response models
    "ResponseBase",
    "ErrorResponse",
    "SuccessResponse",
]

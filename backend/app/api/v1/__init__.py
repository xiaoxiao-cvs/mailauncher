"""
API v1 路由汇总
"""
from fastapi import APIRouter
from .instances import router as instances_router
from .deployments import router as deployments_router
from .environment import router as environment_router
from .config import router as config_router
from .logger import router as logger_router

# 创建 v1 API 路由器
api_v1_router = APIRouter()

# 注册子路由 (prefix 在这里统一定义，避免重复)
api_v1_router.include_router(instances_router, prefix="/instances", tags=["实例管理"])
api_v1_router.include_router(deployments_router, prefix="/deployments", tags=["部署管理"])
api_v1_router.include_router(environment_router, prefix="/environment", tags=["环境配置"])
api_v1_router.include_router(config_router, prefix="/config", tags=["配置管理"])
api_v1_router.include_router(logger_router, tags=["日志管理"])

__all__ = ["api_v1_router"]

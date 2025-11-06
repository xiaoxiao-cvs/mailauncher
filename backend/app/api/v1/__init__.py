"""
API v1 路由汇总
"""
from fastapi import APIRouter
from .instances import router as instances_router
from .deployments import router as deployments_router
from .environment import router as environment_router

# 创建 v1 API 路由器
api_v1_router = APIRouter()

# 注册子路由
api_v1_router.include_router(instances_router, prefix="/instances", tags=["实例管理"])
api_v1_router.include_router(deployments_router, prefix="/deployments", tags=["部署管理"])
api_v1_router.include_router(environment_router, prefix="/environment", tags=["环境配置"])

__all__ = ["api_v1_router"]

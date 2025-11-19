"""
更新相关 API 路由
"""
from fastapi import APIRouter, Query
from typing import Optional

from app.models.update import UpdateCheckResponse, ChannelVersionsResponse
from app.services.update_service import update_service

router = APIRouter()


@router.get("/check", response_model=UpdateCheckResponse, summary="检查更新")
async def check_update(
    channel: str = Query("main", description="更新通道: main, beta, develop")
):
    """
    检查是否有新版本可用
    
    - **channel**: 更新通道 (main/beta/develop)
    """
    return await update_service.check_update(channel)


@router.get("/channels/{channel}/versions", response_model=ChannelVersionsResponse, summary="获取通道版本列表")
async def get_channel_versions(
    channel: str,
    limit: int = Query(10, ge=1, le=50, description="返回数量限制")
):
    """
    获取指定更新通道的版本列表
    
    - **channel**: 更新通道 (main/beta/develop)
    - **limit**: 返回的版本数量
    """
    return await update_service.get_channel_versions(channel, limit)


@router.get("/current-version", summary="获取当前版本")
async def get_current_version():
    """获取应用当前版本号"""
    return {
        "success": True,
        "data": {
            "version": update_service.CURRENT_VERSION
        }
    }

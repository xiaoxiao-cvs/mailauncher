"""
部署管理 API 路由
提供部署任务的管理操作
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from ...models import (
    Deployment,
    DeploymentCreate,
    DeploymentList,
    DeploymentStatus,
    DeploymentLogResponse,
    SuccessResponse,
)
from ...services import deployment_service

router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.get("", response_model=DeploymentList)
async def get_deployments(
    status: Optional[DeploymentStatus] = Query(None, description="按状态过滤"),
    instance_id: Optional[str] = Query(None, description="按实例过滤"),
):
    """获取所有部署任务列表"""
    deployments = await deployment_service.get_all_deployments(
        status=status,
        instance_id=instance_id,
    )
    return DeploymentList(total=len(deployments), deployments=deployments)


@router.get("/{deployment_id}", response_model=Deployment)
async def get_deployment(deployment_id: str):
    """获取指定部署任务详情"""
    deployment = await deployment_service.get_deployment(deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"部署任务 {deployment_id} 不存在",
        )
    return deployment


@router.get("/{deployment_id}/logs", response_model=DeploymentLogResponse)
async def get_deployment_logs(deployment_id: str):
    """获取部署任务日志"""
    deployment = await deployment_service.get_deployment(deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"部署任务 {deployment_id} 不存在",
        )
    
    logs = await deployment_service.get_deployment_logs(deployment_id)
    return DeploymentLogResponse(
        deployment_id=deployment_id,
        logs=logs,
    )


@router.post("", response_model=Deployment, status_code=status.HTTP_201_CREATED)
async def create_deployment(deployment_data: DeploymentCreate):
    """创建新的部署任务"""
    try:
        deployment = await deployment_service.create_deployment(deployment_data)
        return deployment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建部署任务失败: {str(e)}",
        )


@router.post("/{deployment_id}/cancel", response_model=SuccessResponse)
async def cancel_deployment(deployment_id: str):
    """取消部署任务"""
    success = await deployment_service.cancel_deployment(deployment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法取消部署任务 {deployment_id}",
        )
    return SuccessResponse(
        success=True,
        message=f"部署任务 {deployment_id} 已取消",
    )


@router.post("/{deployment_id}/retry", response_model=SuccessResponse)
async def retry_deployment(deployment_id: str):
    """重试失败的部署任务"""
    success = await deployment_service.retry_deployment(deployment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法重试部署任务 {deployment_id}",
        )
    return SuccessResponse(
        success=True,
        message=f"部署任务 {deployment_id} 已重新启动",
    )

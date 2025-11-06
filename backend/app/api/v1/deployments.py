"""
部署管理 API 路由
提供部署任务的管理操作
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...models import (
    Deployment,
    DeploymentCreate,
    DeploymentList,
    DeploymentStatus,
    DeploymentLogResponse,
    SuccessResponse,
)
from ...services.deployment_service import get_deployment_service, DeploymentService
from ...core.database import get_db
from ...core.logger import logger

router = APIRouter(tags=["deployments"])


@router.get("", response_model=DeploymentList)
async def get_deployments(
    status: Optional[DeploymentStatus] = Query(None, description="按状态过滤"),
    instance_id: Optional[str] = Query(None, description="按实例过滤"),
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """获取所有部署任务列表"""
    try:
        deployments = await service.get_all_deployments(
            db=db,
            status=status,
            instance_id=instance_id,
        )
        return DeploymentList(total=len(deployments), deployments=deployments)
    except Exception as e:
        logger.error(f"获取部署列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取部署列表失败: {str(e)}",
        )


@router.get("/{deployment_id}", response_model=Deployment)
async def get_deployment(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """获取指定部署任务详情"""
    try:
        deployment = await service.get_deployment(db, deployment_id)
        if not deployment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"部署任务 {deployment_id} 不存在",
            )
        return deployment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取部署详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取部署详情失败: {str(e)}",
        )


@router.get("/{deployment_id}/logs", response_model=DeploymentLogResponse)
async def get_deployment_logs(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """获取部署任务日志"""
    try:
        deployment = await service.get_deployment(db, deployment_id)
        if not deployment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"部署任务 {deployment_id} 不存在",
            )
        
        logs = await service.get_deployment_logs(db, deployment_id)
        return DeploymentLogResponse(
            deployment_id=deployment_id,
            logs=logs,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取部署日志失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取部署日志失败: {str(e)}",
        )


@router.post("", response_model=Deployment, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    deployment_data: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """创建新的部署任务"""
    try:
        deployment = await service.create_deployment(db, deployment_data)
        return deployment
    except Exception as e:
        logger.error(f"创建部署失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建部署任务失败: {str(e)}",
        )


@router.post("/{deployment_id}/cancel", response_model=SuccessResponse)
async def cancel_deployment(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """取消部署任务"""
    try:
        success = await service.cancel_deployment(db, deployment_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无法取消部署任务 {deployment_id}",
            )
        return SuccessResponse(
            success=True,
            message=f"部署任务 {deployment_id} 已取消",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消部署失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"取消部署失败: {str(e)}",
        )


@router.post("/{deployment_id}/retry", response_model=SuccessResponse)
async def retry_deployment(
    deployment_id: str,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(get_deployment_service),
):
    """重试失败的部署任务"""
    try:
        success = await service.retry_deployment(db, deployment_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无法重试部署任务 {deployment_id}",
            )
        return SuccessResponse(
            success=True,
            message=f"部署任务 {deployment_id} 已重新启动",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重试部署失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重试部署失败: {str(e)}",
        )

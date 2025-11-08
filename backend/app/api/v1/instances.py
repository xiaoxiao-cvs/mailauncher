"""
实例管理 API 路由
提供实例的 CRUD 和控制操作
"""
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...models import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceList,
    InstanceStatusResponse,
    SuccessResponse,
)
from ...services.instance_service import get_instance_service, InstanceService
from ...core.database import get_db
from ...core.logger import logger

router = APIRouter(tags=["instances"])


@router.get("", response_model=InstanceList)
async def get_instances(
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取所有实例列表"""
    try:
        instances = await service.get_all_instances(db)
        return InstanceList(total=len(instances), instances=instances)
    except Exception as e:
        logger.error(f"获取实例列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取实例列表失败: {str(e)}",
        )


@router.get("/{instance_id}", response_model=Instance)
async def get_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取指定实例详情"""
    try:
        instance = await service.get_instance(db, instance_id)
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return instance
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取实例详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取实例详情失败: {str(e)}",
        )


@router.get("/{instance_id}/status", response_model=InstanceStatusResponse)
async def get_instance_status(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取实例运行状态"""
    try:
        status_info = await service.get_instance_status(db, instance_id)
        if not status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return status_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取实例状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取实例状态失败: {str(e)}",
        )


@router.post("", response_model=Instance, status_code=status.HTTP_201_CREATED)
async def create_instance(
    instance_data: InstanceCreate,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """创建新实例"""
    try:
        instance = await service.create_instance(db, instance_data)
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"创建实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建实例失败: {str(e)}",
        )


@router.put("/{instance_id}", response_model=Instance)
async def update_instance(
    instance_id: str,
    update_data: InstanceUpdate,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """更新实例配置"""
    try:
        instance = await service.update_instance(db, instance_id, update_data)
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新实例失败: {str(e)}",
        )


@router.delete("/{instance_id}", response_model=SuccessResponse)
async def delete_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """删除实例"""
    try:
        success = await service.delete_instance(db, instance_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return SuccessResponse(
            success=True,
            message=f"实例 {instance_id} 已删除",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除实例失败: {str(e)}",
        )


@router.post("/{instance_id}/start", response_model=SuccessResponse)
async def start_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """启动实例"""
    try:
        success = await service.start_instance(db, instance_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return SuccessResponse(
            success=True,
            message=f"实例 {instance_id} 启动成功",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动实例失败: {str(e)}",
        )


@router.post("/{instance_id}/stop", response_model=SuccessResponse)
async def stop_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """停止实例"""
    try:
        results = await service.stop_instance(db, instance_id)
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return SuccessResponse(
            success=True,
            message=f"实例 {instance_id} 已停止",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停止实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止实例失败: {str(e)}",
        )


@router.post("/{instance_id}/restart", response_model=SuccessResponse)
async def restart_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """重启实例"""
    try:
        results = await service.restart_instance(db, instance_id)
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在",
            )
        return SuccessResponse(
            success=True,
            message=f"实例 {instance_id} 已重启",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重启实例失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重启实例失败: {str(e)}",
        )


@router.post("/{instance_id}/component/{component}/start", response_model=SuccessResponse)
async def start_component(
    instance_id: str,
    component: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """启动实例的指定组件 (main, napcat, napcat-ada)"""
    try:
        success = await service.start_component(db, instance_id, component)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"组件 {component} 启动失败",
            )
        return SuccessResponse(
            success=True,
            message=f"组件 {component} 已启动",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动组件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动组件失败: {str(e)}",
        )


@router.post("/{instance_id}/component/{component}/stop", response_model=SuccessResponse)
async def stop_component(
    instance_id: str,
    component: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """停止实例的指定组件 (main, napcat, napcat-ada)"""
    try:
        success = await service.stop_component(db, instance_id, component)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"组件 {component} 停止失败",
            )
        return SuccessResponse(
            success=True,
            message=f"组件 {component} 已停止",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停止组件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停止组件失败: {str(e)}",
        )


@router.get("/{instance_id}/component/{component}/status")
async def get_component_status(
    instance_id: str,
    component: str,
    service: InstanceService = Depends(get_instance_service),
):
    """获取组件状态"""
    try:
        status_info = await service.get_component_status(instance_id, component)
        return status_info
    except Exception as e:
        logger.error(f"获取组件状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取组件状态失败: {str(e)}",
        )

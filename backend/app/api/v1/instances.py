"""
实例管理 API 路由
提供实例的 CRUD 和控制操作
"""
from typing import List
from fastapi import APIRouter, HTTPException, status

from ...models import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceList,
    InstanceStatusResponse,
    SuccessResponse,
)
from ...services import instance_service

router = APIRouter(prefix="/instances", tags=["instances"])


@router.get("", response_model=InstanceList)
async def get_instances():
    """获取所有实例列表"""
    instances = await instance_service.get_all_instances()
    return InstanceList(total=len(instances), instances=instances)


@router.get("/{instance_id}", response_model=Instance)
async def get_instance(instance_id: str):
    """获取指定实例详情"""
    instance = await instance_service.get_instance(instance_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return instance


@router.get("/{instance_id}/status", response_model=InstanceStatusResponse)
async def get_instance_status(instance_id: str):
    """获取实例运行状态"""
    status_info = await instance_service.get_instance_status(instance_id)
    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return status_info


@router.post("", response_model=Instance, status_code=status.HTTP_201_CREATED)
async def create_instance(instance_data: InstanceCreate):
    """创建新实例"""
    try:
        instance = await instance_service.create_instance(instance_data)
        return instance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建实例失败: {str(e)}",
        )


@router.put("/{instance_id}", response_model=Instance)
async def update_instance(instance_id: str, update_data: InstanceUpdate):
    """更新实例配置"""
    instance = await instance_service.update_instance(instance_id, update_data)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return instance


@router.delete("/{instance_id}", response_model=SuccessResponse)
async def delete_instance(instance_id: str):
    """删除实例"""
    success = await instance_service.delete_instance(instance_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return SuccessResponse(
        success=True,
        message=f"实例 {instance_id} 已删除",
    )


@router.post("/{instance_id}/start", response_model=SuccessResponse)
async def start_instance(instance_id: str):
    """启动实例"""
    success = await instance_service.start_instance(instance_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return SuccessResponse(
        success=True,
        message=f"实例 {instance_id} 启动成功",
    )


@router.post("/{instance_id}/stop", response_model=SuccessResponse)
async def stop_instance(instance_id: str):
    """停止实例"""
    success = await instance_service.stop_instance(instance_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"实例 {instance_id} 不存在",
        )
    return SuccessResponse(
        success=True,
        message=f"实例 {instance_id} 已停止",
    )

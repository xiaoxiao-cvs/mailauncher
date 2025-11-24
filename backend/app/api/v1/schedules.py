"""
计划任务 API 路由
提供计划任务的 CRUD 操作
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.response import SuccessResponse
from ...models.schedule import Schedule, ScheduleCreate, ScheduleUpdate, ScheduleToggle
from ...services.schedule_service import get_schedule_service, ScheduleService
from ...core.database import get_db
from ...core.logger import logger

router = APIRouter(tags=["schedules"])


@router.get("", response_model=List[Schedule])
async def get_schedules(
    instance_id: Optional[str] = Query(None, description="实例 ID"),
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """
    获取计划任务列表
    
    - **instance_id**: 可选，过滤指定实例的任务
    """
    try:
        schedules = await service.get_schedules(db, instance_id=instance_id)
        return schedules
    except Exception as e:
        logger.error(f"获取计划任务列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取计划任务列表失败: {str(e)}"
        )


@router.get("/{schedule_id}", response_model=Schedule)
async def get_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """获取指定计划任务详情"""
    try:
        schedule = await service.get_schedule(db, schedule_id)
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"计划任务 {schedule_id} 不存在"
            )
        return schedule
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取计划任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取计划任务失败: {str(e)}"
        )


@router.post("", response_model=Schedule, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """
    创建计划任务
    
    - **instance_id**: 实例 ID
    - **name**: 任务名称
    - **action**: 执行动作 (start/stop/restart)
    - **schedule_type**: 触发类型 (once/daily/weekly/monitor)
    - **schedule_config**: 调度配置 JSON
    - **enabled**: 是否启用
    """
    try:
        schedule = await service.create_schedule(db, schedule_data)
        return schedule
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"创建计划任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建计划任务失败: {str(e)}"
        )


@router.put("/{schedule_id}", response_model=Schedule)
async def update_schedule(
    schedule_id: str,
    update_data: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """更新计划任务"""
    try:
        schedule = await service.update_schedule(db, schedule_id, update_data)
        return schedule
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"更新计划任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新计划任务失败: {str(e)}"
        )


@router.delete("/{schedule_id}", response_model=SuccessResponse)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """删除计划任务"""
    try:
        await service.delete_schedule(db, schedule_id)
        return SuccessResponse(message=f"计划任务 {schedule_id} 已删除")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"删除计划任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除计划任务失败: {str(e)}"
        )


@router.post("/{schedule_id}/toggle", response_model=Schedule)
async def toggle_schedule(
    schedule_id: str,
    toggle_data: ScheduleToggle,
    db: AsyncSession = Depends(get_db),
    service: ScheduleService = Depends(get_schedule_service),
):
    """切换计划任务启用状态"""
    try:
        schedule = await service.toggle_schedule(db, schedule_id, toggle_data.enabled)
        return schedule
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"切换计划任务状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切换计划任务状态失败: {str(e)}"
        )

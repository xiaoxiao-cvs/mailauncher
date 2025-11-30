"""
统计信息 API 路由
提供 MaiBot 实例的统计数据查询接口
"""
import traceback
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logger import logger
from ...models.response import APIResponse
from ...models.stats import (
    TimeRange,
    InstanceStats,
    AggregatedStats,
    StatsOverview,
    ModelStats,
)
from ...services.stats_service import StatsService, get_stats_service

router = APIRouter()


@router.get(
    "/overview",
    summary="获取统计概览",
    description="获取所有实例的统计概览数据，适用于首页展示",
)
async def get_stats_overview(
    time_range: TimeRange = Query(
        TimeRange.HOUR_24, 
        description="统计时间范围"
    ),
    db: AsyncSession = Depends(get_db),
    stats_service: StatsService = Depends(get_stats_service),
):
    """
    获取统计概览
    
    返回所有实例的汇总统计数据，包括：
    - 实例总数和运行中数量
    - 汇总的请求数、花费、Token 数等
    - 使用量最高的 Top 5 模型
    """
    try:
        overview = await stats_service.get_overview(db, time_range)
        return APIResponse.ok(
            data=overview.model_dump(),
            message="获取统计概览成功"
        )
    except Exception as e:
        logger.error(f"获取统计概览失败: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取统计概览失败: {type(e).__name__}: {str(e)}"
        )


@router.get(
    "/aggregated",
    summary="获取聚合统计",
    description="获取多实例的聚合统计数据，支持指定实例筛选",
)
async def get_aggregated_stats(
    time_range: TimeRange = Query(
        TimeRange.HOUR_24, 
        description="统计时间范围"
    ),
    instance_ids: Optional[str] = Query(
        None,
        description="实例 ID 列表（逗号分隔），不指定则统计所有实例"
    ),
    db: AsyncSession = Depends(get_db),
    stats_service: StatsService = Depends(get_stats_service),
):
    """
    获取聚合统计数据
    
    返回多个实例的汇总统计，可以指定实例 ID 列表进行筛选
    
    - 不指定 instance_ids：统计所有实例
    - 指定 instance_ids：只统计指定的实例
    
    返回数据包括：
    - 汇总摘要（total_requests, total_cost, total_tokens 等）
    - 按实例分组的详细统计
    - 汇总的模型使用统计
    """
    try:
        # 解析实例 ID 列表
        ids_list = None
        if instance_ids:
            ids_list = [id.strip() for id in instance_ids.split(",") if id.strip()]
        
        aggregated = await stats_service.get_aggregated_stats(db, time_range, ids_list)
        return APIResponse.ok(
            data=aggregated.model_dump(),
            message="获取聚合统计成功"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取聚合统计失败: {str(e)}"
        )


@router.get(
    "/instances/{instance_id}",
    summary="获取实例统计",
    description="获取单个实例的详细统计数据",
)
async def get_instance_stats(
    instance_id: str,
    time_range: TimeRange = Query(
        TimeRange.HOUR_24, 
        description="统计时间范围"
    ),
    db: AsyncSession = Depends(get_db),
    stats_service: StatsService = Depends(get_stats_service),
):
    """
    获取单个实例的统计数据
    
    返回指定实例的详细统计信息，包括：
    - 摘要统计（请求数、花费、Token 数、在线时间等）
    - 按模型分组的使用统计
    - 按请求类型分组的统计
    """
    try:
        instance_stats = await stats_service.get_instance_stats(db, instance_id, time_range)
        
        if instance_stats is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在"
            )
        
        return APIResponse.ok(
            data=instance_stats.model_dump(),
            message="获取实例统计成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取实例统计失败: {str(e)}"
        )


@router.get(
    "/instances/{instance_id}/models",
    summary="获取模型统计",
    description="获取实例的模型使用统计",
)
async def get_instance_model_stats(
    instance_id: str,
    time_range: TimeRange = Query(
        TimeRange.HOUR_24, 
        description="统计时间范围"
    ),
    limit: int = Query(
        10,
        ge=1,
        le=50,
        description="返回数量限制"
    ),
    db: AsyncSession = Depends(get_db),
    stats_service: StatsService = Depends(get_stats_service),
):
    """
    获取实例的模型使用统计
    
    返回按请求数排序的模型统计列表，包含每个模型的：
    - 请求次数
    - Token 使用量（输入/输出/总计）
    - 总花费
    - 平均响应时间
    """
    try:
        instance_stats = await stats_service.get_instance_stats(db, instance_id, time_range)
        
        if instance_stats is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"实例 {instance_id} 不存在"
            )
        
        # 限制返回数量
        model_stats = instance_stats.model_stats[:limit]
        
        return APIResponse.ok(
            data={
                "instance_id": instance_id,
                "time_range": time_range.value,
                "models": [m.model_dump() for m in model_stats],
            },
            message="获取模型统计成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型统计失败: {str(e)}"
        )


@router.post(
    "/cache/invalidate",
    summary="清除统计缓存",
    description="手动清除统计数据缓存",
)
async def invalidate_stats_cache(
    instance_id: Optional[str] = Query(
        None,
        description="实例 ID，不指定则清除所有缓存"
    ),
    stats_service: StatsService = Depends(get_stats_service),
):
    """
    清除统计缓存
    
    用于在数据发生变化后强制刷新统计数据
    """
    try:
        stats_service.invalidate_cache(instance_id)
        return APIResponse.ok(
            message="缓存已清除"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清除缓存失败: {str(e)}"
        )

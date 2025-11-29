"""
统计服务
处理 MaiBot 实例统计数据的查询和聚合
通过读取 MaiBot 实例的 SQLite 数据库获取统计信息
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
import aiosqlite
from functools import lru_cache
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.stats import (
    StatsSummary,
    ModelStats,
    RequestTypeStats,
    InstanceStats,
    AggregatedStats,
    StatsOverview,
    TimeRange,
)
from ..models.db_models import InstanceDB
from ..models.instance import InstanceStatus
from ..core.logger import logger
from ..core import settings
from ..services.process_manager import get_process_manager


class StatsCache:
    """简单的内存缓存，带 TTL"""
    
    def __init__(self, default_ttl: int = 30):
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值，如果过期则返回 None"""
        if key not in self._cache:
            return None
        value, expires_at = self._cache[key]
        if datetime.now() > expires_at:
            del self._cache[key]
            return None
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """设置缓存值"""
        ttl = ttl or self._default_ttl
        expires_at = datetime.now() + timedelta(seconds=ttl)
        self._cache[key] = (value, expires_at)
    
    def invalidate(self, key: str) -> None:
        """使缓存失效"""
        self._cache.pop(key, None)
    
    def clear(self) -> None:
        """清空所有缓存"""
        self._cache.clear()


class StatsService:
    """统计服务类 - 处理 MaiBot 统计数据查询"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化统计服务"""
        if self.__class__._initialized:
            return
        
        # 缓存 TTL 设为 15 秒，因为前端最短刷新间隔是 15 秒
        self._cache = StatsCache(default_ttl=15)
        self.__class__._initialized = True
        logger.info("统计服务已初始化")
    
    @classmethod
    def reset(cls):
        """重置单例（用于测试或重新初始化）"""
        cls._instance = None
        cls._initialized = False
    
    def _get_maibot_db_path(self, instance_path: str) -> Optional[Path]:
        """获取 MaiBot 实例的数据库路径
        
        Args:
            instance_path: 实例相对路径（相对于 instances_dir）
            
        Returns:
            数据库文件路径，如果不存在返回 None
        """
        instances_dir = settings.ensure_instances_dir()
        
        # 可能的数据库路径（按优先级排序）
        possible_paths = [
            # 标准路径: {instances_dir}/{instance_path}/MaiBot/data/MaiBot.db
            Path(instances_dir) / instance_path / "MaiBot" / "data" / "MaiBot.db",
            # 小写版本
            Path(instances_dir) / instance_path / "MaiBot" / "data" / "maibot.db",
            # 不带 MaiBot 子目录
            Path(instances_dir) / instance_path / "data" / "MaiBot.db",
            Path(instances_dir) / instance_path / "data" / "maibot.db",
        ]
        
        for db_path in possible_paths:
            if db_path.exists():
                logger.debug(f"找到 MaiBot 数据库: {db_path}")
                return db_path
        
        logger.debug(f"MaiBot 数据库不存在于可能路径中: {possible_paths[0]}")
        return None
    
    async def _query_llm_usage(
        self, 
        db_path: Path, 
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """查询 LLM 使用统计
        
        从 MaiBot 的 llm_usage 表查询数据
        """
        result = {
            "total_requests": 0,
            "total_cost": 0.0,
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "avg_response_time": 0.0,
            "model_stats": defaultdict(lambda: {
                "request_count": 0,
                "total_tokens": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_cost": 0.0,
                "total_time": 0.0,
            }),
            "request_type_stats": defaultdict(lambda: {
                "request_count": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
            }),
        }
        
        try:
            async with aiosqlite.connect(db_path) as db:
                # 检查表是否存在
                cursor = await db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_usage'"
                )
                if not await cursor.fetchone():
                    logger.debug(f"llm_usage 表不存在: {db_path}")
                    return result
                
                # 查询 LLM 使用数据
                query = """
                    SELECT 
                        model_name,
                        model_assign_name,
                        request_type,
                        prompt_tokens,
                        completion_tokens,
                        total_tokens,
                        cost,
                        time_cost,
                        timestamp
                    FROM llm_usage
                    WHERE timestamp >= ? AND timestamp <= ?
                """
                cursor = await db.execute(query, (start_time.isoformat(), end_time.isoformat()))
                rows = await cursor.fetchall()
                
                total_time = 0.0
                for row in rows:
                    (model_name, model_assign_name, request_type, 
                     prompt_tokens, completion_tokens, total_tokens,
                     cost, time_cost, _) = row
                    
                    # 使用 model_assign_name 作为显示名，如果没有则用 model_name
                    display_name = model_assign_name or model_name or "unknown"
                    model_key = model_name or "unknown"
                    
                    # 更新总计
                    result["total_requests"] += 1
                    result["total_cost"] += cost or 0.0
                    result["total_tokens"] += total_tokens or 0
                    result["input_tokens"] += prompt_tokens or 0
                    result["output_tokens"] += completion_tokens or 0
                    total_time += time_cost or 0.0
                    
                    # 更新模型统计
                    ms = result["model_stats"][model_key]
                    ms["display_name"] = display_name
                    ms["request_count"] += 1
                    ms["total_tokens"] += total_tokens or 0
                    ms["input_tokens"] += prompt_tokens or 0
                    ms["output_tokens"] += completion_tokens or 0
                    ms["total_cost"] += cost or 0.0
                    ms["total_time"] += time_cost or 0.0
                    
                    # 更新请求类型统计
                    rt = request_type or "unknown"
                    rts = result["request_type_stats"][rt]
                    rts["request_count"] += 1
                    rts["total_tokens"] += total_tokens or 0
                    rts["total_cost"] += cost or 0.0
                
                # 计算平均响应时间
                if result["total_requests"] > 0:
                    result["avg_response_time"] = total_time / result["total_requests"]
                
        except Exception as e:
            logger.error(f"查询 LLM 使用数据失败 ({db_path}): {e}")
        
        return result
    
    async def _query_online_time(
        self, 
        db_path: Path, 
        start_time: datetime,
        end_time: datetime
    ) -> float:
        """查询在线时间（秒）
        
        注意：MaiBot 目前可能没有 online_time 表，这个方法返回 0.0
        在线时间应该通过 _get_instance_online_time 方法从实例记录获取
        """
        try:
            async with aiosqlite.connect(db_path) as db:
                # 检查表是否存在
                cursor = await db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='online_time'"
                )
                if not await cursor.fetchone():
                    # MaiBot 没有 online_time 表，返回 0
                    # 在线时间将通过实例的 run_time 字段获取
                    return 0.0
                
                # 查询在线时间记录 - 使用 start_timestamp 和 end_timestamp（datetime类型）
                query = """
                    SELECT SUM(duration) 
                    FROM online_time
                    WHERE start_timestamp >= ? AND end_timestamp <= ?
                """
                cursor = await db.execute(query, (start_time.isoformat(), end_time.isoformat()))
                row = await cursor.fetchone()
                return float(row[0]) if row and row[0] else 0.0
                
        except Exception as e:
            logger.error(f"查询在线时间失败 ({db_path}): {e}")
            return 0.0
    
    def _get_instance_online_time(self, instance: InstanceDB) -> float:
        """从实例记录获取在线时间（秒）
        
        包括:
        1. 实例的累计运行时间 (run_time)
        2. 如果实例正在运行，加上当前进程的运行时间
        
        Args:
            instance: 实例数据库对象
            
        Returns:
            在线时间（秒）
        """
        total_time = float(instance.run_time or 0)
        
        # 如果实例正在运行，加上当前进程的运行时间
        if instance.status == InstanceStatus.RUNNING.value and instance.last_run:
            current_uptime = (datetime.now() - instance.last_run).total_seconds()
            total_time += current_uptime
        
        return total_time
    
    async def _query_messages(
        self, 
        db_path: Path, 
        start_time: datetime,
        end_time: datetime
    ) -> Tuple[int, int]:
        """查询消息统计
        
        Returns:
            (total_messages, total_replies)
        """
        try:
            async with aiosqlite.connect(db_path) as db:
                # 检查表是否存在
                cursor = await db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
                )
                if not await cursor.fetchone():
                    return 0, 0
                
                # 查询总消息数
                query = """
                    SELECT COUNT(*) FROM messages
                    WHERE time >= ? AND time <= ?
                """
                cursor = await db.execute(query, (start_time.timestamp(), end_time.timestamp()))
                row = await cursor.fetchone()
                total_messages = int(row[0]) if row else 0
                
                # 查询回复数（有 reply_to 的消息）
                query = """
                    SELECT COUNT(*) FROM messages
                    WHERE time >= ? AND time <= ? AND reply_to IS NOT NULL
                """
                cursor = await db.execute(query, (start_time.timestamp(), end_time.timestamp()))
                row = await cursor.fetchone()
                total_replies = int(row[0]) if row else 0
                
                return total_messages, total_replies
                
        except Exception as e:
            logger.error(f"查询消息统计失败 ({db_path}): {e}")
            return 0, 0
    
    async def get_instance_stats(
        self,
        db: AsyncSession,
        instance_id: str,
        time_range: TimeRange = TimeRange.HOUR_24,
    ) -> Optional[InstanceStats]:
        """获取单个实例的统计数据
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            time_range: 时间范围
            
        Returns:
            实例统计数据，如果实例不存在或数据库不存在则返回 None
        """
        # 检查缓存
        cache_key = f"instance_stats:{instance_id}:{time_range.value}"
        cached = self._cache.get(cache_key)
        if cached:
            logger.debug(f"从缓存获取实例统计: {cache_key}")
            return cached
        
        # 获取实例信息
        result = await db.execute(
            select(InstanceDB).where(InstanceDB.id == instance_id)
        )
        instance = result.scalar_one_or_none()
        if not instance:
            logger.warning(f"实例不存在: {instance_id}")
            return None
        
        if not instance.instance_path:
            logger.warning(f"实例路径未设置: {instance_id}")
            return None
        
        # 获取数据库路径
        db_path = self._get_maibot_db_path(instance.instance_path)
        if not db_path:
            # MaiBot 数据库不存在，但仍返回在线时间（从实例记录获取）
            online_time = self._get_instance_online_time(instance)
            return InstanceStats(
                instance_id=instance_id,
                instance_name=instance.name,
                time_range=time_range.value,
                summary=StatsSummary(online_time=online_time),
                model_stats=[],
                request_type_stats=[],
            )
        
        # 计算时间范围
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=time_range.to_hours())
        
        # 并行查询 LLM 使用数据和消息统计
        llm_task = self._query_llm_usage(db_path, start_time, end_time)
        messages_task = self._query_messages(db_path, start_time, end_time)
        
        llm_data, (total_messages, total_replies) = await asyncio.gather(
            llm_task, messages_task
        )
        
        # 获取在线时间 - 从实例记录获取
        online_time = self._get_instance_online_time(instance)
        
        # 构建摘要
        online_hours = online_time / 3600.0 if online_time > 0 else 0.0
        summary = StatsSummary(
            total_requests=llm_data["total_requests"],
            total_cost=round(llm_data["total_cost"], 4),
            total_tokens=llm_data["total_tokens"],
            input_tokens=llm_data["input_tokens"],
            output_tokens=llm_data["output_tokens"],
            online_time=online_time,
            total_messages=total_messages,
            total_replies=total_replies,
            avg_response_time=round(llm_data["avg_response_time"], 3),
            cost_per_hour=round(llm_data["total_cost"] / online_hours, 4) if online_hours > 0 else 0.0,
            tokens_per_hour=round(llm_data["total_tokens"] / online_hours, 1) if online_hours > 0 else 0.0,
        )
        
        # 构建模型统计列表
        model_stats = []
        for model_name, stats in llm_data["model_stats"].items():
            avg_time = stats["total_time"] / stats["request_count"] if stats["request_count"] > 0 else 0.0
            model_stats.append(ModelStats(
                model_name=model_name,
                display_name=stats.get("display_name"),
                request_count=stats["request_count"],
                total_tokens=stats["total_tokens"],
                input_tokens=stats["input_tokens"],
                output_tokens=stats["output_tokens"],
                total_cost=round(stats["total_cost"], 4),
                avg_response_time=round(avg_time, 3),
            ))
        
        # 按请求数排序
        model_stats.sort(key=lambda x: x.request_count, reverse=True)
        
        # 构建请求类型统计列表
        request_type_stats = []
        for rt, stats in llm_data["request_type_stats"].items():
            request_type_stats.append(RequestTypeStats(
                request_type=rt,
                request_count=stats["request_count"],
                total_tokens=stats["total_tokens"],
                total_cost=round(stats["total_cost"], 4),
            ))
        
        # 按请求数排序
        request_type_stats.sort(key=lambda x: x.request_count, reverse=True)
        
        # 构建结果
        instance_stats = InstanceStats(
            instance_id=instance_id,
            instance_name=instance.name,
            time_range=time_range.value,
            summary=summary,
            model_stats=model_stats,
            request_type_stats=request_type_stats,
        )
        
        # 缓存结果
        self._cache.set(cache_key, instance_stats)
        
        return instance_stats
    
    async def get_aggregated_stats(
        self,
        db: AsyncSession,
        time_range: TimeRange = TimeRange.HOUR_24,
        instance_ids: Optional[List[str]] = None,
    ) -> AggregatedStats:
        """获取聚合统计数据（多实例汇总）
        
        Args:
            db: 数据库会话
            time_range: 时间范围
            instance_ids: 指定的实例 ID 列表，如果为 None 则统计所有实例
            
        Returns:
            聚合统计数据
        """
        # 检查缓存
        ids_key = ",".join(sorted(instance_ids)) if instance_ids else "all"
        cache_key = f"aggregated_stats:{ids_key}:{time_range.value}"
        cached = self._cache.get(cache_key)
        if cached:
            logger.debug(f"从缓存获取聚合统计: {cache_key}")
            return cached
        
        # 获取实例列表
        if instance_ids:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id.in_(instance_ids))
            )
        else:
            result = await db.execute(select(InstanceDB))
        
        instances = result.scalars().all()
        
        # 并行获取所有实例的统计数据
        tasks = [
            self.get_instance_stats(db, inst.id, time_range) 
            for inst in instances
        ]
        all_stats = await asyncio.gather(*tasks)
        
        # 过滤掉 None 结果
        valid_stats = [s for s in all_stats if s is not None]
        
        # 汇总数据
        total_summary = StatsSummary()
        merged_model_stats: Dict[str, Dict] = defaultdict(lambda: {
            "display_name": None,
            "request_count": 0,
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_cost": 0.0,
            "total_time": 0.0,
        })
        
        for stats in valid_stats:
            # 累加摘要
            total_summary.total_requests += stats.summary.total_requests
            total_summary.total_cost += stats.summary.total_cost
            total_summary.total_tokens += stats.summary.total_tokens
            total_summary.input_tokens += stats.summary.input_tokens
            total_summary.output_tokens += stats.summary.output_tokens
            total_summary.online_time += stats.summary.online_time
            total_summary.total_messages += stats.summary.total_messages
            total_summary.total_replies += stats.summary.total_replies
            
            # 合并模型统计
            for ms in stats.model_stats:
                m = merged_model_stats[ms.model_name]
                m["display_name"] = m["display_name"] or ms.display_name
                m["request_count"] += ms.request_count
                m["total_tokens"] += ms.total_tokens
                m["input_tokens"] += ms.input_tokens
                m["output_tokens"] += ms.output_tokens
                m["total_cost"] += ms.total_cost
                m["total_time"] += ms.avg_response_time * ms.request_count
        
        # 计算衍生指标
        if total_summary.total_requests > 0:
            # 计算加权平均响应时间
            total_time = sum(
                s.summary.avg_response_time * s.summary.total_requests 
                for s in valid_stats
            )
            total_summary.avg_response_time = round(
                total_time / total_summary.total_requests, 3
            )
        
        online_hours = total_summary.online_time / 3600.0
        if online_hours > 0:
            total_summary.cost_per_hour = round(total_summary.total_cost / online_hours, 4)
            total_summary.tokens_per_hour = round(total_summary.total_tokens / online_hours, 1)
        
        total_summary.total_cost = round(total_summary.total_cost, 4)
        
        # 构建合并后的模型统计列表
        model_stats_list = []
        for model_name, stats in merged_model_stats.items():
            avg_time = stats["total_time"] / stats["request_count"] if stats["request_count"] > 0 else 0.0
            model_stats_list.append(ModelStats(
                model_name=model_name,
                display_name=stats["display_name"],
                request_count=stats["request_count"],
                total_tokens=stats["total_tokens"],
                input_tokens=stats["input_tokens"],
                output_tokens=stats["output_tokens"],
                total_cost=round(stats["total_cost"], 4),
                avg_response_time=round(avg_time, 3),
            ))
        
        model_stats_list.sort(key=lambda x: x.request_count, reverse=True)
        
        # 构建结果
        aggregated = AggregatedStats(
            instance_count=len(valid_stats),
            time_range=time_range.value,
            summary=total_summary,
            by_instance=valid_stats,
            model_stats=model_stats_list,
        )
        
        # 缓存结果
        self._cache.set(cache_key, aggregated)
        
        return aggregated
    
    async def get_overview(
        self,
        db: AsyncSession,
        time_range: TimeRange = TimeRange.HOUR_24,
    ) -> StatsOverview:
        """获取统计概览（首页展示用）
        
        Args:
            db: 数据库会话
            time_range: 时间范围
            
        Returns:
            统计概览数据
        """
        # 检查缓存
        cache_key = f"overview:{time_range.value}"
        cached = self._cache.get(cache_key)
        if cached:
            logger.debug(f"从缓存获取统计概览: {cache_key}")
            return cached
        
        # 获取所有实例
        result = await db.execute(select(InstanceDB))
        instances = list(result.scalars().all())
        
        total_instances = len(instances)
        running_instances = sum(
            1 for inst in instances 
            if inst.status == InstanceStatus.RUNNING.value
        )
        
        # 获取聚合统计
        aggregated = await self.get_aggregated_stats(db, time_range)
        
        # 取 Top 5 模型
        top_models = aggregated.model_stats[:5]
        
        # 构建结果
        overview = StatsOverview(
            total_instances=total_instances,
            running_instances=running_instances,
            time_range=time_range.value,
            summary=aggregated.summary,
            top_models=top_models,
        )
        
        # 缓存结果
        self._cache.set(cache_key, overview)
        
        return overview
    
    def invalidate_cache(self, instance_id: Optional[str] = None) -> None:
        """使缓存失效
        
        Args:
            instance_id: 如果指定，只使该实例相关的缓存失效；否则清空所有缓存
        """
        if instance_id:
            # 简单实现：清空所有缓存
            # 更精细的实现需要遍历缓存键
            self._cache.clear()
        else:
            self._cache.clear()


def get_stats_service() -> StatsService:
    """获取统计服务实例（用于依赖注入）"""
    return StatsService()

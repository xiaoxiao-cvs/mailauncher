"""
计划任务服务 - 管理实例的计划任务调度
"""
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.logger import logger
from ..models.db_models import ScheduleTaskDB, InstanceDB
from ..models.schedule import Schedule, ScheduleCreate, ScheduleUpdate


class ScheduleService:
    """计划任务服务 - 单例模式"""
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not ScheduleService._initialized:
            self.scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
            self.scheduler.start()
            self._monitor_jobs: Dict[str, str] = {}  # instance_id -> job_id 映射
            ScheduleService._initialized = True
            logger.info("计划任务调度器已启动")
    
    def _generate_task_id(self) -> str:
        """生成任务 ID"""
        import uuid
        return f"task_{uuid.uuid4().hex[:12]}"
    
    async def create_schedule(
        self, 
        db: AsyncSession, 
        schedule_data: ScheduleCreate
    ) -> Schedule:
        """创建计划任务"""
        task_id = self._generate_task_id()
        
        # 验证实例是否存在
        result = await db.execute(
            select(InstanceDB).where(InstanceDB.id == schedule_data.instance_id)
        )
        instance = result.scalar_one_or_none()
        if not instance:
            raise ValueError(f"实例 {schedule_data.instance_id} 不存在")
        
        # 创建数据库记录
        now = datetime.now()
        db_task = ScheduleTaskDB(
            id=task_id,
            instance_id=schedule_data.instance_id,
            name=schedule_data.name,
            action=schedule_data.action,
            schedule_type=schedule_data.schedule_type,
            schedule_config=schedule_data.schedule_config,
            enabled=schedule_data.enabled,
            created_at=now,
            updated_at=now
        )
        
        # 计算下次运行时间
        if schedule_data.enabled:
            next_run = self._calculate_next_run(
                schedule_data.schedule_type,
                schedule_data.schedule_config
            )
            db_task.next_run = next_run
        
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)
        
        # 如果启用，添加到调度器
        if schedule_data.enabled:
            await self._add_job_to_scheduler(db_task)
        
        logger.info(f"创建计划任务: {task_id} - {schedule_data.name}")
        return Schedule.model_validate(db_task)
    
    async def get_schedules(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None
    ) -> List[Schedule]:
        """获取计划任务列表"""
        query = select(ScheduleTaskDB)
        if instance_id:
            query = query.where(ScheduleTaskDB.instance_id == instance_id)
        
        result = await db.execute(query.order_by(ScheduleTaskDB.created_at.desc()))
        tasks = result.scalars().all()
        return [Schedule.model_validate(task) for task in tasks]
    
    async def get_schedule(
        self,
        db: AsyncSession,
        schedule_id: str
    ) -> Optional[Schedule]:
        """获取单个计划任务"""
        result = await db.execute(
            select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
        )
        task = result.scalar_one_or_none()
        return Schedule.model_validate(task) if task else None
    
    async def update_schedule(
        self,
        db: AsyncSession,
        schedule_id: str,
        update_data: ScheduleUpdate
    ) -> Schedule:
        """更新计划任务"""
        result = await db.execute(
            select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
        )
        db_task = result.scalar_one_or_none()
        if not db_task:
            raise ValueError(f"计划任务 {schedule_id} 不存在")
        
        # 更新字段
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_task, key, value)
        
        db_task.updated_at = datetime.now()
        
        # 重新计算下次运行时间
        if db_task.enabled:
            next_run = self._calculate_next_run(
                db_task.schedule_type,
                db_task.schedule_config
            )
            db_task.next_run = next_run
        else:
            db_task.next_run = None
        
        await db.commit()
        await db.refresh(db_task)
        
        # 更新调度器中的任务
        self._remove_job_from_scheduler(schedule_id)
        if db_task.enabled:
            await self._add_job_to_scheduler(db_task)
        
        logger.info(f"更新计划任务: {schedule_id}")
        return Schedule.model_validate(db_task)
    
    async def delete_schedule(
        self,
        db: AsyncSession,
        schedule_id: str
    ) -> None:
        """删除计划任务"""
        result = await db.execute(
            select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
        )
        db_task = result.scalar_one_or_none()
        if not db_task:
            raise ValueError(f"计划任务 {schedule_id} 不存在")
        
        # 从调度器移除
        self._remove_job_from_scheduler(schedule_id)
        
        # 从数据库删除
        await db.delete(db_task)
        await db.commit()
        
        logger.info(f"删除计划任务: {schedule_id}")
    
    async def toggle_schedule(
        self,
        db: AsyncSession,
        schedule_id: str,
        enabled: bool
    ) -> Schedule:
        """切换计划任务启用状态"""
        result = await db.execute(
            select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
        )
        db_task = result.scalar_one_or_none()
        if not db_task:
            raise ValueError(f"计划任务 {schedule_id} 不存在")
        
        db_task.enabled = enabled
        db_task.updated_at = datetime.now()
        
        if enabled:
            next_run = self._calculate_next_run(
                db_task.schedule_type,
                db_task.schedule_config
            )
            db_task.next_run = next_run
            await self._add_job_to_scheduler(db_task)
        else:
            db_task.next_run = None
            self._remove_job_from_scheduler(schedule_id)
        
        await db.commit()
        await db.refresh(db_task)
        
        logger.info(f"切换计划任务状态: {schedule_id} -> {enabled}")
        return Schedule.model_validate(db_task)
    
    def _calculate_next_run(
        self,
        schedule_type: str,
        schedule_config: Dict[str, Any]
    ) -> Optional[datetime]:
        """计算下次运行时间"""
        if schedule_type == "once":
            # 单次执行
            date_str = schedule_config.get("date")
            if date_str:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return None
        
        elif schedule_type == "daily":
            # 每天执行
            hour = schedule_config.get("hour", 0)
            minute = schedule_config.get("minute", 0)
            now = datetime.now()
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            return next_run
        
        elif schedule_type == "weekly":
            # 每周执行
            hour = schedule_config.get("hour", 0)
            minute = schedule_config.get("minute", 0)
            weekdays = schedule_config.get("weekdays", [])
            if not weekdays:
                return None
            
            now = datetime.now()
            current_weekday = now.weekday()
            
            # 找到最近的星期几
            for offset in range(8):
                check_day = (current_weekday + offset) % 7
                if check_day in weekdays:
                    next_run = now + timedelta(days=offset)
                    next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    if next_run > now:
                        return next_run
            
            return None
        
        elif schedule_type == "monitor":
            # 进程监控不需要固定时间
            return None
        
        return None
    
    async def _add_job_to_scheduler(self, db_task: ScheduleTaskDB) -> None:
        """添加任务到调度器"""
        try:
            if db_task.schedule_type == "once":
                # 单次执行
                run_date = db_task.next_run
                if run_date and run_date > datetime.now():
                    self.scheduler.add_job(
                        self._execute_action,
                        trigger=DateTrigger(run_date=run_date),
                        id=db_task.id,
                        args=[db_task.id, db_task.instance_id, db_task.action],
                        replace_existing=True
                    )
                    logger.info(f"添加单次任务到调度器: {db_task.id} at {run_date}")
            
            elif db_task.schedule_type == "daily":
                # 每天执行
                hour = db_task.schedule_config.get("hour", 0)
                minute = db_task.schedule_config.get("minute", 0)
                self.scheduler.add_job(
                    self._execute_action,
                    trigger=CronTrigger(hour=hour, minute=minute),
                    id=db_task.id,
                    args=[db_task.id, db_task.instance_id, db_task.action],
                    replace_existing=True
                )
                logger.info(f"添加每日任务到调度器: {db_task.id} at {hour:02d}:{minute:02d}")
            
            elif db_task.schedule_type == "weekly":
                # 每周执行
                hour = db_task.schedule_config.get("hour", 0)
                minute = db_task.schedule_config.get("minute", 0)
                weekdays = db_task.schedule_config.get("weekdays", [])
                if weekdays:
                    # APScheduler 使用 0=周一, 6=周日
                    day_of_week = ",".join(str(d) for d in weekdays)
                    self.scheduler.add_job(
                        self._execute_action,
                        trigger=CronTrigger(day_of_week=day_of_week, hour=hour, minute=minute),
                        id=db_task.id,
                        args=[db_task.id, db_task.instance_id, db_task.action],
                        replace_existing=True
                    )
                    logger.info(f"添加每周任务到调度器: {db_task.id} on days {weekdays}")
            
            elif db_task.schedule_type == "monitor":
                # 进程监控 - 每 30 秒检查一次
                self.scheduler.add_job(
                    self._monitor_process,
                    trigger=IntervalTrigger(seconds=30),
                    id=db_task.id,
                    args=[db_task.id, db_task.instance_id, db_task.action],
                    replace_existing=True
                )
                self._monitor_jobs[db_task.instance_id] = db_task.id
                logger.info(f"添加进程监控任务到调度器: {db_task.id}")
        
        except Exception as e:
            logger.error(f"添加任务到调度器失败: {db_task.id} - {e}")
    
    def _remove_job_from_scheduler(self, schedule_id: str) -> None:
        """从调度器移除任务"""
        try:
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)
                logger.info(f"从调度器移除任务: {schedule_id}")
            
            # 清理监控任务映射
            for instance_id, job_id in list(self._monitor_jobs.items()):
                if job_id == schedule_id:
                    del self._monitor_jobs[instance_id]
        except Exception as e:
            logger.error(f"从调度器移除任务失败: {schedule_id} - {e}")
    
    async def _execute_action(
        self,
        schedule_id: str,
        instance_id: str,
        action: str
    ) -> None:
        """执行计划任务动作"""
        logger.info(f"执行计划任务: {schedule_id} - {action} on {instance_id}")
        
        try:
            from .instance_service import get_instance_service
            from ..core.database import get_db
            
            service = get_instance_service()
            
            # 获取数据库会话
            async for db in get_db():
                try:
                    # 执行对应动作
                    if action == "start":
                        await service.start_instance(db, instance_id)
                    elif action == "stop":
                        await service.stop_instance(db, instance_id)
                    elif action == "restart":
                        await service.restart_instance(db, instance_id)
                    
                    # 更新最后运行时间
                    result = await db.execute(
                        select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
                    )
                    db_task = result.scalar_one_or_none()
                    if db_task:
                        db_task.last_run = datetime.now()
                        await db.commit()
                    
                    logger.info(f"计划任务执行成功: {schedule_id}")
                finally:
                    break
        
        except Exception as e:
            logger.error(f"计划任务执行失败: {schedule_id} - {e}")
    
    async def _monitor_process(
        self,
        schedule_id: str,
        instance_id: str,
        action: str
    ) -> None:
        """监控进程状态，如果停止则自动启动"""
        try:
            from .process_manager import get_process_manager
            from .instance_service import get_instance_service
            from ..core.database import get_db
            
            pm = get_process_manager()
            
            # 检查进程是否运行
            if not pm.is_instance_running(instance_id):
                logger.info(f"检测到实例 {instance_id} 已停止，准备自动启动")
                
                # 执行启动操作
                if action == "start":
                    service = get_instance_service()
                    async for db in get_db():
                        try:
                            await service.start_instance(db, instance_id)
                            
                            # 更新最后运行时间
                            result = await db.execute(
                                select(ScheduleTaskDB).where(ScheduleTaskDB.id == schedule_id)
                            )
                            db_task = result.scalar_one_or_none()
                            if db_task:
                                db_task.last_run = datetime.now()
                                await db.commit()
                            
                            logger.info(f"进程监控任务执行成功: {schedule_id} - 实例已自动启动")
                        finally:
                            break
        
        except Exception as e:
            logger.error(f"进程监控任务执行失败: {schedule_id} - {e}")
    
    async def reload_schedules_from_db(self, db: AsyncSession) -> None:
        """从数据库重新加载所有启用的计划任务"""
        logger.info("重新加载计划任务...")
        
        # 清空现有任务
        self.scheduler.remove_all_jobs()
        self._monitor_jobs.clear()
        
        # 加载启用的任务
        result = await db.execute(
            select(ScheduleTaskDB).where(ScheduleTaskDB.enabled == True)
        )
        tasks = result.scalars().all()
        
        for task in tasks:
            await self._add_job_to_scheduler(task)
        
        logger.info(f"已重新加载 {len(tasks)} 个计划任务")
    
    def shutdown(self) -> None:
        """关闭调度器"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("计划任务调度器已关闭")


# 全局单例
_schedule_service: Optional[ScheduleService] = None


def get_schedule_service() -> ScheduleService:
    """获取计划任务服务单例"""
    global _schedule_service
    if _schedule_service is None:
        _schedule_service = ScheduleService()
    return _schedule_service

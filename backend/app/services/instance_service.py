"""
实例服务
处理机器人实例相关的业务逻辑
"""
from typing import List, Optional
from datetime import datetime
import uuid
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from ..models import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceStatus,
    InstanceStatusResponse,
)
from ..models.db_models import InstanceDB
from ..core import settings
from ..core.logger import logger


class InstanceService:
    """机器人实例服务类 - 遵循单一职责原则"""
    
    def __init__(self):
        """初始化实例服务"""
        self.instances_dir = Path(settings.INSTANCES_DIR)
        self.instances_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"实例服务已初始化，实例目录: {self.instances_dir}")
    
    def _generate_instance_id(self) -> str:
        """生成唯一的实例 ID"""
        return f"inst_{uuid.uuid4().hex[:12]}"
    
    def _db_to_model(self, db_instance: InstanceDB) -> Instance:
        """将数据库模型转换为 Pydantic 模型"""
        return Instance(
            id=db_instance.id,
            name=db_instance.name,
            bot_type=db_instance.bot_type,
            bot_version=db_instance.bot_version,
            description=db_instance.description,
            status=InstanceStatus(db_instance.status),
            python_path=db_instance.python_path,
            config_path=db_instance.config_path,
            created_at=db_instance.created_at,
            updated_at=db_instance.updated_at,
            last_run=db_instance.last_run,
            run_time=db_instance.run_time,
        )
    
    async def get_all_instances(self, db: AsyncSession) -> List[Instance]:
        """获取所有实例列表
        
        Args:
            db: 数据库会话
            
        Returns:
            实例列表
        """
        try:
            result = await db.execute(select(InstanceDB))
            db_instances = result.scalars().all()
            logger.info(f"查询到 {len(db_instances)} 个实例")
            return [self._db_to_model(inst) for inst in db_instances]
        except Exception as e:
            logger.error(f"获取实例列表失败: {e}")
            raise
    
    async def get_instance(self, db: AsyncSession, instance_id: str) -> Optional[Instance]:
        """获取指定实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            实例对象，不存在则返回 None
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            if db_instance:
                return self._db_to_model(db_instance)
            return None
        except Exception as e:
            logger.error(f"获取实例 {instance_id} 失败: {e}")
            raise
    
    async def create_instance(
        self, db: AsyncSession, instance_data: InstanceCreate
    ) -> Instance:
        """创建新实例
        
        Args:
            db: 数据库会话
            instance_data: 实例创建数据
            
        Returns:
            创建的实例对象
            
        Raises:
            ValueError: 当实例名称已存在或Python路径无效时
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.name == instance_data.name)
            )
            if result.scalar_one_or_none():
                raise ValueError(f"实例名称 '{instance_data.name}' 已存在")
            
            if instance_data.python_path:
                python_path = Path(instance_data.python_path)
                if not python_path.exists():
                    raise ValueError(f"Python 路径不存在: {instance_data.python_path}")
            
            instance_id = self._generate_instance_id()
            now = datetime.now()
            
            instance_path = self.instances_dir / instance_id
            instance_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"创建实例目录: {instance_path}")
            
            db_instance = InstanceDB(
                id=instance_id,
                name=instance_data.name,
                bot_type=instance_data.bot_type,
                bot_version=instance_data.bot_version,
                description=instance_data.description,
                status=InstanceStatus.STOPPED.value,
                python_path=instance_data.python_path,
                config_path=instance_data.config_path,
                created_at=now,
                updated_at=now,
                run_time=0,
            )
            
            db.add(db_instance)
            await db.commit()
            await db.refresh(db_instance)
            
            logger.info(f"成功创建实例: {instance_id} ({instance_data.name})")
            return self._db_to_model(db_instance)
            
        except ValueError as e:
            await db.rollback()
            logger.warning(f"创建实例失败: {e}")
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"创建实例失败: {e}")
            raise
    
    async def update_instance(
        self, db: AsyncSession, instance_id: str, update_data: InstanceUpdate
    ) -> Optional[Instance]:
        """更新实例信息
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            update_data: 更新数据
            
        Returns:
            更新后的实例对象，不存在则返回 None
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return None
            
            if update_data.name and update_data.name != db_instance.name:
                result = await db.execute(
                    select(InstanceDB).where(InstanceDB.name == update_data.name)
                )
                if result.scalar_one_or_none():
                    raise ValueError(f"实例名称 '{update_data.name}' 已存在")
            
            update_dict = update_data.model_dump(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(db_instance, field, value)
            
            db_instance.updated_at = datetime.now()
            
            await db.commit()
            await db.refresh(db_instance)
            
            logger.info(f"成功更新实例: {instance_id}")
            return self._db_to_model(db_instance)
            
        except ValueError as e:
            await db.rollback()
            logger.warning(f"更新实例失败: {e}")
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"更新实例 {instance_id} 失败: {e}")
            raise
    
    async def delete_instance(self, db: AsyncSession, instance_id: str) -> bool:
        """删除实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            删除是否成功
            
        Raises:
            ValueError: 当实例正在运行时不允许删除
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return False
            
            if db_instance.status == InstanceStatus.RUNNING.value:
                raise ValueError("无法删除正在运行的实例，请先停止实例")
            
            await db.delete(db_instance)
            await db.commit()
            
            logger.info(f"成功删除实例: {instance_id} ({db_instance.name})")
            return True
            
        except ValueError as e:
            await db.rollback()
            logger.warning(f"删除实例失败: {e}")
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"删除实例 {instance_id} 失败: {e}")
            raise
    
    async def get_instance_status(
        self, db: AsyncSession, instance_id: str
    ) -> Optional[InstanceStatusResponse]:
        """获取实例运行状态
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            实例状态信息，不存在则返回 None
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                return None
            
            # TODO: 实现进程状态检查
            return InstanceStatusResponse(
                id=instance_id,
                status=InstanceStatus(db_instance.status),
                pid=None,
                uptime=None,
            )
        except Exception as e:
            logger.error(f"获取实例状态失败 {instance_id}: {e}")
            raise
    
    async def start_instance(self, db: AsyncSession, instance_id: str) -> bool:
        """启动机器人实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            启动是否成功
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return False
            
            if db_instance.status == InstanceStatus.RUNNING.value:
                logger.info(f"实例 {instance_id} 已经在运行中")
                return True
            
            db_instance.status = InstanceStatus.STARTING.value
            await db.commit()
            
            # TODO: 实现机器人进程启动逻辑
            db_instance.status = InstanceStatus.RUNNING.value
            db_instance.last_run = datetime.now()
            await db.commit()
            
            logger.info(f"成功启动实例: {instance_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"启动实例 {instance_id} 失败: {e}")
            raise
    
    async def stop_instance(self, db: AsyncSession, instance_id: str) -> bool:
        """停止机器人实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            停止是否成功
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return False
            
            if db_instance.status == InstanceStatus.STOPPED.value:
                logger.info(f"实例 {instance_id} 已经停止")
                return True
            
            db_instance.status = InstanceStatus.STOPPING.value
            await db.commit()
            
            # TODO: 实现机器人进程停止逻辑
            db_instance.status = InstanceStatus.STOPPED.value
            await db.commit()
            
            logger.info(f"成功停止实例: {instance_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"停止实例 {instance_id} 失败: {e}")
            raise


# 依赖注入函数
def get_instance_service() -> InstanceService:
    """获取实例服务的依赖注入"""
    return InstanceService()

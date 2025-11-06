"""
部署服务
处理部署任务相关的业务逻辑
"""
from typing import List, Optional
from datetime import datetime
import uuid
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (
    Deployment,
    DeploymentCreate,
    DeploymentStatus,
    DeploymentLog,
)
from ..models.db_models import DeploymentDB, DeploymentLogDB
from ..core import settings
from ..core.logger import logger


class DeploymentService:
    """部署服务类"""
    
    def __init__(self):
        """初始化部署服务"""
        self.instances_dir = Path(settings.INSTANCES_DIR)
        logger.info("部署服务已初始化")
    
    def _generate_deployment_id(self) -> str:
        """生成唯一的部署任务 ID"""
        return f"deploy_{uuid.uuid4().hex[:12]}"
    
    def _db_to_model(self, db_deployment: DeploymentDB) -> Deployment:
        """将数据库模型转换为 Pydantic 模型"""
        return Deployment(
            id=db_deployment.id,
            instance_id=db_deployment.instance_id,
            deployment_type=db_deployment.deployment_type,
            description=db_deployment.description,
            status=DeploymentStatus(db_deployment.status),
            progress=db_deployment.progress,
            created_at=db_deployment.created_at,
            started_at=db_deployment.started_at,
            completed_at=db_deployment.completed_at,
            error_message=db_deployment.error_message,
            deployed_files=[],
        )
    
    async def _add_log(
        self, db: AsyncSession, deployment_id: str, level: str, message: str
    ) -> None:
        """添加部署日志"""
        try:
            log = DeploymentLogDB(
                deployment_id=deployment_id,
                timestamp=datetime.now(),
                level=level,
                message=message,
            )
            db.add(log)
            await db.commit()
            logger.info(f"[{deployment_id}] {level}: {message}")
        except Exception as e:
            logger.error(f"添加部署日志失败: {e}")
    
    async def get_all_deployments(
        self,
        db: AsyncSession,
        status: Optional[DeploymentStatus] = None,
        instance_id: Optional[str] = None,
    ) -> List[Deployment]:
        """获取所有部署任务列表"""
        try:
            query = select(DeploymentDB)
            
            if status:
                query = query.where(DeploymentDB.status == status.value)
            
            if instance_id:
                query = query.where(DeploymentDB.instance_id == instance_id)
            
            result = await db.execute(query)
            db_deployments = result.scalars().all()
            
            logger.info(f"查询到 {len(db_deployments)} 个部署任务")
            return [self._db_to_model(dep) for dep in db_deployments]
            
        except Exception as e:
            logger.error(f"获取部署列表失败: {e}")
            raise
    
    async def get_deployment(
        self, db: AsyncSession, deployment_id: str
    ) -> Optional[Deployment]:
        """获取指定部署任务"""
        try:
            result = await db.execute(
                select(DeploymentDB).where(DeploymentDB.id == deployment_id)
            )
            db_deployment = result.scalar_one_or_none()
            
            if db_deployment:
                return self._db_to_model(db_deployment)
            return None
            
        except Exception as e:
            logger.error(f"获取部署任务 {deployment_id} 失败: {e}")
            raise
    
    async def create_deployment(
        self, db: AsyncSession, deployment_data: DeploymentCreate
    ) -> Deployment:
        """创建部署任务"""
        try:
            deployment_id = self._generate_deployment_id()
            now = datetime.now()
            
            db_deployment = DeploymentDB(
                id=deployment_id,
                instance_id=deployment_data.instance_id,
                deployment_type=deployment_data.deployment_type.value,
                description=deployment_data.description,
                status=DeploymentStatus.PENDING.value,
                progress=0,
                created_at=now,
            )
            
            db.add(db_deployment)
            await db.commit()
            await db.refresh(db_deployment)
            
            await self._add_log(db, deployment_id, "INFO", "部署任务已创建")
            logger.info(f"成功创建部署任务: {deployment_id}")
            
            return self._db_to_model(db_deployment)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"创建部署任务失败: {e}")
            raise
    
    async def cancel_deployment(
        self, db: AsyncSession, deployment_id: str
    ) -> bool:
        """取消部署任务"""
        try:
            result = await db.execute(
                select(DeploymentDB).where(DeploymentDB.id == deployment_id)
            )
            db_deployment = result.scalar_one_or_none()
            
            if not db_deployment:
                logger.warning(f"部署任务 {deployment_id} 不存在")
                return False
            
            if db_deployment.status not in [
                DeploymentStatus.PENDING.value,
                DeploymentStatus.RUNNING.value,
            ]:
                logger.warning(f"部署任务 {deployment_id} 无法取消")
                return False
            
            db_deployment.status = DeploymentStatus.CANCELLED.value
            await db.commit()
            
            await self._add_log(db, deployment_id, "WARNING", "部署任务已取消")
            logger.info(f"成功取消部署任务: {deployment_id}")
            
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"取消部署任务 {deployment_id} 失败: {e}")
            raise
    
    async def retry_deployment(
        self, db: AsyncSession, deployment_id: str
    ) -> bool:
        """重试失败的部署任务"""
        try:
            result = await db.execute(
                select(DeploymentDB).where(DeploymentDB.id == deployment_id)
            )
            db_deployment = result.scalar_one_or_none()
            
            if not db_deployment:
                logger.warning(f"部署任务 {deployment_id} 不存在")
                return False
            
            if db_deployment.status != DeploymentStatus.FAILED.value:
                logger.warning(f"部署任务 {deployment_id} 无法重试")
                return False
            
            db_deployment.status = DeploymentStatus.PENDING.value
            db_deployment.progress = 0
            db_deployment.error_message = None
            await db.commit()
            
            await self._add_log(db, deployment_id, "INFO", "重试部署任务")
            logger.info(f"成功重试部署任务: {deployment_id}")
            
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"重试部署任务 {deployment_id} 失败: {e}")
            raise
    
    async def get_deployment_logs(
        self, db: AsyncSession, deployment_id: str
    ) -> List[DeploymentLog]:
        """获取部署日志"""
        try:
            result = await db.execute(
                select(DeploymentLogDB)
                .where(DeploymentLogDB.deployment_id == deployment_id)
                .order_by(DeploymentLogDB.timestamp)
            )
            db_logs = result.scalars().all()
            
            return [
                DeploymentLog(
                    timestamp=log.timestamp,
                    level=log.level,
                    message=log.message,
                )
                for log in db_logs
            ]
            
        except Exception as e:
            logger.error(f"获取部署日志失败: {e}")
            raise


def get_deployment_service() -> DeploymentService:
    """获取部署服务的依赖注入"""
    return DeploymentService()

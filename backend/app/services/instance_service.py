"""
实例服务
处理机器人实例相关的业务逻辑
"""
from typing import List, Optional, Dict
from datetime import datetime
import uuid
import asyncio
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
from .process_manager import get_process_manager
from .message_queue_service import get_message_queue_service


class InstanceService:
    """机器人实例服务类 - 遵循单一职责原则"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """初始化实例服务"""
        # 避免重复初始化
        if self.__class__._initialized:
            return
            
        # 使用配置中的方法获取正确的实例目录（数据目录）
        self.instances_dir = settings.ensure_instances_dir()
        logger.info(f"实例服务已初始化，实例目录: {self.instances_dir}")
        self.__class__._initialized = True
    
    def _generate_instance_id(self) -> str:
        """生成唯一的实例 ID"""
        return f"inst_{uuid.uuid4().hex[:12]}"
    
    async def _db_to_model(self, db_instance: InstanceDB) -> Instance:
        """将数据库模型转换为 Pydantic 模型"""
        # 获取资源使用情况
        cpu_usage = 0.0
        memory_usage = 0.0
        
        # 如果实例正在运行，获取所有组件的资源使用总和
        if db_instance.status == InstanceStatus.RUNNING.value:
            cpu_usage, memory_usage = await self._get_instance_resources(db_instance.id)
        
        return self._db_to_model_with_resources(db_instance, cpu_usage, memory_usage)
    
    async def _get_instance_resources(self, instance_id: str) -> tuple[float, float]:
        """异步获取实例所有组件的资源使用情况（CPU%, 内存MB）"""
        def _get_resources_sync():
            """同步获取资源，在线程中执行"""
            cpu_total = 0.0
            memory_total = 0.0
            process_manager = get_process_manager()
            
            for component in ["main", "napcat", "napcat-ada"]:
                session_id = f"{instance_id}_{component}"
                process_info = process_manager.processes.get(session_id)
                if process_info and process_info.is_alive():
                    # 获取进程及其所有子进程的资源
                    cpu, mem = process_info.get_resources_with_children()
                    cpu_total += cpu
                    memory_total += mem
            
            return cpu_total, memory_total
        
        # 在线程池中执行同步的 psutil 调用
        return await asyncio.to_thread(_get_resources_sync)
    
    def _db_to_model_with_resources(self, db_instance: InstanceDB, cpu_usage: float, memory_usage: float) -> Instance:
        """将数据库模型转换为 Pydantic 模型（带资源使用情况）"""
        return Instance(
            id=db_instance.id,
            name=db_instance.name,
            instance_path=db_instance.instance_path,
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
            cpu_usage=round(cpu_usage, 1),
            memory_usage=round(memory_usage, 1),
            qq_account=db_instance.qq_account,
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
            
            # 使用 asyncio.gather 并发获取所有实例的资源信息
            instances = await asyncio.gather(*[self._db_to_model(inst) for inst in db_instances])
            return list(instances)
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
                return await self._db_to_model(db_instance)
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
            
            # 使用实例名称作为目录名
            instance_path = self.instances_dir / instance_data.name
            instance_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"创建实例目录: {instance_path}")
            
            db_instance = InstanceDB(
                id=instance_id,
                name=instance_data.name,
                instance_path=instance_data.name,  # 保存相对路径
                bot_type=instance_data.bot_type,
                bot_version=instance_data.bot_version,
                description=instance_data.description,
                status=InstanceStatus.STOPPED.value,
                python_path=instance_data.python_path,
                config_path=instance_data.config_path,
                created_at=now,
                updated_at=now,
                run_time=0,
                qq_account=instance_data.qq_account,
            )
            
            db.add(db_instance)
            await db.commit()
            await db.refresh(db_instance)
            
            logger.info(f"成功创建实例: {instance_id} ({instance_data.name})")
            return await self._db_to_model(db_instance)
            
        except ValueError as e:
            await db.rollback()
            logger.warning(f"创建实例失败: {e}")
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"创建实例失败: {e}")
            raise
    
    async def create_instance_from_path(
        self, 
        db: AsyncSession, 
        instance_data: InstanceCreate,
        instance_path: Path,
    ) -> Instance:
        """从已存在的路径创建实例记录（用于下载任务完成后）
        
        Args:
            db: 数据库会话
            instance_data: 实例创建数据
            instance_path: 已存在的实例路径
            
        Returns:
            创建的实例对象
            
        Raises:
            ValueError: 当实例名称已存在或路径无效时
        """
        try:
            # 检查实例名称是否已存在
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.name == instance_data.name)
            )
            if result.scalar_one_or_none():
                raise ValueError(f"实例名称 '{instance_data.name}' 已存在")
            
            # 验证路径存在
            if not instance_path.exists():
                raise ValueError(f"实例路径不存在: {instance_path}")
            
            # 生成实例 ID（使用目录名作为 hash 的一部分）
            instance_id = f"inst_{uuid.uuid4().hex[:12]}"
            now = datetime.now()
            
            logger.info(f"从路径创建实例记录: {instance_path} -> {instance_id}")
            
            db_instance = InstanceDB(
                id=instance_id,
                name=instance_data.name,
                instance_path=instance_path.name,  # 保存相对路径（目录名）
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
            
            logger.info(f"成功创建实例记录: {instance_id} ({instance_data.name})")
            return await self._db_to_model(db_instance)
            
        except ValueError as e:
            await db.rollback()
            logger.warning(f"创建实例记录失败: {e}")
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"创建实例记录失败: {e}")
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
            return await self._db_to_model(db_instance)
            
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
        process_manager = get_process_manager()
        
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                return None
            
            # 检查进程状态
            processes = process_manager.get_instance_processes(instance_id)
            
            # 获取主进程信息
            main_process = processes.get("main")
            pid = main_process.pid if main_process else None
            uptime = main_process.get_uptime() if main_process else None
            
            # 同步数据库状态与实际进程状态
            is_running = process_manager.is_instance_running(instance_id)
            current_db_status = InstanceStatus(db_instance.status)
            
            if is_running and current_db_status == InstanceStatus.STOPPED:
                # 进程在运行但数据库显示已停止,更新数据库
                db_instance.status = InstanceStatus.RUNNING.value
                await db.commit()
                logger.info(f"同步实例 {instance_id} 状态: STOPPED -> RUNNING")
            elif not is_running and current_db_status == InstanceStatus.RUNNING:
                # 进程已停止但数据库显示运行中,更新数据库
                db_instance.status = InstanceStatus.STOPPED.value
                await db.commit()
                logger.info(f"同步实例 {instance_id} 状态: RUNNING -> STOPPED")
            
            return InstanceStatusResponse(
                id=instance_id,
                status=InstanceStatus(db_instance.status),
                pid=pid,
                uptime=uptime,
            )
        except Exception as e:
            logger.error(f"获取实例状态失败 {instance_id}: {e}")
            raise
    
    async def start_instance(
        self,
        db: AsyncSession,
        instance_id: str,
        components: Optional[List[str]] = None,
    ) -> Dict[str, bool]:
        """启动机器人实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            components: 要启动的组件列表,None 表示启动所有组件
                       可选值: "main", "napcat", "napcat-ada"
            
        Returns:
            字典,键为组件名称,值为是否启动成功
        """
        process_manager = get_process_manager()
        results = {}
        db_instance = None
        
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return {"error": False}
            
            # 获取实例路径：优先使用 instance_path，否则使用 name
            instance_dir = db_instance.instance_path or db_instance.name
            instance_path = self.instances_dir / instance_dir
            if not instance_path.exists():
                logger.error(f"实例路径不存在: {instance_path}")
                return {"error": False}
            
            # 更新状态为启动中
            db_instance.status = InstanceStatus.STARTING.value
            await db.commit()
            
            # 确定要启动的组件
            if components is None:
                # 默认启动主程序和适配器
                components_to_start = ["main"]
                
                # 检查是否存在其他组件（使用实际的目录名）
                # NapCat: 检查启动脚本是否存在（跨平台支持）
                napcat_dir = instance_path / "NapCat"
                napcat_start_sh = napcat_dir / "start.sh"   # macOS
                napcat_launcher_user = napcat_dir / "launcher-user.bat"  # Windows (用户模式)
                napcat_launcher = napcat_dir / "launcher.bat"  # Windows
                if napcat_start_sh.exists() or napcat_launcher_user.exists() or napcat_launcher.exists():
                    components_to_start.append("napcat")
                # Adapter: 检查 MaiBot-Napcat-Adapter/main.py 是否存在
                if (instance_path / "MaiBot-Napcat-Adapter").exists():
                    components_to_start.append("napcat-ada")
            else:
                components_to_start = components
            
            logger.info(f"启动实例 {instance_id} 的组件: {components_to_start}")
            logger.info(f"实例QQ账号: {db_instance.qq_account}")
            
            # 启动各个组件
            for component in components_to_start:
                try:
                    success = await process_manager.start_process(
                        instance_id=instance_id,
                        instance_path=instance_path,
                        component=component,
                        python_path=db_instance.python_path,
                        qq_account=db_instance.qq_account,
                    )
                    results[component] = success
                    
                    if success:
                        logger.info(f"组件 {component} 启动成功")
                        # 等待一小段时间，确认进程没有立即退出
                        await asyncio.sleep(0.5)
                        process_info = process_manager.get_process_info(instance_id, component)
                        if process_info and not process_info.is_alive():
                            logger.error(f"组件 {component} 启动后立即退出")
                            results[component] = False
                    else:
                        logger.warning(f"组件 {component} 启动失败")
                        
                except FileNotFoundError as e:
                    logger.warning(f"组件 {component} 不存在: {e}")
                    results[component] = False
                except Exception as e:
                    logger.error(f"启动组件 {component} 时出错: {e}", exc_info=True)
                    results[component] = False
            
            # 检查是否有任何组件启动成功
            any_success = any(results.values())
            
            if any_success:
                db_instance.status = InstanceStatus.RUNNING.value
                db_instance.last_run = datetime.now()
                logger.info(f"实例 {instance_id} 启动成功")
                
                # 启动消息队列监听器 (延迟启动，等待 MaiBot WebUI 就绪)
                async def delayed_start_listener():
                    await asyncio.sleep(3)  # 等待 MaiBot WebUI 启动
                    mq_service = get_message_queue_service()
                    await mq_service.start_listener(
                        instance_id=instance_id,
                        instance_name=db_instance.name,
                        instance_path=instance_path,
                    )
                asyncio.create_task(delayed_start_listener())
            else:
                db_instance.status = InstanceStatus.ERROR.value
                logger.error(f"实例 {instance_id} 所有组件启动失败")
            
            await db.commit()
            return results
            
        except Exception as e:
            try:
                await db.rollback()
            except Exception:
                pass
            try:
                if db_instance:
                    db_instance.status = InstanceStatus.ERROR.value
                    await db.commit()
            except Exception:
                pass
            logger.error(f"启动实例 {instance_id} 失败: {e}", exc_info=True)
            raise

    async def get_available_components(
        self,
        db: AsyncSession,
        instance_id: str,
    ) -> List[str]:
        process_manager = get_process_manager()
        result = await db.execute(select(InstanceDB).where(InstanceDB.id == instance_id))
        db_instance = result.scalar_one_or_none()
        if not db_instance:
            return []
        instance_dir = db_instance.instance_path or db_instance.name
        instance_path = self.instances_dir / instance_dir
        if not instance_path.exists():
            return []
        components: List[str] = ["main"]
        # NapCat: 检查启动脚本是否存在（跨平台支持）
        napcat_dir = instance_path / "NapCat"
        napcat_start_sh = napcat_dir / "start.sh"   # macOS
        napcat_launcher_user = napcat_dir / "launcher-user.bat"  # Windows (用户模式)
        napcat_launcher = napcat_dir / "launcher.bat"  # Windows
        if napcat_start_sh.exists() or napcat_launcher_user.exists() or napcat_launcher.exists():
            components.append("napcat")
        if (instance_path / "MaiBot-Napcat-Adapter").exists():
            components.append("napcat-ada")
        return components
    
    async def stop_instance(
        self,
        db: AsyncSession,
        instance_id: str,
        force: bool = False,
    ) -> Dict[str, bool]:
        """停止机器人实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            force: 是否强制停止
            
        Returns:
            字典,键为组件名称,值为是否停止成功
        """
        process_manager = get_process_manager()
        
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return {"error": False}
            
            if db_instance.status == InstanceStatus.STOPPED.value:
                logger.info(f"实例 {instance_id} 已经停止")
                return {"already_stopped": True}
            
            # 更新状态为停止中
            db_instance.status = InstanceStatus.STOPPING.value
            await db.commit()
            
            # 停止所有进程，先尝试优雅停止
            logger.info(f"停止实例 {instance_id} 的所有进程 (force={force})")
            results = await process_manager.stop_all_instance_processes(instance_id, force=False)

            # 等待确认全部终止
            try:
                wait_start = datetime.now()
                while process_manager.is_instance_running(instance_id) and (datetime.now() - wait_start).total_seconds() < 3:
                    import asyncio
                    await asyncio.sleep(0.1)
            except Exception:
                pass

            # 如仍有进程存活，进行强制终止（优先处理 PTY 进程在 ProcessManager 层）
            if process_manager.is_instance_running(instance_id):
                logger.warning(f"实例 {instance_id} 仍有进程存活，执行强制终止")
                results_force = await process_manager.stop_all_instance_processes(instance_id, force=True)
                # 合并结果（强制终止覆盖优雅结果）
                results.update(results_force)
                try:
                    wait_start2 = datetime.now()
                    while process_manager.is_instance_running(instance_id) and (datetime.now() - wait_start2).total_seconds() < 3:
                        import asyncio
                        await asyncio.sleep(0.1)
                except Exception:
                    pass
            
            # 计算运行时间
            if db_instance.last_run:
                run_duration = int((datetime.now() - db_instance.last_run).total_seconds())
                db_instance.run_time += run_duration
                logger.info(f"实例 {instance_id} 本次运行时长: {run_duration}秒")
            
            # 根据最终状态更新
            if not process_manager.is_instance_running(instance_id):
                db_instance.status = InstanceStatus.STOPPED.value
                await db.commit()
                logger.info(f"成功停止实例: {instance_id}")
                
                # 停止消息队列监听器
                mq_service = get_message_queue_service()
                await mq_service.stop_listener(instance_id)
            else:
                db_instance.status = InstanceStatus.ERROR.value
                await db.commit()
                logger.error(f"停止实例 {instance_id} 后仍有残留进程，标记为 ERROR")
            return results
            
        except Exception as e:
            await db.rollback()
            logger.error(f"停止实例 {instance_id} 失败: {e}", exc_info=True)
            raise
    
    async def restart_instance(
        self,
        db: AsyncSession,
        instance_id: str,
    ) -> Dict[str, bool]:
        """重启机器人实例
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            字典,键为组件名称,值为是否重启成功
        """
        try:
            logger.info(f"重启实例: {instance_id}")
            
            # 先停止实例
            stop_results = await self.stop_instance(db, instance_id, force=False)
            logger.info(f"停止结果: {stop_results}")
            
            # 等待一小段时间（减少不必要的等待）
            import asyncio
            await asyncio.sleep(0.5)
            
            # 重新启动实例
            start_results = await self.start_instance(db, instance_id)
            logger.info(f"启动结果: {start_results}")
            
            return start_results
            
        except Exception as e:
            logger.error(f"重启实例 {instance_id} 失败: {e}", exc_info=True)
            raise
    
    async def start_component(
        self,
        db: AsyncSession,
        instance_id: str,
        component: str,
    ) -> bool:
        """启动实例的指定组件
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            component: 组件名称 (main, napcat, napcat-ada)
            
        Returns:
            是否启动成功
        """
        try:
            results = await self.start_instance(db, instance_id, components=[component])
            return results.get(component, False)
        except Exception as e:
            logger.error(f"启动组件 {instance_id}/{component} 失败: {e}", exc_info=True)
            raise
    
    async def stop_component(
        self,
        db: AsyncSession,
        instance_id: str,
        component: str,
    ) -> bool:
        """停止实例的指定组件
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            component: 组件名称 (main, napcat, napcat-ada)
            
        Returns:
            是否停止成功
        """
        process_manager = get_process_manager()
        
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return False
            
            # 停止指定组件并确认
            success = await process_manager.stop_process(instance_id, component, force=False)
            if success:
                try:
                    wait_start = datetime.now()
                    while process_manager.is_component_running(instance_id, component) and (datetime.now() - wait_start).total_seconds() < 3:
                        import asyncio
                        await asyncio.sleep(0.1)
                except Exception:
                    pass
                if process_manager.is_component_running(instance_id, component):
                    logger.warning(f"组件 {instance_id}/{component} 仍在运行，执行强制终止")
                    success = await process_manager.stop_process(instance_id, component, force=True)
            
            if success:
                logger.info(f"组件 {instance_id}/{component} 已停止")
            
            # 检查是否还有其他组件在运行
            is_running = process_manager.is_instance_running(instance_id)
            if not is_running and db_instance.status == InstanceStatus.RUNNING.value:
                db_instance.status = InstanceStatus.STOPPED.value
                await db.commit()
                logger.info(f"实例 {instance_id} 所有组件已停止,更新状态为 STOPPED")
            
            return success
            
        except Exception as e:
            logger.error(f"停止组件 {instance_id}/{component} 失败: {e}", exc_info=True)
            raise
    
    async def get_component_status(
        self,
        instance_id: str,
        component: str,
    ) -> Dict[str, any]:
        """获取组件状态
        
        Args:
            instance_id: 实例 ID
            component: 组件名称
            
        Returns:
            组件状态信息字典
        """
        process_manager = get_process_manager()
        process_info = process_manager.get_process_info(instance_id, component)
        
        if not process_info:
            return {
                "component": component,
                "running": False,
                "pid": None,
                "uptime": None,
            }
        
        return {
            "component": component,
            "running": process_info.is_alive(),
            "pid": process_info.pid,
            "uptime": process_info.get_uptime(),
        }
    
    async def get_napcat_accounts(
        self,
        db: AsyncSession,
        instance_id: str,
    ) -> Optional[List[Dict[str, str]]]:
        """获取 NapCat 已登录的 QQ 账号列表（包含昵称）
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            
        Returns:
            已登录的 QQ 账号列表，格式: [{"account": "123456", "nickname": "昵称"}, ...]
            如果实例不存在则返回 None
        """
        try:
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if not db_instance:
                logger.warning(f"实例 {instance_id} 不存在")
                return None
            
            # 获取实例路径
            instance_dir = db_instance.instance_path or db_instance.name
            instance_path = self.instances_dir / instance_dir
            if not instance_path.exists():
                logger.warning(f"实例路径不存在: {instance_path}")
                return []
            
            # 从 NapCat 目录获取已登录账号
            from .process.utils import get_napcat_logged_accounts
            accounts = get_napcat_logged_accounts(instance_path)
            return accounts
            
        except Exception as e:
            logger.error(f"获取 NapCat 账号列表失败 {instance_id}: {e}", exc_info=True)
            raise


# 依赖注入函数（单例）
def get_instance_service() -> InstanceService:
    return _global_instance_service

_global_instance_service = InstanceService()

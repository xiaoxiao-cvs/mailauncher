"""
下载管理服务
整合下载、安装、配置的完整流程
"""
import uuid
from typing import Dict, Optional
from pathlib import Path
from datetime import datetime
import asyncio
import platform

from ..core.logger import logger
from ..core.websocket import get_connection_manager
from ..core.terminal_stream import get_terminal_stream_manager
from ..core.database import get_db
from ..models.download import (
    DownloadTask,
    DownloadTaskCreate,
    DownloadStatus,
    DownloadItemType,
    DownloadProgress,
    MaibotVersionSource,
)
from ..models.instance import InstanceCreate, BotType
from .download_service import get_download_service
from .install_service import get_install_service
from .instance_service import get_instance_service


class DownloadManager:
    """下载管理器 - 管理所有下载任务"""

    def __init__(self):
        """初始化下载管理器"""
        self.tasks: Dict[str, DownloadTask] = {}
        self.download_service = get_download_service()
        self.install_service = get_install_service()
        self.ws_manager = get_connection_manager()
        self.terminal_stream = get_terminal_stream_manager()
        logger.info("下载管理器已初始化")

    def create_task(self, task_data: DownloadTaskCreate) -> DownloadTask:
        """
        创建下载任务

        Args:
            task_data: 任务创建数据

        Returns:
            下载任务
        """
        task_id = f"download_{uuid.uuid4().hex[:12]}"
        
        task = DownloadTask(
            id=task_id,
            instance_name=task_data.instance_name,
            deployment_path=task_data.deployment_path,
            maibot_version_source=task_data.maibot_version_source,
            maibot_version_value=task_data.maibot_version_value,
            selected_items=task_data.selected_items,
            venv_type=task_data.venv_type or "venv",  # 使用用户配置的虚拟环境类型
            python_path=task_data.python_path,  # 使用用户配置的 Python 路径
            status=DownloadStatus.PENDING,
            progress=DownloadProgress(
                current=0,
                total=100,
                message="任务已创建，等待开始",
                percentage=0.0,
            ),
            created_at=datetime.now(),
        )

        self.tasks[task_id] = task
        logger.info(f"创建下载任务: {task_id} - {task_data.instance_name} (venv: {task.venv_type}, python: {task.python_path or 'default'})")
        
        return task

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """获取任务"""
        return self.tasks.get(task_id)

    def get_all_tasks(self) -> Dict[str, DownloadTask]:
        """获取所有任务"""
        return self.tasks

    def _update_progress(
        self,
        task: DownloadTask,
        current: int,
        total: int,
        message: str,
    ) -> None:
        """更新任务进度"""
        task.progress.current = current
        task.progress.total = total
        task.progress.message = message
        task.progress.percentage = (current / total * 100) if total > 0 else 0
        task.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    async def _add_log(self, task: DownloadTask, message: str, level: str = "info") -> None:
        """添加日志并通过 WebSocket 推送"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        task.logs.append(log_message)
        logger.info(f"[{task.id}] {message}")
        
        # 通过 WebSocket 推送日志
        await self.ws_manager.send_log(task.id, level, message)

    async def execute_task(self, task_id: str) -> bool:
        """
        执行下载任务

        Args:
            task_id: 任务ID

        Returns:
            是否成功
        """
        task = self.get_task(task_id)
        if not task:
            logger.error(f"任务不存在: {task_id}")
            return False

        # 立即发送初始状态（不等待 WebSocket 连接）
        task.status = DownloadStatus.PENDING
        self._update_progress(task, 0, 100, "准备开始安装...")
        logger.info(f"[{task_id}] 任务准备开始")
        
        # 尝试发送初始进度（如果 WebSocket 已连接）
        try:
            await self.ws_manager.send_progress(task_id, 0, 100, "准备开始安装...", "pending")
        except Exception as e:
            logger.warning(f"[{task_id}] 发送初始进度失败（WebSocket 可能未连接）: {e}")

        # 等待 WebSocket 连接建立（缩短等待时间为 5 秒）
        await self._add_log(task, "等待客户端连接...")
        
        # 等待最多 5 秒，直到有 WebSocket 连接
        wait_start = datetime.now()
        while not self.ws_manager.has_connections(task_id):
            await asyncio.sleep(0.2)  # 减少等待间隔
            if (datetime.now() - wait_start).seconds > 5:  # 缩短超时时间
                # 即使没有 WebSocket 连接也继续执行（日志会保存在任务中）
                logger.warning(f"[{task_id}] WebSocket 连接超时，继续执行任务")
                await self._add_log(task, "WebSocket 连接超时，继续执行（日志将保存在任务中）", "warning")
                break
        
        if self.ws_manager.has_connections(task_id):
            await self._add_log(task, "客户端已连接，开始安装...", "success")
        else:
            await self._add_log(task, "继续执行任务...", "info")

        try:
            # 创建终端输出回调 - 实时推送到前端  必须先创建，后面才能使用
            progress_callback = self.terminal_stream.create_callback(task_id)
            
            # 更新状态为下载中
            task.status = DownloadStatus.DOWNLOADING
            task.started_at = datetime.now()
            self._update_progress(task, 0, 100, "开始下载...")
            await self.ws_manager.send_progress(task_id, 0, 100, "开始下载...", "downloading")

            # 创建实例目录
            instance_dir = Path(task.deployment_path) / task.instance_name
            instance_dir.mkdir(parents=True, exist_ok=True)
            await self._add_log(task, f"创建实例目录: {instance_dir}")
            
            # 在实例根目录创建共享虚拟环境
            python_info = f" using {task.python_path}" if task.python_path else ""
            await self._add_log(task, f"创建共享虚拟环境 (使用 {task.venv_type}{python_info})...", "info")
            venv_success = await self.install_service.create_virtual_environment(
                instance_dir,
                task.venv_type,
                progress_callback,  # 传递回调，实时输出创建虚拟环境的过程
                task.python_path,  # 使用用户选择的 Python 版本
            )
            
            if venv_success:
                await self._add_log(task, "虚拟环境创建成功", "success")
                
                # 在虚拟环境内升级 pip、setuptools、wheel
                await self._add_log(task, "升级 pip、setuptools、wheel...", "info")
                upgrade_success = await self.install_service.upgrade_venv_pip(
                    instance_dir,
                    task.venv_type,
                    progress_callback,  # 传递回调，实时输出 ⭐
                )
                if upgrade_success:
                    await self._add_log(task, "pip 升级成功", "success")
                else:
                    await self._add_log(task, "pip 升级失败，继续安装", "warning")
            else:
                await self._add_log(task, "虚拟环境创建失败", "error")
                raise Exception("虚拟环境创建失败")

            # 计算总步骤数
            total_steps = len(task.selected_items)
            if DownloadItemType.MAIBOT in task.selected_items:
                total_steps += 2  # Maibot 需要额外的安装和配置步骤
            if DownloadItemType.NAPCAT_ADAPTER in task.selected_items:
                total_steps += 2  # Adapter 需要额外的安装和配置步骤
            if DownloadItemType.LPMM in task.selected_items:
                total_steps += 2  # LPMM 需要额外的安装和编译步骤

            current_step = 0

            # 步骤 1: 下载 LPMM (macOS 需要先编译 quick_algo)
            if DownloadItemType.LPMM in task.selected_items:
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "下载 LPMM...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "下载 LPMM...", "downloading"
                )
                
                success = await self.download_service.download_lpmm(
                    instance_dir,
                    progress_callback,
                )
                
                if not success:
                    raise Exception("LPMM 下载失败")

                # 创建虚拟环境并安装依赖
                task.status = DownloadStatus.INSTALLING
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "创建虚拟环境并安装 LPMM 依赖...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "创建虚拟环境并安装 LPMM 依赖...", "installing"
                )
                
                lpmm_dir = instance_dir / "MaiMBot-LPMM"
                
                # 使用共享虚拟环境安装依赖
                success = await self.install_service.install_dependencies(
                    lpmm_dir,
                    task.venv_type,
                    progress_callback,
                    venv_dir=instance_dir,  # 使用实例根目录的虚拟环境
                )
                
                if not success:
                    await self._add_log(task, "警告: LPMM 依赖安装失败", "warning")

                # 编译 quick_algo
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "编译 quick_algo (这可能需要几分钟)...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "编译 quick_algo...", "installing"
                )
                
                success = await self.install_service.compile_quick_algo(
                    lpmm_dir,
                    task.venv_type,
                    progress_callback,
                    venv_dir=instance_dir,  # 使用实例根目录的虚拟环境
                )
                
                if not success:
                    await self._add_log(task, "警告: quick_algo 编译失败，请手动编译", "warning")

            # 步骤 2: 下载 MaiBot
            if DownloadItemType.MAIBOT in task.selected_items:
                # 在 macOS 上检查编译工具
                if platform.system() == "Darwin":
                    build_tools_ok, build_error = await self.install_service.check_build_tools()
                    if not build_tools_ok:
                        await self._add_log(task, f"[警告] {build_error}", "warning")
                        await self._add_log(task, "MaiBot 依赖可能无法正常安装", "warning")
                
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "下载 MaiBot...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "下载 MaiBot...", "downloading"
                )
                
                success = await self.download_service.download_maibot(
                    instance_dir,
                    task.maibot_version_source,
                    task.maibot_version_value,
                    progress_callback,
                )
                
                if not success:
                    raise Exception("MaiBot 下载失败")

                # 安装依赖
                task.status = DownloadStatus.INSTALLING
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "安装 MaiBot 依赖...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "安装 MaiBot 依赖...", "installing"
                )
                
                maibot_dir = instance_dir / "MaiBot"
                
                # 使用共享虚拟环境安装依赖
                success = await self.install_service.install_dependencies(
                    maibot_dir,
                    task.venv_type,
                    progress_callback,
                    venv_dir=instance_dir,  # 使用实例根目录的虚拟环境
                )
                
                if not success:
                    error_msg = "MaiBot 依赖安装失败"
                    if platform.system() == "Darwin":
                        error_msg += "\n可能缺少 Xcode Command Line Tools"
                        error_msg += "\n请运行: xcode-select --install"
                    await self._add_log(task, error_msg, "error")
                    await self._add_log(task, "您可以稍后手动安装依赖: cd MaiBot && .venv/bin/pip install -r requirements.txt", "info")

                # 配置
                task.status = DownloadStatus.CONFIGURING
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "配置 MaiBot...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "配置 MaiBot...", "configuring"
                )
                
                await self.install_service.setup_maibot_config(
                    maibot_dir,
                    progress_callback,
                )

            # 步骤 3: 下载 Napcat Adapter
            if DownloadItemType.NAPCAT_ADAPTER in task.selected_items:
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "下载 Napcat Adapter...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "下载 Napcat Adapter...", "downloading"
                )
                
                success = await self.download_service.download_adapter(
                    instance_dir,
                    progress_callback,
                )
                
                if not success:
                    raise Exception("Napcat Adapter 下载失败")

                # 安装依赖
                task.status = DownloadStatus.INSTALLING
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "安装 Adapter 依赖...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "安装 Adapter 依赖...", "installing"
                )
                
                adapter_dir = instance_dir / "MaiBot-Napcat-Adapter"
                
                # 使用共享虚拟环境安装依赖
                success = await self.install_service.install_dependencies(
                    adapter_dir,
                    task.venv_type,
                    progress_callback,
                    venv_dir=instance_dir,  # 使用实例根目录的虚拟环境
                )
                
                if not success:
                    await self._add_log(task, "警告: Adapter 依赖安装失败，请手动安装", "warning")

                # 配置
                task.status = DownloadStatus.CONFIGURING
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "配置 Adapter...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "配置 Adapter...", "configuring"
                )
                
                await self.install_service.setup_adapter_config(
                    adapter_dir,
                    progress_callback,
                )

            # 步骤 4: 下载 Napcat
            if DownloadItemType.NAPCAT in task.selected_items:
                current_step += 1
                self._update_progress(
                    task,
                    current_step,
                    total_steps,
                    "准备 Napcat...",
                )
                await self.ws_manager.send_progress(
                    task_id, current_step, total_steps, "准备 Napcat...", "configuring"
                )
                
                await self.download_service.download_napcat(
                    instance_dir,
                    progress_callback,
                )

            # 完成安装，创建实例记录
            await self._add_log(task, "正在创建实例记录...", "info")
            
            # 获取数据库会话
            async for db in get_db():
                try:
                    instance_service = get_instance_service()
                    
                    # 确定 bot_type
                    bot_type = BotType.MAIBOT if DownloadItemType.MAIBOT in task.selected_items else BotType.OTHER
                    
                    # 确定 bot_version
                    bot_version = None
                    if DownloadItemType.MAIBOT in task.selected_items:
                        if task.maibot_version_source == MaibotVersionSource.TAG:
                            bot_version = task.maibot_version_value
                        elif task.maibot_version_source == MaibotVersionSource.BRANCH:
                            bot_version = f"branch:{task.maibot_version_value}"
                        else:
                            bot_version = "latest"
                    
                    # 创建实例记录（使用已存在的路径）
                    instance_data = InstanceCreate(
                        name=task.instance_name,
                        bot_type=bot_type,
                        bot_version=bot_version,
                        description=None,  # 不再自动生成描述，让用户自行填写
                        python_path=None,  # 使用共享虚拟环境
                        config_path=str(instance_dir / "MaiBot" / "config.json") if DownloadItemType.MAIBOT in task.selected_items else None,
                    )
                    
                    created_instance = await instance_service.create_instance_from_path(
                        db, 
                        instance_data,
                        instance_dir
                    )
                    
                    # 更新任务的实例ID
                    task.instance_id = created_instance.id
                    
                    await self._add_log(task, f"实例记录已创建: {created_instance.id}", "success")
                    logger.info(f"任务 {task_id} 创建实例记录: {created_instance.id}")
                    
                except Exception as e:
                    await self._add_log(task, f"创建实例记录失败: {str(e)}", "warning")
                    logger.error(f"创建实例记录失败: {e}", exc_info=True)
                
                break  # 只使用第一个数据库会话
            
            # 完成
            task.status = DownloadStatus.COMPLETED
            task.completed_at = datetime.now()
            self._update_progress(
                task,
                total_steps,
                total_steps,
                "安装完成！",
            )
            
            await self._add_log(task, f"所有组件已成功安装到: {instance_dir}", "success")
            await self.ws_manager.send_complete(task_id, "安装完成")
            logger.info(f"任务 {task_id} 完成")
            
            return True

        except Exception as e:
            error_msg = f"任务执行失败: {str(e)}"
            task.status = DownloadStatus.FAILED
            task.error_message = error_msg
            task.completed_at = datetime.now()
            await self._add_log(task, error_msg, "error")
            await self.ws_manager.send_error(task_id, error_msg)
            logger.error(f"任务 {task_id} 失败: {e}")
            return False

    async def start_task(self, task_id: str) -> None:
        """
        启动任务 (异步执行)

        Args:
            task_id: 任务ID
        """
        # 立即发送任务开始消息（即使 WebSocket 未连接也记录日志）
        task = self.get_task(task_id)
        if task:
            logger.info(f"[{task_id}] 任务已加入执行队列")
            task.status = DownloadStatus.PENDING
            self._update_progress(task, 0, 100, "任务已加入队列，准备开始...")
        
        # 在后台执行任务
        asyncio.create_task(self.execute_task(task_id))


# 全局单例
_download_manager: Optional[DownloadManager] = None


def get_download_manager() -> DownloadManager:
    """获取下载管理器单例"""
    global _download_manager
    if _download_manager is None:
        _download_manager = DownloadManager()
    return _download_manager

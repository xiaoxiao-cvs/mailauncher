"""
进程管理器
负责管理 MaiBot 实例的进程生命周期
支持 Windows(winpty) 和 Unix 系统
"""
import asyncio
import os
import sys
import platform
import signal
from typing import Dict, Optional, Tuple
from pathlib import Path
from datetime import datetime

from ..core.logger import logger

# 尝试导入 winpty (Windows)
try:
    from winpty import PtyProcess
    HAS_WINPTY = True
except ImportError:
    HAS_WINPTY = False
    logger.warning("winpty 未安装,Windows 上的 PTY 功能将不可用")

# 尝试导入 pty (Unix)
try:
    import pty
    import fcntl
    HAS_PTY = True
except ImportError:
    HAS_PTY = False
    logger.warning("pty 模块不可用,Unix PTY 功能将不可用")


class ProcessInfo:
    """进程信息类"""
    
    def __init__(
        self,
        instance_id: str,
        component: str,  # main, napcat, napcat-ada
        process: Optional[any] = None,
        pid: Optional[int] = None,
        start_time: Optional[datetime] = None,
    ):
        self.instance_id = instance_id
        self.component = component
        self.process = process
        self.pid = pid
        self.start_time = start_time or datetime.now()
        self.session_id = f"{instance_id}_{component}"
    
    def is_alive(self) -> bool:
        """检查进程是否存活"""
        if self.process:
            if hasattr(self.process, 'isalive'):
                return self.process.isalive()
            elif hasattr(self.process, 'poll'):
                return self.process.poll() is None
        return False
    
    def get_uptime(self) -> int:
        """获取运行时间（秒）"""
        if self.start_time:
            return int((datetime.now() - self.start_time).total_seconds())
        return 0


class ProcessManager:
    """进程管理器 - 管理所有实例的进程"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 避免重复初始化
        if self.__class__._initialized:
            return
            
        self.processes: Dict[str, ProcessInfo] = {}  # session_id -> ProcessInfo
        self.is_windows = platform.system() == "Windows"
        self.pty_rows = int(os.environ.get("PTY_ROWS", 24))
        self.pty_cols = int(os.environ.get("PTY_COLS", 80))
        logger.info(f"进程管理器初始化 - 平台: {platform.system()}")
        self.__class__._initialized = True
    
    def _get_session_id(self, instance_id: str, component: str) -> str:
        """生成会话 ID"""
        return f"{instance_id}_{component}"
    
    def _get_command_and_cwd(
        self,
        instance_path: Path,
        component: str,
        python_path: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        根据组件类型获取启动命令和工作目录
        
        Args:
            instance_path: 实例路径
            component: 组件类型 (main, napcat, napcat-ada)
            python_path: Python 可执行文件路径
            
        Returns:
            (command, cwd) 元组
        """
        # 确定 Python 命令
        python_cmd = python_path if python_path else sys.executable
        
        if component == "main":
            # MaiBot 主程序
            cwd = str(instance_path)
            bot_script = instance_path / "bot.py"
            if not bot_script.exists():
                raise FileNotFoundError(f"MaiBot 启动脚本不存在: {bot_script}")
            command = f"{python_cmd} bot.py"
            
        elif component == "napcat":
            # NapCat 服务
            cwd = str(instance_path / "napcat")
            napcat_script = Path(cwd) / "napcat.py"
            if not napcat_script.exists():
                raise FileNotFoundError(f"NapCat 启动脚本不存在: {napcat_script}")
            command = f"{python_cmd} napcat.py"
            
        elif component == "napcat-ada":
            # NapCat 适配器
            cwd = str(instance_path / "napcat-ada")
            ada_script = Path(cwd) / "main.py"
            if not ada_script.exists():
                raise FileNotFoundError(f"NapCat-ada 启动脚本不存在: {ada_script}")
            command = f"{python_cmd} main.py"
            
        else:
            raise ValueError(f"不支持的组件类型: {component}")
        
        return command, cwd
    
    async def start_process_windows(
        self,
        instance_id: str,
        component: str,
        command: str,
        cwd: str,
    ) -> bool:
        """
        在 Windows 上启动进程 (使用 winpty)
        
        Args:
            instance_id: 实例 ID
            component: 组件类型
            command: 启动命令
            cwd: 工作目录
            
        Returns:
            是否启动成功
        """
        if not HAS_WINPTY:
            logger.error("Windows 上需要安装 winpty: pip install pywinpty")
            return False
        
        session_id = self._get_session_id(instance_id, component)
        
        # 检查是否已经在运行
        if session_id in self.processes and self.processes[session_id].is_alive():
            logger.info(f"进程已在运行: {session_id}")
            return True
        
        try:
            logger.info(f"启动 Windows 进程: {session_id}, 命令: {command}, 工作目录: {cwd}")
            
            # 尝试直接启动
            try:
                pty_process = PtyProcess.spawn(
                    command,
                    dimensions=(self.pty_rows, self.pty_cols),
                    cwd=cwd,
                )
            except Exception as spawn_error:
                logger.warning(f"直接启动失败,尝试使用 cmd.exe: {spawn_error}")
                # 使用 cmd.exe 作为包装器
                cmd_wrapper = f'cmd.exe /c "{command}"'
                pty_process = PtyProcess.spawn(
                    cmd_wrapper,
                    dimensions=(self.pty_rows, self.pty_cols),
                    cwd=cwd,
                )
            
            process_info = ProcessInfo(
                instance_id=instance_id,
                component=component,
                process=pty_process,
                pid=pty_process.pid,
                start_time=datetime.now(),
            )
            
            self.processes[session_id] = process_info
            logger.info(f"Windows 进程启动成功: {session_id}, PID: {pty_process.pid}")
            return True
            
        except Exception as e:
            logger.error(f"启动 Windows 进程失败 {session_id}: {e}", exc_info=True)
            return False
    
    async def start_process_unix(
        self,
        instance_id: str,
        component: str,
        command: str,
        cwd: str,
    ) -> bool:
        """
        在 Unix 系统上启动进程（使用 PTY）
        
        Args:
            instance_id: 实例 ID
            component: 组件类型
            command: 启动命令
            cwd: 工作目录
            
        Returns:
            是否启动成功
        """
        session_id = self._get_session_id(instance_id, component)
        
        # 检查是否已经在运行
        if session_id in self.processes and self.processes[session_id].is_alive():
            logger.info(f"进程已在运行: {session_id}")
            return True
        
        try:
            logger.info(f"启动 Unix 进程: {session_id}, 命令: {command}, 工作目录: {cwd}")
            
            if HAS_PTY:
                # 使用 PTY 启动进程（更好的终端支持）
                import subprocess
                import shlex
                
                # 创建 PTY
                master, slave = pty.openpty()
                
                # 启动进程
                process = subprocess.Popen(
                    shlex.split(command),
                    cwd=cwd,
                    stdin=slave,
                    stdout=slave,
                    stderr=slave,
                    close_fds=True,
                    preexec_fn=os.setsid,
                )
                
                # 关闭子进程端的 fd
                os.close(slave)
                
                # 设置主端为非阻塞
                fcntl.fcntl(master, fcntl.F_SETFL, os.O_NONBLOCK)
                
                # 包装进程对象添加必要的属性
                process.master_fd = master
                process.is_pty = True
                
                process_info = ProcessInfo(
                    instance_id=instance_id,
                    component=component,
                    process=process,
                    pid=process.pid,
                    start_time=datetime.now(),
                )
                
                self.processes[session_id] = process_info
                logger.info(f"Unix PTY 进程启动成功: {session_id}, PID: {process.pid}")
                return True
            else:
                # 回退到普通 subprocess
                process = await asyncio.create_subprocess_shell(
                    command,
                    cwd=cwd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,  # 合并 stderr 到 stdout
                    stdin=asyncio.subprocess.PIPE,
                )
                
                process_info = ProcessInfo(
                    instance_id=instance_id,
                    component=component,
                    process=process,
                    pid=process.pid,
                    start_time=datetime.now(),
                )
                
                self.processes[session_id] = process_info
                logger.info(f"Unix 进程启动成功: {session_id}, PID: {process.pid}")
                return True
            
        except Exception as e:
            logger.error(f"启动 Unix 进程失败 {session_id}: {e}", exc_info=True)
            return False
    
    async def start_process(
        self,
        instance_id: str,
        instance_path: Path,
        component: str,
        python_path: Optional[str] = None,
    ) -> bool:
        """
        启动进程
        
        Args:
            instance_id: 实例 ID
            instance_path: 实例路径
            component: 组件类型 (main, napcat, napcat-ada)
            python_path: Python 可执行文件路径
            
        Returns:
            是否启动成功
        """
        try:
            command, cwd = self._get_command_and_cwd(instance_path, component, python_path)
            
            if self.is_windows:
                return await self.start_process_windows(instance_id, component, command, cwd)
            else:
                return await self.start_process_unix(instance_id, component, command, cwd)
                
        except Exception as e:
            logger.error(f"启动进程失败 {instance_id}/{component}: {e}", exc_info=True)
            return False
    
    async def stop_process(
        self,
        instance_id: str,
        component: str,
        force: bool = False,
    ) -> bool:
        """
        停止进程
        
        Args:
            instance_id: 实例 ID
            component: 组件类型
            force: 是否强制终止
            
        Returns:
            是否停止成功
        """
        session_id = self._get_session_id(instance_id, component)
        
        if session_id not in self.processes:
            logger.info(f"进程不存在: {session_id}")
            return True
        
        process_info = self.processes[session_id]
        
        if not process_info.is_alive():
            logger.info(f"进程已经停止: {session_id}")
            del self.processes[session_id]
            return True
        
        try:
            logger.info(f"停止进程: {session_id}, 强制: {force}")
            
            process = process_info.process
            
            # Unix PTY 进程
            if hasattr(process, 'master_fd') and hasattr(process, 'is_pty'):
                if force:
                    process.kill()
                else:
                    process.terminate()
                process.wait(timeout=5)
                # 关闭 master fd
                try:
                    os.close(process.master_fd)
                except:
                    pass
            # Windows winpty
            elif hasattr(process, 'terminate'):
                process.terminate(force=force)
            # asyncio subprocess
            elif hasattr(process, 'kill'):
                if force:
                    process.kill()
                else:
                    process.terminate()
                await process.wait()
            
            # 等待一小段时间确认进程已停止
            await asyncio.sleep(0.5)
            
            if session_id in self.processes:
                del self.processes[session_id]
            
            logger.info(f"进程停止成功: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"停止进程失败 {session_id}: {e}", exc_info=True)
            return False
    
    async def stop_all_instance_processes(self, instance_id: str) -> Dict[str, bool]:
        """
        停止实例的所有进程
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            字典,键为组件名称,值为是否停止成功
        """
        results = {}
        
        # 查找该实例的所有进程
        components = []
        for session_id, process_info in list(self.processes.items()):
            if process_info.instance_id == instance_id:
                components.append(process_info.component)
        
        logger.info(f"停止实例 {instance_id} 的所有进程: {components}")
        
        # 停止所有进程
        for component in components:
            success = await self.stop_process(instance_id, component, force=False)
            results[component] = success
        
        return results
    
    def get_process_info(
        self,
        instance_id: str,
        component: str,
    ) -> Optional[ProcessInfo]:
        """获取进程信息"""
        session_id = self._get_session_id(instance_id, component)
        return self.processes.get(session_id)
    
    def get_instance_processes(self, instance_id: str) -> Dict[str, ProcessInfo]:
        """获取实例的所有进程信息"""
        result = {}
        for session_id, process_info in self.processes.items():
            if process_info.instance_id == instance_id:
                result[process_info.component] = process_info
        return result
    
    def is_component_running(self, instance_id: str, component: str) -> bool:
        """检查组件是否在运行"""
        process_info = self.get_process_info(instance_id, component)
        if process_info:
            return process_info.is_alive()
        return False
    
    def is_instance_running(self, instance_id: str) -> bool:
        """检查实例是否有任何组件在运行"""
        processes = self.get_instance_processes(instance_id)
        return any(p.is_alive() for p in processes.values())
    
    async def cleanup(self):
        """清理所有进程"""
        logger.info("清理所有进程...")
        for session_id in list(self.processes.keys()):
            process_info = self.processes[session_id]
            await self.stop_process(
                process_info.instance_id,
                process_info.component,
                force=True,
            )
        logger.info("进程清理完成")


# 全局进程管理器实例（单例）
def get_process_manager() -> ProcessManager:
    """获取全局进程管理器实例（单例）"""
    return ProcessManager()

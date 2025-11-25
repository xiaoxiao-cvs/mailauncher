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
import asyncio
from pathlib import Path
from datetime import datetime

from ..core.logger import logger
from ..core.environment import decode_console_output
from .process.windows import start_process_windows
from .process.unix import start_process_unix_sync, start_process_unix_async
from .process.types import ProcessInfo
from .process.utils import resolve_python, build_napcat_command

# 平台具体实现已移动至子模块


    


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
        self.output_readers: Dict[str, asyncio.Task] = {}
        from ..core.websocket import get_connection_manager
        self.ws_manager = get_connection_manager()
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
        qq_account: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        根据组件类型获取启动命令和工作目录
        
        Args:
            instance_path: 实例路径
            component: 组件类型 (main, napcat, napcat-ada)
            python_path: Python 可执行文件路径
            qq_account: QQ 账号（用于 NapCat 快速登录）
            
        Returns:
            (command, cwd) 元组
        """
        python_cmd = resolve_python(instance_path, python_path)
        
        logger.info(f"_get_command_and_cwd 接收到的参数 - component: {component}, qq_account: {qq_account}")
        
        if component == "main":
            # MaiBot 主程序 - 在 MaiBot 子目录下
            cwd = str(instance_path / "MaiBot")
            bot_script = Path(cwd) / "bot.py"
            if not bot_script.exists():
                raise FileNotFoundError(f"MaiBot 启动脚本不存在: {bot_script}")
            command = f"{python_cmd} bot.py"
            
        elif component == "napcat":
            logger.info(f"准备构建 NapCat 命令，qq_account: {qq_account}")
            command, cwd = build_napcat_command(instance_path, qq_account)
            logger.info(f"构建完成的 NapCat 命令: {command}")
            
        elif component == "napcat-ada":
            # NapCat 适配器 - 在 MaiBot-Napcat-Adapter 子目录下
            cwd = str(instance_path / "MaiBot-Napcat-Adapter")
            ada_script = Path(cwd) / "main.py"
            if not ada_script.exists():
                raise FileNotFoundError(f"NapCat 适配器启动脚本不存在: {ada_script}")
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
        session_id = self._get_session_id(instance_id, component)
        if session_id in self.processes and self.processes[session_id].is_alive():
            logger.info(f"进程已在运行: {session_id}")
            return True
        ok, process_info = start_process_windows(
            instance_id, component, command, cwd,
            rows=self.pty_rows, cols=self.pty_cols
        )
        if ok and process_info:
            if session_id in self.processes:
                prev = self.processes[session_id]
                process_info.output_buffer = prev.output_buffer
                process_info.buffer_size = max(prev.buffer_size, process_info.buffer_size)
            self.processes[session_id] = process_info
            logger.info(f"Windows 进程启动成功: {session_id}, PID: {process_info.pid}")
            await self._ensure_output_reader(session_id)
            return True
        return False
    
    async def start_process_unix(
        self,
        instance_id: str,
        component: str,
        command: str,
        cwd: str,
    ) -> bool:
        session_id = self._get_session_id(instance_id, component)
        if session_id in self.processes and self.processes[session_id].is_alive():
            logger.info(f"进程已在运行: {session_id}")
            return True
        ok, process_info = start_process_unix_sync(
            instance_id, component, command, cwd,
            rows=self.pty_rows, cols=self.pty_cols
        )
        if ok and process_info:
            if session_id in self.processes:
                prev = self.processes[session_id]
                process_info.output_buffer = prev.output_buffer
                process_info.buffer_size = max(prev.buffer_size, process_info.buffer_size)
            self.processes[session_id] = process_info
            logger.info(f"Unix PTY 进程启动成功: {session_id}, PID: {process_info.pid}")
            await self._ensure_output_reader(session_id)
            return True
        else:
            ok2, process_info2 = await start_process_unix_async(instance_id, component, command, cwd)
            if ok2 and process_info2:
                if session_id in self.processes:
                    prev = self.processes[session_id]
                    process_info2.output_buffer = prev.output_buffer
                    process_info2.buffer_size = max(prev.buffer_size, process_info2.buffer_size)
                self.processes[session_id] = process_info2
                logger.info(f"Unix 进程启动成功: {session_id}, PID: {process_info2.pid}")
                await self._ensure_output_reader(session_id)
                return True
        return False
    
    async def start_process(
        self,
        instance_id: str,
        instance_path: Path,
        component: str,
        python_path: Optional[str] = None,
        qq_account: Optional[str] = None,
    ) -> bool:
        """
        启动进程
        
        Args:
            instance_id: 实例 ID
            instance_path: 实例路径
            component: 组件类型 (main, napcat, napcat-ada)
            python_path: Python 可执行文件路径
            qq_account: QQ 账号（用于 NapCat 快速登录）
            
        Returns:
            是否启动成功
        """
        try:
            command, cwd = self._get_command_and_cwd(instance_path, component, python_path, qq_account)
            
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
                
                # 异步等待进程终止（不阻塞事件循环）
                try:
                    wait_start = datetime.now()
                    while process.poll() is None and (datetime.now() - wait_start).total_seconds() < 5:
                        await asyncio.sleep(0.1)
                    
                    if process.poll() is None:
                        logger.warning(f"进程 {session_id} 在5秒内未停止，强制终止")
                        process.kill()
                        await asyncio.sleep(0.1)
                except Exception as wait_error:
                    logger.warning(f"等待进程停止时出错: {wait_error}")
                
                # 关闭 master fd
                try:
                    os.close(process.master_fd)
                except:
                    pass
            # Windows winpty
            elif hasattr(process, 'terminate'):
                process.terminate(force=force)
                # 异步等待进程实际终止（不阻塞事件循环）
                try:
                    wait_start = datetime.now()
                    while process.isalive() and (datetime.now() - wait_start).total_seconds() < 5:
                        await asyncio.sleep(0.1)
                    
                    if process.isalive():
                        logger.warning(f"进程 {session_id} 在5秒内未停止，可能需要强制终止")
                except Exception as wait_error:
                    logger.warning(f"等待进程停止时出错: {wait_error}")
            # asyncio subprocess
            elif hasattr(process, 'kill'):
                if force:
                    process.kill()
                else:
                    process.terminate()
                await process.wait()
            
            # 等待一小段时间确认进程已停止（减少等待时间）
            await asyncio.sleep(0.1)
            
            if session_id in self.processes:
                pi = self.processes[session_id]
                pi.process = None
                pi.pid = None
            # 停止输出读取器
            try:
                if session_id in self.output_readers:
                    task = self.output_readers.pop(session_id)
                    task.cancel()
            except Exception:
                pass
            
            logger.info(f"进程停止成功: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"停止进程失败 {session_id}: {e}", exc_info=True)
            return False
    
    async def stop_all_instance_processes(self, instance_id: str, force: bool = False) -> Dict[str, bool]:
        """
        停止实例的所有进程（并行停止以提高性能）
        
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
        
        # 并行停止所有进程（使用 asyncio.gather 真正并行执行）
        if not components:
            return results
        
        tasks = [
            self.stop_process(instance_id, component, force=force)
            for component in components
        ]
        
        # 等待所有停止任务完成（并行执行）
        task_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        for component, result in zip(components, task_results):
            if isinstance(result, Exception):
                logger.error(f"停止组件 {component} 时出错: {result}")
                results[component] = False
            else:
                results[component] = result
        
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
    
    def add_output_to_buffer(self, instance_id: str, component: str, output: str):
        """添加输出到缓冲区"""
        process_info = self.get_process_info(instance_id, component)
        if process_info:
            process_info.output_buffer.append(output)
            # 保持缓冲区大小限制
            if len(process_info.output_buffer) > process_info.buffer_size:
                process_info.output_buffer = process_info.output_buffer[-process_info.buffer_size:]

    async def _ensure_output_reader(self, session_id: str):
        if session_id in self.output_readers:
            return
        async def read_loop():
            try:
                pi = self.processes.get(session_id)
                if not pi or not pi.process:
                    return
                instance_id = pi.instance_id
                component = pi.component
                process = pi.process
                # Unix PTY
                if hasattr(process, 'master_fd') and hasattr(process, 'is_pty'):
                    import os
                    import codecs
                    decoder = codecs.getincrementaldecoder("utf-8")(errors='replace')
                    while True:
                        try:
                            data = os.read(process.master_fd, 4096)
                            if not data:
                                await asyncio.sleep(0.05)
                                continue
                            text = decoder.decode(data, final=False)
                            self.add_output_to_buffer(instance_id, component, text)
                            await self.ws_manager.send_message(session_id, {"type": "output", "data": text})
                        except BlockingIOError:
                            await asyncio.sleep(0.05)
                        except Exception:
                            break
                # Unix asyncio subprocess
                elif hasattr(process, 'stdout') and process.stdout:
                    while True:
                        try:
                            line = await process.stdout.readline()
                            if not line:
                                break
                            # 使用跨平台编码解码
                            text = decode_console_output(line)
                            self.add_output_to_buffer(instance_id, component, text)
                            await self.ws_manager.send_message(session_id, {"type": "output", "data": text})
                        except Exception:
                            break
                # Windows winpty
                elif hasattr(process, 'read'):
                    import threading, time
                    loop = asyncio.get_event_loop()
                    q: asyncio.Queue[str] = asyncio.Queue()
                    stop = {"v": False}
                    def reader_thread():
                        while not stop["v"]:
                            try:
                                data = process.read()
                                if data:
                                    asyncio.run_coroutine_threadsafe(q.put(data), loop)
                                else:
                                    time.sleep(0.1)
                            except Exception:
                                break
                    t = threading.Thread(target=reader_thread, daemon=True)
                    t.start()
                    while not stop["v"]:
                        try:
                            text = await q.get()
                            self.add_output_to_buffer(instance_id, component, text)
                            await self.ws_manager.send_message(session_id, {"type": "output", "data": text})
                        except Exception:
                            break
                    stop["v"] = True
                    try:
                        t.join(timeout=0.5)
                    except Exception:
                        pass
            except Exception:
                pass
            finally:
                try:
                    self.output_readers.pop(session_id, None)
                except Exception:
                    pass
        task = asyncio.create_task(read_loop())
        self.output_readers[session_id] = task
    
    def get_output_history(self, instance_id: str, component: str, lines: int = 300) -> list[str]:
        """获取历史输出"""
        process_info = self.get_process_info(instance_id, component)
        if process_info:
            return process_info.output_buffer[-lines:]
        return []
    
    async def cleanup(self):
        """清理所有进程"""
        logger.info("清理所有进程...")
        sessions = list(self.processes.keys())
        pty_first = []
        others = []
        for session_id in sessions:
            pi = self.processes[session_id]
            proc = pi.process
            if proc and hasattr(proc, 'is_pty') and hasattr(proc, 'master_fd'):
                pty_first.append(session_id)
            else:
                others.append(session_id)
        for session_id in pty_first + others:
            pi2 = self.processes.get(session_id)
            if not pi2:
                continue
            await self.stop_process(
                pi2.instance_id,
                pi2.component,
                force=True,
            )
        logger.info("进程清理完成")


# 全局进程管理器实例（单例）
def get_process_manager() -> ProcessManager:
    return _global_process_manager

_global_process_manager = ProcessManager()

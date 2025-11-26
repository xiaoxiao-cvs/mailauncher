from typing import Optional
from datetime import datetime
import psutil


class ProcessInfo:
    def __init__(
        self,
        instance_id: str,
        component: str,
        process: Optional[any] = None,
        pid: Optional[int] = None,
        start_time: Optional[datetime] = None,
        buffer_size: int = 1000,
    ):
        self.instance_id = instance_id
        self.component = component
        self.process = process
        self.pid = pid
        self.start_time = start_time or datetime.now()
        self.output_buffer: list[str] = []
        self.buffer_size = buffer_size
        self.session_id = f"{instance_id}_{component}"

    def is_alive(self) -> bool:
        if self.process:
            if hasattr(self.process, 'isalive'):
                alive = self.process.isalive()
                return alive
            elif hasattr(self.process, 'poll'):
                poll_result = self.process.poll()
                alive = poll_result is None
                if not alive:
                    from app.core.logger import logger
                    logger.warning(f"进程 {self.session_id} (PID: {self.pid}) 已退出，退出码: {poll_result}")
                return alive
        # 进程对象为 None，表示进程已被停止或从未启动，直接返回 False
        # 这是预期行为，不需要记录警告
        return False

    def get_uptime(self) -> int:
        if self.start_time:
            return int((datetime.now() - self.start_time).total_seconds())
        return 0

    def get_cpu_percent(self) -> float:
        """获取进程 CPU 使用率（百分比）
        注意：首次调用返回 0.0，之后返回自上次调用以来的 CPU 使用率
        """
        if not self.pid:
            return 0.0
        try:
            process = psutil.Process(self.pid)
            # interval=None 不阻塞，返回自上次调用以来的 CPU 使用率
            # 首次调用返回 0.0，这是预期行为
            return round(process.cpu_percent(interval=None), 1)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return 0.0

    def get_memory_mb(self) -> float:
        """获取进程内存使用量（MB）"""
        if not self.pid:
            return 0.0
        try:
            process = psutil.Process(self.pid)
            # rss (Resident Set Size) 是实际物理内存使用量
            return round(process.memory_info().rss / 1024 / 1024, 1)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return 0.0
    
    def get_resources_with_children(self) -> tuple[float, float]:
        """获取进程及其所有子进程的资源使用情况（CPU%, 内存MB）"""
        if not self.pid:
            return 0.0, 0.0
        
        try:
            process = psutil.Process(self.pid)
            cpu_total = process.cpu_percent(interval=None)
            memory_total = process.memory_info().rss / 1024 / 1024
            
            # 获取所有子进程的资源使用
            try:
                children = process.children(recursive=True)
                for child in children:
                    try:
                        cpu_total += child.cpu_percent(interval=None)
                        memory_total += child.memory_info().rss / 1024 / 1024
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        continue
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            
            return round(cpu_total, 1), round(memory_total, 1)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return 0.0, 0.0


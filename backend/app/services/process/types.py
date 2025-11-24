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
        from app.core.logger import logger
        logger.warning(f"进程 {self.session_id} 没有关联的 process 对象")
        return False

    def get_uptime(self) -> int:
        if self.start_time:
            return int((datetime.now() - self.start_time).total_seconds())
        return 0

    def get_cpu_percent(self) -> float:
        """获取进程 CPU 使用率（百分比）"""
        if not self.pid:
            return 0.0
        try:
            process = psutil.Process(self.pid)
            # interval=0.1 避免阻塞，获取最近的 CPU 使用率
            return round(process.cpu_percent(interval=0.1), 1)
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


from typing import Optional
from datetime import datetime
import psutil
import time


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
        
        # CPU/内存缓存，避免频繁调用
        self._cpu_cache: Optional[float] = None
        self._memory_cache: Optional[float] = None
        self._cache_time: float = 0.0
        self._cache_ttl: float = 2.0  # 缓存2秒
        self._psutil_process: Optional[psutil.Process] = None

    def is_alive(self) -> bool:
        if self.process:
            if hasattr(self.process, 'isalive'):
                return self.process.isalive()
            elif hasattr(self.process, 'poll'):
                return self.process.poll() is None
        return False

    def get_uptime(self) -> int:
        if self.start_time:
            return int((datetime.now() - self.start_time).total_seconds())
        return 0

    def get_cpu_percent(self) -> float:
        """获取进程 CPU 使用率（百分比）
        使用缓存机制，避免频繁阻塞调用
        """
        if not self.pid:
            return 0.0
        
        # 检查缓存是否有效
        current_time = time.time()
        if self._cpu_cache is not None and (current_time - self._cache_time) < self._cache_ttl:
            return self._cpu_cache
        
        try:
            # 复用psutil.Process实例
            if self._psutil_process is None:
                self._psutil_process = psutil.Process(self.pid)
            
            # 使用interval=None获取非阻塞的CPU使用率
            # 第一次调用会返回0.0，后续调用会返回累积值
            cpu = self._psutil_process.cpu_percent(interval=None)
            self._cpu_cache = round(cpu, 1)
            self._cache_time = current_time
            return self._cpu_cache
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            self._cpu_cache = 0.0
            self._psutil_process = None
            return 0.0

    def get_memory_mb(self) -> float:
        """获取进程内存使用量（MB）
        使用缓存机制，避免频繁调用
        """
        if not self.pid:
            return 0.0
        
        # 检查缓存是否有效
        current_time = time.time()
        if self._memory_cache is not None and (current_time - self._cache_time) < self._cache_ttl:
            return self._memory_cache
        
        try:
            # 复用psutil.Process实例
            if self._psutil_process is None:
                self._psutil_process = psutil.Process(self.pid)
            
            # rss (Resident Set Size) 是实际物理内存使用量
            memory = round(self._psutil_process.memory_info().rss / 1024 / 1024, 1)
            self._memory_cache = memory
            self._cache_time = current_time
            return self._memory_cache
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            self._memory_cache = 0.0
            self._psutil_process = None
            return 0.0


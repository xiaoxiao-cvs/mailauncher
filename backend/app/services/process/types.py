from typing import Optional
from datetime import datetime


class ProcessInfo:
    def __init__(
        self,
        instance_id: str,
        component: str,
        process: Optional[any] = None,
        pid: Optional[int] = None,
        start_time: Optional[datetime] = None,
        buffer_size: int = 300,
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
                return self.process.isalive()
            elif hasattr(self.process, 'poll'):
                return self.process.poll() is None
        return False

    def get_uptime(self) -> int:
        if self.start_time:
            return int((datetime.now() - self.start_time).total_seconds())
        return 0


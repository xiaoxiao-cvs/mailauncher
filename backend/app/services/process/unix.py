import os
import platform
import asyncio
from datetime import datetime
from app.core.logger import logger
from .types import ProcessInfo


def start_process_unix_sync(instance_id: str, component: str, command: str, cwd: str, rows: int = 24, cols: int = 80):
    try:
        import pty
        import fcntl
        import termios
        import struct
        HAS_PTY = True
    except Exception:
        HAS_PTY = False
        fcntl = None
        pty = None
        termios = None
        struct = None

    if platform.system() == "Windows":
        logger.error("当前平台是 Windows，无法使用 Unix 进程启动")
        return False, None

    try:
        if HAS_PTY:
            import subprocess
            import shlex

            master, slave = pty.openpty()
            
            # 设置初始窗口大小
            try:
                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                fcntl.ioctl(master, termios.TIOCSWINSZ, winsize)
            except Exception as e:
                logger.warning(f"设置初始终端大小失败: {e}")

            process = subprocess.Popen(
                shlex.split(command),
                cwd=cwd,
                stdin=slave,
                stdout=slave,
                stderr=slave,
                close_fds=True,
                preexec_fn=os.setsid,
            )
            os.close(slave)
            fcntl.fcntl(master, fcntl.F_SETFL, os.O_NONBLOCK)
            process.master_fd = master
            process.is_pty = True

            process_info = ProcessInfo(
                instance_id=instance_id,
                component=component,
                process=process,
                pid=process.pid,
                start_time=datetime.now(),
            )
            return True, process_info
        else:
            return False, None
    except Exception as e:
        logger.error(f"启动 Unix 进程失败 {instance_id}_{component}: {e}", exc_info=True)
        return False, None


async def start_process_unix_async(instance_id: str, component: str, command: str, cwd: str):
    process = await asyncio.create_subprocess_shell(
        command,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        stdin=asyncio.subprocess.PIPE,
    )
    process_info = ProcessInfo(
        instance_id=instance_id,
        component=component,
        process=process,
        pid=process.pid,
        start_time=datetime.now(),
    )
    return True, process_info

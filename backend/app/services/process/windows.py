import platform
from datetime import datetime
import sys
from app.core.logger import logger
from .types import ProcessInfo


def start_process_windows(instance_id: str, component: str, command: str, cwd: str):
    try:
        from winpty import PtyProcess
        HAS_WINPTY = True
    except ImportError:
        HAS_WINPTY = False
        logger.warning("winpty 未安装,Windows 上的 PTY 功能将不可用")

    if platform.system() != "Windows":
        logger.error("当前平台不是 Windows，无法使用 Windows 进程启动")
        return False, None

    if not HAS_WINPTY:
        logger.error("Windows 上需要安装 winpty: pip install pywinpty")
        return False, None

    try:
        build = getattr(sys.getwindowsversion(), 'build', 0)
        if build and build >= 17763:
            logger.info("检测到 Windows 10+ (ConPTY 可用)，优先使用 ConPTY 后端")
        logger.info(f"启动 Windows 进程: {instance_id}_{component}, 命令: {command}, 工作目录: {cwd}")

        try:
            pty_process = PtyProcess.spawn(
                command,
                dimensions=(24, 80),
                cwd=cwd,
            )
        except Exception as spawn_error:
            logger.warning(f"直接启动失败,尝试使用 cmd.exe: {spawn_error}")
            cmd_wrapper = f'cmd.exe /c "{command}"'
            pty_process = PtyProcess.spawn(
                cmd_wrapper,
                dimensions=(24, 80),
                cwd=cwd,
            )

        process_info = ProcessInfo(
            instance_id=instance_id,
            component=component,
            process=pty_process,
            pid=pty_process.pid,
            start_time=datetime.now(),
        )
        return True, process_info

    except Exception as e:
        logger.error(f"启动 Windows 进程失败 {instance_id}_{component}: {e}", exc_info=True)
        return False, None

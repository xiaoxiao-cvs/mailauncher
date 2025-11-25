import platform
from datetime import datetime
import sys
from app.core.logger import logger
from .types import ProcessInfo


def start_process_windows(instance_id: str, component: str, command: str, cwd: str, rows: int = 24, cols: int = 80):
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

        # 解析命令为参数列表，正确处理带引号的路径
        import shlex
        try:
            # 尝试用 shlex 解析（处理引号）
            args = shlex.split(command, posix=False)
            logger.info(f"解析后的命令参数: {args}")
        except ValueError:
            # 如果解析失败，直接使用原命令
            args = command
            logger.info(f"shlex 解析失败，使用原命令: {args}")
        
        try:
            pty_process = PtyProcess.spawn(
                args,
                dimensions=(rows, cols),
                cwd=cwd,
            )
        except Exception as spawn_error:
            logger.warning(f"列表参数启动失败: {spawn_error}，尝试字符串命令")
            # 回退到字符串命令
            pty_process = PtyProcess.spawn(
                command,
                dimensions=(rows, cols),
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

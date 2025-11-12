"""
终端输出流管理模块
负责将终端命令输出实时推送到 WebSocket 客户端
"""
from typing import Optional, Callable, Any
from .logger import logger
from .websocket import get_connection_manager


class TerminalStreamManager:
    """终端输出流管理器"""
    
    def __init__(self):
        """初始化终端流管理器"""
        self.ws_manager = get_connection_manager()
        logger.info("终端流管理器已初始化")
    
    def create_callback(self, task_id: str) -> Callable[[str, str], Any]:
        """
        为指定任务创建进度回调函数
        
        Args:
            task_id: 任务ID
            
        Returns:
            异步回调函数 (message, level) -> None
        """
        async def progress_callback(message: str, level: str = "info"):
            """
            进度回调函数 - 将消息推送到 WebSocket
            
            Args:
                message: 消息内容
                level: 日志级别 (info, success, warning, error)
            """
            try:
                # 推送到 WebSocket
                await self.ws_manager.send_log(task_id, level, message)
                
                # 同时记录到后端日志
                if level == "error":
                    logger.error(f"[{task_id}] {message}")
                elif level == "warning":
                    logger.warning(f"[{task_id}] {message}")
                elif level == "success":
                    logger.success(f"[{task_id}] {message}")  # loguru 支持 success 级别
                else:
                    logger.info(f"[{task_id}] {message}")
                    
            except Exception as e:
                logger.error(f"发送终端输出失败: {e}")
        
        return progress_callback


# 全局单例
_terminal_stream_manager: Optional[TerminalStreamManager] = None


def get_terminal_stream_manager() -> TerminalStreamManager:
    """获取终端流管理器单例"""
    global _terminal_stream_manager
    if _terminal_stream_manager is None:
        _terminal_stream_manager = TerminalStreamManager()
    return _terminal_stream_manager

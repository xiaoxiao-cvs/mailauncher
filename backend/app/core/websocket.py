"""
WebSocket 连接管理器
用于实时推送安装日志和进度
"""
from __future__ import annotations

from typing import Dict, Set, Optional
from fastapi import WebSocket
from datetime import datetime
import json

from .logger import logger


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # 存储所有活跃的 WebSocket 连接，按任务ID分组
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        logger.info("WebSocket 连接管理器已初始化")

    async def connect(self, websocket: WebSocket, task_id: str):
        """
        接受并存储 WebSocket 连接

        Args:
            websocket: WebSocket 连接
            task_id: 任务ID
        """
        await websocket.accept()
        
        if task_id not in self.active_connections:
            self.active_connections[task_id] = set()
        
        self.active_connections[task_id].add(websocket)
        logger.info(f"WebSocket 连接已建立: 任务 {task_id}")

    def disconnect(self, websocket: WebSocket, task_id: str):
        """
        移除 WebSocket 连接

        Args:
            websocket: WebSocket 连接
            task_id: 任务ID
        """
        if task_id in self.active_connections:
            self.active_connections[task_id].discard(websocket)
            
            # 如果该任务没有连接了，删除任务
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        
        logger.info(f"WebSocket 连接已断开: 任务 {task_id}")

    async def send_message(self, task_id: str, message: dict):
        """
        向指定任务的所有连接发送消息

        Args:
            task_id: 任务ID
            message: 消息字典
        """
        if task_id not in self.active_connections:
            return

        # 添加时间戳
        message["timestamp"] = datetime.now().isoformat()

        disconnected: Set[WebSocket] = set()
        for connection in self.active_connections[task_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"发送消息失败: {e}")
                disconnected.add(connection)

        # 清理断开的连接
        for connection in disconnected:
            self.disconnect(connection, task_id)

    async def send_log(self, task_id: str, level: str, message: str):
        """
        发送日志消息

        Args:
            task_id: 任务ID
            level: 日志级别 (info, success, warning, error)
            message: 日志消息
        """
        await self.send_message(task_id, {
            "type": "log",
            "level": level,
            "message": message
        })

    async def send_progress(
        self,
        task_id: str,
        current: int,
        total: int,
        message: str,
        status: str
    ):
        """
        发送进度更新

        Args:
            task_id: 任务ID
            current: 当前进度
            total: 总进度
            message: 进度消息
            status: 任务状态
        """
        percentage = (current / total * 100) if total > 0 else 0
        
        await self.send_message(task_id, {
            "type": "progress",
            "current": current,
            "total": total,
            "percentage": round(percentage, 2),
            "message": message,
            "status": status
        })

    async def send_status(self, task_id: str, status: str, message: str = ""):
        """
        发送状态更新

        Args:
            task_id: 任务ID
            status: 状态
            message: 状态消息
        """
        await self.send_message(task_id, {
            "type": "status",
            "status": status,
            "message": message
        })

    async def send_error(self, task_id: str, error: str):
        """
        发送错误消息

        Args:
            task_id: 任务ID
            error: 错误消息
        """
        await self.send_message(task_id, {
            "type": "error",
            "message": error
        })

    async def send_complete(self, task_id: str, message: str = "安装完成"):
        """
        发送完成消息

        Args:
            task_id: 任务ID
            message: 完成消息
        """
        await self.send_message(task_id, {
            "type": "complete",
            "message": message
        })

    def has_connections(self, task_id: str) -> bool:
        """
        检查任务是否有活跃的 WebSocket 连接

        Args:
            task_id: 任务ID

        Returns:
            是否有连接
        """
        return task_id in self.active_connections and len(self.active_connections[task_id]) > 0

    def purge_task(self, task_id: str):
        if task_id in self.active_connections:
            for ws in list(self.active_connections[task_id]):
                try:
                    # best-effort close
                    import anyio
                    anyio.from_thread.run(ws.close)
                except Exception:
                    pass
            del self.active_connections[task_id]


# 全局单例
_connection_manager: Optional[ConnectionManager] = None


def get_connection_manager() -> ConnectionManager:
    """获取 WebSocket 连接管理器单例"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager

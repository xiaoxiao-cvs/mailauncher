"""
MaiBot 消息队列监控服务
订阅 MaiBot 的 /ws/logs WebSocket，解析日志提取消息处理状态
"""
import asyncio
import re
import time
import uuid
from typing import Dict, Optional, List
from pathlib import Path
from collections import OrderedDict

import aiohttp

from ..core.logger import logger
from ..core import settings
from ..models.message_queue import MessageQueueItem, MessageStatus, MessageQueueResponse


class MaiBotLogListener:
    """MaiBot 日志监听器 - 单个实例的 WebSocket 监听"""
    
    # 日志解析正则表达式
    # 匹配: [群名/用户名] 开始第N次思考
    PATTERN_THINKING = re.compile(r'\[([^\]]+)\]\s*开始第(\d+)次思考')
    # 匹配: 决定执行X个动作: reply, ...
    PATTERN_ACTION = re.compile(r'决定执行\d+个动作[:：]\s*(.+)')
    # 匹配: 已将消息 '...' 发往平台
    PATTERN_SENT = re.compile(r"已将消息\s*['\"](.{0,50})['\"]?\s*发往平台")
    # 匹配: 429 或 rate limit
    PATTERN_RATE_LIMIT = re.compile(r'(429|rate.?limit|too.?many.?requests)', re.IGNORECASE)
    # 匹配: 重试
    PATTERN_RETRY = re.compile(r'重试|retry|retrying', re.IGNORECASE)
    # 匹配聊天流ID: qq:123456:group 或 qq:123456:private
    PATTERN_STREAM_ID = re.compile(r'\[([a-z]+:\d+:(?:group|private))\]', re.IGNORECASE)
    
    def __init__(
        self,
        instance_id: str,
        instance_name: str,
        maibot_ws_url: str,
        max_queue_size: int = 50,
        sent_item_ttl: float = 5.0,  # 已发送消息保留时间(秒)
    ):
        """
        初始化监听器
        
        Args:
            instance_id: 实例ID
            instance_name: 实例名称
            maibot_ws_url: MaiBot WebSocket URL (如 ws://localhost:8001/ws/logs)
            max_queue_size: 队列最大长度
            sent_item_ttl: 已发送消息保留时间
        """
        self.instance_id = instance_id
        self.instance_name = instance_name
        self.ws_url = maibot_ws_url
        self.max_queue_size = max_queue_size
        self.sent_item_ttl = sent_item_ttl
        
        # 消息队列: OrderedDict 保持插入顺序
        self._queue: OrderedDict[str, MessageQueueItem] = OrderedDict()
        # 当前活跃的 stream_id -> message_id 映射
        self._active_streams: Dict[str, str] = {}
        
        self._connected = False
        self._total_processed = 0
        self._error: Optional[str] = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._session: Optional[aiohttp.ClientSession] = None
    
    @property
    def connected(self) -> bool:
        return self._connected
    
    @property
    def total_processed(self) -> int:
        return self._total_processed
    
    @property
    def error(self) -> Optional[str]:
        return self._error
    
    def get_queue(self) -> List[MessageQueueItem]:
        """获取当前消息队列(移除过期的已发送消息)"""
        self._cleanup_sent_items()
        return list(self._queue.values())
    
    def _cleanup_sent_items(self):
        """清理过期的已发送消息"""
        now = time.time()
        to_remove = []
        for msg_id, item in self._queue.items():
            if item.status == MessageStatus.SENT and item.sent_time:
                if now - item.sent_time > self.sent_item_ttl:
                    to_remove.append(msg_id)
        for msg_id in to_remove:
            del self._queue[msg_id]
    
    def _generate_message_id(self) -> str:
        """生成消息ID"""
        return f"msg_{uuid.uuid4().hex[:8]}"
    
    def _parse_log_line(self, line: str):
        """解析单行日志，更新队列状态"""
        line = line.strip()
        if not line:
            return
        
        # 尝试提取 stream_id
        stream_match = self.PATTERN_STREAM_ID.search(line)
        stream_id = stream_match.group(1) if stream_match else None
        
        # 1. 检测开始思考
        thinking_match = self.PATTERN_THINKING.search(line)
        if thinking_match:
            group_name = thinking_match.group(1)
            cycle_count = int(thinking_match.group(2))
            
            # 创建或更新消息
            if stream_id and stream_id in self._active_streams:
                msg_id = self._active_streams[stream_id]
                if msg_id in self._queue:
                    item = self._queue[msg_id]
                    item.cycle_count = cycle_count
                    item.status = MessageStatus.PLANNING
                    return
            
            # 新消息
            msg_id = self._generate_message_id()
            item = MessageQueueItem(
                id=msg_id,
                stream_id=stream_id or f"unknown:{group_name}",
                group_name=group_name,
                status=MessageStatus.PLANNING,
                cycle_count=cycle_count,
                start_time=time.time(),
            )
            self._queue[msg_id] = item
            if stream_id:
                self._active_streams[stream_id] = msg_id
            
            # 限制队列大小
            while len(self._queue) > self.max_queue_size:
                self._queue.popitem(last=False)
            return
        
        # 2. 检测执行动作
        action_match = self.PATTERN_ACTION.search(line)
        if action_match and stream_id:
            actions_str = action_match.group(1)
            if stream_id in self._active_streams:
                msg_id = self._active_streams[stream_id]
                if msg_id in self._queue:
                    item = self._queue[msg_id]
                    item.action_type = actions_str.strip()
                    item.status = MessageStatus.GENERATING
            return
        
        # 3. 检测发送成功
        sent_match = self.PATTERN_SENT.search(line)
        if sent_match:
            message_preview = sent_match.group(1)
            # 尝试找到对应的消息
            if stream_id and stream_id in self._active_streams:
                msg_id = self._active_streams[stream_id]
                if msg_id in self._queue:
                    item = self._queue[msg_id]
                    item.status = MessageStatus.SENT
                    item.sent_time = time.time()
                    item.message_preview = message_preview[:50] if message_preview else None
                    self._total_processed += 1
                    # 清除活跃映射
                    del self._active_streams[stream_id]
            return
        
        # 4. 检测 rate limit / 重试
        if self.PATTERN_RATE_LIMIT.search(line):
            # 增加所有正在处理的消息的重试计数
            for item in self._queue.values():
                if item.status in (MessageStatus.PLANNING, MessageStatus.GENERATING):
                    item.retry_count += 1
                    item.retry_reason = "429 Rate Limit"
            return
        
        if self.PATTERN_RETRY.search(line) and '429' not in line.lower():
            for item in self._queue.values():
                if item.status in (MessageStatus.PLANNING, MessageStatus.GENERATING):
                    item.retry_count += 1
                    if not item.retry_reason:
                        item.retry_reason = "Retry"
    
    async def start(self):
        """启动监听器"""
        if self._task and not self._task.done():
            logger.warning(f"[{self.instance_name}] 监听器已在运行")
            return
        
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"[{self.instance_name}] 消息队列监听器已启动: {self.ws_url}")
    
    async def stop(self):
        """停止监听器"""
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._session and not self._session.closed:
            await self._session.close()
        self._connected = False
        self._queue.clear()
        self._active_streams.clear()
        logger.info(f"[{self.instance_name}] 消息队列监听器已停止")
    
    async def _run_loop(self):
        """运行主循环 - 自动重连"""
        retry_delay = 1.0
        max_retry_delay = 30.0
        
        while not self._stop_event.is_set():
            try:
                await self._connect_and_listen()
                retry_delay = 1.0  # 成功后重置
            except asyncio.CancelledError:
                break
            except aiohttp.ClientError as e:
                self._error = f"连接错误: {e}"
                logger.warning(f"[{self.instance_name}] WebSocket 连接失败: {e}")
            except Exception as e:
                self._error = f"未知错误: {e}"
                logger.error(f"[{self.instance_name}] WebSocket 错误: {e}", exc_info=True)
            
            self._connected = False
            
            if not self._stop_event.is_set():
                logger.info(f"[{self.instance_name}] {retry_delay}秒后重试连接...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_retry_delay)
    
    async def _connect_and_listen(self):
        """连接并监听 WebSocket"""
        if not self._session or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=None, sock_connect=10)
            self._session = aiohttp.ClientSession(timeout=timeout)
        
        async with self._session.ws_connect(self.ws_url) as ws:
            self._connected = True
            self._error = None
            logger.info(f"[{self.instance_name}] 已连接到 MaiBot WebSocket")
            
            async for msg in ws:
                if self._stop_event.is_set():
                    break
                
                if msg.type == aiohttp.WSMsgType.TEXT:
                    self._parse_log_line(msg.data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"[{self.instance_name}] WebSocket 错误: {ws.exception()}")
                    break
                elif msg.type == aiohttp.WSMsgType.CLOSED:
                    logger.info(f"[{self.instance_name}] WebSocket 连接已关闭")
                    break


class MessageQueueService:
    """消息队列服务 - 管理所有实例的监听器"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self.__class__._initialized:
            return
        
        self._listeners: Dict[str, MaiBotLogListener] = {}
        self._instances_dir = settings.ensure_instances_dir()
        logger.info("消息队列服务已初始化")
        self.__class__._initialized = True
    
    def _get_maibot_ws_url(self, instance_path: Path) -> Optional[str]:
        """从实例配置读取 MaiBot WebUI 的 WebSocket URL"""
        env_file = instance_path / "MaiBot" / ".env"
        
        if not env_file.exists():
            logger.warning(f"未找到 .env 文件: {env_file}")
            return None
        
        # 解析 .env 文件
        host = "127.0.0.1"
        port = "8001"  # 默认 WebUI 端口
        
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('#') or '=' not in line:
                        continue
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    
                    if key == 'WEBUI_HOST':
                        # 如果是 0.0.0.0 则使用 localhost 连接
                        host = '127.0.0.1' if value == '0.0.0.0' else value
                    elif key == 'WEBUI_PORT':
                        port = value
        except Exception as e:
            logger.error(f"读取 .env 文件失败: {e}")
            return None
        
        return f"ws://{host}:{port}/ws/logs"
    
    async def start_listener(
        self,
        instance_id: str,
        instance_name: str,
        instance_path: Path,
    ) -> bool:
        """为实例启动消息队列监听器"""
        if instance_id in self._listeners:
            logger.info(f"[{instance_name}] 监听器已存在，跳过")
            return True
        
        ws_url = self._get_maibot_ws_url(instance_path)
        if not ws_url:
            logger.warning(f"[{instance_name}] 无法获取 WebSocket URL，跳过监听器启动")
            return False
        
        listener = MaiBotLogListener(
            instance_id=instance_id,
            instance_name=instance_name,
            maibot_ws_url=ws_url,
        )
        
        self._listeners[instance_id] = listener
        await listener.start()
        return True
    
    async def stop_listener(self, instance_id: str):
        """停止实例的监听器"""
        if instance_id in self._listeners:
            listener = self._listeners.pop(instance_id)
            await listener.stop()
    
    async def stop_all(self):
        """停止所有监听器"""
        for instance_id in list(self._listeners.keys()):
            await self.stop_listener(instance_id)
    
    def get_queue(self, instance_id: str) -> MessageQueueResponse:
        """获取实例的消息队列"""
        if instance_id not in self._listeners:
            return MessageQueueResponse(
                instance_id=instance_id,
                instance_name="未知",
                connected=False,
                messages=[],
                error="监听器未启动",
            )
        
        listener = self._listeners[instance_id]
        return MessageQueueResponse(
            instance_id=instance_id,
            instance_name=listener.instance_name,
            connected=listener.connected,
            messages=listener.get_queue(),
            total_processed=listener.total_processed,
            error=listener.error,
        )
    
    def get_all_queues(self) -> Dict[str, MessageQueueResponse]:
        """获取所有实例的消息队列"""
        return {
            instance_id: self.get_queue(instance_id)
            for instance_id in self._listeners
        }
    
    def is_listening(self, instance_id: str) -> bool:
        """检查实例是否正在监听"""
        return instance_id in self._listeners


def get_message_queue_service() -> MessageQueueService:
    """获取消息队列服务单例"""
    return MessageQueueService()

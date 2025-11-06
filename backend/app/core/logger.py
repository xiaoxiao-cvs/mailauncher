"""
日志配置模块
使用 loguru 提供结构化日志功能
"""
import sys
import json
from pathlib import Path
from datetime import datetime
from loguru import logger
import zipfile
import os


class LoggerConfig:
    """日志配置类"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent.parent.parent  # backend 目录
        self.log_dir = self.backend_dir / "data" / "Log"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 日志文件配置
        self.max_log_files = 7  # 保留最近 7 次日志
        self.current_log_file = None
        
    def _compress_previous_logs(self):
        """压缩上一次的日志文件为 zip 格式"""
        # 同时处理 .json 和 .jsonl 文件
        json_files = sorted(list(self.log_dir.glob("*.json")) + list(self.log_dir.glob("*.jsonl")))
        
        for json_file in json_files:
            # 跳过当前会话的日志文件
            if self.current_log_file and json_file.name == self.current_log_file.name:
                continue
            
            # 创建 zip 文件
            zip_path = json_file.with_suffix('.zip')
            if not zip_path.exists():
                try:
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        zipf.write(json_file, json_file.name)
                    # 删除原始 JSON 文件
                    json_file.unlink()
                    logger.info(f"已压缩日志文件: {json_file.name} -> {zip_path.name}")
                except Exception as e:
                    logger.error(f"压缩日志文件失败 {json_file.name}: {e}")
    
    def _cleanup_old_logs(self):
        """清理超过保留数量的旧日志"""
        # 获取所有 zip 日志文件，按修改时间排序
        zip_files = sorted(
            self.log_dir.glob("*.zip"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        # 删除超过保留数量的旧日志
        if len(zip_files) > self.max_log_files:
            for old_log in zip_files[self.max_log_files:]:
                try:
                    old_log.unlink()
                    logger.info(f"已删除旧日志文件: {old_log.name}")
                except Exception as e:
                    logger.error(f"删除旧日志文件失败 {old_log.name}: {e}")
    
    def setup(self):
        """配置 loguru 日志系统"""
        # 移除默认的 handler
        logger.remove()
        
        # 添加控制台输出 (带颜色，便于开发调试)
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="DEBUG",
            colorize=True,
        )
        
        # 生成当前会话的日志文件名 (时间戳)
        # 使用 .jsonl 扩展名表示 JSON Lines 格式，避免 IDE 报错
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_log_file = self.log_dir / f"app_{timestamp}.jsonl"
        
        # 压缩上一次的日志
        self._compress_previous_logs()
        
        # 清理旧日志
        self._cleanup_old_logs()
        
        # 添加 JSON 文件输出
        logger.add(
            str(self.current_log_file),
            format="{message}",
            level="DEBUG",
            serialize=True,  # 输出为 JSON 格式
            enqueue=True,    # 异步写入，提高性能
            backtrace=True,  # 显示完整的堆栈跟踪
            diagnose=True,   # 显示变量值
        )
        
        logger.info(f"日志系统初始化完成")
        logger.info(f"日志目录: {self.log_dir}")
        logger.info(f"当前日志文件: {self.current_log_file.name}")
        logger.info(f"日志保留数量: {self.max_log_files}")
        
        return logger


# 创建全局日志配置实例
_logger_config = LoggerConfig()


def setup_logger():
    """初始化日志系统"""
    return _logger_config.setup()


def get_logger():
    """获取 logger 实例"""
    return logger


# 导出 logger 供其他模块使用
__all__ = ["setup_logger", "get_logger", "logger"]

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
        self.log_dir = None  # 延迟初始化
        self.max_log_files = 7
        self.current_log_file = None
    
    def _ensure_log_dir(self):
        """确保日志目录存在 (延迟初始化)"""
        if self.log_dir is None:
            from app.core.data_dir import get_log_dir
            self.log_dir = get_log_dir()
        return self.log_dir
        
    def _compress_previous_logs(self):
        """压缩历史日志文件"""
        log_dir = self._ensure_log_dir()
        json_files = sorted(list(log_dir.glob("*.json")) + list(log_dir.glob("*.jsonl")))
        
        for json_file in json_files:
            if self.current_log_file and json_file.name == self.current_log_file.name:
                continue
            
            zip_path = json_file.with_suffix('.zip')
            if not zip_path.exists():
                try:
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        zipf.write(json_file, json_file.name)
                    json_file.unlink()
                    logger.info(f"已压缩日志文件: {json_file.name} -> {zip_path.name}")
                except Exception as e:
                    logger.error(f"压缩日志文件失败 {json_file.name}: {e}")
    
    def _cleanup_old_logs(self):
        """清理旧的日志文件"""
        log_dir = self._ensure_log_dir()
        zip_files = sorted(
            log_dir.glob("*.zip"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        if len(zip_files) > self.max_log_files:
            for old_log in zip_files[self.max_log_files:]:
                try:
                    old_log.unlink()
                    logger.info(f"已删除旧日志文件: {old_log.name}")
                except Exception as e:
                    logger.error(f"删除旧日志文件失败 {old_log.name}: {e}")
    
    def setup(self):
        """配置 loguru 日志系统"""
        logger.remove()
        
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="DEBUG",
            colorize=True,
        )
        
        # 确保日志目录存在
        log_dir = self._ensure_log_dir()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # 后端日志文件名前缀为 backend_
        self.current_log_file = log_dir / f"backend_{timestamp}.jsonl"
        
        self._compress_previous_logs()
        self._cleanup_old_logs()
        
        logger.add(
            str(self.current_log_file),
            format="{message}",
            level="DEBUG",
            serialize=True,
            enqueue=True,
            backtrace=True,
            diagnose=True,
        )
        
        logger.info("日志系统初始化完成")
        logger.info(f"日志目录: {log_dir}")
        logger.info(f"当前日志文件: {self.current_log_file.name}")
        logger.info(f"日志保留数量: {self.max_log_files}")
        
        return logger


_logger_config = LoggerConfig()


def setup_logger():
    """初始化日志系统"""
    return _logger_config.setup()


def get_logger():
    """获取 logger 实例"""
    return logger


__all__ = ["setup_logger", "get_logger", "logger"]

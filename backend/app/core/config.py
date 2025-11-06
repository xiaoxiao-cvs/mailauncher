"""
核心配置模块
管理应用的配置信息
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """应用配置类"""
    
    # API 配置
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "MAI Launcher API"
    VERSION: str = "0.1.0"
    
    # CORS 配置
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # 实例存储路径配置
    # 默认在后端同目录下的 deployments 文件夹
    INSTANCES_DIR: str = "./deployments"
    
    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/database/mailauncher.db"
    
    # Python 环境配置
    # 默认使用系统 Python，如果指定则使用指定路径
    PYTHON_EXECUTABLE: Optional[str] = None
    
    # Git 配置
    # 默认使用系统 Git，如果指定则使用指定路径
    GIT_EXECUTABLE: Optional[str] = None
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def get_instances_path(self) -> Path:
        """
        获取实例存储路径的绝对路径
        
        Returns:
            实例存储路径的 Path 对象
        """
        # 如果是相对路径，则相对于后端根目录
        if not os.path.isabs(self.INSTANCES_DIR):
            backend_root = Path(__file__).parent.parent.parent
            return backend_root / self.INSTANCES_DIR
        return Path(self.INSTANCES_DIR)
    
    def ensure_instances_dir(self) -> Path:
        """
        确保实例存储目录存在
        
        Returns:
            实例存储路径的 Path 对象
        """
        instances_path = self.get_instances_path()
        instances_path.mkdir(parents=True, exist_ok=True)
        return instances_path


# 创建全局配置实例
settings = Settings()

"""
核心配置模块
管理应用的配置信息
"""
import os
from pathlib import Path
from pydantic import field_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union


class Settings(BaseSettings):
    """应用配置类"""
    
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # 服务器配置
    HOST: str = "127.0.0.1"
    PORT: int = 11111
    
    # API 配置
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "MAI Launcher API"
    VERSION: str = "0.1.0"
    
    # CORS 配置
    ALLOWED_ORIGINS: Union[List[str], str] = ["*"]  # 允许所有来源
    
    # GitHub API 配置
    GITHUB_TOKEN: Optional[str] = None  # GitHub Personal Access Token (可选)
    
    # 实例存储路径配置
    # 默认在后端同目录下的 deployments 文件夹
    INSTANCES_DIR: str = "./deployments"
    
    @field_validator('INSTANCES_DIR')
    @classmethod
    def validate_instances_dir(cls, v: str) -> str:
        """验证实例目录配置"""
        if not v or not v.strip():
            raise ValueError('INSTANCES_DIR 不能为空')
        return v.strip()
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def validate_allowed_origins(cls, v: Union[List[str], str]) -> List[str]:
        """验证 CORS 配置"""
        # 如果是字符串，按逗号分隔
        if isinstance(v, str):
            v = [origin.strip() for origin in v.split(',') if origin.strip()]
        
        if not v:
            raise ValueError('ALLOWED_ORIGINS 不能为空')
        # 允许 * 表示所有来源
        if v == ["*"]:
            return v
        # 验证 URL 格式
        for origin in v:
            if not origin.startswith(('http://', 'https://', 'tauri://')):
                raise ValueError(f'无效的 origin 格式: {origin}，必须以 http://, https:// 或 tauri:// 开头')
        return v
    
    # 数据库配置
    @property
    def DATABASE_URL(self) -> str:
        """获取数据库 URL，使用统一的数据目录"""
        from app.core.data_dir import get_database_dir
        db_path = get_database_dir() / "mailauncher.db"
        return f"sqlite+aiosqlite:///{db_path}"
    
    # Python 环境配置
    # 默认使用系统 Python，如果指定则使用指定路径
    PYTHON_EXECUTABLE: Optional[str] = None
    
    # Git 配置
    # 默认使用系统 Git，如果指定则使用指定路径
    GIT_EXECUTABLE: Optional[str] = None
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    def get_instances_path(self) -> Path:
        """
        获取实例存储路径的绝对路径
        使用统一的数据目录管理
        
        Returns:
            实例存储路径的 Path 对象
        """
        from app.core.data_dir import get_deployments_dir
        return get_deployments_dir()
    
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

"""
数据库模型 - 启动器配置
定义启动器和 MAIBot 相关配置的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from datetime import datetime

from ..core.database import Base


class LauncherConfig(Base):
    """启动器配置数据库模型 - 存储启动器的全局配置"""
    __tablename__ = "launcher_config"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)  # 配置键
    value = Column(Text, nullable=True)  # 配置值
    description = Column(Text, nullable=True)  # 配置描述
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<LauncherConfig(key={self.key}, value={self.value})>"


class PythonEnvironment(Base):
    """Python 环境配置 - 存储检测到的 Python 环境"""
    __tablename__ = "python_environments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    path = Column(String(500), unique=True, nullable=False, index=True)  # Python 可执行文件路径
    version = Column(String(50), nullable=False)  # 版本字符串 (e.g., "3.11.5")
    major = Column(Integer, nullable=False)  # 主版本号
    minor = Column(Integer, nullable=False)  # 次版本号
    micro = Column(Integer, nullable=False)  # 微版本号
    is_default = Column(Boolean, default=False, nullable=False)  # 是否为默认 Python
    is_selected = Column(Boolean, default=False, nullable=False)  # 是否为用户选择的 Python
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<PythonEnvironment(version={self.version}, path={self.path})>"


class MAIBotConfig(Base):
    """MAIBot 配置 - 存储 MAIBot 相关的路径和配置"""
    __tablename__ = "maibot_config"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    maibot_path = Column(String(500), nullable=True)  # MAIBot 安装路径
    config_path = Column(String(500), nullable=True)  # MAIBot 配置文件路径
    data_path = Column(String(500), nullable=True)  # MAIBot 数据目录
    python_env_id = Column(Integer, nullable=True)  # 关联的 Python 环境 ID
    is_installed = Column(Boolean, default=False, nullable=False)  # 是否已安装
    version = Column(String(50), nullable=True)  # MAIBot 版本
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<MAIBotConfig(maibot_path={self.maibot_path}, version={self.version})>"


class PathConfig(Base):
    """路径配置 - 存储各种工具和目录的路径"""
    __tablename__ = "path_config"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # 路径名称 (e.g., "git", "java", "instances_dir")
    path = Column(String(500), nullable=False)  # 路径值
    path_type = Column(String(50), nullable=False)  # 路径类型: "executable", "directory"
    is_verified = Column(Boolean, default=False, nullable=False)  # 是否已验证
    description = Column(Text, nullable=True)  # 路径描述
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<PathConfig(name={self.name}, path={self.path})>"

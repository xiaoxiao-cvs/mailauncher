"""
数据库模型 - 启动器配置
定义启动器和 MAIBot 相关配置的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey
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


class ApiProvider(Base):
    """AI 模型供应商配置 - 存储各个 AI 服务商的 API 配置"""
    __tablename__ = "api_providers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)  # 供应商名称
    base_url = Column(String(500), nullable=False)  # API 端点 URL
    api_key = Column(Text, nullable=False)  # API Key (加密存储)
    is_enabled = Column(Boolean, default=True, nullable=False)  # 是否启用
    priority = Column(Integer, default=0, nullable=False)  # 优先级（数字越小优先级越高）
    balance = Column(String(100), nullable=True)  # 账户余额
    balance_updated_at = Column(DateTime, nullable=True)  # 余额更新时间
    models_updated_at = Column(DateTime, nullable=True)  # 模型列表更新时间
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<ApiProvider(name={self.name}, is_enabled={self.is_enabled})>"


class ApiModel(Base):
    """AI 模型缓存 - 存储供应商支持的模型列表"""
    __tablename__ = "api_models"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_id = Column(Integer, ForeignKey("api_providers.id"), nullable=False, index=True)
    model_id = Column(String(200), nullable=False)  # 模型 ID (如 gpt-4o, claude-3-sonnet)
    model_name = Column(String(200), nullable=True)  # 模型显示名称
    owned_by = Column(String(200), nullable=True)  # 模型所有者
    created = Column(Integer, nullable=True)  # 模型创建时间戳
    supports_vision = Column(Boolean, default=False, nullable=False)  # 是否支持视觉
    supports_function_calling = Column(Boolean, default=False, nullable=False)  # 是否支持函数调用
    context_length = Column(Integer, nullable=True)  # 上下文长度
    max_output_tokens = Column(Integer, nullable=True)  # 最大输出 tokens
    input_price = Column(String(50), nullable=True)  # 输入价格（每百万 tokens）
    output_price = Column(String(50), nullable=True)  # 输出价格（每百万 tokens）
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    def __repr__(self):
        return f"<ApiModel(provider_id={self.provider_id}, model_id={self.model_id})>"


class InstanceDB(Base):
    """实例数据库模型 - 存储机器人实例信息"""
    __tablename__ = "instances"
    
    id = Column(String(50), primary_key=True)  # 实例唯一标识符
    name = Column(String(100), nullable=False, index=True)  # 实例名称
    instance_path = Column(String(500), nullable=True)  # 实例目录路径（相对于 instances_dir）
    bot_type = Column(String(20), nullable=False)  # 机器人类型 (maibot, napcat, other)
    bot_version = Column(String(50), nullable=True)  # 机器人版本
    description = Column(Text, nullable=True)  # 实例描述
    status = Column(String(20), nullable=False, default="stopped")  # 实例状态
    python_path = Column(String(500), nullable=True)  # Python 路径
    config_path = Column(String(500), nullable=True)  # 配置文件路径
    created_at = Column(DateTime, default=datetime.now, nullable=False)  # 创建时间
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)  # 更新时间
    last_run = Column(DateTime, nullable=True)  # 最后运行时间
    run_time = Column(Integer, default=0, nullable=False)  # 总运行时间（秒）
    
    def __repr__(self):
        return f"<InstanceDB(id={self.id}, name={self.name}, status={self.status})>"


class DeploymentDB(Base):
    """部署任务数据库模型 - 存储部署任务信息"""
    __tablename__ = "deployments"
    
    id = Column(String(50), primary_key=True)  # 部署任务唯一标识符
    instance_id = Column(String(50), nullable=False, index=True)  # 目标实例 ID
    deployment_type = Column(String(20), nullable=False)  # 部署类型 (mods, resourcepack, etc.)
    description = Column(Text, nullable=True)  # 部署描述
    status = Column(String(20), nullable=False, default="pending")  # 部署状态
    progress = Column(Integer, default=0, nullable=False)  # 部署进度百分比
    created_at = Column(DateTime, default=datetime.now, nullable=False)  # 创建时间
    started_at = Column(DateTime, nullable=True)  # 开始时间
    completed_at = Column(DateTime, nullable=True)  # 完成时间
    error_message = Column(Text, nullable=True)  # 错误信息
    
    def __repr__(self):
        return f"<DeploymentDB(id={self.id}, instance_id={self.instance_id}, status={self.status})>"


class DeploymentLogDB(Base):
    """部署日志数据库模型 - 存储部署任务日志"""
    __tablename__ = "deployment_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    deployment_id = Column(String(50), nullable=False, index=True)  # 关联的部署任务 ID
    timestamp = Column(DateTime, default=datetime.now, nullable=False)  # 日志时间
    level = Column(String(20), nullable=False)  # 日志级别 (INFO, WARNING, ERROR)
    message = Column(Text, nullable=False)  # 日志消息
    
    def __repr__(self):
        return f"<DeploymentLogDB(deployment_id={self.deployment_id}, level={self.level})>"

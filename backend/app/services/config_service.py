"""
配置服务
处理启动器配置相关的业务逻辑，使用数据库持久化
"""
from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.db_models import LauncherConfig, PythonEnvironment, MAIBotConfig, PathConfig


class ConfigService:
    """配置服务类 - 管理启动器的各种配置"""
    
    # ===== LauncherConfig 相关方法 =====
    
    async def get_config(self, db: AsyncSession, key: str) -> Optional[str]:
        """获取配置值
        
        Args:
            db: 数据库会话
            key: 配置键
            
        Returns:
            配置值，不存在则返回 None
        """
        result = await db.execute(
            select(LauncherConfig).where(LauncherConfig.key == key)
        )
        config = result.scalar_one_or_none()
        return config.value if config else None
    
    async def set_config(
        self, 
        db: AsyncSession, 
        key: str, 
        value: str, 
        description: Optional[str] = None
    ) -> LauncherConfig:
        """设置配置值
        
        Args:
            db: 数据库会话
            key: 配置键
            value: 配置值
            description: 配置描述
            
        Returns:
            配置对象
        """
        result = await db.execute(
            select(LauncherConfig).where(LauncherConfig.key == key)
        )
        config = result.scalar_one_or_none()
        
        if config:
            # 更新现有配置
            config.value = value
            if description:
                config.description = description
            config.updated_at = datetime.now()
        else:
            # 创建新配置
            config = LauncherConfig(
                key=key,
                value=value,
                description=description
            )
            db.add(config)
        
        await db.commit()
        await db.refresh(config)
        return config
    
    async def get_all_configs(self, db: AsyncSession) -> Dict[str, str]:
        """获取所有配置
        
        Args:
            db: 数据库会话
            
        Returns:
            配置字典
        """
        result = await db.execute(select(LauncherConfig))
        configs = result.scalars().all()
        return {config.key: config.value for config in configs}
    
    # ===== PythonEnvironment 相关方法 =====
    
    async def save_python_environment(
        self,
        db: AsyncSession,
        path: str,
        version: str,
        major: int,
        minor: int,
        micro: int,
        is_default: bool = False,
        is_selected: bool = False
    ) -> PythonEnvironment:
        """保存 Python 环境信息
        
        Args:
            db: 数据库会话
            path: Python 可执行文件路径
            version: 版本字符串
            major: 主版本号
            minor: 次版本号
            micro: 微版本号
            is_default: 是否为默认 Python
            is_selected: 是否为用户选择的 Python
            
        Returns:
            Python 环境对象
        """
        result = await db.execute(
            select(PythonEnvironment).where(PythonEnvironment.path == path)
        )
        env = result.scalar_one_or_none()
        
        if env:
            # 更新现有环境
            env.version = version
            env.major = major
            env.minor = minor
            env.micro = micro
            env.is_default = is_default
            env.is_selected = is_selected
            env.updated_at = datetime.now()
        else:
            # 创建新环境
            env = PythonEnvironment(
                path=path,
                version=version,
                major=major,
                minor=minor,
                micro=micro,
                is_default=is_default,
                is_selected=is_selected
            )
            db.add(env)
        
        await db.commit()
        await db.refresh(env)
        return env
    
    async def get_python_environments(self, db: AsyncSession) -> List[PythonEnvironment]:
        """获取所有 Python 环境
        
        Args:
            db: 数据库会话
            
        Returns:
            Python 环境列表
        """
        result = await db.execute(select(PythonEnvironment))
        return list(result.scalars().all())
    
    async def get_selected_python(self, db: AsyncSession) -> Optional[PythonEnvironment]:
        """获取用户选择的 Python 环境
        
        Args:
            db: 数据库会话
            
        Returns:
            选择的 Python 环境，不存在则返回 None
        """
        result = await db.execute(
            select(PythonEnvironment).where(PythonEnvironment.is_selected == True)
        )
        return result.scalar_one_or_none()
    
    async def set_selected_python(self, db: AsyncSession, path: str) -> bool:
        """设置选择的 Python 环境
        
        Args:
            db: 数据库会话
            path: Python 路径
            
        Returns:
            是否成功
        """
        # 先取消所有选中状态
        result = await db.execute(select(PythonEnvironment))
        all_envs = result.scalars().all()
        for env in all_envs:
            env.is_selected = False
        
        # 设置新的选中环境
        result = await db.execute(
            select(PythonEnvironment).where(PythonEnvironment.path == path)
        )
        env = result.scalar_one_or_none()
        
        if not env:
            return False
        
        env.is_selected = True
        await db.commit()
        return True
    
    # ===== MAIBotConfig 相关方法 =====
    
    async def get_maibot_config(self, db: AsyncSession) -> Optional[MAIBotConfig]:
        """获取 MAIBot 配置
        
        Args:
            db: 数据库会话
            
        Returns:
            MAIBot 配置对象，不存在则返回 None
        """
        result = await db.execute(select(MAIBotConfig))
        return result.scalar_one_or_none()
    
    async def save_maibot_config(
        self,
        db: AsyncSession,
        maibot_path: Optional[str] = None,
        config_path: Optional[str] = None,
        data_path: Optional[str] = None,
        python_env_id: Optional[int] = None,
        is_installed: bool = False,
        version: Optional[str] = None
    ) -> MAIBotConfig:
        """保存 MAIBot 配置
        
        Args:
            db: 数据库会话
            maibot_path: MAIBot 安装路径
            config_path: 配置文件路径
            data_path: 数据目录
            python_env_id: 关联的 Python 环境 ID
            is_installed: 是否已安装
            version: MAIBot 版本
            
        Returns:
            MAIBot 配置对象
        """
        config = await self.get_maibot_config(db)
        
        if config:
            # 更新现有配置
            if maibot_path is not None:
                config.maibot_path = maibot_path
            if config_path is not None:
                config.config_path = config_path
            if data_path is not None:
                config.data_path = data_path
            if python_env_id is not None:
                config.python_env_id = python_env_id
            config.is_installed = is_installed
            if version is not None:
                config.version = version
            config.updated_at = datetime.now()
        else:
            # 创建新配置
            config = MAIBotConfig(
                maibot_path=maibot_path,
                config_path=config_path,
                data_path=data_path,
                python_env_id=python_env_id,
                is_installed=is_installed,
                version=version
            )
            db.add(config)
        
        await db.commit()
        await db.refresh(config)
        return config
    
    # ===== PathConfig 相关方法 =====
    
    async def get_path(self, db: AsyncSession, name: str) -> Optional[str]:
        """获取路径配置
        
        Args:
            db: 数据库会话
            name: 路径名称
            
        Returns:
            路径值，不存在则返回 None
        """
        result = await db.execute(
            select(PathConfig).where(PathConfig.name == name)
        )
        path_config = result.scalar_one_or_none()
        return path_config.path if path_config else None
    
    async def set_path(
        self,
        db: AsyncSession,
        name: str,
        path: str,
        path_type: str,
        is_verified: bool = False,
        description: Optional[str] = None
    ) -> PathConfig:
        """设置路径配置
        
        Args:
            db: 数据库会话
            name: 路径名称
            path: 路径值
            path_type: 路径类型 (executable, directory)
            is_verified: 是否已验证
            description: 路径描述
            
        Returns:
            路径配置对象
        """
        result = await db.execute(
            select(PathConfig).where(PathConfig.name == name)
        )
        path_config = result.scalar_one_or_none()
        
        if path_config:
            # 更新现有路径
            path_config.path = path
            path_config.path_type = path_type
            path_config.is_verified = is_verified
            if description:
                path_config.description = description
            path_config.updated_at = datetime.now()
        else:
            # 创建新路径
            path_config = PathConfig(
                name=name,
                path=path,
                path_type=path_type,
                is_verified=is_verified,
                description=description
            )
            db.add(path_config)
        
        await db.commit()
        await db.refresh(path_config)
        return path_config
    
    async def get_all_paths(self, db: AsyncSession) -> List[PathConfig]:
        """获取所有路径配置
        
        Args:
            db: 数据库会话
            
        Returns:
            路径配置列表
        """
        result = await db.execute(select(PathConfig))
        return list(result.scalars().all())


# 创建全局配置服务实例
config_service = ConfigService()

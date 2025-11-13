"""
MAIBot 配置服务
处理 bot_config.toml 和 model_config.toml 的读写操作
"""
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..utils.toml_handler import TOMLWithComments, merge_toml_data
from ..models.maibot_config import (
    ConfigWithComments,
    ConfigUpdateRequest,
    ConfigDeleteRequest,
    ConfigAddRequest,
    ArrayItemAddRequest,
    ArrayItemUpdateRequest,
    ArrayItemDeleteRequest,
    BotConfigResponse,
    ModelConfigResponse
)
from ..models.db_models import InstanceDB
from ..core import settings
from ..core.logger import logger


class MAIBotConfigService:
    """MAIBot 配置服务"""
    
    def __init__(self, config_dir: Optional[str] = None):
        """初始化配置服务
        
        Args:
            config_dir: 配置文件目录，如果为 None 则使用默认目录
        """
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            # 默认配置目录（可根据实际情况调整）
            self.config_dir = Path(__file__).parent.parent.parent.parent / "参考文件"
        
        self.bot_config_path = self.config_dir / "bot_config.toml"
        self.model_config_path = self.config_dir / "model_config.toml"
        
        # 获取实例目录
        self.instances_dir = settings.ensure_instances_dir()
    
    async def _get_instance_config_dir(
        self, 
        db: AsyncSession,
        instance_id: Optional[str] = None
    ) -> Path:
        """获取实例配置目录
        
        Args:
            db: 数据库会话
            instance_id: 实例ID，如果为 None 则使用默认配置
            
        Returns:
            配置目录路径
        """
        if instance_id:
            # 查询实例信息
            result = await db.execute(
                select(InstanceDB).where(InstanceDB.id == instance_id)
            )
            db_instance = result.scalar_one_or_none()
            
            if db_instance:
                # 获取实例路径：优先使用 instance_path，否则使用 name
                instance_dir = db_instance.instance_path or db_instance.name
                # 实例配置目录：{instances_dir}/{instance_path}/MaiBot/config/
                instance_config_dir = self.instances_dir / instance_dir / "MaiBot" / "config"
                
                if instance_config_dir.exists():
                    logger.info(f"使用实例配置目录: {instance_config_dir}")
                    return instance_config_dir
                else:
                    logger.warning(f"实例配置目录不存在: {instance_config_dir}")
        
        # 如果没有找到实例配置，返回默认配置目录
        logger.info(f"使用默认配置目录: {self.config_dir}")
        return self.config_dir
    
    # ==================== Bot Config ====================
    
    async def get_bot_config_raw_text(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None
    ) -> str:
        """获取 bot 配置原始文本
        
        Args:
            db: 数据库会话
            instance_id: 实例ID
            
        Returns:
            TOML 原始文本内容
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Bot config file not found: {config_path}")
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read bot config: {str(e)}")
    
    async def save_bot_config_raw_text(
        self,
        db: AsyncSession,
        content: str,
        instance_id: Optional[str] = None
    ) -> None:
        """保存 bot 配置原始文本
        
        Args:
            db: 数据库会话
            content: TOML 文本内容
            instance_id: 实例ID
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        try:
            # 首先验证 TOML 格式是否正确（使用tomlkit更宽容）
            try:
                import tomlkit
                tomlkit.loads(content)
            except ImportError:
                # 如果没有tomlkit，使用标准toml库
                import toml
                toml.loads(content)
            
            # 保存文件
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            logger.info(f"Bot config saved to {config_path}")
        except Exception as e:
            if 'toml' in str(type(e).__name__).lower() or 'parse' in str(type(e).__name__).lower():
                raise HTTPException(status_code=400, detail=f"Invalid TOML format: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save bot config: {str(e)}")
    
    async def get_bot_config(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None,
        include_comments: bool = True
    ) -> ConfigWithComments:
        """获取 bot 配置
        
        Args:
            db: 数据库会话
            instance_id: 实例ID
            include_comments: 是否包含注释
            
        Returns:
            配置数据
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Bot config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            result = toml_handler.to_json_with_comments()
            
            if not include_comments:
                result['comments'] = {}
            
            return ConfigWithComments(**result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load bot config: {str(e)}")
    
    async def update_bot_config(
        self,
        db: AsyncSession,
        update_request: ConfigUpdateRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新 bot 配置
        
        Args:
            db: 数据库会话
            update_request: 更新请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Bot config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 更新值
            toml_handler.set_value(update_request.key_path, update_request.value)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update bot config: {str(e)}")
    
    async def delete_bot_config_key(
        self,
        db: AsyncSession,
        delete_request: ConfigDeleteRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除 bot 配置键
        
        Args:
            db: 数据库会话
            delete_request: 删除请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Bot config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 删除键
            toml_handler.delete_value(delete_request.key_path)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete bot config key: {str(e)}")
    
    async def add_bot_config_key(
        self,
        db: AsyncSession,
        add_request: ConfigAddRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """添加 bot 配置键
        
        Args:
            db: 数据库会话
            add_request: 添加请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "bot_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Bot config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 构建键路径
            if add_request.section:
                key_path = f"{add_request.section}.{add_request.key}"
            else:
                key_path = add_request.key
            
            # 添加值
            toml_handler.set_value(key_path, add_request.value)
            
            # 添加注释
            if add_request.comment:
                toml_handler.comments_map[key_path] = add_request.comment
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to add bot config key: {str(e)}")
    
    # ==================== Model Config ====================
    
    async def get_model_config_raw_text(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None
    ) -> str:
        """获取模型配置原始文本
        
        Args:
            db: 数据库会话
            instance_id: 实例ID
            
        Returns:
            TOML 原始文本内容
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Model config file not found: {config_path}")
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read model config: {str(e)}")
    
    async def save_model_config_raw_text(
        self,
        db: AsyncSession,
        content: str,
        instance_id: Optional[str] = None
    ) -> None:
        """保存模型配置原始文本
        
        Args:
            db: 数据库会话
            content: TOML 文本内容
            instance_id: 实例ID
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "model_config.toml"
        
        try:
            # 首先验证 TOML 格式是否正确
            import toml
            toml.loads(content)
            
            # 保存文件
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            logger.info(f"Model config saved to {config_path}")
        except toml.TomlDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid TOML format: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save model config: {str(e)}")
    
    async def get_model_config(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None,
        include_comments: bool = True
    ) -> ConfigWithComments:
        """获取模型配置
        
        Args:
            db: 数据库会话
            instance_id: 实例ID
            include_comments: 是否包含注释
            
        Returns:
            配置数据
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Model config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            result = toml_handler.to_json_with_comments()
            
            if not include_comments:
                result['comments'] = {}
            
            return ConfigWithComments(**result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load model config: {str(e)}")
    
    async def update_model_config(
        self,
        db: AsyncSession,
        update_request: ConfigUpdateRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新模型配置
        
        Args:
            db: 数据库会话
            update_request: 更新请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Model config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 更新值
            toml_handler.set_value(update_request.key_path, update_request.value)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update model config: {str(e)}")
    
    async def delete_model_config_key(
        self,
        db: AsyncSession,
        delete_request: ConfigDeleteRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除模型配置键
        
        Args:
            db: 数据库会话
            delete_request: 删除请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Model config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 删除键
            toml_handler.delete_value(delete_request.key_path)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete model config key: {str(e)}")
    
    # ==================== 数组操作 ====================
    
    async def add_array_item(
        self,
        db: AsyncSession,
        request: ArrayItemAddRequest,
        config_type: str,  # 'bot' or 'model'
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """添加数组项
        
        Args:
            db: 数据库会话
            request: 添加请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        
        if config_type == 'bot':
            config_path = config_dir / "bot_config.toml"
        else:
            config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 获取数组
            array = toml_handler.get_value(request.array_path)
            if not isinstance(array, list):
                raise HTTPException(status_code=400, detail=f"{request.array_path} is not an array")
            
            # 添加新项
            array.append(request.item)
            toml_handler.set_value(request.array_path, array)
            
            # 添加注释
            if request.comment:
                index = len(array) - 1
                key_path = f"{request.array_path}[{index}]"
                toml_handler.comments_map[key_path] = request.comment
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to add array item: {str(e)}")
    
    async def update_array_item(
        self,
        db: AsyncSession,
        request: ArrayItemUpdateRequest,
        config_type: str,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新数组项
        
        Args:
            db: 数据库会话
            request: 更新请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        
        if config_type == 'bot':
            config_path = config_dir / "bot_config.toml"
        else:
            config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 获取数组
            array = toml_handler.get_value(request.array_path)
            if not isinstance(array, list):
                raise HTTPException(status_code=400, detail=f"{request.array_path} is not an array")
            
            if request.index < 0 or request.index >= len(array):
                raise HTTPException(status_code=400, detail=f"Index {request.index} out of range")
            
            # 更新项
            item = array[request.index]
            if isinstance(item, dict):
                item.update(request.updates)
            else:
                array[request.index] = request.updates.get('value', item)
            
            toml_handler.set_value(request.array_path, array)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update array item: {str(e)}")
    
    async def delete_array_item(
        self,
        db: AsyncSession,
        request: ArrayItemDeleteRequest,
        config_type: str,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除数组项
        
        Args:
            db: 数据库会话
            request: 删除请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = await self._get_instance_config_dir(db, instance_id)
        
        if config_type == 'bot':
            config_path = config_dir / "bot_config.toml"
        else:
            config_path = config_dir / "model_config.toml"
        
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Config file not found: {config_path}")
        
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            
            # 获取数组
            array = toml_handler.get_value(request.array_path)
            if not isinstance(array, list):
                raise HTTPException(status_code=400, detail=f"{request.array_path} is not an array")
            
            if request.index < 0 or request.index >= len(array):
                raise HTTPException(status_code=400, detail=f"Index {request.index} out of range")
            
            # 删除项
            del array[request.index]
            toml_handler.set_value(request.array_path, array)
            
            # 保存文件
            toml_handler.save()
            
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete array item: {str(e)}")

    # ==================== Napcat Adapter Config ====================

    async def _get_adapter_config_path(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None,
    ) -> Path:
        config_dir = await self._get_instance_config_dir(db, instance_id)
        # 实例根目录：config_dir 位于 {instances_dir}/{inst}/MaiBot/config
        # 适配器目录位于 {instances_dir}/{inst}/MaiBot-Napcat-Adapter/config.toml
        # 推导实例根路径
        instance_root = config_dir.parent.parent  # .../MaiBot/config -> 到实例根
        adapter_config_path = instance_root / "MaiBot-Napcat-Adapter" / "config.toml"
        return adapter_config_path

    async def get_adapter_config_raw_text(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None,
    ) -> str:
        config_path = await self._get_adapter_config_path(db, instance_id)
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Adapter config file not found: {config_path}")
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read adapter config: {str(e)}")

    async def save_adapter_config_raw_text(
        self,
        db: AsyncSession,
        content: str,
        instance_id: Optional[str] = None,
    ) -> None:
        config_path = await self._get_adapter_config_path(db, instance_id)
        try:
            try:
                import tomlkit
                tomlkit.loads(content)
            except ImportError:
                import toml
                toml.loads(content)
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"Adapter config saved to {config_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save adapter config: {str(e)}")

    async def get_adapter_config(
        self,
        db: AsyncSession,
        instance_id: Optional[str] = None,
        include_comments: bool = True,
    ) -> ConfigWithComments:
        config_path = await self._get_adapter_config_path(db, instance_id)
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Adapter config file not found: {config_path}")
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            result = toml_handler.to_json_with_comments()
            if not include_comments:
                result["comments"] = {}
            return ConfigWithComments(**result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load adapter config: {str(e)}")

    async def update_adapter_config(
        self,
        db: AsyncSession,
        update_request: ConfigUpdateRequest,
        instance_id: Optional[str] = None,
    ) -> ConfigWithComments:
        config_path = await self._get_adapter_config_path(db, instance_id)
        if not config_path.exists():
            raise HTTPException(status_code=404, detail=f"Adapter config file not found: {config_path}")
        try:
            toml_handler = TOMLWithComments(str(config_path))
            toml_handler.load()
            toml_handler.set_value(update_request.key_path, update_request.value)
            toml_handler.save()
            return ConfigWithComments(**toml_handler.to_json_with_comments())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update adapter config: {str(e)}")


# 创建全局服务实例
maibot_config_service = MAIBotConfigService()

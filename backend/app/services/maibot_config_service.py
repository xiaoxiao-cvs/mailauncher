"""
MAIBot 配置服务
处理 bot_config.toml 和 model_config.toml 的读写操作
"""
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import HTTPException

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
    
    def _get_instance_config_dir(self, instance_id: Optional[str] = None) -> Path:
        """获取实例配置目录
        
        Args:
            instance_id: 实例ID，如果为 None 则使用默认配置
            
        Returns:
            配置目录路径
        """
        if instance_id:
            # 实例配置目录
            instance_dir = Path(f"./data/instances/{instance_id}/config")
            if instance_dir.exists():
                return instance_dir
        
        return self.config_dir
    
    # ==================== Bot Config ====================
    
    async def get_bot_config(
        self, 
        instance_id: Optional[str] = None,
        include_comments: bool = True
    ) -> ConfigWithComments:
        """获取 bot 配置
        
        Args:
            instance_id: 实例ID
            include_comments: 是否包含注释
            
        Returns:
            配置数据
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        update_request: ConfigUpdateRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新 bot 配置
        
        Args:
            update_request: 更新请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        delete_request: ConfigDeleteRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除 bot 配置键
        
        Args:
            delete_request: 删除请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        add_request: ConfigAddRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """添加 bot 配置键
        
        Args:
            add_request: 添加请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
    
    async def get_model_config(
        self,
        instance_id: Optional[str] = None,
        include_comments: bool = True
    ) -> ConfigWithComments:
        """获取模型配置
        
        Args:
            instance_id: 实例ID
            include_comments: 是否包含注释
            
        Returns:
            配置数据
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        update_request: ConfigUpdateRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新模型配置
        
        Args:
            update_request: 更新请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        delete_request: ConfigDeleteRequest,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除模型配置键
        
        Args:
            delete_request: 删除请求
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
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
        request: ArrayItemAddRequest,
        config_type: str,  # 'bot' or 'model'
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """添加数组项
        
        Args:
            request: 添加请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
        
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
        request: ArrayItemUpdateRequest,
        config_type: str,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """更新数组项
        
        Args:
            request: 更新请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
        
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
        request: ArrayItemDeleteRequest,
        config_type: str,
        instance_id: Optional[str] = None
    ) -> ConfigWithComments:
        """删除数组项
        
        Args:
            request: 删除请求
            config_type: 配置类型
            instance_id: 实例ID
            
        Returns:
            更新后的配置
        """
        config_dir = self._get_instance_config_dir(instance_id)
        
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


# 创建全局服务实例
maibot_config_service = MAIBotConfigService()

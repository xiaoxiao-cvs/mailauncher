"""
TOML 配置文件处理工具
使用 tomlkit 库实现，完美保留注释、格式和空行
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import tomlkit
from tomlkit.toml_document import TOMLDocument


class TOMLWithComments:
    """TOML 文件处理类，使用 tomlkit 保留所有注释和格式"""
    
    def __init__(self, file_path: str):
        """初始化 TOML 处理器
        
        Args:
            file_path: TOML 文件路径
        """
        self.file_path = Path(file_path)
        self.doc: TOMLDocument = None
        self.data: Dict[str, Any] = {}
        
    def load(self) -> Dict[str, Any]:
        """加载 TOML 文件并解析
        
        Returns:
            解析后的数据字典（普通 dict，非 tomlkit 对象）
        """
        if not self.file_path.exists():
            raise FileNotFoundError(f"TOML file not found: {self.file_path}")
        
        with open(self.file_path, 'r', encoding='utf-8') as f:
            self.doc = tomlkit.load(f)
        
        # 转换为普通字典供外部使用
        self.data = self._to_plain_dict(self.doc)
        return self.data
    
    def _to_plain_dict(self, obj: Any) -> Any:
        """递归转换 tomlkit 对象为普通 Python 对象
        
        Args:
            obj: tomlkit 对象
            
        Returns:
            普通 Python 对象
        """
        if isinstance(obj, dict):
            return {k: self._to_plain_dict(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._to_plain_dict(item) for item in obj]
        else:
            return obj
    
    def get_value(self, key_path: str) -> Any:
        """获取指定路径的值
        
        Args:
            key_path: 键路径，如 "bot.platform" 或 "models[0].name"
            
        Returns:
            值，如果路径不存在则返回 None
        """
        keys = self._parse_key_path(key_path)
        value = self.doc
        
        try:
            for key in keys:
                if isinstance(key, int):
                    # 处理数组索引
                    value = value[key]
                else:
                    # 处理字典键
                    value = value[key]
            return self._to_plain_dict(value)
        except (KeyError, IndexError, TypeError):
            return None
    
    def set_value(self, key_path: str, value: Any, comment: Optional[str] = None) -> None:
        """设置指定路径的值
        
        Args:
            key_path: 键路径，如 "bot.platform" 或 "models[0].name"
            value: 新值
            comment: 可选的注释（仅用于新增键，添加在键上方）
        """
        keys = self._parse_key_path(key_path)
        
        # 导航到目标位置并设置值
        target = self.doc
        for i, key in enumerate(keys[:-1]):
            if isinstance(key, int):
                target = target[key]
            else:
                if key not in target:
                    # 创建新的表或数组
                    target[key] = tomlkit.table()
                target = target[key]
        
        last_key = keys[-1]
        
        # 如果是新增键且提供了注释，使用 tomlkit 的注释功能
        is_new = last_key not in target if not isinstance(last_key, int) else False
        
        if isinstance(last_key, int):
            target[last_key] = value
        else:
            # 对于新键，可以添加注释
            if is_new and comment:
                # tomlkit 支持在添加键时设置注释
                item = tomlkit.item(value)
                item.comment(comment)
                target[last_key] = item
            else:
                target[last_key] = value
        
        # 同步更新 data
        self.data = self._to_plain_dict(self.doc)
    
    def delete_value(self, key_path: str) -> None:
        """删除指定路径的值
        
        Args:
            key_path: 键路径
        """
        keys = self._parse_key_path(key_path)
        
        # 导航到目标位置
        target = self.doc
        try:
            for key in keys[:-1]:
                if isinstance(key, int):
                    target = target[key]
                else:
                    target = target[key]
            
            last_key = keys[-1]
            if isinstance(last_key, int):
                del target[last_key]
            else:
                if last_key in target:
                    del target[last_key]
            
            # 同步更新 data
            self.data = self._to_plain_dict(self.doc)
        except (KeyError, IndexError, TypeError):
            # 键不存在，忽略
            pass
    
    def get_comment(self, key_path: str) -> Optional[str]:
        """获取指定键的注释（如果有的话）
        
        Args:
            key_path: 键路径
            
        Returns:
            注释文本，如果没有则返回 None
        
        注意: tomlkit 保留所有注释在内部结构中，
        通过 save() 会自动保留所有原始注释
        """
        keys = self._parse_key_path(key_path)
        
        try:
            target = self.doc
            for key in keys[:-1]:
                target = target[key]
            
            last_key = keys[-1]
            if hasattr(target, 'get') and last_key in target:
                item = target[last_key]
                # 尝试获取 tomlkit 的注释
                if hasattr(item, 'trivia') and hasattr(item.trivia, 'comment'):
                    comment = item.trivia.comment
                    return comment.strip() if comment else None
        except (KeyError, IndexError, TypeError, AttributeError):
            pass
        
        return None
    
    def save(self, output_path: Optional[str] = None) -> None:
        """保存 TOML 文件，自动保留所有注释和格式
        
        Args:
            output_path: 输出路径，如果为 None 则覆盖原文件
        
        注意: tomlkit 会自动保留所有注释、空行和格式，
        不会出现重复注释或配置项的问题
        """
        output_file = Path(output_path) if output_path else self.file_path
        
        with open(output_file, 'w', encoding='utf-8') as f:
            tomlkit.dump(self.doc, f)
    
    def to_dict(self) -> Dict[str, Any]:
        """获取配置的纯字典表示
        
        Returns:
            配置数据的普通字典
        """
        return self.data.copy()
    
    def _parse_key_path(self, key_path: str) -> List[Union[str, int]]:
        """解析键路径
        
        Args:
            key_path: 键路径字符串，如 "models[0].name"
            
        Returns:
            键列表
        """
        keys = []
        parts = key_path.split('.')
        
        for part in parts:
            # 处理数组索引
            if '[' in part and ']' in part:
                key, index = part.split('[')
                index = int(index.rstrip(']'))
                if key:
                    keys.append(key)
                keys.append(index)
            else:
                keys.append(part)
        
        return keys


def merge_toml_data(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """递归合并 TOML 数据
    
    Args:
        base: 基础数据
        updates: 更新数据
        
    Returns:
        合并后的数据
    """
    result = base.copy()
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_toml_data(result[key], value)
        else:
            result[key] = value
    
    return result

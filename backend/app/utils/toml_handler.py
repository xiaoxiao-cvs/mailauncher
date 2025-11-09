"""
TOML 配置文件处理工具
支持保留注释的解析和写入
"""
import re
from typing import Any, Dict, List, Tuple, Optional
from pathlib import Path


class TOMLWithComments:
    """TOML 文件处理类，支持保留注释"""
    
    def __init__(self, file_path: str):
        """初始化 TOML 处理器
        
        Args:
            file_path: TOML 文件路径
        """
        self.file_path = Path(file_path)
        self.lines: List[str] = []
        self.data: Dict[str, Any] = {}
        self.comments_map: Dict[str, str] = {}  # 存储每个键的注释
        self.structure: List[Dict[str, Any]] = []  # 保存文件结构
        
    def load(self) -> Dict[str, Any]:
        """加载 TOML 文件并解析
        
        Returns:
            解析后的数据字典
        """
        if not self.file_path.exists():
            raise FileNotFoundError(f"TOML file not found: {self.file_path}")
        
        with open(self.file_path, 'r', encoding='utf-8') as f:
            self.lines = f.readlines()
        
        self._parse()
        return self.data
    
    def _parse(self):
        """解析 TOML 内容，保留注释和结构"""
        import toml
        
        # 使用标准 toml 库解析数据
        with open(self.file_path, 'r', encoding='utf-8') as f:
            self.data = toml.load(f)
        
        # 解析结构和注释
        current_section = ""
        current_array_table = None
        array_table_index = -1
        pending_comments = []
        
        for line_num, line in enumerate(self.lines):
            stripped = line.strip()
            
            # 空行
            if not stripped:
                self.structure.append({
                    'type': 'blank',
                    'line': line_num,
                    'content': line
                })
                continue
            
            # 注释行
            if stripped.startswith('#'):
                pending_comments.append(stripped)
                self.structure.append({
                    'type': 'comment',
                    'line': line_num,
                    'content': line,
                    'text': stripped
                })
                continue
            
            # 数组表格 [[xxx]]
            if stripped.startswith('[[') and stripped.endswith(']]'):
                current_array_table = stripped[2:-2].strip()
                array_table_index += 1
                key = f"{current_array_table}[{array_table_index}]"
                
                self.structure.append({
                    'type': 'array_table',
                    'line': line_num,
                    'content': line,
                    'name': current_array_table,
                    'index': array_table_index,
                    'comments': pending_comments.copy()
                })
                
                if pending_comments:
                    self.comments_map[key] = '\n'.join(pending_comments)
                    pending_comments = []
                
                current_section = ""
                continue
            
            # 普通表格 [xxx]
            if stripped.startswith('[') and stripped.endswith(']'):
                current_section = stripped[1:-1].strip()
                current_array_table = None
                array_table_index = -1
                
                self.structure.append({
                    'type': 'section',
                    'line': line_num,
                    'content': line,
                    'name': current_section,
                    'comments': pending_comments.copy()
                })
                
                if pending_comments:
                    self.comments_map[current_section] = '\n'.join(pending_comments)
                    pending_comments = []
                continue
            
            # 键值对
            if '=' in stripped:
                # 提取键名（处理行内注释）
                key_part = stripped.split('=')[0].strip()
                
                # 构建完整键路径
                if current_array_table is not None:
                    full_key = f"{current_array_table}[{array_table_index}].{key_part}"
                elif current_section:
                    full_key = f"{current_section}.{key_part}"
                else:
                    full_key = key_part
                
                # 提取行内注释
                inline_comment = None
                if '#' in line:
                    # 需要考虑字符串中的 # 号
                    comment_match = re.search(r'#(.+)$', line)
                    if comment_match:
                        inline_comment = comment_match.group(1).strip()
                
                self.structure.append({
                    'type': 'keyvalue',
                    'line': line_num,
                    'content': line,
                    'key': key_part,
                    'full_key': full_key,
                    'section': current_section,
                    'array_table': current_array_table,
                    'array_index': array_table_index if current_array_table else None,
                    'comments': pending_comments.copy(),
                    'inline_comment': inline_comment
                })
                
                # 保存注释
                all_comments = []
                if pending_comments:
                    all_comments.extend(pending_comments)
                if inline_comment:
                    all_comments.append(f"# {inline_comment}")
                
                if all_comments:
                    self.comments_map[full_key] = '\n'.join(all_comments)
                
                pending_comments = []
                continue
            
            # 其他内容
            self.structure.append({
                'type': 'other',
                'line': line_num,
                'content': line
            })
    
    def get_value(self, key_path: str) -> Any:
        """获取指定路径的值
        
        Args:
            key_path: 键路径，如 "bot.platform" 或 "models[0].name"
            
        Returns:
            值
        """
        keys = self._parse_key_path(key_path)
        value = self.data
        
        for key in keys:
            if isinstance(key, int):
                value = value[key]
            else:
                value = value.get(key)
                if value is None:
                    return None
        
        return value
    
    def set_value(self, key_path: str, value: Any) -> None:
        """设置指定路径的值
        
        Args:
            key_path: 键路径
            value: 新值
        """
        keys = self._parse_key_path(key_path)
        
        # 更新内存中的数据
        target = self.data
        for i, key in enumerate(keys[:-1]):
            if isinstance(key, int):
                target = target[key]
            else:
                if key not in target:
                    target[key] = {}
                target = target[key]
        
        last_key = keys[-1]
        if isinstance(last_key, int):
            target[last_key] = value
        else:
            target[last_key] = value
    
    def delete_value(self, key_path: str) -> None:
        """删除指定路径的值
        
        Args:
            key_path: 键路径
        """
        keys = self._parse_key_path(key_path)
        
        target = self.data
        for key in keys[:-1]:
            if isinstance(key, int):
                target = target[key]
            else:
                target = target.get(key)
                if target is None:
                    return
        
        last_key = keys[-1]
        if isinstance(last_key, int):
            del target[last_key]
        else:
            if last_key in target:
                del target[last_key]
    
    def get_comment(self, key_path: str) -> Optional[str]:
        """获取指定键的注释
        
        Args:
            key_path: 键路径
            
        Returns:
            注释文本，如果没有则返回 None
        """
        return self.comments_map.get(key_path)
    
    def save(self, output_path: Optional[str] = None) -> None:
        """保存 TOML 文件，保留注释和格式
        
        Args:
            output_path: 输出路径，如果为 None 则覆盖原文件
        """
        import toml
        
        output_file = Path(output_path) if output_path else self.file_path
        
        # 重新构建文件内容
        new_lines = []
        
        for item in self.structure:
            if item['type'] in ['comment', 'blank', 'other']:
                new_lines.append(item['content'])
            
            elif item['type'] == 'section':
                # 添加前置注释
                for comment in item.get('comments', []):
                    new_lines.append(f"{comment}\n")
                new_lines.append(item['content'])
            
            elif item['type'] == 'array_table':
                # 添加前置注释
                for comment in item.get('comments', []):
                    new_lines.append(f"{comment}\n")
                new_lines.append(item['content'])
            
            elif item['type'] == 'keyvalue':
                # 从数据中获取最新值
                full_key = item['full_key']
                value = self.get_value(full_key)
                
                if value is None:
                    # 值已被删除，跳过此行
                    continue
                
                # 添加前置注释
                for comment in item.get('comments', []):
                    new_lines.append(f"{comment}\n")
                
                # 生成新的键值对行
                key = item['key']
                value_str = toml.dumps({key: value}).strip()
                
                # 添加行内注释
                if item.get('inline_comment'):
                    value_str = f"{value_str} # {item['inline_comment']}"
                
                new_lines.append(f"{value_str}\n")
        
        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    
    def to_json_with_comments(self) -> Dict[str, Any]:
        """转换为带注释的 JSON 结构
        
        Returns:
            包含数据和注释的字典
        """
        return {
            'data': self.data,
            'comments': self.comments_map,
            'file_path': str(self.file_path)
        }
    
    def _parse_key_path(self, key_path: str) -> List[str | int]:
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

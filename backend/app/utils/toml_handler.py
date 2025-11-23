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
        def to_plain_dict(obj):
            """递归转换tomlkit对象为普通Python对象"""
            if isinstance(obj, dict):
                return {k: to_plain_dict(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [to_plain_dict(item) for item in obj]
            else:
                return obj
        
        try:
            # 优先使用 tomlkit，它更宽容且保留格式
            import tomlkit
            with open(self.file_path, 'r', encoding='utf-8') as f:
                doc = tomlkit.load(f)
                # 递归转换为普通字典
                self.data = to_plain_dict(doc)
        except ImportError:
            # 回退到标准 toml 库
            import toml
            with open(self.file_path, 'r', encoding='utf-8') as f:
                self.data = toml.load(f)
        
        # 解析结构和注释
        current_section = ""
        current_array_table = None
        array_table_indices = {}  # 每个数组表格名称的独立索引计数器
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
            if stripped.startswith('[['):
                # 提取表格名，忽略行内注释
                match = re.match(r'\[\[([^\]]+)\]\]', stripped)
                if match:
                    current_array_table = match.group(1).strip()
                    
                    # 为每个数组表格维护独立的索引计数器
                    if current_array_table not in array_table_indices:
                        array_table_indices[current_array_table] = -1
                    array_table_indices[current_array_table] += 1
                    array_table_index = array_table_indices[current_array_table]
                    
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
            if stripped.startswith('[') and not stripped.startswith('[['):
                # 提取表格名，忽略行内注释
                match = re.match(r'\[([^\]]+)\]', stripped)
                if match:
                    current_section = match.group(1).strip()
                    current_array_table = None
                    
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
                
                # 保存注释（注意：pending_comments 中的注释已经包含 # 前缀）
                all_comments = []
                if pending_comments:
                    all_comments.extend(pending_comments)
                # 行内注释不需要重复添加到 comments_map，因为它已经保存在 structure 的 inline_comment 字段中
                # 这样可以避免在 save() 时重复写入
                
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
            值，如果路径不存在则返回 None
        """
        keys = self._parse_key_path(key_path)
        value = self.data
        
        for key in keys:
            if isinstance(key, int):
                # 处理数组索引
                if not isinstance(value, list) or key >= len(value):
                    return None
                value = value[key]
            else:
                # 处理字典键
                if not isinstance(value, dict):
                    return None
                value = value.get(key)
                if value is None:
                    return None
        
        return value
    
    def set_value(self, key_path: str, value: Any, comment: Optional[str] = None) -> None:
        """设置指定路径的值
        
        Args:
            key_path: 键路径
            value: 新值
            comment: 可选的注释（仅用于新增键）
        """
        keys = self._parse_key_path(key_path)
        
        # 检查是否是新增的键
        is_new_key = self.get_value(key_path) is None
        
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
        
        # 如果是新增的键，更新 structure 和 comments_map
        if is_new_key:
            # 解析 section 和 key
            parts = key_path.split('.')
            if len(parts) > 1:
                section = '.'.join(parts[:-1])
                key = parts[-1]
            else:
                section = ""
                key = key_path
            
            # 添加注释到 comments_map
            if comment:
                self.comments_map[key_path] = comment
            
            # 添加到 structure（插入到对应 section 后）
            insert_pos = len(self.structure)
            for i, item in enumerate(self.structure):
                if item['type'] == 'section' and item.get('name') == section:
                    # 找到下一个 section 或文件末尾
                    for j in range(i + 1, len(self.structure)):
                        if self.structure[j]['type'] == 'section':
                            insert_pos = j
                            break
                    else:
                        insert_pos = len(self.structure)
                    break
            
            # 构建新的 keyvalue 结构项
            new_item = {
                'type': 'keyvalue',
                'line': -1,  # 标记为新增
                'content': '',  # 将在 save 时生成
                'key': key,
                'full_key': key_path,
                'section': section,
                'array_table': None,
                'array_index': None,
                'comments': [comment] if comment and not comment.startswith('#') else ([comment] if comment else []),
                'inline_comment': None
            }
            
            self.structure.insert(insert_pos, new_item)
    
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
        
        # 清理 comments_map 中的注释
        if key_path in self.comments_map:
            del self.comments_map[key_path]
        
        # 从 structure 中移除对应项
        self.structure = [item for item in self.structure 
                         if not (item['type'] == 'keyvalue' and item['full_key'] == key_path)]
    
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
        try:
            import tomlkit as toml
        except ImportError:
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
                
                # 添加前置注释（只添加不以 # 开头的原始注释）
                for comment in item.get('comments', []):
                    # 确保注释行以 # 开头
                    comment_line = comment if comment.startswith('#') else f"# {comment}"
                    new_lines.append(f"{comment_line}\n")
                
                # 生成新的键值对行
                key = item['key']
                
                # 使用 tomlkit 的内联格式化 - 确保生成单行输出
                try:
                    # 对于简单类型，直接格式化
                    if isinstance(value, (str, int, float, bool)):
                        if isinstance(value, str):
                            # 字符串需要转义和引号
                            value_repr = toml.dumps({'_': value}).split('=')[1].strip()
                        else:
                            value_repr = str(value).lower() if isinstance(value, bool) else str(value)
                        value_str = f"{key} = {value_repr}"
                    elif isinstance(value, list):
                        # 数组使用内联格式
                        value_repr = toml.dumps({'_': value}).split('=')[1].strip()
                        value_str = f"{key} = {value_repr}"
                    elif isinstance(value, dict):
                        # 内联表格使用 { } 格式
                        items = ', '.join(f'{k} = {toml.dumps({"_": v}).split("=")[1].strip()}' for k, v in value.items())
                        value_str = f"{key} = {{ {items} }}"
                    else:
                        # 回退到标准序列化
                        value_str = toml.dumps({key: value}).strip()
                except Exception:
                    # 回退到标准方法
                    value_str = toml.dumps({key: value}).strip()
                
                # 添加行内注释（但不要重复添加）
                # 行内注释不应该包含 "# " 前缀，因为在解析时已经去掉了
                if item.get('inline_comment'):
                    inline_comment = item['inline_comment']
                    # 如果注释不在前置注释中，才添加为行内注释
                    value_str = f"{value_str}  # {inline_comment}"
                
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

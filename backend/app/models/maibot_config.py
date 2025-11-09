"""
MAIBot 配置相关的数据模型
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ConfigWithComments(BaseModel):
    """带注释的配置数据"""
    data: Dict[str, Any] = Field(..., description="配置数据")
    comments: Dict[str, str] = Field(default_factory=dict, description="注释映射")
    file_path: str = Field(..., description="文件路径")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": {
                    "bot": {
                        "platform": "qq",
                        "qq_account": "1145141919810"
                    }
                },
                "comments": {
                    "bot.qq_account": "# 麦麦的QQ账号"
                },
                "file_path": "/path/to/bot_config.toml"
            }
        }


class ConfigUpdateRequest(BaseModel):
    """配置更新请求"""
    key_path: str = Field(..., description="配置键路径，如 'bot.platform' 或 'models[0].name'")
    value: Any = Field(..., description="新值")
    
    class Config:
        json_schema_extra = {
            "example": {
                "key_path": "bot.nickname",
                "value": "麦麦"
            }
        }


class ConfigDeleteRequest(BaseModel):
    """配置删除请求"""
    key_path: str = Field(..., description="要删除的配置键路径")
    
    class Config:
        json_schema_extra = {
            "example": {
                "key_path": "bot.alias_names[0]"
            }
        }


class ConfigAddRequest(BaseModel):
    """配置添加请求"""
    section: Optional[str] = Field(None, description="所属节，如 'bot'")
    key: str = Field(..., description="配置键名")
    value: Any = Field(..., description="配置值")
    comment: Optional[str] = Field(None, description="注释")
    
    class Config:
        json_schema_extra = {
            "example": {
                "section": "bot",
                "key": "new_setting",
                "value": "some_value",
                "comment": "# 这是一个新配置"
            }
        }


class BotConfigResponse(BaseModel):
    """Bot 配置响应"""
    version: Optional[str] = Field(None, description="配置版本")
    bot: Optional[Dict[str, Any]] = Field(None, description="机器人基础配置")
    personality: Optional[Dict[str, Any]] = Field(None, description="人格配置")
    expression: Optional[Dict[str, Any]] = Field(None, description="表达配置")
    chat: Optional[Dict[str, Any]] = Field(None, description="聊天配置")
    memory: Optional[Dict[str, Any]] = Field(None, description="记忆配置")
    tool: Optional[Dict[str, Any]] = Field(None, description="工具配置")
    mood: Optional[Dict[str, Any]] = Field(None, description="情绪配置")
    emoji: Optional[Dict[str, Any]] = Field(None, description="表情配置")
    voice: Optional[Dict[str, Any]] = Field(None, description="语音配置")
    message_receive: Optional[Dict[str, Any]] = Field(None, description="消息接收配置")
    lpmm_knowledge: Optional[Dict[str, Any]] = Field(None, description="知识库配置")
    keyword_reaction: Optional[Dict[str, Any]] = Field(None, description="关键词反应配置")
    response_post_process: Optional[Dict[str, Any]] = Field(None, description="回复后处理配置")
    chinese_typo: Optional[Dict[str, Any]] = Field(None, description="中文错别字配置")
    response_splitter: Optional[Dict[str, Any]] = Field(None, description="回复分割器配置")
    log: Optional[Dict[str, Any]] = Field(None, description="日志配置")
    debug: Optional[Dict[str, Any]] = Field(None, description="调试配置")
    maim_message: Optional[Dict[str, Any]] = Field(None, description="消息配置")
    telemetry: Optional[Dict[str, Any]] = Field(None, description="遥测配置")
    experimental: Optional[Dict[str, Any]] = Field(None, description="实验性功能")
    relationship: Optional[Dict[str, Any]] = Field(None, description="关系配置")
    comments: Dict[str, str] = Field(default_factory=dict, description="注释映射")


class ModelConfigResponse(BaseModel):
    """模型配置响应"""
    version: Optional[str] = Field(None, description="配置版本")
    api_providers: Optional[List[Dict[str, Any]]] = Field(None, description="API提供商列表")
    models: Optional[List[Dict[str, Any]]] = Field(None, description="模型列表")
    model_task_config: Optional[Dict[str, Any]] = Field(None, description="模型任务配置")
    comments: Dict[str, str] = Field(default_factory=dict, description="注释映射")


class ConfigQueryParams(BaseModel):
    """配置查询参数"""
    section: Optional[str] = Field(None, description="查询特定节")
    include_comments: bool = Field(True, description="是否包含注释")


class ConfigValidationResponse(BaseModel):
    """配置验证响应"""
    valid: bool = Field(..., description="是否有效")
    errors: List[str] = Field(default_factory=list, description="错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告列表")


class ArrayItemAddRequest(BaseModel):
    """数组项添加请求"""
    array_path: str = Field(..., description="数组路径，如 'api_providers' 或 'models'")
    item: Dict[str, Any] = Field(..., description="要添加的项")
    comment: Optional[str] = Field(None, description="注释")
    
    class Config:
        json_schema_extra = {
            "example": {
                "array_path": "api_providers",
                "item": {
                    "name": "NewProvider",
                    "base_url": "https://api.example.com",
                    "api_key": "your-key",
                    "client_type": "openai"
                },
                "comment": "# 新的API提供商"
            }
        }


class ArrayItemUpdateRequest(BaseModel):
    """数组项更新请求"""
    array_path: str = Field(..., description="数组路径")
    index: int = Field(..., description="数组索引")
    updates: Dict[str, Any] = Field(..., description="要更新的字段")
    
    class Config:
        json_schema_extra = {
            "example": {
                "array_path": "models",
                "index": 0,
                "updates": {
                    "price_in": 2.5,
                    "price_out": 9.0
                }
            }
        }


class ArrayItemDeleteRequest(BaseModel):
    """数组项删除请求"""
    array_path: str = Field(..., description="数组路径")
    index: int = Field(..., description="要删除的数组索引")
    
    class Config:
        json_schema_extra = {
            "example": {
                "array_path": "api_providers",
                "index": 2
            }
        }

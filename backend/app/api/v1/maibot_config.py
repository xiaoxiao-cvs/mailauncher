"""
MAIBot 配置 API 路由
"""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse

from ...models.maibot_config import (
    ConfigWithComments,
    ConfigUpdateRequest,
    ConfigDeleteRequest,
    ConfigAddRequest,
    ArrayItemAddRequest,
    ArrayItemUpdateRequest,
    ArrayItemDeleteRequest
)
from ...services.maibot_config_service import maibot_config_service

router = APIRouter()


# ==================== Bot Config ====================

@router.get("/bot-config", response_model=ConfigWithComments, summary="获取 Bot 配置")
async def get_bot_config(
    instance_id: Optional[str] = Query(None, description="实例ID，为空则使用默认配置"),
    include_comments: bool = Query(True, description="是否包含注释")
):
    """
    获取 MAIBot 的 bot_config.toml 配置
    
    - **instance_id**: 实例ID（可选）
    - **include_comments**: 是否包含注释信息
    
    返回配置数据和注释信息
    """
    return await maibot_config_service.get_bot_config(instance_id, include_comments)


@router.put("/bot-config", response_model=ConfigWithComments, summary="更新 Bot 配置")
async def update_bot_config(
    request: ConfigUpdateRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    更新 Bot 配置中的某个值
    
    - **key_path**: 配置键路径，如 "bot.nickname" 或 "chat.talk_value"
    - **value**: 新值
    - **instance_id**: 实例ID（可选）
    
    示例：
    ```json
    {
        "key_path": "bot.nickname",
        "value": "新麦麦"
    }
    ```
    """
    return await maibot_config_service.update_bot_config(request, instance_id)


@router.delete("/bot-config", response_model=ConfigWithComments, summary="删除 Bot 配置键")
async def delete_bot_config_key(
    request: ConfigDeleteRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    删除 Bot 配置中的某个键
    
    - **key_path**: 要删除的配置键路径
    - **instance_id**: 实例ID（可选）
    
    示例：
    ```json
    {
        "key_path": "bot.alias_names[0]"
    }
    ```
    """
    return await maibot_config_service.delete_bot_config_key(request, instance_id)


@router.post("/bot-config", response_model=ConfigWithComments, summary="添加 Bot 配置键")
async def add_bot_config_key(
    request: ConfigAddRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    添加新的 Bot 配置键
    
    - **section**: 所属节（可选）
    - **key**: 配置键名
    - **value**: 配置值
    - **comment**: 注释（可选）
    - **instance_id**: 实例ID（可选）
    
    示例：
    ```json
    {
        "section": "bot",
        "key": "new_feature",
        "value": true,
        "comment": "# 新功能开关"
    }
    ```
    """
    return await maibot_config_service.add_bot_config_key(request, instance_id)


# ==================== Model Config ====================

@router.get("/model-config", response_model=ConfigWithComments, summary="获取模型配置")
async def get_model_config(
    instance_id: Optional[str] = Query(None, description="实例ID"),
    include_comments: bool = Query(True, description="是否包含注释")
):
    """
    获取 MAIBot 的 model_config.toml 配置
    
    - **instance_id**: 实例ID（可选）
    - **include_comments**: 是否包含注释信息
    
    返回模型配置数据和注释信息
    """
    return await maibot_config_service.get_model_config(instance_id, include_comments)


@router.put("/model-config", response_model=ConfigWithComments, summary="更新模型配置")
async def update_model_config(
    request: ConfigUpdateRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    更新模型配置中的某个值
    
    - **key_path**: 配置键路径，如 "models[0].price_in"
    - **value**: 新值
    - **instance_id**: 实例ID（可选）
    
    示例：
    ```json
    {
        "key_path": "models[0].price_in",
        "value": 2.5
    }
    ```
    """
    return await maibot_config_service.update_model_config(request, instance_id)


@router.delete("/model-config", response_model=ConfigWithComments, summary="删除模型配置键")
async def delete_model_config_key(
    request: ConfigDeleteRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    删除模型配置中的某个键
    
    - **key_path**: 要删除的配置键路径
    - **instance_id**: 实例ID（可选）
    """
    return await maibot_config_service.delete_model_config_key(request, instance_id)


# ==================== 数组操作 ====================

@router.post("/bot-config/array-item", response_model=ConfigWithComments, summary="添加 Bot 配置数组项")
async def add_bot_config_array_item(
    request: ArrayItemAddRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    向 Bot 配置的数组中添加新项
    
    - **array_path**: 数组路径，如 "personality.states"
    - **item**: 要添加的项
    - **comment**: 注释（可选）
    
    示例：
    ```json
    {
        "array_path": "personality.states",
        "item": "是一个喜欢音乐的学生。",
        "comment": "# 新的人格状态"
    }
    ```
    """
    return await maibot_config_service.add_array_item(request, 'bot', instance_id)


@router.put("/bot-config/array-item", response_model=ConfigWithComments, summary="更新 Bot 配置数组项")
async def update_bot_config_array_item(
    request: ArrayItemUpdateRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    更新 Bot 配置数组中的某一项
    
    - **array_path**: 数组路径
    - **index**: 数组索引
    - **updates**: 要更新的字段
    """
    return await maibot_config_service.update_array_item(request, 'bot', instance_id)


@router.delete("/bot-config/array-item", response_model=ConfigWithComments, summary="删除 Bot 配置数组项")
async def delete_bot_config_array_item(
    request: ArrayItemDeleteRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    删除 Bot 配置数组中的某一项
    
    - **array_path**: 数组路径
    - **index**: 要删除的数组索引
    """
    return await maibot_config_service.delete_array_item(request, 'bot', instance_id)


@router.post("/model-config/array-item", response_model=ConfigWithComments, summary="添加模型配置数组项")
async def add_model_config_array_item(
    request: ArrayItemAddRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    向模型配置的数组中添加新项
    
    - **array_path**: 数组路径，如 "api_providers" 或 "models"
    - **item**: 要添加的项（字典格式）
    - **comment**: 注释（可选）
    
    示例 - 添加 API 提供商：
    ```json
    {
        "array_path": "api_providers",
        "item": {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "api_key": "your-key",
            "client_type": "openai",
            "max_retry": 3,
            "timeout": 60,
            "retry_interval": 5
        },
        "comment": "# OpenAI API 配置"
    }
    ```
    
    示例 - 添加模型：
    ```json
    {
        "array_path": "models",
        "item": {
            "model_identifier": "gpt-4",
            "name": "gpt4-turbo",
            "api_provider": "OpenAI",
            "price_in": 10.0,
            "price_out": 30.0
        },
        "comment": "# GPT-4 模型配置"
    }
    ```
    """
    return await maibot_config_service.add_array_item(request, 'model', instance_id)


@router.put("/model-config/array-item", response_model=ConfigWithComments, summary="更新模型配置数组项")
async def update_model_config_array_item(
    request: ArrayItemUpdateRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    更新模型配置数组中的某一项
    
    - **array_path**: 数组路径，如 "models"
    - **index**: 数组索引
    - **updates**: 要更新的字段
    
    示例：
    ```json
    {
        "array_path": "models",
        "index": 0,
        "updates": {
            "price_in": 2.5,
            "price_out": 9.0
        }
    }
    ```
    """
    return await maibot_config_service.update_array_item(request, 'model', instance_id)


@router.delete("/model-config/array-item", response_model=ConfigWithComments, summary="删除模型配置数组项")
async def delete_model_config_array_item(
    request: ArrayItemDeleteRequest,
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    删除模型配置数组中的某一项
    
    - **array_path**: 数组路径
    - **index**: 要删除的数组索引
    
    示例：
    ```json
    {
        "array_path": "api_providers",
        "index": 2
    }
    ```
    """
    return await maibot_config_service.delete_array_item(request, 'model', instance_id)


# ==================== 辅助端点 ====================

@router.get("/bot-config/sections", summary="获取 Bot 配置的所有节")
async def get_bot_config_sections(
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    获取 Bot 配置文件中的所有顶层节名称
    
    返回示例：
    ```json
    {
        "sections": ["bot", "personality", "chat", "memory", ...]
    }
    ```
    """
    config = await maibot_config_service.get_bot_config(instance_id, include_comments=False)
    sections = list(config.data.keys())
    return {"sections": sections}


@router.get("/model-config/sections", summary="获取模型配置的所有节")
async def get_model_config_sections(
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    获取模型配置文件中的所有顶层节名称
    
    返回示例：
    ```json
    {
        "sections": ["api_providers", "models", "model_task_config"]
    }
    ```
    """
    config = await maibot_config_service.get_model_config(instance_id, include_comments=False)
    sections = list(config.data.keys())
    return {"sections": sections}


@router.get("/bot-config/value", summary="获取 Bot 配置的特定值")
async def get_bot_config_value(
    key_path: str = Query(..., description="配置键路径"),
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    获取 Bot 配置中特定路径的值
    
    - **key_path**: 配置键路径，如 "bot.nickname"
    
    返回：
    ```json
    {
        "key_path": "bot.nickname",
        "value": "麦麦",
        "comment": "# 麦麦的昵称"
    }
    ```
    """
    config = await maibot_config_service.get_bot_config(instance_id)
    
    # 简单的路径解析（需要改进以支持数组索引）
    keys = key_path.split('.')
    value = config.data
    
    try:
        for key in keys:
            value = value[key]
        
        comment = config.comments.get(key_path, None)
        
        return {
            "key_path": key_path,
            "value": value,
            "comment": comment
        }
    except (KeyError, TypeError):
        raise HTTPException(status_code=404, detail=f"Key path not found: {key_path}")


@router.get("/model-config/value", summary="获取模型配置的特定值")
async def get_model_config_value(
    key_path: str = Query(..., description="配置键路径"),
    instance_id: Optional[str] = Query(None, description="实例ID")
):
    """
    获取模型配置中特定路径的值
    
    - **key_path**: 配置键路径，如 "models[0].name"
    """
    config = await maibot_config_service.get_model_config(instance_id)
    
    # 这里需要更复杂的路径解析来处理数组索引
    # 暂时简化处理
    raise HTTPException(status_code=501, detail="Not implemented yet")

"""
API 供应商管理 API
提供 AI 模型供应商的 CRUD 和模型查询功能
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ...core.database import get_db
from ...models.response import APIResponse
from ...services.api_provider_service import api_provider_service

router = APIRouter(tags=["api-providers"])


# ===== Pydantic 模型 =====

class ApiProviderItem(BaseModel):
    """API 供应商配置项"""
    id: Optional[int] = None
    name: str
    base_url: str
    api_key: str
    is_enabled: bool = True
    priority: int = 0


class ApiProviderListRequest(BaseModel):
    """API 供应商列表请求"""
    providers: List[ApiProviderItem]


class ModelInfo(BaseModel):
    """模型信息"""
    model_config = {"protected_namespaces": ()}
    
    model_id: str
    model_name: Optional[str] = None
    owned_by: Optional[str] = None
    supports_vision: bool = False
    supports_function_calling: bool = False
    context_length: Optional[int] = None


# ===== API 端点 =====

@router.get("")
async def get_all_providers(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取所有 API 供应商配置"""
    try:
        providers = await api_provider_service.get_all_providers(db)
        return APIResponse(
            success=True,
            message="成功获取 API 供应商列表",
            data={
                "providers": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "base_url": p.base_url,
                        "api_key": p.api_key,
                        "is_enabled": p.is_enabled,
                        "priority": p.priority,
                        "balance": p.balance,
                        "balance_updated_at": p.balance_updated_at.isoformat() if p.balance_updated_at else None,
                        "models_updated_at": p.models_updated_at.isoformat() if p.models_updated_at else None,
                    }
                    for p in providers
                ]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 API 供应商列表失败: {str(e)}"
        )


@router.post("")
async def save_providers(
    request: ApiProviderListRequest,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """批量保存 API 供应商配置"""
    try:
        # 验证
        for provider in request.providers:
            if not provider.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="供应商名称不能为空"
                )
            if not provider.base_url.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{provider.name} 的 API URL 不能为空"
                )
            if not provider.api_key.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{provider.name} 的 API Key 不能为空"
                )
        
        # 保存
        saved_providers = await api_provider_service.save_providers(
            db,
            [
                {
                    "id": p.id,
                    "name": p.name,
                    "base_url": p.base_url,
                    "api_key": p.api_key,
                    "is_enabled": p.is_enabled,
                    "priority": p.priority
                }
                for p in request.providers
            ]
        )
        
        return APIResponse(
            success=True,
            message="成功保存 API 供应商配置",
            data={
                "count": len(saved_providers),
                "providers": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "is_enabled": p.is_enabled
                    }
                    for p in saved_providers
                ]
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存 API 供应商配置失败: {str(e)}"
        )


@router.post("/{provider_id}/fetch-models")
async def fetch_provider_models(
    provider_id: int,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    获取供应商支持的模型列表
    调用供应商 API 的 /models 端点，并缓存到数据库
    """
    try:
        models = await api_provider_service.fetch_and_cache_models(db, provider_id)
        
        return APIResponse(
            success=True,
            message=f"成功获取模型列表，共 {len(models)} 个模型",
            data={
                "provider_id": provider_id,
                "model_count": len(models),
                "models": [
                    {
                        "model_id": m.model_id,
                        "model_name": m.model_name,
                        "owned_by": m.owned_by,
                        "supports_vision": m.supports_vision,
                        "supports_function_calling": m.supports_function_calling,
                        "context_length": m.context_length,
                    }
                    for m in models
                ]
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表失败: {str(e)}"
        )


@router.post("/{provider_id}/fetch-balance")
async def fetch_provider_balance(
    provider_id: int,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    获取供应商账户余额
    调用供应商的余额查询 API 并缓存到数据库
    """
    try:
        balance_info = await api_provider_service.fetch_and_cache_balance(db, provider_id)
        
        return APIResponse(
            success=True,
            message="成功获取账户余额",
            data=balance_info
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取账户余额失败: {str(e)}"
        )


@router.get("/{provider_id}/models")
async def get_provider_models(
    provider_id: int,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """获取供应商的缓存模型列表"""
    try:
        models = await api_provider_service.get_cached_models(db, provider_id)
        
        return APIResponse(
            success=True,
            message=f"成功获取缓存的模型列表",
            data={
                "provider_id": provider_id,
                "model_count": len(models),
                "models": [
                    {
                        "model_id": m.model_id,
                        "model_name": m.model_name,
                        "owned_by": m.owned_by,
                        "supports_vision": m.supports_vision,
                        "supports_function_calling": m.supports_function_calling,
                        "context_length": m.context_length,
                        "updated_at": m.updated_at.isoformat()
                    }
                    for m in models
                ]
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表失败: {str(e)}"
        )


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """删除 API 供应商配置"""
    try:
        success = await api_provider_service.delete_provider(db, provider_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"供应商 {provider_id} 不存在"
            )
        
        return APIResponse(
            success=True,
            message="成功删除 API 供应商配置",
            data={"provider_id": provider_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除 API 供应商配置失败: {str(e)}"
        )

"""
API 供应商服务
处理 AI 模型供应商的配置管理、模型查询和余额查询
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import httpx

from ..models.db_models import ApiProvider, ApiModel
from ..core.logger import logger


class ApiProviderService:
    """API 供应商服务类"""
    
    async def get_all_providers(self, db: AsyncSession) -> List[ApiProvider]:
        """获取所有 API 供应商"""
        result = await db.execute(
            select(ApiProvider).order_by(ApiProvider.priority, ApiProvider.id)
        )
        return list(result.scalars().all())
    
    async def get_provider_by_id(self, db: AsyncSession, provider_id: int) -> Optional[ApiProvider]:
        """根据 ID 获取供应商"""
        result = await db.execute(
            select(ApiProvider).where(ApiProvider.id == provider_id)
        )
        return result.scalar_one_or_none()
    
    async def save_providers(
        self,
        db: AsyncSession,
        providers: List[Dict[str, Any]]
    ) -> List[ApiProvider]:
        """批量保存 API 供应商配置"""
        saved_providers = []
        
        for provider_data in providers:
            provider_id = provider_data.get("id")
            
            if provider_id:
                # 更新现有供应商
                result = await db.execute(
                    select(ApiProvider).where(ApiProvider.id == provider_id)
                )
                provider = result.scalar_one_or_none()
                
                if provider:
                    provider.name = provider_data["name"]
                    provider.base_url = provider_data["base_url"].rstrip('/')
                    provider.api_key = provider_data["api_key"]
                    provider.is_enabled = provider_data.get("is_enabled", True)
                    provider.priority = provider_data.get("priority", 0)
                    provider.updated_at = datetime.now()
                    saved_providers.append(provider)
            else:
                # 创建新供应商
                provider = ApiProvider(
                    name=provider_data["name"],
                    base_url=provider_data["base_url"].rstrip('/'),
                    api_key=provider_data["api_key"],
                    is_enabled=provider_data.get("is_enabled", True),
                    priority=provider_data.get("priority", 0)
                )
                db.add(provider)
                saved_providers.append(provider)
        
        await db.commit()
        
        # 刷新以获取生成的 ID
        for provider in saved_providers:
            await db.refresh(provider)
        
        logger.info(f"成功保存 {len(saved_providers)} 个 API 供应商")
        return saved_providers
    
    async def delete_provider(self, db: AsyncSession, provider_id: int) -> bool:
        """删除 API 供应商及其关联的模型缓存"""
        # 先删除关联的模型
        await db.execute(
            delete(ApiModel).where(ApiModel.provider_id == provider_id)
        )
        
        # 删除供应商
        result = await db.execute(
            delete(ApiProvider).where(ApiProvider.id == provider_id)
        )
        
        await db.commit()
        
        return result.rowcount > 0
    
    async def fetch_and_cache_models(
        self,
        db: AsyncSession,
        provider_id: int
    ) -> List[ApiModel]:
        """
        从供应商 API 获取模型列表并缓存到数据库
        兼容 OpenAI API 格式
        """
        # 获取供应商配置
        provider = await self.get_provider_by_id(db, provider_id)
        if not provider:
            raise ValueError(f"供应商 {provider_id} 不存在")
        
        logger.info(f"开始获取供应商 {provider.name} 的模型列表")
        
        try:
            # 调用供应商的 /models API
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {provider.api_key}",
                    "Content-Type": "application/json"
                }
                
                response = await client.get(
                    f"{provider.base_url}/models",
                    headers=headers
                )
                
                if response.status_code != 200:
                    raise ConnectionError(
                        f"API 返回错误状态码: {response.status_code}, "
                        f"响应: {response.text}"
                    )
                
                data = response.json()
                
                # 解析模型列表（兼容 OpenAI API 格式）
                models_data = data.get("data", [])
                if not models_data:
                    logger.warning(f"供应商 {provider.name} 返回空模型列表")
                    return []
                
                # 删除旧的缓存
                await db.execute(
                    delete(ApiModel).where(ApiModel.provider_id == provider_id)
                )
                
                # 保存新的模型列表
                models = []
                for model_data in models_data:
                    model_id = model_data.get("id")
                    if not model_id:
                        continue
                    
                    # 尝试推断模型能力
                    model_id_lower = model_id.lower()
                    supports_vision = any(
                        keyword in model_id_lower
                        for keyword in ["vision", "gpt-4o", "claude-3", "gemini-pro-vision"]
                    )
                    supports_function_calling = any(
                        keyword in model_id_lower
                        for keyword in ["gpt-4", "gpt-3.5-turbo", "claude-3"]
                    )
                    
                    model = ApiModel(
                        provider_id=provider_id,
                        model_id=model_id,
                        model_name=model_data.get("id"),  # 使用 id 作为显示名称
                        owned_by=model_data.get("owned_by"),
                        created=model_data.get("created"),
                        supports_vision=supports_vision,
                        supports_function_calling=supports_function_calling,
                    )
                    db.add(model)
                    models.append(model)
                
                # 更新供应商的模型列表更新时间
                provider.models_updated_at = datetime.now()
                
                await db.commit()
                
                logger.success(f"成功缓存 {len(models)} 个模型")
                return models
                
        except httpx.TimeoutException:
            raise ConnectionError(f"连接供应商 {provider.name} 超时")
        except httpx.RequestError as e:
            raise ConnectionError(f"请求供应商 {provider.name} 失败: {str(e)}")
        except Exception as e:
            logger.error(f"获取模型列表异常: {str(e)}")
            raise
    
    async def fetch_and_cache_balance(
        self,
        db: AsyncSession,
        provider_id: int
    ) -> Dict[str, Any]:
        """
        从供应商 API 获取账户余额并缓存到数据库
        尝试多个常见的余额查询端点
        """
        # 获取供应商配置
        provider = await self.get_provider_by_id(db, provider_id)
        if not provider:
            raise ValueError(f"供应商 {provider_id} 不存在")
        
        logger.info(f"开始获取供应商 {provider.name} 的账户余额")
        
        # 常见的余额查询端点
        balance_endpoints = [
            "/dashboard/billing/subscription",  # OpenAI
            "/user/balance",  # 通用
            "/account/balance",  # 通用
            "/v1/balance",  # 一些国内供应商
        ]
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {
                    "Authorization": f"Bearer {provider.api_key}",
                    "Content-Type": "application/json"
                }
                
                balance_info = None
                
                # 尝试不同的端点
                for endpoint in balance_endpoints:
                    try:
                        response = await client.get(
                            f"{provider.base_url}{endpoint}",
                            headers=headers
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            # 尝试提取余额信息（适配不同 API 格式）
                            balance_value = None
                            
                            # OpenAI 格式
                            if "hard_limit_usd" in data:
                                balance_value = f"${data.get('hard_limit_usd', 0):.2f}"
                            elif "total_granted" in data:
                                used = data.get("total_used", 0)
                                granted = data.get("total_granted", 0)
                                balance_value = f"${(granted - used) / 100:.2f}"
                            # 通用格式
                            elif "balance" in data:
                                balance_value = str(data.get("balance"))
                            elif "amount" in data:
                                balance_value = str(data.get("amount"))
                            elif "credit" in data:
                                balance_value = str(data.get("credit"))
                            
                            if balance_value:
                                balance_info = {
                                    "provider_id": provider_id,
                                    "provider_name": provider.name,
                                    "balance": balance_value,
                                    "endpoint": endpoint,
                                    "raw_data": data
                                }
                                break
                    except Exception as e:
                        logger.debug(f"尝试端点 {endpoint} 失败: {str(e)}")
                        continue
                
                if not balance_info:
                    # 如果所有端点都失败，返回不支持的信息
                    balance_info = {
                        "provider_id": provider_id,
                        "provider_name": provider.name,
                        "balance": "不支持余额查询",
                        "endpoint": None,
                        "raw_data": None
                    }
                    logger.warning(f"供应商 {provider.name} 不支持余额查询或所有端点均失败")
                else:
                    # 更新数据库
                    provider.balance = balance_info["balance"]
                    provider.balance_updated_at = datetime.now()
                    await db.commit()
                    logger.success(f"成功获取余额: {balance_info['balance']}")
                
                return balance_info
                
        except httpx.TimeoutException:
            raise ConnectionError(f"连接供应商 {provider.name} 超时")
        except httpx.RequestError as e:
            raise ConnectionError(f"请求供应商 {provider.name} 失败: {str(e)}")
        except Exception as e:
            logger.error(f"获取账户余额异常: {str(e)}")
            raise
    
    async def get_cached_models(
        self,
        db: AsyncSession,
        provider_id: int
    ) -> List[ApiModel]:
        """获取供应商的缓存模型列表"""
        # 验证供应商存在
        provider = await self.get_provider_by_id(db, provider_id)
        if not provider:
            raise ValueError(f"供应商 {provider_id} 不存在")
        
        result = await db.execute(
            select(ApiModel)
            .where(ApiModel.provider_id == provider_id)
            .order_by(ApiModel.model_id)
        )
        return list(result.scalars().all())


# 创建服务实例
api_provider_service = ApiProviderService()

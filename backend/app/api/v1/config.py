"""
配置管理 API 路由
提供启动器配置的读写操作
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ...core.database import get_db
from ...services.config_service import config_service
from ...models.response import APIResponse

router = APIRouter(tags=["config"])


# ===== Pydantic 模型 =====

class ConfigItem(BaseModel):
    """配置项模型"""
    key: str
    value: str
    description: Optional[str] = None


class PathConfigItem(BaseModel):
    """路径配置项模型"""
    name: str
    path: str
    path_type: str  # "executable" or "directory"
    is_verified: bool = False
    description: Optional[str] = None


class MAIBotConfigItem(BaseModel):
    """MAIBot 配置模型"""
    maibot_path: Optional[str] = None
    config_path: Optional[str] = None
    data_path: Optional[str] = None
    python_env_id: Optional[int] = None
    is_installed: bool = False
    version: Optional[str] = None


# ===== 通用配置 API =====

@router.get("")
async def get_all_configs(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取所有配置"""
    try:
        configs = await config_service.get_all_configs(db)
        return APIResponse(
            success=True,
            message="成功获取所有配置",
            data=configs
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取配置失败: {str(e)}"
        )


@router.get("/{key}")
async def get_config(key: str, db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取指定配置"""
    try:
        value = await config_service.get_config(db, key)
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"配置 {key} 不存在"
            )
        return APIResponse(
            success=True,
            message=f"成功获取配置 {key}",
            data={"key": key, "value": value}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取配置失败: {str(e)}"
        )


@router.post("")
async def set_config(
    config: ConfigItem, 
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """设置配置"""
    try:
        result = await config_service.set_config(
            db, 
            config.key, 
            config.value, 
            config.description
        )
        return APIResponse(
            success=True,
            message=f"成功设置配置 {config.key}",
            data={
                "key": result.key,
                "value": result.value,
                "description": result.description
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置配置失败: {str(e)}"
        )


# ===== Python 环境 API =====

@router.get("/python/environments")
async def get_python_environments(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取所有 Python 环境"""
    try:
        envs = await config_service.get_python_environments(db)
        return APIResponse(
            success=True,
            message="成功获取 Python 环境列表",
            data={
                "environments": [
                    {
                        "id": env.id,
                        "path": env.path,
                        "version": env.version,
                        "major": env.major,
                        "minor": env.minor,
                        "micro": env.micro,
                        "is_default": env.is_default,
                        "is_selected": env.is_selected
                    }
                    for env in envs
                ]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 Python 环境失败: {str(e)}"
        )


@router.get("/python/selected")
async def get_selected_python(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取当前选择的 Python 环境"""
    try:
        env = await config_service.get_selected_python(db)
        if not env:
            return APIResponse(
                success=False,
                message="未设置 Python 环境",
                data=None
            )
        return APIResponse(
            success=True,
            message="成功获取选择的 Python 环境",
            data={
                "id": env.id,
                "path": env.path,
                "version": env.version
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 Python 环境失败: {str(e)}"
        )


@router.post("/python/select/{path:path}")
async def select_python(path: str, db: AsyncSession = Depends(get_db)) -> APIResponse:
    """选择 Python 环境"""
    try:
        success = await config_service.set_selected_python(db, path)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Python 环境 {path} 不存在"
            )
        return APIResponse(
            success=True,
            message="成功设置 Python 环境",
            data={"path": path}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置 Python 环境失败: {str(e)}"
        )


# ===== MAIBot 配置 API =====

@router.get("/maibot")
async def get_maibot_config(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取 MAIBot 配置"""
    try:
        config = await config_service.get_maibot_config(db)
        if not config:
            return APIResponse(
                success=False,
                message="MAIBot 配置不存在",
                data=None
            )
        return APIResponse(
            success=True,
            message="成功获取 MAIBot 配置",
            data={
                "maibot_path": config.maibot_path,
                "config_path": config.config_path,
                "data_path": config.data_path,
                "python_env_id": config.python_env_id,
                "is_installed": config.is_installed,
                "version": config.version
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 MAIBot 配置失败: {str(e)}"
        )


@router.post("/maibot")
async def save_maibot_config(
    config: MAIBotConfigItem,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """保存 MAIBot 配置"""
    try:
        result = await config_service.save_maibot_config(
            db,
            maibot_path=config.maibot_path,
            config_path=config.config_path,
            data_path=config.data_path,
            python_env_id=config.python_env_id,
            is_installed=config.is_installed,
            version=config.version
        )
        return APIResponse(
            success=True,
            message="成功保存 MAIBot 配置",
            data={
                "maibot_path": result.maibot_path,
                "is_installed": result.is_installed,
                "version": result.version
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存 MAIBot 配置失败: {str(e)}"
        )


# ===== 路径配置 API =====

@router.get("/paths")
async def get_all_paths(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取所有路径配置"""
    try:
        paths = await config_service.get_all_paths(db)
        return APIResponse(
            success=True,
            message="成功获取所有路径配置",
            data={
                "paths": [
                    {
                        "name": p.name,
                        "path": p.path,
                        "path_type": p.path_type,
                        "is_verified": p.is_verified,
                        "description": p.description
                    }
                    for p in paths
                ]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取路径配置失败: {str(e)}"
        )


@router.get("/paths/{name}")
async def get_path(name: str, db: AsyncSession = Depends(get_db)) -> APIResponse:
    """获取指定路径配置"""
    try:
        path = await config_service.get_path(db, name)
        if path is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"路径配置 {name} 不存在"
            )
        return APIResponse(
            success=True,
            message=f"成功获取路径配置 {name}",
            data={"name": name, "path": path}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取路径配置失败: {str(e)}"
        )


@router.post("/paths")
async def set_path(
    path_config: PathConfigItem,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """设置路径配置"""
    try:
        result = await config_service.set_path(
            db,
            name=path_config.name,
            path=path_config.path,
            path_type=path_config.path_type,
            is_verified=path_config.is_verified,
            description=path_config.description
        )
        return APIResponse(
            success=True,
            message=f"成功设置路径配置 {path_config.name}",
            data={
                "name": result.name,
                "path": result.path,
                "path_type": result.path_type,
                "is_verified": result.is_verified
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置路径配置失败: {str(e)}"
        )

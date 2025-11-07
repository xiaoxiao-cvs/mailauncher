"""
环境配置 API
提供环境检查和配置的 REST API 端点
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from ...core.environment import environment_manager, PythonVersion, GitInfo
from ...core.config import settings
from ...core.database import get_db
from ...models.response import APIResponse

router = APIRouter()


class SetPythonDefaultRequest(BaseModel):
    """设置默认 Python 请求模型"""
    python_path: str


class SetVenvTypeRequest(BaseModel):
    """设置虚拟环境类型请求模型"""
    venv_type: str  # venv, uv, conda


@router.get("/python/versions")
async def get_python_versions(
    refresh: bool = False,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    获取系统中所有可用的 Python 版本
    
    Args:
        refresh: 是否强制刷新缓存
        db: 数据库会话
        
    Returns:
        包含 Python 版本列表的响应
    """
    try:
        from ...services.config_service import config_service
        
        versions = environment_manager.get_python_versions(force_refresh=refresh)
        
        # 获取用户选择的 Python
        selected_python = await config_service.get_selected_python(db)
        selected_path = selected_python.path if selected_python else None
        
        return APIResponse(
            success=True,
            message="成功获取 Python 版本列表",
            data=[
                {
                    "path": ver.path,
                    "version": ver.version,
                    "major": ver.major,
                    "minor": ver.minor,
                    "micro": ver.micro,
                    "is_default": ver.is_default,
                    "is_selected": ver.path == selected_path,
                }
                for ver in versions
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 Python 版本失败: {str(e)}")


@router.get("/python/default")
async def get_default_python(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """
    获取默认的 Python 版本（优先返回用户选择的版本）
    
    Returns:
        包含默认 Python 版本信息的响应
    """
    try:
        from ...services.config_service import config_service
        
        # 首先尝试从数据库获取用户选择的 Python
        selected_python = await config_service.get_selected_python(db)
        
        if selected_python:
            return APIResponse(
                success=True,
                message="成功获取默认 Python 版本",
                data={
                    "path": selected_python.path,
                    "version": selected_python.version,
                    "major": selected_python.major,
                    "minor": selected_python.minor,
                    "micro": selected_python.micro,
                    "is_user_selected": True,
                }
            )
        
        # 如果没有用户选择，使用系统默认
        default_python = environment_manager.get_default_python()
        
        if not default_python:
            return APIResponse(
                success=False,
                message="未找到可用的 Python",
                data=None
            )
        
        return APIResponse(
            success=True,
            message="成功获取默认 Python 版本",
            data={
                "path": default_python.path,
                "version": default_python.version,
                "major": default_python.major,
                "minor": default_python.minor,
                "micro": default_python.micro,
                "is_user_selected": False,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取默认 Python 失败: {str(e)}")


@router.post("/python/default")
async def set_default_python(
    request: SetPythonDefaultRequest,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    设置默认的 Python 版本
    
    Args:
        request: 包含 python_path 的请求体
        db: 数据库会话
        
    Returns:
        设置结果响应
    """
    try:
        from ...services.config_service import config_service
        
        # 验证 Python 路径是否存在于可用版本中
        versions = environment_manager.get_python_versions()
        target_version = None
        
        for ver in versions:
            if ver.path == request.python_path:
                target_version = ver
                break
        
        if not target_version:
            return APIResponse(
                success=False,
                message=f"指定的 Python 路径不存在或不可用: {request.python_path}",
                data=None
            )
        
        # 先保存到数据库（如果不存在）
        await config_service.save_python_environment(
            db=db,
            path=target_version.path,
            version=target_version.version,
            major=target_version.major,
            minor=target_version.minor,
            micro=target_version.micro,
            is_default=target_version.is_default,
            is_selected=False  # 先设为 False
        )
        
        # 设置为选中的 Python
        success = await config_service.set_selected_python(db, request.python_path)
        
        if not success:
            return APIResponse(
                success=False,
                message="设置默认 Python 失败",
                data=None
            )
        
        return APIResponse(
            success=True,
            message="成功设置默认 Python 版本",
            data={
                "path": target_version.path,
                "version": target_version.version,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置默认 Python 失败: {str(e)}")


@router.get("/git")
async def get_git_info(refresh: bool = False) -> APIResponse:
    """
    获取 Git 环境信息
    
    Args:
        refresh: 是否强制刷新缓存
        
    Returns:
        包含 Git 信息的响应
    """
    try:
        git_info = environment_manager.check_git(force_refresh=refresh)
        
        return APIResponse(
            success=True,
            message="成功获取 Git 信息",
            data={
                "path": git_info.path,
                "version": git_info.version,
                "is_available": git_info.is_available,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 Git 信息失败: {str(e)}")


@router.get("/system")
async def get_system_info() -> APIResponse:
    """
    获取系统信息
    
    Returns:
        包含系统信息的响应
    """
    try:
        system_info = environment_manager.get_system_info()
        
        return APIResponse(
            success=True,
            message="成功获取系统信息",
            data=system_info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统信息失败: {str(e)}")


@router.get("/config")
async def get_environment_config(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """
    获取当前环境配置
    
    Returns:
        包含环境配置的响应
    """
    try:
        from ...services.config_service import config_service
        
        # 尝试从数据库获取用户保存的部署路径
        saved_instances_dir = await config_service.get_path(db, "instances_dir")
        
        # 如果数据库中没有保存的路径，使用默认路径
        if saved_instances_dir:
            instances_path = saved_instances_dir
        else:
            instances_path = str(settings.get_instances_path())
        
        return APIResponse(
            success=True,
            message="成功获取环境配置",
            data={
                "instances_dir": instances_path,
                "python_executable": settings.PYTHON_EXECUTABLE or "系统默认",
                "git_executable": settings.GIT_EXECUTABLE or "系统默认",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取环境配置失败: {str(e)}")


@router.get("/check")
async def check_environment() -> APIResponse:
    """
    执行完整的环境检查
    
    Returns:
        包含完整环境检查结果的响应
    """
    try:
        # 检查 Python
        python_versions = environment_manager.get_python_versions()
        default_python = environment_manager.get_default_python()
        
        # 检查 Git
        git_info = environment_manager.check_git()
        
        # 检查实例目录
        instances_path = settings.get_instances_path()
        instances_dir_exists = instances_path.exists()
        
        # 系统信息
        system_info = environment_manager.get_system_info()
        
        # 环境健康状态
        is_healthy = (
            len(python_versions) > 0 and
            default_python is not None and
            git_info.is_available and
            (instances_dir_exists or True)  # 目录可以自动创建，不是关键问题
        )
        
        return APIResponse(
            success=True,
            message="环境检查完成",
            data={
                "is_healthy": is_healthy,
                "python": {
                    "available_versions": len(python_versions),
                    "default": {
                        "path": default_python.path if default_python else None,
                        "version": default_python.version if default_python else None,
                    } if default_python else None,
                },
                "git": {
                    "is_available": git_info.is_available,
                    "path": git_info.path,
                    "version": git_info.version,
                },
                "instances_dir": {
                    "path": str(instances_path),
                    "exists": instances_dir_exists,
                },
                "system": system_info,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"环境检查失败: {str(e)}")


@router.get("/venv/type")
async def get_venv_type(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """
    获取虚拟环境类型配置
    
    Returns:
        包含虚拟环境类型的响应
    """
    try:
        from ...services.config_service import config_service
        
        # 从数据库获取虚拟环境类型，默认为 venv
        venv_type = await config_service.get_config(db, "venv_type")
        
        if not venv_type:
            # 如果没有配置，设置默认值
            await config_service.set_config(
                db=db,
                key="venv_type",
                value="venv",
                description="虚拟环境类型: venv, uv, conda"
            )
            venv_type = "venv"
        
        return APIResponse(
            success=True,
            message="成功获取虚拟环境类型",
            data={
                "venv_type": venv_type,
                "available_types": ["venv", "uv", "conda"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取虚拟环境类型失败: {str(e)}")


@router.post("/venv/type")
async def set_venv_type(
    request: SetVenvTypeRequest,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    设置虚拟环境类型
    
    Args:
        request: 包含 venv_type 的请求体
        db: 数据库会话
        
    Returns:
        设置结果响应
    """
    try:
        from ...services.config_service import config_service
        
        # 验证虚拟环境类型
        valid_types = ["venv", "uv", "conda"]
        if request.venv_type not in valid_types:
            return APIResponse(
                success=False,
                message=f"无效的虚拟环境类型: {request.venv_type}，支持的类型: {', '.join(valid_types)}",
                data=None
            )
        
        # 保存到数据库
        await config_service.set_config(
            db=db,
            key="venv_type",
            value=request.venv_type,
            description="虚拟环境类型: venv, uv, conda"
        )
        
        return APIResponse(
            success=True,
            message="成功设置虚拟环境类型",
            data={
                "venv_type": request.venv_type
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置虚拟环境类型失败: {str(e)}")


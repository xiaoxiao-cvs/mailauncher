"""
下载相关的 API 端点
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from typing import Dict

from ...models.download import (
    DownloadTask,
    DownloadTaskCreate,
    DownloadItemType,
    VersionsResponse,
)
from ...models.response import ResponseBase, SuccessResponse
from ...services.download_manager import get_download_manager
from ...services.download_service import get_download_service
from ...core.websocket import get_connection_manager
from ...core.logger import logger

router = APIRouter()


@router.post("/downloads", response_model=ResponseBase[DownloadTask])
async def create_download_task(
    task_data: DownloadTaskCreate,
    background_tasks: BackgroundTasks,
):
    """
    创建下载任务

    创建一个新的下载任务，任务会在后台异步执行。
    """
    try:
        manager = get_download_manager()
        
        # 创建任务
        task = manager.create_task(task_data)
        
        # 在后台启动任务
        background_tasks.add_task(manager.start_task, task.id)
        
        logger.info(f"创建下载任务: {task.id}")
        
        return SuccessResponse(
            data=task,
            message="下载任务已创建",
        )
        
    except Exception as e:
        logger.error(f"创建下载任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/downloads/{task_id}", response_model=ResponseBase[DownloadTask])
async def get_download_task(task_id: str):
    """
    获取下载任务详情

    通过任务ID获取下载任务的详细信息和进度。
    """
    try:
        manager = get_download_manager()
        task = manager.get_task(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        return SuccessResponse(data=task)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取下载任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/downloads", response_model=ResponseBase[Dict[str, DownloadTask]])
async def get_all_download_tasks():
    """
    获取所有下载任务

    获取所有下载任务的列表，包括进行中和已完成的任务。
    """
    try:
        manager = get_download_manager()
        tasks = manager.get_all_tasks()
        
        return SuccessResponse(data=tasks)
        
    except Exception as e:
        logger.error(f"获取下载任务列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/versions/maibot", response_model=ResponseBase[VersionsResponse])
async def get_maibot_versions():
    """
    获取 Maibot 可用版本

    获取 Maibot 仓库的所有可用 tags 和 branches。
    """
    try:
        download_service = get_download_service()
        versions = await download_service.get_available_versions(
            DownloadItemType.MAIBOT
        )
        
        response = VersionsResponse(
            tags=versions.get("tags", []),
            branches=versions.get("branches", []),
        )
        
        return SuccessResponse(data=response)
        
    except Exception as e:
        logger.error(f"获取 Maibot 版本失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/downloads/{task_id}", response_model=ResponseBase[None])
async def cancel_download_task(task_id: str):
    """
    取消下载任务

    取消指定的下载任务（仅对未开始的任务有效）。
    """
    try:
        manager = get_download_manager()
        task = manager.get_task(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # TODO: 实现任务取消逻辑
        
        return SuccessResponse(message="任务已取消")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取消下载任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/downloads/{task_id}")
async def websocket_download_progress(websocket: WebSocket, task_id: str):
    """
    WebSocket 端点 - 实时推送下载进度和日志
    
    客户端连接此端点后，会实时接收以下类型的消息：
    - log: 日志消息 { type: "log", level: "info|success|warning|error", message: string, timestamp: string }
    - progress: 进度更新 { type: "progress", current: number, total: number, percentage: number, message: string, status: string, timestamp: string }
    - status: 状态更新 { type: "status", status: string, message: string, timestamp: string }
    - error: 错误消息 { type: "error", message: string, timestamp: string }
    - complete: 完成消息 { type: "complete", message: string, timestamp: string }
    """
    ws_manager = get_connection_manager()
    
    try:
        # 建立连接
        await ws_manager.connect(websocket, task_id)
        logger.info(f"WebSocket 已连接: 任务 {task_id}")
        
        # 发送连接成功消息
        await ws_manager.send_log(task_id, "info", "已连接到服务器")
        
        # 保持连接并接收客户端消息
        while True:
            try:
                # 接收客户端消息（主要用于保持连接活跃）
                data = await websocket.receive_text()
                logger.debug(f"收到客户端消息: {data}")
                
                # 可以在这里处理客户端发送的控制命令（如取消任务等）
                
            except WebSocketDisconnect:
                logger.info(f"客户端断开连接: 任务 {task_id}")
                break
            except Exception as e:
                logger.error(f"WebSocket 错误: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket 连接失败: {e}")
    finally:
        # 清理连接
        ws_manager.disconnect(websocket, task_id)

"""
实例管理 API 路由
提供实例的 CRUD 和控制操作
"""
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from ...models import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceList,
    InstanceStatusResponse,
    SuccessResponse,
)
from ...services.instance_service import get_instance_service, InstanceService
from ...services.process_manager import get_process_manager
from ...core.database import get_db
from ...core.logger import logger

router = APIRouter(tags=["instances"])


@router.get("", response_model=InstanceList)
async def get_instances(
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取所有实例列表"""
    instances = await service.get_all_instances(db)
    return InstanceList(total=len(instances), instances=instances)


@router.get("/{instance_id}", response_model=Instance)
async def get_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取指定实例详情"""
    instance = await service.get_instance(db, instance_id)
    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
    return instance


@router.get("/{instance_id}/status", response_model=InstanceStatusResponse)
async def get_instance_status(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """获取实例运行状态"""
    status_info = await service.get_instance_status(db, instance_id)
    if not status_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
    return status_info


@router.post("", response_model=Instance, status_code=status.HTTP_201_CREATED)
async def create_instance(
    instance_data: InstanceCreate,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """创建新实例"""
    try:
        return await service.create_instance(db, instance_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{instance_id}", response_model=Instance)
async def update_instance(
    instance_id: str,
    update_data: InstanceUpdate,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """更新实例配置"""
    try:
        instance = await service.update_instance(db, instance_id, update_data)
        if not instance:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
        return instance
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{instance_id}", response_model=SuccessResponse)
async def delete_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """删除实例"""
    try:
        success = await service.delete_instance(db, instance_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
        return SuccessResponse(success=True, message=f"实例 {instance_id} 已删除")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{instance_id}/start", response_model=SuccessResponse)
async def start_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """启动实例"""
    success = await service.start_instance(db, instance_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
    return SuccessResponse(success=True, message=f"实例 {instance_id} 启动成功")


@router.post("/{instance_id}/stop", response_model=SuccessResponse)
async def stop_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """停止实例"""
    results = await service.stop_instance(db, instance_id)
    if "error" in results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
    return SuccessResponse(success=True, message=f"实例 {instance_id} 已停止")


@router.post("/{instance_id}/restart", response_model=SuccessResponse)
async def restart_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """重启实例"""
    results = await service.restart_instance(db, instance_id)
    if "error" in results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"实例 {instance_id} 不存在")
    return SuccessResponse(success=True, message=f"实例 {instance_id} 已重启")


@router.post("/{instance_id}/component/{component}/start", response_model=SuccessResponse)
async def start_component(
    instance_id: str,
    component: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """启动实例的指定组件 (main, napcat, napcat-ada)"""
    success = await service.start_component(db, instance_id, component)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"组件 {component} 启动失败")
    return SuccessResponse(success=True, message=f"组件 {component} 已启动")


@router.post("/{instance_id}/component/{component}/stop", response_model=SuccessResponse)
async def stop_component(
    instance_id: str,
    component: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    """停止实例的指定组件 (main, napcat, napcat-ada)"""
    success = await service.stop_component(db, instance_id, component)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"组件 {component} 停止失败")
    return SuccessResponse(success=True, message=f"组件 {component} 已停止")


@router.get("/{instance_id}/component/{component}/status")
async def get_component_status(
    instance_id: str,
    component: str,
    service: InstanceService = Depends(get_instance_service),
):
    """获取组件状态"""
    return await service.get_component_status(instance_id, component)


@router.websocket("/{instance_id}/component/{component}/terminal")
async def terminal_websocket(
    websocket: WebSocket,
    instance_id: str,
    component: str,
    history: int = 300,  # 默认返回300行历史记录
):
    """
    终端 WebSocket 端点
    提供实时的终端输出和输入交互
    支持查询参数 history 指定返回的历史日志行数
    """
    process_manager = get_process_manager()
    
    try:
        await websocket.accept()
        logger.info(f"终端 WebSocket 已连接: {instance_id}/{component}, 请求历史: {history} 行")
        
        # 获取进程信息
        process_info = process_manager.get_process_info(instance_id, component)
        
        if not process_info:
            await websocket.send_json({
                "type": "error",
                "message": f"组件 {component} 未运行"
            })
            await websocket.close()
            return
        
        if not process_info.is_alive():
            await websocket.send_json({
                "type": "error",
                "message": f"组件 {component} 进程已停止"
            })
            await websocket.close()
            return
        
        # 发送连接成功消息
        await websocket.send_json({
            "type": "connected",
            "message": f"已连接到 {instance_id}/{component}",
            "pid": process_info.pid
        })
        
        # 发送历史日志
        if history > 0:
            history_lines = process_manager.get_output_history(instance_id, component, history)
            if history_lines:
                await websocket.send_json({
                    "type": "history",
                    "lines": history_lines
                })
                logger.debug(f"已发送 {len(history_lines)} 行历史日志")
        
        # 创建读取进程输出的任务
        async def read_output():
            try:
                process = process_info.process
                
                # Unix PTY 进程
                if hasattr(process, 'master_fd') and hasattr(process, 'is_pty'):
                    import os
                    import codecs
                    master_fd = process.master_fd
                    decoder = codecs.getincrementaldecoder("utf-8")(errors='replace')
                    
                    while True:
                        try:
                            # 非阻塞读取
                            data = os.read(master_fd, 4096)
                            if not data:
                                await asyncio.sleep(0.05)
                                continue
                            
                            text = decoder.decode(data, final=False)
                            
                            # 添加到缓冲区
                            process_manager.add_output_to_buffer(instance_id, component, text)
                            
                            # 发送给前端
                            await websocket.send_json({
                                "type": "output",
                                "data": text
                            })
                        except BlockingIOError:
                            await asyncio.sleep(0.05)
                        except Exception as e:
                            logger.error(f"读取 PTY 输出失败: {e}")
                            break
                
                # Unix asyncio subprocess
                elif hasattr(process, 'stdout') and process.stdout:
                    while True:
                        try:
                            line = await process.stdout.readline()
                            if not line:
                                break
                            
                            text = line.decode('utf-8', errors='replace')
                            
                            # 添加到缓冲区
                            process_manager.add_output_to_buffer(instance_id, component, text)
                            
                            # 发送给前端
                            await websocket.send_json({
                                "type": "output",
                                "data": text
                            })
                        except Exception as e:
                            logger.error(f"读取输出失败: {e}")
                            break
                
                # Windows winpty
                elif hasattr(process, 'read'):
                    import threading
                    import time
                    loop = asyncio.get_event_loop()
                    output_queue: asyncio.Queue[str] = asyncio.Queue()
                    stop_flag = {"value": False}

                    def reader_thread():
                        while not stop_flag["value"]:
                            try:
                                data = process.read()
                                if data:
                                    asyncio.run_coroutine_threadsafe(output_queue.put(data), loop)
                                else:
                                    time.sleep(0.1)
                            except Exception as e:
                                logger.error(f"读取输出失败: {e}")
                                break

                    t = threading.Thread(target=reader_thread, daemon=True)
                    t.start()

                    while not stop_flag["value"]:
                        try:
                            text = await output_queue.get()
                            # 添加到缓冲区
                            process_manager.add_output_to_buffer(instance_id, component, text)
                            # 发送给前端
                            await websocket.send_json({
                                "type": "output",
                                "data": text
                            })
                        except Exception as e:
                            logger.error(f"发送输出失败: {e}")
                            break
                    stop_flag["value"] = True
                    try:
                        t.join(timeout=0.5)
                    except Exception:
                        pass
                else:
                    logger.warning(f"进程 {instance_id}/{component} 不支持输出读取")
                    
            except Exception as e:
                logger.error(f"读取输出任务异常: {e}", exc_info=True)
        
        # 启动输出读取任务
        output_task = asyncio.create_task(read_output())
        
        try:
            # 接收来自前端的输入
            while True:
                try:
                    message = await websocket.receive_json()
                    
                    if message.get("type") == "input":
                        # 发送用户输入到进程
                        data = message.get("data", "")
                        process = process_info.process
                        
                        # Unix PTY
                        if hasattr(process, 'master_fd') and hasattr(process, 'is_pty'):
                            import os
                            os.write(process.master_fd, data.encode('utf-8'))
                        # Unix asyncio subprocess
                        elif hasattr(process, 'stdin') and process.stdin:
                            process.stdin.write(data.encode('utf-8'))
                            await process.stdin.drain()
                        # Windows winpty
                        elif hasattr(process, 'write'):
                            process.write(data)
                        else:
                            logger.warning(f"进程 {instance_id}/{component} 不支持输入")
                            
                    elif message.get("type") == "resize":
                        # 处理终端大小调整
                        rows = message.get("rows", 24)
                        cols = message.get("cols", 80)
                        
                        # Windows winpty
                        if hasattr(process_info.process, 'set_winsize'):
                            process_info.process.set_winsize(rows, cols)
                            logger.debug(f"Windows 终端大小已调整: {rows}x{cols}")
                        # Unix PTY
                        elif hasattr(process_info.process, 'master_fd') and hasattr(process_info.process, 'is_pty'):
                            try:
                                import fcntl
                                import termios
                                import struct
                                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                fcntl.ioctl(process_info.process.master_fd, termios.TIOCSWINSZ, winsize)
                                logger.debug(f"Unix 终端大小已调整: {rows}x{cols}")
                            except Exception as e:
                                logger.warning(f"调整 Unix 终端大小失败: {e}")
                        # Fallback for other types or older winpty versions
                        elif hasattr(process_info.process, 'setwinsize'):
                            process_info.process.setwinsize(rows, cols)
                            logger.debug(f"终端大小已调整(fallback): {rows}x{cols}")
                        
                except WebSocketDisconnect:
                    logger.info(f"终端 WebSocket 断开: {instance_id}/{component}")
                    break
                except Exception as e:
                    logger.error(f"处理 WebSocket 消息失败: {e}")
                    break
                    
        finally:
            # 取消输出读取任务
            output_task.cancel()
            try:
                await output_task
            except asyncio.CancelledError:
                pass
                
    except Exception as e:
        logger.error(f"终端 WebSocket 错误: {e}", exc_info=True)
    finally:
        try:
            await websocket.close()
        except:
            pass
        logger.info(f"终端 WebSocket 已关闭: {instance_id}/{component}")
@router.get("/{instance_id}/components", response_model=List[str])
async def get_instance_components(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    service: InstanceService = Depends(get_instance_service),
):
    return await service.get_available_components(db, instance_id)

"""
前端日志 API
处理前端日志的保存、查询、导出和清理

日志管理策略：
1. 按天创建日志文件（格式：frontend_YYYYMMDD.jsonl）
2. 同一天的所有日志写入同一个文件，避免刷新浏览器创建新文件
3. 每天首次写入时自动压缩昨天及更早的 .jsonl 文件为 .zip
4. 保留最近 7 个压缩的日志文件，自动删除更旧的文件
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import json
import zipfile
import os

from app.core.logger import logger

router = APIRouter(prefix="/logger", tags=["logger"])


class LogEntry(BaseModel):
    """日志条目"""
    timestamp: str
    level: str
    tag: Optional[str] = None
    message: str
    args: Optional[List] = None
    error: Optional[dict] = None


class FrontendLogsRequest(BaseModel):
    """前端日志请求"""
    logs: List[LogEntry]


# 前端日志目录
FRONTEND_LOG_DIR = Path(__file__).parent.parent.parent.parent / "data" / "Log" / "frontend"
FRONTEND_LOG_DIR.mkdir(parents=True, exist_ok=True)

# 当前日志文件（按天创建，同一天内复用）
current_log_file: Optional[Path] = None
# 保留的最大压缩日志文件数量
MAX_LOG_FILES = 7


def _get_current_log_file() -> Path:
    """获取当前日志文件路径（按天创建）"""
    global current_log_file
    
    # 获取今天的日期
    today = datetime.now().strftime("%Y%m%d")
    today_log_pattern = f"frontend_{today}"
    
    # 检查当前日志文件是否是今天的
    if current_log_file is None or not current_log_file.name.startswith(today_log_pattern):
        # 查找今天是否已经有日志文件
        existing_today_logs = list(FRONTEND_LOG_DIR.glob(f"{today_log_pattern}*.jsonl"))
        
        if existing_today_logs:
            # 使用已存在的今天的日志文件
            current_log_file = existing_today_logs[0]
            logger.info(f"使用已存在的前端日志文件: {current_log_file.name}")
        else:
            # 创建新的日志文件（仅包含日期，不含时间戳）
            current_log_file = FRONTEND_LOG_DIR / f"frontend_{today}.jsonl"
            logger.info(f"创建新的前端日志文件: {current_log_file.name}")
            
            # 只在新的一天开始时压缩昨天及更早的日志
            _compress_old_logs()
            _cleanup_old_logs()
    
    return current_log_file


def _compress_old_logs():
    """压缩昨天及更早的 JSON Lines 日志文件（不压缩今天的日志）"""
    today = datetime.now().strftime("%Y%m%d")
    jsonl_files = sorted(FRONTEND_LOG_DIR.glob("*.jsonl"))
    
    for jsonl_file in jsonl_files:
        # 跳过当前正在使用的日志文件
        if jsonl_file == current_log_file:
            continue
        
        # 检查是否是今天的日志文件
        if jsonl_file.name.startswith(f"frontend_{today}"):
            continue
        
        # 只压缩昨天及更早的日志
        zip_path = jsonl_file.with_suffix('.zip')
        if not zip_path.exists():
            try:
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    zipf.write(jsonl_file, jsonl_file.name)
                jsonl_file.unlink()
                logger.info(f"已压缩前端日志: {jsonl_file.name} -> {zip_path.name}")
            except Exception as e:
                logger.error(f"压缩前端日志失败 {jsonl_file.name}: {e}")


def _cleanup_old_logs():
    """清理旧的日志文件"""
    zip_files = sorted(
        FRONTEND_LOG_DIR.glob("*.zip"),
        key=lambda x: x.stat().st_mtime,
        reverse=True
    )
    
    if len(zip_files) > MAX_LOG_FILES:
        for old_log in zip_files[MAX_LOG_FILES:]:
            try:
                old_log.unlink()
                logger.info(f"已删除旧的前端日志: {old_log.name}")
            except Exception as e:
                logger.error(f"删除旧的前端日志失败 {old_log.name}: {e}")


@router.post("/frontend")
async def save_frontend_logs(request: FrontendLogsRequest):
    """
    保存前端日志
    
    前端定期将缓冲区中的日志发送到后端保存
    """
    try:
        log_file = _get_current_log_file()
        
        # 追加日志到文件
        with open(log_file, 'a', encoding='utf-8') as f:
            for log_entry in request.logs:
                f.write(json.dumps(log_entry.dict(), ensure_ascii=False) + '\n')
        
        logger.debug(f"保存了 {len(request.logs)} 条前端日志")
        
        return {
            "success": True,
            "message": f"已保存 {len(request.logs)} 条日志"
        }
    except Exception as e:
        logger.error(f"保存前端日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frontend/files")
async def list_frontend_log_files():
    """
    获取前端日志文件列表
    """
    try:
        files = []
        
        # 获取所有日志文件（jsonl 和 zip）
        for file_path in FRONTEND_LOG_DIR.iterdir():
            if file_path.suffix in ['.jsonl', '.zip']:
                files.append({
                    "name": file_path.name,
                    "path": str(file_path),
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "compressed": file_path.suffix == '.zip'
                })
        
        # 按修改时间降序排列
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return {
            "success": True,
            "data": files
        }
    except Exception as e:
        logger.error(f"获取前端日志文件列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frontend/content")
async def get_frontend_log_content(path: str):
    """
    获取前端日志文件内容
    
    Args:
        path: 日志文件路径
    """
    try:
        file_path = Path(path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="日志文件不存在")
        
        if not file_path.is_relative_to(FRONTEND_LOG_DIR):
            raise HTTPException(status_code=403, detail="无权访问该文件")
        
        # 如果是压缩文件，需要先解压
        if file_path.suffix == '.zip':
            with zipfile.ZipFile(file_path, 'r') as zipf:
                # 获取 zip 中的第一个文件
                names = zipf.namelist()
                if names:
                    content = zipf.read(names[0]).decode('utf-8')
                else:
                    content = ''
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        return {
            "success": True,
            "data": content
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"读取前端日志内容失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frontend/export")
async def export_frontend_logs():
    """
    导出所有前端日志为 zip 文件
    """
    try:
        export_path = FRONTEND_LOG_DIR.parent / f"frontend_logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        
        with zipfile.ZipFile(export_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in FRONTEND_LOG_DIR.iterdir():
                if file_path.suffix in ['.jsonl', '.zip']:
                    zipf.write(file_path, f"frontend/{file_path.name}")
        
        logger.info(f"导出前端日志: {export_path.name}")
        
        return FileResponse(
            path=export_path,
            filename=export_path.name,
            media_type='application/zip'
        )
    except Exception as e:
        logger.error(f"导出前端日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/frontend/clear")
async def clear_frontend_logs():
    """
    清除所有前端日志文件
    """
    try:
        count = 0
        for file_path in FRONTEND_LOG_DIR.iterdir():
            if file_path.suffix in ['.jsonl', '.zip']:
                file_path.unlink()
                count += 1
        
        logger.info(f"清除了 {count} 个前端日志文件")
        
        # 重置当前日志文件
        global current_log_file
        current_log_file = None
        
        return {
            "success": True,
            "message": f"已清除 {count} 个日志文件"
        }
    except Exception as e:
        logger.error(f"清除前端日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

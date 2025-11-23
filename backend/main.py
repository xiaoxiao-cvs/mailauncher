"""
MAI Launcher Backend
主入口文件
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import settings, api_v1_router
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.core.database import init_db, close_db
from app.services.process_manager import get_process_manager
from app.core.logger import setup_logger, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("=" * 60)
    logger.info("MAI Launcher Backend 启动中...")
    logger.info("=" * 60)
    
    # 确保实例目录存在
    instances_dir = settings.ensure_instances_dir()
    logger.info(f"实例目录已就绪: {instances_dir}")
    
    # 初始化数据库
    await init_db()
    logger.info("数据库初始化完成")
    
    yield  # 应用运行期间
    
    # 关闭时
    logger.info("MAI Launcher Backend 正在关闭...")
    try:
        pm = get_process_manager()
        logger.info("优先强制结束所有 PTY/终端进程并清理...")
        await pm.cleanup()
    except Exception as e:
        logger.error(f"清理进程时发生错误: {e}")
    await close_db()
    logger.info("数据库连接已关闭")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MAI Launcher 后端服务 API",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 统一异常处理器
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "status": "ok",
        "message": "MAI Launcher Backend is running"
    }


def main():
    """主函数:启动 Uvicorn 服务器"""
    import uvicorn
    import sys
    from app.core.data_dir import init_data_directories
    
    # 初始化数据目录
    init_data_directories()
    
    # 初始化日志系统 (必须在数据目录初始化之后)
    setup_logger()
    
    # 检查是否由 PyInstaller 打包运行
    is_packaged = getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')
    
    logger.info(f"[MAIN] 运行模式: {'打包模式' if is_packaged else '开发模式'}")
    logger.info(f"[MAIN] __name__ = {__name__}")
    logger.info(f"[MAIN] sys.frozen = {getattr(sys, 'frozen', False)}")
    logger.info(f"[MAIN] sys.argv = {sys.argv}")
    
    if is_packaged:
        # 打包模式:直接传递 app 对象
        logger.info(f"[MAIN] 后端服务启动在 {settings.HOST}:{settings.PORT}")
        uvicorn.run(
            app,
            host=settings.HOST,
            port=settings.PORT,
            log_level="info"
        )
    else:
        # 开发模式:使用字符串以支持热重载
        logger.info(f"[MAIN] 开发服务器启动在 {settings.HOST}:{settings.PORT}")
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=True,
            log_level="info"
        )


if __name__ == "__main__":
    # 检查是否是 multiprocessing 的子进程
    # 子进程的 sys.argv 会包含 '-c' 参数,用于执行 Python 代码
    import sys
    is_subprocess = any('-c' in str(arg) for arg in sys.argv)
    
    if is_subprocess:
        # 这是 multiprocessing 的子进程 (如 resource_tracker)
        # 不启动服务器,让 Python 执行 -c 后面的代码
        logger.debug(f"[子进程] 检测到 multiprocessing 子进程,跳过服务器启动: {sys.argv}")
    else:
        # 正常的主进程,启动服务器
        main()

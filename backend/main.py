"""
MAI Launcher Backend
主入口文件
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import settings, api_v1_router
from app.core.database import init_db, close_db
from app.core.logger import setup_logger, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    setup_logger()
    logger.info("=" * 60)
    logger.info("MAI Launcher Backend 启动中...")
    logger.info("=" * 60)
    
    instances_path = settings.ensure_instances_dir()
    logger.info(f"实例目录已就绪: {instances_path}")
    
    await init_db()
    logger.info("数据库初始化完成")
    
    yield
    
    logger.info("MAI Launcher Backend 关闭中...")
    await close_db()
    logger.info("数据库连接已关闭")
    logger.info("=" * 60)


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
    main()

# PyInstaller 打包后的特殊处理
# 当通过 multiprocessing 启动时,__name__ 可能不是 "__main__"
import sys
if getattr(sys, 'frozen', False):
    # 只在打包环境且不是子进程时执行
    import multiprocessing
    if multiprocessing.current_process().name == 'MainProcess':
        logger.info("[FROZEN] 检测到打包环境,MainProcess,准备启动服务器")
        # 检查是否已经在运行 (避免重复启动)
        if not any('uvicorn.run' in str(frame) for frame in sys._current_frames().values()):
            main()

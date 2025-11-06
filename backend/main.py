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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )

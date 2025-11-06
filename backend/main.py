"""
MAI Launcher Backend
主入口文件 - 使用 FastAPI 提供 HTTP API 服务

遵循单一职责原则，此文件仅负责应用初始化和路由注册
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import settings, api_v1_router
from app.core.database import init_db, close_db
from app.core.logger import setup_logger, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 - 启动和关闭时执行"""
    # 启动时执行
    setup_logger()
    logger.info("=" * 60)
    logger.info("MAI Launcher Backend 启动中...")
    logger.info("=" * 60)
    
    instances_path = settings.ensure_instances_dir()
    logger.info(f"实例目录已就绪: {instances_path}")
    
    await init_db()
    logger.success("数据库初始化完成")
    
    yield  # 应用运行期间
    
    # 关闭时执行
    logger.info("MAI Launcher Backend 关闭中...")
    await close_db()
    logger.success("数据库连接已关闭")
    logger.info("=" * 60)


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MAI Launcher 后端服务 API",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,  # 使用 lifespan 管理应用生命周期
)

# 配置 CORS 中间件，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API v1 路由
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
        host="127.0.0.1",
        port=8000,
        reload=True  # 开发模式下启用热重载
    )

"""
MAI Launcher Backend
主入口文件 - 使用 FastAPI 提供 HTTP API 服务

遵循单一职责原则，此文件仅负责应用初始化和路由注册
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import settings, api_v1_router
from app.core.database import init_db, close_db
from app.core.logger import setup_logger, logger

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MAI Launcher 后端服务 API",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
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


# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    # 初始化日志系统
    setup_logger()
    logger.info("=" * 60)
    logger.info("MAI Launcher Backend 启动中...")
    logger.info("=" * 60)
    
    # 确保必要的目录存在
    instances_path = settings.ensure_instances_dir()
    logger.info(f"实例目录已就绪: {instances_path}")
    
    # 初始化数据库，创建所有表
    await init_db()
    logger.success("数据库初始化完成")


# 应用关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    logger.info("MAI Launcher Backend 关闭中...")
    # 关闭数据库连接
    await close_db()
    logger.success("数据库连接已关闭")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True  # 开发模式下启用热重载
    )

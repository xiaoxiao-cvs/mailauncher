"""
MAI Launcher Backend
主入口文件 - 使用 FastAPI 提供 HTTP API 服务

遵循单一职责原则，此文件仅负责应用初始化和路由注册
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 创建 FastAPI 应用实例
app = FastAPI(
    title="MAI Launcher API",
    description="MAI Launcher 后端服务",
    version="0.1.0"
)

# 配置 CORS 中间件，允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 默认开发端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    pass


# 应用关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True  # 开发模式下启用热重载
    )

"""
数据库配置和会话管理
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pathlib import Path
import os

from .config import settings


def _get_logger():
    """延迟导入 logger 以避免循环依赖"""
    try:
        from .logger import logger
        return logger
    except ImportError:
        return None


class Base(DeclarativeBase):
    """SQLAlchemy 基础模型类"""
    pass


def _ensure_db_directory() -> None:
    """确保数据库目录存在"""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        db_path = db_url.split("///")[-1] if "///" in db_url else db_url.split("//")[-1]
        db_file = Path(db_path)
        
        db_dir = db_file.parent
        if not db_dir.exists():
            db_dir.mkdir(parents=True, exist_ok=True)
            log = _get_logger()
            if log:
                log.info(f"已创建数据库目录: {db_dir.absolute()}")


_ensure_db_directory()

# 创建数据库引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.LOG_LEVEL == "DEBUG",
    future=True,
)

# 创建会话工厂
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """
    获取数据库会话的依赖项
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    初始化数据库，创建所有表
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    关闭数据库连接
    """
    await engine.dispose()

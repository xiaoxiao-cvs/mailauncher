"""
数据库迁移：为 instances 表添加 qq_account 字段

用途：支持 NapCat 快速登录功能
运行方式：python migrations/add_qq_account.py
"""
import sys
import asyncio
from pathlib import Path

# 添加项目根目录到 Python 路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine
from app.core.logger import logger


async def add_qq_account_column():
    """为 instances 表添加 qq_account 字段"""
    
    try:
        async with engine.begin() as conn:
            # 检查列是否已存在
            check_query = text("""
                SELECT COUNT(*) 
                FROM pragma_table_info('instances') 
                WHERE name='qq_account'
            """)
            result = await conn.execute(check_query)
            count = result.scalar()
            
            if count > 0:
                logger.info("qq_account 列已存在，跳过迁移")
                return
            
            # 添加 qq_account 列
            alter_query = text("""
                ALTER TABLE instances 
                ADD COLUMN qq_account VARCHAR(20)
            """)
            await conn.execute(alter_query)
            logger.info("成功添加 qq_account 列到 instances 表")
            
    except Exception as e:
        logger.error(f"数据库迁移失败: {e}", exc_info=True)
        raise
    finally:
        await engine.dispose()


async def main():
    """主函数"""
    logger.info("开始数据库迁移：添加 qq_account 字段")
    await add_qq_account_column()
    logger.info("数据库迁移完成")


if __name__ == "__main__":
    asyncio.run(main())

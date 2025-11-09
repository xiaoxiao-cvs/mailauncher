"""
数据库迁移脚本：添加 instance_path 字段到 instances 表
运行方式：python migrations/add_instance_path.py
"""
import asyncio
import sys
from pathlib import Path

# 添加父目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine, Base
from app.core.logger import logger


async def migrate():
    """执行迁移"""
    async with engine.begin() as conn:
        # 检查列是否已存在
        result = await conn.execute(text("""
            SELECT COUNT(*) as count
            FROM pragma_table_info('instances')
            WHERE name = 'instance_path'
        """))
        
        row = result.fetchone()
        if row and row[0] > 0:
            logger.info("instance_path 字段已存在，跳过迁移")
            return
        
        # 添加新字段
        logger.info("添加 instance_path 字段到 instances 表...")
        await conn.execute(text("""
            ALTER TABLE instances
            ADD COLUMN instance_path VARCHAR(500)
        """))
        
        # 为现有记录填充 instance_path
        # 注意：这里不自动填充，因为实际目录名可能与实例名不同
        # 需要手动检查并更新每个实例的正确路径
        logger.info("迁移完成 - 请手动检查并更新现有实例的 instance_path")
        logger.warning("现有实例的 instance_path 为 NULL，需要根据实际目录名手动更新")
        
        logger.info("迁移完成！")


async def main():
    """主函数"""
    try:
        logger.info("开始数据库迁移...")
        await migrate()
        logger.info("数据库迁移成功完成")
    except Exception as e:
        logger.error(f"数据库迁移失败: {e}", exc_info=True)
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
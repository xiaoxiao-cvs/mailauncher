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
        
        # 为现有记录填充 instance_path（使用 name 作为默认值）
        logger.info("更新现有记录的 instance_path...")
        await conn.execute(text("""
            UPDATE instances
            SET instance_path = name
            WHERE instance_path IS NULL
        """))
        
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
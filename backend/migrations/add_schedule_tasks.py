"""
数据库迁移：添加计划任务表
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine, Base
from app.models.db_models import ScheduleTaskDB


async def upgrade():
    """创建 schedule_tasks 表"""
    async with engine.begin() as conn:
        # 创建表
        await conn.run_sync(Base.metadata.create_all, tables=[ScheduleTaskDB.__table__])
        print("✅ 成功创建 schedule_tasks 表")


async def downgrade():
    """删除 schedule_tasks 表"""
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS schedule_tasks"))
        print("✅ 成功删除 schedule_tasks 表")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        asyncio.run(downgrade())
    else:
        asyncio.run(upgrade())

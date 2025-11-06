"""测试日志系统"""
from app.core.logger import setup_logger, logger
import asyncio
from app.core.database import init_db

async def main():
    # 初始化日志
    setup_logger()
    logger.info("测试日志系统启动")
    
    # 模拟一些日志输出
    logger.debug("这是一条调试日志")
    logger.info("这是一条信息日志")
    logger.warning("这是一条警告日志")
    logger.error("这是一条错误日志")
    
    try:
        # 模拟一个异常
        result = 1 / 0
    except Exception as e:
        logger.exception("捕获到异常")
    
    logger.success("测试完成！")

if __name__ == "__main__":
    asyncio.run(main())

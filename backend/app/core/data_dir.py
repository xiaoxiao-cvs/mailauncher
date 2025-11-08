"""
数据目录管理模块
负责根据系统和运行模式管理数据目录
- macOS: 保存到用户目录 ~/mailauncher-data
- Windows: 保存到应用安装目录
- 开发环境: 使用 backend/ 目录
"""
import sys
import platform
from pathlib import Path
from loguru import logger

# 缓存数据根目录,避免重复日志
_data_root_cache: Path | None = None


def get_data_root() -> Path:
    """
    获取数据根目录 (带缓存)
    
    策略:
    1. macOS (无论是否打包): 使用用户目录 ~/mailauncher-data
    2. Windows 打包: 使用可执行文件所在目录
    3. 开发环境: 使用 backend/ 目录
    
    Returns:
        数据根目录的 Path 对象
    """
    global _data_root_cache
    
    # 如果已缓存,直接返回
    if _data_root_cache is not None:
        return _data_root_cache
    
    is_packaged = getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')
    system = platform.system()
    
    if system == 'Darwin':
        # macOS: 统一使用用户目录 (避免应用 bundle 只读问题)
        user_home = Path.home()
        data_root = user_home / "mailauncher-data"
        data_root.mkdir(parents=True, exist_ok=True)
        
        if is_packaged:
            logger.info(f"[数据目录] macOS 打包环境,使用用户目录: {data_root}")
        else:
            logger.info(f"[数据目录] macOS 开发环境,使用用户目录: {data_root}")
        
        _data_root_cache = data_root
        return data_root
    
    elif system == 'Windows':
        if is_packaged:
            # Windows 打包: 使用可执行文件所在目录
            exe_dir = Path(sys.executable).parent
            data_root = exe_dir / "mailauncher-data"
            data_root.mkdir(parents=True, exist_ok=True)
            logger.info(f"[数据目录] Windows 打包环境,使用应用目录: {data_root}")
            _data_root_cache = data_root
            return data_root
        else:
            # Windows 开发: 使用 backend 目录
            backend_root = Path(__file__).parent.parent.parent
            logger.info(f"[数据目录] Windows 开发环境,使用应用目录: {backend_root}")
            _data_root_cache = backend_root
            return backend_root
    
    else:
        # Linux 或其他系统
        if is_packaged:
            exe_dir = Path(sys.executable).parent
            data_root = exe_dir / "mailauncher-data"
            data_root.mkdir(parents=True, exist_ok=True)
            logger.info(f"[数据目录] {system} 打包环境,使用应用目录: {data_root}")
            _data_root_cache = data_root
            return data_root
        else:
            backend_root = Path(__file__).parent.parent.parent
            logger.info(f"[数据目录] {system} 开发环境,使用应用目录: {backend_root}")
            _data_root_cache = backend_root
            return backend_root


def get_log_dir() -> Path:
    """
    获取日志目录
    
    Returns:
        日志目录的 Path 对象
    """
    log_dir = get_data_root() / "data" / "Log" / "backend"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_database_dir() -> Path:
    """
    获取数据库目录
    
    Returns:
        数据库目录的 Path 对象
    """
    db_dir = get_data_root() / "data" / "database"
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir


def get_deployments_dir() -> Path:
    """
    获取部署目录
    
    Returns:
        部署目录的 Path 对象
    """
    deployments_dir = get_data_root() / "deployments"
    deployments_dir.mkdir(parents=True, exist_ok=True)
    return deployments_dir


def get_frontend_log_dir() -> Path:
    """
    获取前端日志目录
    
    Returns:
        前端日志目录的 Path 对象
    """
    frontend_log_dir = get_data_root() / "data" / "Log" / "frontend"
    frontend_log_dir.mkdir(parents=True, exist_ok=True)
    return frontend_log_dir


def init_data_directories():
    """
    初始化所有数据目录
    确保所有必要的目录都存在
    """
    data_root = get_data_root()
    logger.info(f"[数据目录] 初始化数据目录: {data_root}")
    
    # 创建所有必要的目录
    get_log_dir()
    get_database_dir()
    get_deployments_dir()
    get_frontend_log_dir()
    
    logger.info("[数据目录] 所有数据目录初始化完成")
    logger.info(f"  - 日志目录: {get_log_dir()}")
    logger.info(f"  - 数据库目录: {get_database_dir()}")
    logger.info(f"  - 部署目录: {get_deployments_dir()}")
    logger.info(f"  - 前端日志目录: {get_frontend_log_dir()}")

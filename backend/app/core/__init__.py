"""
核心包初始化
"""
from .config import settings
from .environment import environment_manager

__all__ = ["settings", "environment_manager"]

"""
应用包初始化
"""
from .core import settings
from .api import api_v1_router

__all__ = ["settings", "api_v1_router"]

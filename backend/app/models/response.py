"""
通用响应模型
定义 API 统一的响应格式
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, Generic, TypeVar

DataT = TypeVar("DataT")


class ResponseBase(BaseModel, Generic[DataT]):
    """通用响应基类"""
    success: bool = Field(..., description="请求是否成功")
    message: Optional[str] = Field(None, description="响应消息")
    data: Optional[DataT] = Field(None, description="响应数据")


class ErrorResponse(BaseModel):
    """错误响应模型"""
    success: bool = Field(default=False, description="请求是否成功")
    error: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误消息")
    details: Optional[Any] = Field(None, description="错误详情")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "NotFoundError",
                "message": "实例不存在",
                "details": {"instance_id": "inst_not_exist"}
            }
        }


class SuccessResponse(BaseModel):
    """成功响应模型"""
    success: bool = Field(default=True, description="请求是否成功")
    message: str = Field(..., description="成功消息")
    data: Optional[Any] = Field(None, description="响应数据")


class APIResponse(BaseModel):
    """API 通用响应模型"""
    success: bool = Field(..., description="请求是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(None, description="响应数据")
    
    @classmethod
    def ok(cls, data: Optional[Any] = None, message: str = "操作成功") -> "APIResponse":
        """创建成功响应"""
        return cls(success=True, message=message, data=data)
    
    @classmethod
    def fail(cls, message: str, data: Optional[Any] = None) -> "APIResponse":
        """创建错误响应"""
        return cls(success=False, message=message, data=data)

"""
更新相关数据模型
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class ReleaseAsset(BaseModel):
    """发布资源"""
    name: str = Field(..., description="文件名")
    download_url: str = Field(..., description="下载链接")
    size: int = Field(..., description="文件大小(字节)")
    content_type: str = Field(..., description="内容类型")


class GitHubRelease(BaseModel):
    """GitHub Release 信息"""
    tag_name: str = Field(..., description="标签名称(版本号)")
    name: str = Field(..., description="发布名称")
    body: str = Field(default="", description="发布说明")
    draft: bool = Field(default=False, description="是否为草稿")
    prerelease: bool = Field(default=False, description="是否为预发布版本")
    created_at: str = Field(..., description="创建时间")
    published_at: Optional[str] = Field(None, description="发布时间")
    html_url: str = Field(..., description="网页链接")
    assets: List[ReleaseAsset] = Field(default_factory=list, description="发布资源")


class UpdateChannel(BaseModel):
    """更新通道"""
    name: str = Field(..., description="通道名称: main, beta, develop")
    label: str = Field(..., description="显示名称")
    description: str = Field(..., description="通道描述")
    

class VersionInfo(BaseModel):
    """版本信息"""
    version: str = Field(..., description="版本号")
    label: str = Field(..., description="显示标签")
    date: str = Field(..., description="发布日期")
    channel: str = Field(..., description="所属通道")
    notes: str = Field(default="", description="更新说明")
    download_url: Optional[str] = Field(None, description="下载链接")


class UpdateCheckResponse(BaseModel):
    """更新检查响应"""
    current_version: str = Field(..., description="当前版本")
    latest_version: Optional[str] = Field(None, description="最新版本")
    has_update: bool = Field(..., description="是否有更新")
    update_available: Optional[VersionInfo] = Field(None, description="可用更新信息")
    channels: List[UpdateChannel] = Field(default_factory=list, description="可用通道")


class ChannelVersionsResponse(BaseModel):
    """通道版本列表响应"""
    channel: str = Field(..., description="通道名称")
    versions: List[VersionInfo] = Field(default_factory=list, description="版本列表")

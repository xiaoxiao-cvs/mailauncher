"""
更新服务
负责从 GitHub 获取版本信息和管理更新
"""
import aiohttp
from typing import List, Optional
from datetime import datetime

from app.core.logger import logger
from app.core.config import settings
from app.models.update import (
    GitHubRelease,
    ReleaseAsset,
    UpdateChannel,
    VersionInfo,
    UpdateCheckResponse,
    ChannelVersionsResponse
)


class UpdateService:
    """更新服务"""
    
    # GitHub 仓库信息
    GITHUB_OWNER = "xiaoxiao-cvs"
    GITHUB_REPO = "mailauncher"
    GITHUB_API_BASE = "https://api.github.com"
    
    # 当前版本(从配置读取)
    CURRENT_VERSION = "0.1.0"
    
    # 更新通道配置
    CHANNELS = [
        UpdateChannel(
            name="main",
            label="Main (Stable)",
            description="稳定版本,适合日常使用"
        ),
        UpdateChannel(
            name="beta",
            label="Beta (Testing)",
            description="测试版本,体验新功能"
        ),
        UpdateChannel(
            name="develop",
            label="Develop (Nightly)",
            description="开发版本,更新最快但不稳定"
        )
    ]
    
    async def get_github_releases(
        self,
        per_page: int = 30,
        page: int = 1
    ) -> List[GitHubRelease]:
        """
        获取 GitHub Releases 列表
        
        Args:
            per_page: 每页数量
            page: 页码
            
        Returns:
            Release 列表
        """
        url = f"{self.GITHUB_API_BASE}/repos/{self.GITHUB_OWNER}/{self.GITHUB_REPO}/releases"
        params = {
            "per_page": per_page,
            "page": page
        }
        
        # 设置请求头
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MAI-Launcher-Updater"
        }
        
        # 如果配置了 GitHub Token,添加到请求头
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
            logger.info("使用 GitHub Token 进行 API 请求")
        else:
            logger.warning("未配置 GITHUB_TOKEN,可能受到 API 速率限制")
        
        try:
            # 创建 SSL 上下文,在开发环境中跳过证书验证
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"获取 GitHub Releases 失败: {response.status}, 响应: {error_text[:200]}")
                        return []
                    
                    data = await response.json()
                    logger.info(f"从 GitHub 获取到 {len(data)} 个 releases")
                    releases = []
                    
                    for item in data:
                        assets = [
                            ReleaseAsset(
                                name=asset["name"],
                                download_url=asset["browser_download_url"],
                                size=asset["size"],
                                content_type=asset.get("content_type", "application/octet-stream")
                            )
                            for asset in item.get("assets", [])
                        ]
                        
                        release = GitHubRelease(
                            tag_name=item["tag_name"],
                            name=item["name"],
                            body=item.get("body", ""),
                            draft=item.get("draft", False),
                            prerelease=item.get("prerelease", False),
                            created_at=item["created_at"],
                            published_at=item.get("published_at"),
                            html_url=item["html_url"],
                            assets=assets
                        )
                        releases.append(release)
                    
                    logger.info(f"成功获取 {len(releases)} 个 GitHub Releases")
                    return releases
                    
        except Exception as e:
            logger.error(f"获取 GitHub Releases 异常: {e}")
            return []
    
    def _classify_release_to_channel(self, release: GitHubRelease) -> str:
        """
        根据 tag 将 release 分类到不同通道
        
        规则:
        - vX.Y.Z: main 通道
        - vX.Y.Z-beta.N: beta 通道
        - vX.Y.Z-dev.*, vX.Y.Z-alpha.*, vX.Y.Z-rc.*: develop 通道
        
        注意: 必须先检查具体的标签后缀,再检查 prerelease 标志
        """
        tag = release.tag_name.lower()
        
        # 优先检查具体的版本后缀
        if "-dev" in tag or "-alpha" in tag or "-rc" in tag:
            return "develop"
        elif "-beta" in tag:
            return "beta"
        # 如果没有明确的后缀,但标记为 prerelease,则归类为 beta
        elif release.prerelease:
            return "beta"
        else:
            return "main"
    
    def _parse_version_info(self, release: GitHubRelease) -> VersionInfo:
        """将 GitHub Release 转换为 VersionInfo"""
        channel = self._classify_release_to_channel(release)
        
        # 解析日期
        try:
            date_str = release.published_at or release.created_at
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            formatted_date = date.strftime('%Y-%m-%d')
        except:
            formatted_date = "未知"
        
        # 查找适用于当前平台的下载链接
        download_url = None
        for asset in release.assets:
            # 根据文件名判断平台
            if asset.name.endswith('.dmg'):  # macOS
                download_url = asset.download_url
                break
            elif asset.name.endswith('.msi') or asset.name.endswith('.exe'):  # Windows
                download_url = asset.download_url
                break
            elif asset.name.endswith('.AppImage') or asset.name.endswith('.deb'):  # Linux
                download_url = asset.download_url
                break
        
        return VersionInfo(
            version=release.tag_name,
            label=f"{release.name or release.tag_name}",
            date=formatted_date,
            channel=channel,
            notes=release.body,
            download_url=download_url
        )
    
    async def check_update(self, channel: str = "main") -> UpdateCheckResponse:
        """
        检查更新
        
        Args:
            channel: 更新通道
            
        Returns:
            更新检查响应
        """
        releases = await self.get_github_releases()
        
        if not releases:
            return UpdateCheckResponse(
                current_version=self.CURRENT_VERSION,
                has_update=False,
                channels=self.CHANNELS
            )
        
        # 过滤指定通道的版本
        channel_releases = [
            r for r in releases
            if self._classify_release_to_channel(r) == channel and not r.draft
        ]
        
        if not channel_releases:
            return UpdateCheckResponse(
                current_version=self.CURRENT_VERSION,
                has_update=False,
                channels=self.CHANNELS
            )
        
        # 获取最新版本
        latest_release = channel_releases[0]
        latest_version_info = self._parse_version_info(latest_release)
        
        # 简单的版本比较(去掉 'v' 前缀)
        current_ver = self.CURRENT_VERSION.lstrip('v')
        latest_ver = latest_release.tag_name.lstrip('v')
        
        has_update = latest_ver != current_ver
        
        return UpdateCheckResponse(
            current_version=self.CURRENT_VERSION,
            latest_version=latest_release.tag_name,
            has_update=has_update,
            update_available=latest_version_info if has_update else None,
            channels=self.CHANNELS
        )
    
    async def get_channel_versions(
        self,
        channel: str = "main",
        limit: int = 10
    ) -> ChannelVersionsResponse:
        """
        获取指定通道的版本列表
        
        Args:
            channel: 更新通道
            limit: 返回数量限制
            
        Returns:
            通道版本列表
        """
        releases = await self.get_github_releases()
        
        logger.info(f"获取到 {len(releases)} 个 releases")
        
        # 过滤并转换
        channel_releases = []
        for r in releases:
            classified_channel = self._classify_release_to_channel(r)
            logger.info(f"Release {r.tag_name}: channel={classified_channel}, draft={r.draft}, prerelease={r.prerelease}")
            if classified_channel == channel and not r.draft:
                channel_releases.append(self._parse_version_info(r))
        
        logger.info(f"通道 {channel} 过滤后得到 {len(channel_releases)} 个版本")
        
        return ChannelVersionsResponse(
            channel=channel,
            versions=channel_releases[:limit]
        )


# 全局实例
update_service = UpdateService()

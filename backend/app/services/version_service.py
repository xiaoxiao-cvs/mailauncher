"""
版本管理服务
负责检查 GitHub 版本、对比提交、获取发布信息
"""
import httpx
import re
from typing import Optional, Dict, List, Any
from pathlib import Path
import subprocess
from datetime import datetime

from ..core.logger import logger


class VersionService:
    """版本管理服务"""
    
    # GitHub 仓库配置
    GITHUB_REPOS = {
        "MaiBot": {
            "owner": "Mai-with-u",
            "repo": "MaiBot",
            "has_releases": False  # MaiBot 没有 release，只能对比 commit
        },
        "MaiBot-Napcat-Adapter": {
            "owner": "Mai-with-u",
            "repo": "MaiBot-Napcat-Adapter",
            "has_releases": False
        }
    }
    
    def __init__(self):
        from ..core.config import settings
        self.github_api_base = "https://api.github.com"
        self.timeout = 30.0
        self.github_token = settings.GITHUB_TOKEN
        
        if self.github_token:
            logger.info(f"GitHub Token 已配置 (前10位: {self.github_token[:10]}...)")
        else:
            logger.warning("未配置 GitHub Token，API 请求受限（每小时60次）")
        
    def _get_headers(self) -> Dict[str, str]:
        """获取 GitHub API 请求头"""
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        if self.github_token:
            headers["Authorization"] = f"Bearer {self.github_token}"
        return headers
    
    async def check_github_version(self, component: str) -> Optional[Dict[str, Any]]:
        """
        检查 GitHub 上的最新版本
        
        Returns:
            {
                "has_update": bool,
                "current_version": str,
                "latest_version": str,
                "current_commit": str,
                "latest_commit": str,
                "commits_behind": int,
                "changelog": str,
                "release_url": str
            }
        """
        try:
            repo_config = self.GITHUB_REPOS.get(component)
            if not repo_config:
                logger.error(f"未知的组件: {component}")
                return None
            
            owner = repo_config["owner"]
            repo = repo_config["repo"]
            has_releases = repo_config["has_releases"]
            
            if has_releases:
                # 有 release 的组件，检查最新 release
                return await self._check_release_version(owner, repo)
            else:
                # 没有 release 的组件，对比 commit
                return await self._check_commit_version(owner, repo)
                
        except Exception as e:
            logger.error(f"检查 {component} 版本失败: {e}")
            return None
    
    async def _check_release_version(self, owner: str, repo: str) -> Optional[Dict[str, Any]]:
        """检查基于 Release 的版本"""
        try:
            url = f"{self.github_api_base}/repos/{owner}/{repo}/releases/latest"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 404:
                    logger.warning(f"{owner}/{repo} 没有发布任何 release")
                    return None
                    
                response.raise_for_status()
                data = response.json()
                
                return {
                    "has_update": None,  # 需要与本地版本对比才能确定
                    "latest_version": data.get("tag_name", ""),
                    "latest_commit": data.get("target_commitish", ""),
                    "changelog": data.get("body", ""),
                    "release_url": data.get("html_url", ""),
                    "published_at": data.get("published_at", ""),
                    "assets": [
                        {
                            "name": asset["name"],
                            "size": asset["size"],
                            "download_url": asset["browser_download_url"]
                        }
                        for asset in data.get("assets", [])
                    ]
                }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                logger.error(f"GitHub API 速率限制已超限。请配置 GITHUB_TOKEN 环境变量以提高限制")
            else:
                logger.error(f"获取 {owner}/{repo} release 失败: {e}")
            return None
        except Exception as e:
            logger.error(f"获取 {owner}/{repo} release 失败: {e}")
            return None
    
    async def _check_commit_version(self, owner: str, repo: str, branch: str = "main") -> Optional[Dict[str, Any]]:
        """检查基于 Commit 的版本"""
        try:
            url = f"{self.github_api_base}/repos/{owner}/{repo}/commits/{branch}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                commit_hash = data["sha"]
                commit_message = data["commit"]["message"]
                commit_date = data["commit"]["committer"]["date"]
                
                return {
                    "has_update": None,  # 需要与本地 commit 对比
                    "latest_commit": commit_hash,
                    "latest_commit_short": commit_hash[:7],
                    "commit_message": commit_message,
                    "commit_date": commit_date,
                    "author": data["commit"]["author"]["name"],
                    "html_url": data["html_url"]
                }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                logger.error(f"GitHub API 速率限制已超限。请配置有效的 GITHUB_TOKEN 环境变量")
            else:
                logger.error(f"获取 {owner}/{repo} commit 失败: {e}")
            return None
        except Exception as e:
            logger.error(f"获取 {owner}/{repo} commit 失败: {e}")
            return None
    
    async def compare_commits(self, owner: str, repo: str, base: str, head: str) -> Optional[Dict[str, Any]]:
        """
        对比两个 commit 之间的差异
        
        Args:
            owner: 仓库所有者
            repo: 仓库名称
            base: 基础 commit (当前版本)
            head: 目标 commit (最新版本)
        
        Returns:
            {
                "ahead_by": int,  # 领先的提交数
                "behind_by": int,  # 落后的提交数
                "commits": List[Dict],  # 提交列表
                "files": List[Dict]  # 修改的文件列表
            }
        """
        try:
            url = f"{self.github_api_base}/repos/{owner}/{repo}/compare/{base}...{head}"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._get_headers())
                
                if response.status_code == 404:
                    logger.warning(f"无法对比 {base}...{head}，可能 commit 不存在")
                    return None
                
                response.raise_for_status()
                data = response.json()
                
                return {
                    "ahead_by": data.get("ahead_by", 0),
                    "behind_by": data.get("behind_by", 0),
                    "total_commits": data.get("total_commits", 0),
                    "commits": [
                        {
                            "sha": commit["sha"][:7],
                            "message": commit["commit"]["message"].split("\n")[0],  # 只取第一行
                            "author": commit["commit"]["author"]["name"],
                            "date": commit["commit"]["author"]["date"],
                            "url": commit["html_url"]
                        }
                        for commit in data.get("commits", [])
                    ],
                    "files_changed": len(data.get("files", [])),
                    "files": [
                        {
                            "filename": file["filename"],
                            "status": file["status"],  # added, modified, removed
                            "additions": file.get("additions", 0),
                            "deletions": file.get("deletions", 0),
                            "changes": file.get("changes", 0)
                        }
                        for file in data.get("files", [])[:20]  # 最多显示 20 个文件
                    ]
                }
        except Exception as e:
            logger.error(f"对比 commit 失败: {e}")
            return None
    
    def get_local_commit_hash(self, component_path: Path) -> Optional[str]:
        """
        获取本地组件的 Git commit hash
        
        Args:
            component_path: 组件路径
        
        Returns:
            commit hash 或 None
        """
        try:
            if not component_path.exists():
                return None
            
            git_dir = component_path / ".git"
            if not git_dir.exists():
                logger.warning(f"{component_path} 不是 Git 仓库")
                return None
            
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=str(component_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(f"获取 commit hash 失败: {result.stderr}")
                return None
                
        except Exception as e:
            logger.error(f"获取本地 commit hash 失败: {e}")
            return None
    
    def get_local_version_from_file(self, component_path: Path, component: str) -> Optional[str]:
        """
        从文件中读取版本号
        不同组件有不同的版本文件位置
        """
        try:
            if component == "MaiBot":
                # MaiBot 的版本可能在 __version__.py 或 setup.py
                version_file = component_path / "maibot" / "__version__.py"
                if version_file.exists():
                    content = version_file.read_text()
                    match = re.search(r'__version__\s*=\s*["\']([^"\']+)["\']', content)
                    if match:
                        return match.group(1)
            
            elif component in ["NapCat", "MaiBot-Napcat-Adapter"]:
                # NapCat 和 Adapter 的版本在 package.json
                package_json = component_path / "package.json"
                if package_json.exists():
                    import json
                    data = json.loads(package_json.read_text())
                    return data.get("version")
            
            return None
            
        except Exception as e:
            logger.error(f"读取 {component} 版本文件失败: {e}")
            return None
    
    async def get_all_releases(self, owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取仓库的所有 release 列表
        
        Args:
            owner: 仓库所有者
            repo: 仓库名称
            limit: 返回的 release 数量限制
        """
        try:
            url = f"{self.github_api_base}/repos/{owner}/{repo}/releases"
            params = {"per_page": limit}
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=self._get_headers())
                response.raise_for_status()
                data = response.json()
                
                return [
                    {
                        "tag_name": release["tag_name"],
                        "name": release["name"],
                        "published_at": release["published_at"],
                        "body": release.get("body", ""),
                        "html_url": release["html_url"],
                        "prerelease": release.get("prerelease", False)
                    }
                    for release in data
                ]
        except Exception as e:
            logger.error(f"获取 release 列表失败: {e}")
            return []


# 创建全局实例
version_service = VersionService()

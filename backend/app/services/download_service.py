"""
下载服务
处理仓库克隆和下载相关的业务逻辑
"""
import asyncio
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime
from pathlib import Path
import platform

from ..core.logger import logger
from ..models.download import (
    DownloadTask,
    DownloadStatus,
    DownloadItemType,
    MaibotVersionSource,
)


class DownloadService:
    """下载服务类 - 负责克隆和下载仓库"""

    # 仓库配置
    REPOS = {
        DownloadItemType.MAIBOT: {
            "url": "https://github.com/MaiM-with-u/MaiBot.git",
            "folder": "MaiBot",
        },
        DownloadItemType.NAPCAT_ADAPTER: {
            "url": "https://github.com/MaiM-with-u/MaiBot-Napcat-Adapter.git",
            "folder": "MaiBot-Napcat-Adapter",
        },
        DownloadItemType.LPMM: {
            "url": "https://github.com/MaiM-with-u/MaiMBot-LPMM.git",
            "folder": "MaiMBot-LPMM",
        },
    }

    def __init__(self):
        """初始化下载服务"""
        logger.info("下载服务已初始化")

    async def clone_repository(
        self,
        repo_url: str,
        target_dir: Path,
        branch: Optional[str] = None,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        克隆 Git 仓库

        Args:
            repo_url: 仓库 URL
            target_dir: 目标目录
            branch: 分支或标签名 (可选)
            progress_callback: 进度回调函数 (message, level)

        Returns:
            是否成功
        """
        try:
            # 确保目标目录存在
            target_dir.parent.mkdir(parents=True, exist_ok=True)

            # 如果目录已存在，跳过克隆
            if target_dir.exists():
                if progress_callback:
                    await progress_callback(f"目录 {target_dir.name} 已存在，跳过克隆", "info")
                logger.info(f"目录 {target_dir} 已存在，跳过克隆")
                return True

            # 构建 git clone 命令
            cmd = ["git", "clone"]

            # 如果指定了分支/标签
            if branch:
                cmd.extend(["-b", branch])

            cmd.extend([repo_url, str(target_dir)])

            if progress_callback:
                await progress_callback(f"正在克隆 {repo_url}", "info")

            # 根据操作系统选择不同的克隆方法
            if platform.system() == "Windows":
                return await self._clone_repository_windows(cmd, target_dir, progress_callback)
            else:
                return await self._clone_repository_unix(cmd, target_dir, progress_callback)

        except Exception as e:
            error_msg = f"克隆仓库异常: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg, exc_info=True)
            return False

    async def _clone_repository_windows(
        self,
        cmd: list[str],
        target_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Windows 下克隆仓库"""
        import subprocess
        
        cmd_str = ' '.join(cmd)
        logger.info(f"{'='*60}")
        logger.info(f"[Windows] 执行命令: {cmd_str}")
        logger.info(f"{'='*60}")

        try:
            loop = asyncio.get_event_loop()
            
            def run_subprocess():
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                )
                output_lines = []
                for line in proc.stdout:
                    line = line.rstrip()
                    if line:
                        output_lines.append(line)
                proc.wait()
                return proc.returncode, output_lines
            
            returncode, output_lines = await loop.run_in_executor(None, run_subprocess)
            
            # 输出所有日志
            for line in output_lines:
                logger.info(f"  {line}")
                if progress_callback:
                    await progress_callback(line, "info")
            
            logger.info(f"{'='*60}")
            logger.info(f"[Windows] 克隆完成: 返回码 {returncode}")
            logger.info(f"{'='*60}")

            if returncode == 0:
                if progress_callback:
                    await progress_callback(f"成功克隆到 {target_dir.name}", "success")
                logger.info(f"成功克隆仓库到 {target_dir}")
                return True
            else:
                error_msg = '\n'.join(output_lines) if output_lines else "未知错误"
                if progress_callback:
                    await progress_callback(f"克隆失败: {error_msg}", "error")
                logger.error(f"克隆仓库失败: {error_msg}")
                return False

        except Exception as e:
            error_msg = f"[Windows] 克隆异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            if progress_callback:
                await progress_callback(error_msg, "error")
            return False

    async def _clone_repository_unix(
        self,
        cmd: list[str],
        target_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Unix (macOS/Linux) 下克隆仓库"""
        cmd_str = ' '.join(cmd)
        logger.info(f"{'='*60}")
        logger.info(f"[Unix] 执行命令: {cmd_str}")
        logger.info(f"{'='*60}")

        try:
            # 执行 git clone
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )

            output_lines = []
            while True:
                line_bytes = await process.stdout.readline()
                if not line_bytes:
                    break
                
                try:
                    line = line_bytes.decode('utf-8').rstrip()
                except UnicodeDecodeError:
                    line = line_bytes.decode('utf-8', errors='replace').rstrip()
                
                if line:
                    logger.info(f"  {line}")
                    output_lines.append(line)
                    if progress_callback:
                        await progress_callback(line, "info")

            await process.wait()
            
            logger.info(f"{'='*60}")
            logger.info(f"[Unix] 克隆完成: 返回码 {process.returncode}")
            logger.info(f"{'='*60}")

            if process.returncode == 0:
                if progress_callback:
                    await progress_callback(f"成功克隆到 {target_dir.name}", "success")
                logger.info(f"成功克隆仓库到 {target_dir}")
                return True
            else:
                error_msg = '\n'.join(output_lines) if output_lines else "未知错误"
                if progress_callback:
                    await progress_callback(f"克隆失败: {error_msg}", "error")
                logger.error(f"克隆仓库失败: {error_msg}")
                return False

        except Exception as e:
            error_msg = f"[Unix] 克隆异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            if progress_callback:
                await progress_callback(error_msg, "error")
            return False

    async def download_maibot(
        self,
        instance_dir: Path,
        version_source: MaibotVersionSource,
        version_value: str,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        下载 Maibot

        Args:
            instance_dir: 实例目录
            version_source: 版本来源 (tag/branch)
            version_value: 版本值
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        repo_config = self.REPOS[DownloadItemType.MAIBOT]
        target_dir = instance_dir / repo_config["folder"]

        # 根据版本来源决定分支/标签
        branch = version_value if version_source in [
            MaibotVersionSource.TAG,
            MaibotVersionSource.BRANCH,
        ] else None

        return await self.clone_repository(
            repo_config["url"],
            target_dir,
            branch,
            progress_callback,
        )

    async def download_adapter(
        self,
        instance_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        下载 Napcat Adapter

        Args:
            instance_dir: 实例目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        repo_config = self.REPOS[DownloadItemType.NAPCAT_ADAPTER]
        target_dir = instance_dir / repo_config["folder"]

        return await self.clone_repository(
            repo_config["url"],
            target_dir,
            None,
            progress_callback,
        )

    async def download_lpmm(
        self,
        instance_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        下载 LPMM (仅限 macOS)

        Args:
            instance_dir: 实例目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        # 检查操作系统
        if platform.system() != "Darwin":
            if progress_callback:
                await progress_callback("LPMM 仅在 macOS 上需要安装", "info")
            logger.warning("LPMM 仅在 macOS 上需要安装")
            return True

        repo_config = self.REPOS[DownloadItemType.LPMM]
        target_dir = instance_dir / repo_config["folder"]

        return await self.clone_repository(
            repo_config["url"],
            target_dir,
            None,
            progress_callback,
        )

    async def download_napcat(
        self,
        instance_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        下载并安装 Napcat
        使用内置的 shell 脚本自动安装

        Args:
            instance_dir: 实例目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback("开始安装 Napcat...", "info")
            
            logger.info("开始执行 NapCat 安装")
            
            # 使用新的 Python 安装器（不再依赖 shell 脚本）
            from .napcat_installer import get_napcat_installer
            
            installer = get_napcat_installer()
            return await installer.install(instance_dir, progress_callback)
                
        except Exception as e:
            error_msg = f"Napcat 安装异常: {str(e)}"
            logger.error(error_msg)
            if progress_callback:
                await progress_callback(error_msg, "error")
            return False

    async def get_available_versions(self, repo_type: DownloadItemType) -> Dict[str, List[str]]:
        """
        获取仓库的可用版本 (tags 和 branches)

        Args:
            repo_type: 仓库类型

        Returns:
            包含 tags 和 branches 的字典
        """
        try:
            if repo_type not in self.REPOS:
                logger.error(f"未知的仓库类型: {repo_type}")
                return {"tags": [], "branches": []}

            repo_config = self.REPOS[repo_type]
            repo_url = repo_config["url"]

            # 获取 tags
            tags_process = await asyncio.create_subprocess_exec(
                "git", "ls-remote", "--tags", repo_url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            tags_stdout, _ = await tags_process.communicate()

            # 获取 branches
            branches_process = await asyncio.create_subprocess_exec(
                "git", "ls-remote", "--heads", repo_url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            branches_stdout, _ = await branches_process.communicate()

            # 解析 tags
            tags = []
            if tags_stdout:
                for line in tags_stdout.decode().strip().split("\n"):
                    if line:
                        # 格式: <commit-hash>\trefs/tags/<tag-name>
                        parts = line.split("\t")
                        if len(parts) == 2 and "refs/tags/" in parts[1]:
                            tag = parts[1].replace("refs/tags/", "")
                            # 跳过 ^{} 结尾的(annotated tags的引用)
                            if not tag.endswith("^{}"):
                                tags.append(tag)

            # 解析 branches
            branches = []
            if branches_stdout:
                for line in branches_stdout.decode().strip().split("\n"):
                    if line:
                        # 格式: <commit-hash>\trefs/heads/<branch-name>
                        parts = line.split("\t")
                        if len(parts) == 2 and "refs/heads/" in parts[1]:
                            branch = parts[1].replace("refs/heads/", "")
                            branches.append(branch)

            logger.info(
                f"仓库 {repo_type.value} 有 {len(tags)} 个 tags, {len(branches)} 个 branches"
            )
            return {"tags": tags, "branches": branches}

        except Exception as e:
            logger.error(f"获取仓库版本失败: {e}")
            return {"tags": [], "branches": []}


# 全局单例
_download_service: Optional[DownloadService] = None


def get_download_service() -> DownloadService:
    """获取下载服务单例"""
    global _download_service
    if _download_service is None:
        _download_service = DownloadService()
    return _download_service

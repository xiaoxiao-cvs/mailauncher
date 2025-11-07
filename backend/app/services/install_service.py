"""
安装服务
处理依赖安装和配置相关的业务逻辑
"""
import asyncio
from typing import Optional, Callable, Any
from pathlib import Path
import platform
import shutil

from ..core.logger import logger


class InstallService:
    """安装服务类 - 负责安装依赖和配置"""

    def __init__(self):
        """初始化安装服务"""
        logger.info("安装服务已初始化")

    async def _run_command(
        self,
        cmd: list[str],
        cwd: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> tuple[bool, str]:
        """
        运行命令

        Args:
            cmd: 命令列表
            cwd: 工作目录
            progress_callback: 进度回调 (message, level)

        Returns:
            (是否成功, 输出/错误信息)
        """
        try:
            if progress_callback:
                await progress_callback(f"执行: {' '.join(cmd)}", "info")

            logger.info(f"在 {cwd} 执行命令: {' '.join(cmd)}")

            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                output = stdout.decode() if stdout else ""
                logger.info(f"命令执行成功: {output[:200]}")
                return True, output
            else:
                error = stderr.decode() if stderr else "未知错误"
                logger.error(f"命令执行失败: {error}")
                return False, error

        except Exception as e:
            error_msg = f"命令执行异常: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    async def create_virtual_environment(
        self,
        project_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        创建 Python 虚拟环境 (使用 uv)

        Args:
            project_dir: 项目目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback(f"在 {project_dir.name} 创建虚拟环境", "info")

            # 检查是否安装了 uv
            uv_check = await asyncio.create_subprocess_exec(
                "uv", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await uv_check.communicate()

            if uv_check.returncode != 0:
                # uv 未安装，使用 python venv
                if progress_callback:
                    await progress_callback("uv 未安装，使用 python -m venv", "info")
                
                success, _ = await self._run_command(
                    ["python3", "-m", "venv", ".venv"],
                    project_dir,
                    progress_callback,
                )
                return success
            else:
                # 使用 uv 创建虚拟环境
                success, _ = await self._run_command(
                    ["uv", "venv"],
                    project_dir,
                    progress_callback,
                )
                return success

        except Exception as e:
            error_msg = f"创建虚拟环境失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg)
            return False

    async def install_dependencies(
        self,
        project_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        安装项目依赖

        Args:
            project_dir: 项目目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            requirements_file = project_dir / "requirements.txt"
            if not requirements_file.exists():
                if progress_callback:
                    await progress_callback(f"requirements.txt 不存在，跳过依赖安装", "info")
                logger.warning(f"requirements.txt 不存在: {requirements_file}")
                return True

            if progress_callback:
                await progress_callback(f"在 {project_dir.name} 安装依赖", "info")

            # 检查是否使用 uv
            uv_check = await asyncio.create_subprocess_exec(
                "uv", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await uv_check.communicate()

            if uv_check.returncode == 0:
                # 使用 uv pip install
                success, _ = await self._run_command(
                    ["uv", "pip", "install", "-r", "requirements.txt"],
                    project_dir,
                    progress_callback,
                )
            else:
                # 使用传统 pip install
                # 首先激活虚拟环境中的 pip
                venv_pip = project_dir / ".venv" / "bin" / "pip"
                if not venv_pip.exists():
                    venv_pip = project_dir / ".venv" / "Scripts" / "pip.exe"  # Windows
                
                if venv_pip.exists():
                    success, _ = await self._run_command(
                        [str(venv_pip), "install", "-r", "requirements.txt"],
                        project_dir,
                        progress_callback,
                    )
                else:
                    # 使用系统 pip
                    success, _ = await self._run_command(
                        ["pip3", "install", "-r", "requirements.txt"],
                        project_dir,
                        progress_callback,
                    )

            return success

        except Exception as e:
            error_msg = f"安装依赖失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg)
            return False

    async def compile_quick_algo(
        self,
        lpmm_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        编译 quick_algo (仅限 macOS)

        Args:
            lpmm_dir: LPMM 目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            # 检查操作系统
            if platform.system() != "Darwin":
                if progress_callback:
                    await progress_callback("非 macOS 系统，跳过 quick_algo 编译", "info")
                return True

            if progress_callback:
                await progress_callback("开始编译 quick_algo", "info")

            # 进入 lib/quick_algo 目录
            quick_algo_dir = lpmm_dir / "lib" / "quick_algo"
            if not quick_algo_dir.exists():
                error_msg = f"quick_algo 目录不存在: {quick_algo_dir}"
                if progress_callback:
                    await progress_callback(error_msg, "error")
                logger.error(error_msg)
                return False

            # 执行编译脚本
            success, output = await self._run_command(
                ["python", "build_lib.py", "--cleanup", "--cythonize", "--install"],
                quick_algo_dir,
                progress_callback,
            )

            if success:
                if progress_callback:
                    await progress_callback("quick_algo 编译成功", "success")
                logger.info("quick_algo 编译成功")
            else:
                if progress_callback:
                    await progress_callback(f"quick_algo 编译失败: {output}", "error")

            return success

        except Exception as e:
            error_msg = f"编译 quick_algo 失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg)
            return False

    async def setup_maibot_config(
        self,
        maibot_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        配置 MaiBot

        Args:
            maibot_dir: MaiBot 目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback("配置 MaiBot", "info")

            # 创建 config 目录
            config_dir = maibot_dir / "config"
            config_dir.mkdir(exist_ok=True)

            template_dir = maibot_dir / "template"
            if not template_dir.exists():
                error_msg = f"template 目录不存在: {template_dir}"
                if progress_callback:
                    await progress_callback(error_msg, "error")
                logger.error(error_msg)
                return False

            # 复制配置文件
            config_files = [
                ("bot_config_template.toml", "bot_config.toml"),
                ("model_config_template.toml", "model_config.toml"),
            ]

            for template_name, config_name in config_files:
                template_file = template_dir / template_name
                config_file = config_dir / config_name

                if template_file.exists() and not config_file.exists():
                    shutil.copy(template_file, config_file)
                    if progress_callback:
                        await progress_callback(f"已创建 {config_name}", "success")
                    logger.info(f"已复制配置文件: {config_file}")

            # 复制 .env 文件
            env_template = template_dir / "template.env"
            env_file = maibot_dir / ".env"

            if env_template.exists() and not env_file.exists():
                shutil.copy(env_template, env_file)
                
                # 设置默认端口
                with open(env_file, "r") as f:
                    content = f.read()
                
                # 确保端口设置为 8000
                if "PORT=" not in content:
                    with open(env_file, "a") as f:
                        f.write("\nHOST=127.0.0.1\nPORT=8000\n")
                
                if progress_callback:
                    await progress_callback("已创建 .env 配置", "success")
                logger.info(f"已复制 .env 文件: {env_file}")

            return True

        except Exception as e:
            error_msg = f"配置 MaiBot 失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg)
            return False

    async def setup_adapter_config(
        self,
        adapter_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        配置 Napcat Adapter

        Args:
            adapter_dir: Adapter 目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback("配置 Napcat Adapter", "info")

            template_dir = adapter_dir / "template"
            if not template_dir.exists():
                error_msg = f"template 目录不存在: {template_dir}"
                if progress_callback:
                    await progress_callback(error_msg, "error")
                logger.error(error_msg)
                return False

            # 复制配置文件
            template_file = template_dir / "template_config.toml"
            config_file = adapter_dir / "config.toml"

            if template_file.exists() and not config_file.exists():
                shutil.copy(template_file, config_file)
                if progress_callback:
                    await progress_callback("已创建 config.toml", "success")
                logger.info(f"已复制配置文件: {config_file}")

            return True

        except Exception as e:
            error_msg = f"配置 Adapter 失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg)
            return False


# 全局单例
_install_service: Optional[InstallService] = None


def get_install_service() -> InstallService:
    """获取安装服务单例"""
    global _install_service
    if _install_service is None:
        _install_service = InstallService()
    return _install_service

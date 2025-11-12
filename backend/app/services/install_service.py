"""
安装服务
处理依赖安装和配置相关的业务逻辑
"""
import asyncio
import os
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

    async def upgrade_venv_pip(
        self,
        venv_dir: Path,
        venv_type: str = "venv",
    ) -> bool:
        """
        在虚拟环境内升级 pip、setuptools、wheel
        
        Args:
            venv_dir: 虚拟环境所在目录
            venv_type: 虚拟环境类型
            
        Returns:
            是否成功
        """
        try:
            logger.info(f"{'='*60}")
            logger.info(f"在虚拟环境 {venv_dir} 中升级 pip")
            logger.info(f"虚拟环境类型: {venv_type}")
            logger.info(f"{'='*60}")
            
            if venv_type == "venv":
                # 使用虚拟环境中的 pip
                venv_pip = venv_dir / ".venv" / "bin" / "pip"
                if not venv_pip.exists():
                    venv_pip = venv_dir / ".venv" / "Scripts" / "pip.exe"  # Windows
                
                if not venv_pip.exists():
                    logger.error(f"找不到虚拟环境的 pip: {venv_pip}")
                    return False
                
                logger.info(f"使用 pip: {venv_pip}")
                
                # 根据操作系统选择不同的执行方式
                if platform.system() == "Windows":
                    success, output = await self._upgrade_pip_windows(venv_pip)
                else:
                    success, output = await self._upgrade_pip_unix(venv_pip)
                
                logger.info(f"{'='*60}")
                if success:
                    logger.info("虚拟环境 pip 升级成功")
                else:
                    logger.warning(f"虚拟环境 pip 升级失败")
                logger.info(f"{'='*60}")
                return success
                    
            elif venv_type == "uv":
                # uv 自动使用最新的 pip
                logger.info("uv 环境自动使用最新 pip")
                logger.info(f"{'='*60}")
                return True
                
            elif venv_type == "conda":
                # conda 环境升级
                logger.info("使用 conda 升级 pip")
                
                if platform.system() == "Windows":
                    success, output = await self._upgrade_pip_conda_windows(venv_dir)
                else:
                    success, output = await self._upgrade_pip_conda_unix(venv_dir)
                
                logger.info(f"{'='*60}")
                if success:
                    logger.info("conda 环境 pip 升级成功")
                else:
                    logger.warning("conda 环境 pip 升级失败")
                logger.info(f"{'='*60}")
                return success
                    
        except Exception as e:
            logger.error(f"{'='*60}")
            logger.error(f"升级虚拟环境 pip 失败: {str(e)}", exc_info=True)
            logger.error(f"{'='*60}")
            return False

    async def _upgrade_pip_windows(self, venv_pip: Path) -> tuple[bool, str]:
        """Windows 下升级 pip (使用 python -m pip 方式)"""
        import subprocess
        
        # Windows 需要使用 python -m pip 来升级 pip 自身
        venv_python = venv_pip.parent / "python.exe"
        
        if not venv_python.exists():
            error_msg = f"找不到虚拟环境的 Python: {venv_python}"
            logger.error(error_msg)
            return False, error_msg
        
        logger.info("执行命令: python -m pip install --upgrade pip setuptools wheel")
        
        try:
            loop = asyncio.get_event_loop()
            
            def run_subprocess():
                proc = subprocess.Popen(
                    [str(venv_python), "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"],
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
                        logger.info(f"  {line}")
                        output_lines.append(line)
                proc.wait()
                return proc.returncode, '\n'.join(output_lines)
            
            returncode, output = await loop.run_in_executor(None, run_subprocess)
            return returncode == 0, output
            
        except Exception as e:
            error_msg = f"Windows pip 升级异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    async def _upgrade_pip_unix(self, venv_pip: Path) -> tuple[bool, str]:
        """Unix (macOS/Linux) 下升级 pip"""
        logger.info("执行命令: pip install --upgrade pip setuptools wheel")
        
        try:
            process = await asyncio.create_subprocess_exec(
                str(venv_pip), "install", "--upgrade", "pip", "setuptools", "wheel",
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
            
            await process.wait()
            output = '\n'.join(output_lines)
            return process.returncode == 0, output
            
        except Exception as e:
            error_msg = f"Unix pip 升级异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    async def _upgrade_pip_conda_windows(self, venv_dir: Path) -> tuple[bool, str]:
        """Windows conda 环境下升级 pip (使用 python -m pip 方式)"""
        import subprocess
        
        logger.info("执行命令: conda run -p <venv> python -m pip install --upgrade pip setuptools wheel")
        
        try:
            loop = asyncio.get_event_loop()
            
            def run_subprocess():
                proc = subprocess.Popen(
                    ["conda", "run", "-p", str(venv_dir / ".venv"), 
                     "python", "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"],
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
                        logger.info(f"  {line}")
                        output_lines.append(line)
                proc.wait()
                return proc.returncode, '\n'.join(output_lines)
            
            returncode, output = await loop.run_in_executor(None, run_subprocess)
            return returncode == 0, output
            
        except Exception as e:
            error_msg = f"Windows conda pip 升级异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    async def _upgrade_pip_conda_unix(self, venv_dir: Path) -> tuple[bool, str]:
        """Unix conda 环境下升级 pip"""
        logger.info("执行命令: conda run -p <venv> pip install --upgrade pip setuptools wheel")
        
        try:
            process = await asyncio.create_subprocess_exec(
                "conda", "run", "-p", str(venv_dir / ".venv"), 
                "pip", "install", "--upgrade", "pip", "setuptools", "wheel",
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
            
            await process.wait()
            output = '\n'.join(output_lines)
            return process.returncode == 0, output
            
        except Exception as e:
            error_msg = f"Unix conda pip 升级异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    async def check_build_tools(self) -> tuple[bool, str]:
        """
        检查编译工具是否可用 (macOS)
        
        Returns:
            (是否可用, 错误信息)
        """
        if platform.system() != "Darwin":
            return True, ""
        
        try:
            # 检查 xcode-select 是否安装
            process = await asyncio.create_subprocess_exec(
                "xcode-select", "-p",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info(f"检测到 Xcode Command Line Tools: {stdout.decode().strip()}")
                return True, ""
            else:
                error_msg = "未检测到 Xcode Command Line Tools\n请运行: xcode-select --install"
                logger.warning(error_msg)
                return False, error_msg
                
        except FileNotFoundError:
            error_msg = "未检测到 xcode-select 命令\n请运行: xcode-select --install"
            logger.warning(error_msg)
            return False, error_msg
        except Exception as e:
            error_msg = f"检查编译工具失败: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    async def _run_command(
        self,
        cmd: list[str],
        cwd: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> tuple[bool, str]:
        """
        运行命令并实时输出所有日志 (根据操作系统自动选择)

        Args:
            cmd: 命令列表
            cwd: 工作目录
            progress_callback: 进度回调 (message, level)

        Returns:
            (是否成功, 完整输出)
        """
        if platform.system() == "Windows":
            return await self._run_command_windows(cmd, cwd, progress_callback)
        else:
            return await self._run_command_unix(cmd, cwd, progress_callback)

    async def _run_command_windows(
        self,
        cmd: list[str],
        cwd: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> tuple[bool, str]:
        """
        Windows 下运行命令并实时输出所有日志

        Args:
            cmd: 命令列表
            cwd: 工作目录
            progress_callback: 进度回调 (message, level)

        Returns:
            (是否成功, 完整输出)
        """
        import subprocess
        
        try:
            cmd_str = ' '.join(cmd)
            
            # 输出命令开始执行
            logger.info(f"{'='*60}")
            logger.info(f"[Windows] 执行命令: {cmd_str}")
            logger.info(f"工作目录: {cwd}")
            logger.info(f"{'='*60}")
            
            if progress_callback:
                await progress_callback(f"$ {cmd_str}", "info")

            # 使用 run_in_executor 在线程池中运行同步的 subprocess
            loop = asyncio.get_event_loop()
            
            def run_subprocess():
                """在单独的线程中运行子进程"""
                try:
                    proc = subprocess.Popen(
                        cmd,
                        cwd=str(cwd),
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
                except Exception as e:
                    return -1, [f"执行异常: {str(e)}"]
            
            # 在线程池中执行
            returncode, output_lines = await loop.run_in_executor(None, run_subprocess)
            
            # 输出所有日志
            for line in output_lines:
                logger.info(f"  {line}")
                if progress_callback:
                    await progress_callback(line, "info")
            
            full_output = '\n'.join(output_lines)
            
            # 输出命令执行结果
            logger.info(f"{'='*60}")
            logger.info(f"[Windows] 命令执行完成: 返回码 {returncode}")
            logger.info(f"{'='*60}")
            
            if returncode == 0:
                if progress_callback:
                    await progress_callback(f"✓ 命令执行成功", "success")
                return True, full_output
            else:
                if progress_callback:
                    await progress_callback(f"✗ 命令执行失败 (返回码: {returncode})", "error")
                return False, full_output

        except Exception as e:
            error_msg = f"[Windows] 命令执行异常: {type(e).__name__}: {str(e)}"
            logger.error(f"{'='*60}")
            logger.error(error_msg, exc_info=True)
            logger.error(f"{'='*60}")
            if progress_callback:
                await progress_callback(error_msg, "error")
            return False, error_msg

    async def _run_command_unix(
        self,
        cmd: list[str],
        cwd: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> tuple[bool, str]:
        """
        Unix (macOS/Linux) 下运行命令并实时输出所有日志

        Args:
            cmd: 命令列表
            cwd: 工作目录
            progress_callback: 进度回调 (message, level)

        Returns:
            (是否成功, 完整输出)
        """
        try:
            cmd_str = ' '.join(cmd)
            
            # 输出命令开始执行
            logger.info(f"{'='*60}")
            logger.info(f"[Unix] 执行命令: {cmd_str}")
            logger.info(f"工作目录: {cwd}")
            logger.info(f"{'='*60}")
            
            if progress_callback:
                await progress_callback(f"$ {cmd_str}", "info")

            # Unix 系统使用 asyncio.create_subprocess_exec
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
        
            # 实时读取并输出所有日志
            output_lines = []
            
            while True:
                line_bytes = await process.stdout.readline()
                if not line_bytes:
                    break
                
                # 尝试解码 (支持UTF-8)
                try:
                    line = line_bytes.decode('utf-8').rstrip()
                except UnicodeDecodeError:
                    line = line_bytes.decode('utf-8', errors='replace').rstrip()
                
                if line:
                    # 输出到日志
                    logger.info(f"  {line}")
                    output_lines.append(line)
                    
                    # 实时发送到前端
                    if progress_callback:
                        await progress_callback(line, "info")
            
            # 等待进程结束
            await process.wait()
            
            # 完整输出
            full_output = '\n'.join(output_lines)
            
            # 输出命令执行结果
            logger.info(f"{'='*60}")
            logger.info(f"[Unix] 命令执行完成: 返回码 {process.returncode}")
            logger.info(f"{'='*60}")
            
            if process.returncode == 0:
                if progress_callback:
                    await progress_callback(f"✓ 命令执行成功", "success")
                return True, full_output
            else:
                if progress_callback:
                    await progress_callback(f"✗ 命令执行失败 (返回码: {process.returncode})", "error")
                return False, full_output

        except Exception as e:
            error_msg = f"[Unix] 命令执行异常: {type(e).__name__}: {str(e)}"
            logger.error(f"{'='*60}")
            logger.error(error_msg, exc_info=True)
            logger.error(f"{'='*60}")
            if progress_callback:
                await progress_callback(error_msg, "error")
            return False, error_msg

    async def create_virtual_environment(
        self,
        project_dir: Path,
        venv_type: str = "venv",
        progress_callback: Optional[Callable[[str, str], Any]] = None,
        python_path: Optional[str] = None,
    ) -> bool:
        """
        创建虚拟环境

        Args:
            project_dir: 项目目录
            venv_type: 虚拟环境类型 (venv, uv, conda)
            progress_callback: 进度回调 (message, level)
            python_path: Python 可执行文件路径（用户选择的版本）

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback(f"在 {project_dir.name} 创建虚拟环境 (使用 {venv_type})", "info")

            # 必须使用用户指定的 Python 路径
            if not python_path:
                error_msg = "未指定 Python 路径。请在设置中选择 Python 环境后再安装。"
                logger.error(error_msg)
                if progress_callback:
                    await progress_callback(error_msg, "error")
                return False
            
            python_cmd = python_path
            logger.info(f"使用用户指定的 Python: {python_cmd}")

            # 根据操作系统和虚拟环境类型选择不同的创建方法
            if platform.system() == "Windows":
                return await self._create_venv_windows(
                    project_dir, venv_type, python_cmd, progress_callback
                )
            else:
                return await self._create_venv_unix(
                    project_dir, venv_type, python_cmd, progress_callback
                )

        except Exception as e:
            error_msg = f"创建虚拟环境失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg, exc_info=True)
            return False

    async def _create_venv_windows(
        self,
        project_dir: Path,
        venv_type: str,
        python_cmd: str,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Windows 下创建虚拟环境"""
        if venv_type == "uv":
            success, _ = await self._run_command_windows(
                ["uv", "venv", "--python", python_cmd],
                project_dir,
                progress_callback,
            )
            return success
        elif venv_type == "conda":
            python_version = await self._get_python_version(python_cmd)
            success, _ = await self._run_command_windows(
                ["conda", "create", "-p", str(project_dir / ".venv"), f"python={python_version}", "-y"],
                project_dir,
                progress_callback,
            )
            return success
        else:
            # 使用 python venv (默认)
            success, _ = await self._run_command_windows(
                [python_cmd, "-m", "venv", ".venv"],
                project_dir,
                progress_callback,
            )
            return success

    async def _create_venv_unix(
        self,
        project_dir: Path,
        venv_type: str,
        python_cmd: str,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Unix (macOS/Linux) 下创建虚拟环境"""
        if venv_type == "uv":
            success, _ = await self._run_command_unix(
                ["uv", "venv", "--python", python_cmd],
                project_dir,
                progress_callback,
            )
            return success
        elif venv_type == "conda":
            python_version = await self._get_python_version(python_cmd)
            success, _ = await self._run_command_unix(
                ["conda", "create", "-p", str(project_dir / ".venv"), f"python={python_version}", "-y"],
                project_dir,
                progress_callback,
            )
            return success
        else:
            # 使用 python venv (默认)
            success, _ = await self._run_command_unix(
                [python_cmd, "-m", "venv", ".venv"],
                project_dir,
                progress_callback,
            )
            return success

    async def _get_python_version(self, python_cmd: str) -> str:
        """获取 Python 版本号"""
        try:
            import subprocess
            result = subprocess.run([python_cmd, "--version"], capture_output=True, text=True, timeout=5)
            version_str = result.stdout.strip() or result.stderr.strip()
            # 解析版本号（例如：Python 3.11.0 -> 3.11）
            parts = version_str.split()[1].split(".")
            return f"{parts[0]}.{parts[1]}"
        except:
            return "3.11"  # 默认版本

    async def install_dependencies(
        self,
        project_dir: Path,
        venv_type: str = "venv",
        progress_callback: Optional[Callable[[str, str], Any]] = None,
        venv_dir: Optional[Path] = None,
    ) -> bool:
        """
        安装项目依赖

        Args:
            project_dir: 项目目录
            venv_type: 虚拟环境类型 (venv, uv, conda)
            progress_callback: 进度回调 (message, level)
            venv_dir: 虚拟环境目录 (如果为 None 则使用 project_dir)

        Returns:
            是否成功
        """
        # 如果没有指定虚拟环境目录,使用项目目录
        if venv_dir is None:
            venv_dir = project_dir
        try:
            requirements_file = project_dir / "requirements.txt"
            if not requirements_file.exists():
                if progress_callback:
                    await progress_callback(f"requirements.txt 不存在，跳过依赖安装", "info")
                logger.warning(f"requirements.txt 不存在: {requirements_file}")
                return True

            if progress_callback:
                await progress_callback(f"在 {project_dir.name} 安装依赖 (使用 {venv_type})", "info")

            # 根据操作系统和虚拟环境类型选择不同的安装方法
            if platform.system() == "Windows":
                return await self._install_deps_windows(
                    project_dir, venv_type, venv_dir, requirements_file, progress_callback
                )
            else:
                return await self._install_deps_unix(
                    project_dir, venv_type, venv_dir, requirements_file, progress_callback
                )

        except Exception as e:
            error_msg = f"安装依赖失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg, exc_info=True)
            return False

    async def _install_deps_windows(
        self,
        project_dir: Path,
        venv_type: str,
        venv_dir: Path,
        requirements_file: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Windows 下安装依赖"""
        if venv_type == "uv":
            success, _ = await self._run_command_windows(
                ["uv", "pip", "install", "-r", "requirements.txt"],
                project_dir,
                progress_callback,
            )
        elif venv_type == "conda":
            success, _ = await self._run_command_windows(
                ["conda", "run", "-p", str(venv_dir / ".venv"), "pip", "install", "-r", "requirements.txt"],
                project_dir,
                progress_callback,
            )
        else:
            # 使用传统 pip install (venv)
            venv_pip = venv_dir / ".venv" / "Scripts" / "pip.exe"  # Windows
            
            if venv_pip.exists():
                success, _ = await self._run_command_windows(
                    [str(venv_pip), "install", "-r", str(requirements_file)],
                    project_dir,
                    progress_callback,
                )
            else:
                error_msg = f"找不到虚拟环境的 pip: {venv_pip}"
                logger.error(error_msg)
                if progress_callback:
                    await progress_callback(error_msg, "error")
                return False

        return success

    async def _install_deps_unix(
        self,
        project_dir: Path,
        venv_type: str,
        venv_dir: Path,
        requirements_file: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """Unix (macOS/Linux) 下安装依赖"""
        if venv_type == "uv":
            success, _ = await self._run_command_unix(
                ["uv", "pip", "install", "-r", "requirements.txt"],
                project_dir,
                progress_callback,
            )
        elif venv_type == "conda":
            success, _ = await self._run_command_unix(
                ["conda", "run", "-p", str(venv_dir / ".venv"), "pip", "install", "-r", "requirements.txt"],
                project_dir,
                progress_callback,
            )
        else:
            # 使用传统 pip install (venv)
            venv_pip = venv_dir / ".venv" / "bin" / "pip"
            
            if venv_pip.exists():
                success, _ = await self._run_command_unix(
                    [str(venv_pip), "install", "-r", str(requirements_file)],
                    project_dir,
                    progress_callback,
                )
            else:
                error_msg = f"找不到虚拟环境的 pip: {venv_pip}"
                logger.error(error_msg)
                if progress_callback:
                    await progress_callback(error_msg, "error")
                return False

        return success

    async def compile_quick_algo(
        self,
        lpmm_dir: Path,
        venv_type: str = "venv",
        progress_callback: Optional[Callable[[str, str], Any]] = None,
        venv_dir: Optional[Path] = None,
    ) -> bool:
        """
        编译 quick_algo (仅限 macOS)

        Args:
            lpmm_dir: LPMM 目录
            venv_type: 虚拟环境类型 (venv, uv, conda)
            progress_callback: 进度回调 (message, level)
            venv_dir: 虚拟环境目录 (如果为 None 则使用 lpmm_dir)

        Returns:
            是否成功
        """
        # 如果没有指定虚拟环境目录,使用 LPMM 目录
        if venv_dir is None:
            venv_dir = lpmm_dir
        try:
            # 检查操作系统
            if platform.system() != "Darwin":
                if progress_callback:
                    await progress_callback("非 macOS 系统，跳过 quick_algo 编译", "info")
                logger.info("非 macOS 系统，跳过 quick_algo 编译")
                return True

            if progress_callback:
                await progress_callback("开始编译 quick_algo (使用虚拟环境中的 Python)", "info")

            # 进入 lib/quick_algo 目录
            quick_algo_dir = lpmm_dir / "lib" / "quick_algo"
            if not quick_algo_dir.exists():
                error_msg = f"quick_algo 目录不存在: {quick_algo_dir}"
                if progress_callback:
                    await progress_callback(error_msg, "error")
                logger.error(error_msg)
                return False

            # 获取虚拟环境中的 Python 可执行文件
            venv_python = venv_dir / ".venv" / "bin" / "python"
            
            if not venv_python.exists():
                error_msg = f"虚拟环境 Python 不存在: {venv_python}"
                if progress_callback:
                    await progress_callback(error_msg, "error")
                logger.error(error_msg)
                return False

            # 使用虚拟环境中的 Python 执行编译脚本 (仅在 macOS 上)
            if venv_type == "conda":
                # conda 需要使用 conda run
                success, output = await self._run_command_unix(
                    ["conda", "run", "-p", str(venv_dir / ".venv"), "python", "build_lib.py", "--cleanup", "--cythonize", "--install"],
                    quick_algo_dir,
                    progress_callback,
                )
            else:
                # venv 和 uv 直接使用虚拟环境中的 Python
                success, output = await self._run_command_unix(
                    [str(venv_python), "build_lib.py", "--cleanup", "--cythonize", "--install"],
                    quick_algo_dir,
                    progress_callback,
                )

            if success:
                if progress_callback:
                    await progress_callback("quick_algo 编译成功", "success")
                logger.info("quick_algo 编译成功")
            else:
                if progress_callback:
                    await progress_callback(f"quick_algo 编译失败", "error")

            return success

        except Exception as e:
            error_msg = f"编译 quick_algo 失败: {str(e)}"
            if progress_callback:
                await progress_callback(error_msg, "error")
            logger.error(error_msg, exc_info=True)
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
            config_dir.mkdir(parents=True, exist_ok=True)

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

"""
环境配置模块
负责检查和管理系统环境配置，包括 Python、Git 等
"""
import locale
import os
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Optional, List, Dict
from dataclasses import dataclass


def get_console_encoding() -> str:
    """
    获取控制台编码（跨平台）
    
    Windows 中文版默认使用 GBK/GB2312 编码，而 Unix 系统通常使用 UTF-8。
    此函数自动检测当前系统的控制台编码。
    
    Returns:
        控制台编码名称，如 'utf-8', 'gbk', 'cp936' 等
    """
    if platform.system() == "Windows":
        # Windows: 尝试获取控制台代码页
        try:
            # 首先检查环境变量（如果用户设置了 PYTHONIOENCODING）
            env_encoding = os.environ.get("PYTHONIOENCODING")
            if env_encoding:
                return env_encoding.split(":")[0]  # 可能是 "utf-8:surrogateescape" 格式
            
            # 使用 chcp 命令获取当前代码页
            result = subprocess.run(
                ["chcp"],
                capture_output=True,
                text=True,
                shell=True,
                timeout=5
            )
            if result.returncode == 0:
                output = result.stdout.strip()
                # chcp 输出格式: "Active code page: 65001" 或中文 "活动代码页: 936"
                if "65001" in output:
                    return "utf-8"
                elif "936" in output or "936" in output:
                    return "gbk"
                elif "950" in output:
                    return "big5"
                elif "932" in output:
                    return "shift_jis"
                # 尝试提取代码页数字
                import re
                match = re.search(r'\d+', output)
                if match:
                    codepage = match.group()
                    return f"cp{codepage}"
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
            pass
        
        # Fallback: 使用系统默认编码
        return locale.getpreferredencoding(False) or "gbk"
    
    # Unix 系统通常使用 UTF-8
    return "utf-8"


def decode_console_output(data: bytes, errors: str = "replace") -> str:
    """
    解码控制台输出（跨平台）
    
    此函数会尝试使用正确的编码解码控制台输出。
    先尝试 UTF-8，失败后使用系统编码，再失败则使用 replace 策略。
    
    Args:
        data: 要解码的字节数据
        errors: 错误处理策略 ('strict', 'replace', 'ignore')
        
    Returns:
        解码后的字符串
    """
    if not data:
        return ""
    
    # 首先尝试 UTF-8（最常见的编码）
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        pass
    
    # Windows 上尝试系统编码
    if platform.system() == "Windows":
        console_encoding = get_console_encoding()
        if console_encoding and console_encoding.lower() != "utf-8":
            try:
                return data.decode(console_encoding)
            except (UnicodeDecodeError, LookupError):
                pass
    
    # 最后使用 UTF-8 + replace 策略
    return data.decode("utf-8", errors=errors)


@dataclass
class PythonVersion:
    """Python 版本信息"""
    path: str
    version: str
    major: int
    minor: int
    micro: int
    is_default: bool = False


@dataclass
class GitInfo:
    """Git 信息"""
    path: str
    version: str
    is_available: bool


class EnvironmentManager:
    """环境管理器"""
    
    def __init__(self):
        self._python_versions: Optional[List[PythonVersion]] = None
        self._git_info: Optional[GitInfo] = None
        
    def get_python_versions(self, force_refresh: bool = False) -> List[PythonVersion]:
        """
        获取系统中所有可用的 Python 版本
        
        Args:
            force_refresh: 是否强制刷新缓存
            
        Returns:
            Python 版本列表
        """
        if self._python_versions is not None and not force_refresh:
            return self._python_versions
            
        versions = []
        system = platform.system()
        
        # Windows 使用 python 命令,Unix 使用 python3
        if system == "Windows":
            # Windows: 检查 python 命令
            default_python = self._check_python_executable("python")
            if default_python and not self._is_venv_python(default_python.path):
                default_python.is_default = True
                versions.append(default_python)
        else:
            # Unix: 检查 python3
            default_python = self._check_python_executable("python3")
            if default_python and not self._is_venv_python(default_python.path):
                default_python.is_default = True
                versions.append(default_python)
            
            # 检查 python（可能是 python2 或 python3）
            python_cmd = self._check_python_executable("python")
            if python_cmd and not self._is_venv_python(python_cmd.path):
                if not default_python or python_cmd.path != default_python.path:
                    versions.append(python_cmd)
        
        # 在常见位置搜索其他 Python 版本
        versions.extend(self._search_python_installations())
        
        # 去重（基于路径）
        seen_paths = set()
        unique_versions = []
        for ver in versions:
            if ver.path not in seen_paths:
                seen_paths.add(ver.path)
                unique_versions.append(ver)
        
        # 按版本号排序（降序）
        unique_versions.sort(
            key=lambda x: (x.major, x.minor, x.micro),
            reverse=True
        )
        
        self._python_versions = unique_versions
        return unique_versions
    
    def _check_python_executable(self, command: str) -> Optional[PythonVersion]:
        """
        检查指定的 Python 可执行文件
        
        Args:
            command: Python 命令（如 'python3', 'python3.11'）
            
        Returns:
            PythonVersion 对象，如果不存在则返回 None
        """
        try:
            # 获取可执行文件路径
            path = shutil.which(command)
            if not path:
                return None
            
            # 获取版本信息
            result = subprocess.run(
                [command, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                return None
            
            # 解析版本号（Python 3.x.x 或 Python 2.x.x）
            version_str = result.stdout.strip() or result.stderr.strip()
            version_parts = version_str.split()[1].split(".")
            
            if len(version_parts) >= 3:
                major = int(version_parts[0])
                minor = int(version_parts[1])
                micro = int(version_parts[2])
                
                return PythonVersion(
                    path=path,
                    version=version_str.split()[1],
                    major=major,
                    minor=minor,
                    micro=micro
                )
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, ValueError, IndexError):
            pass
        
        return None
    
    def _is_venv_python(self, path: str) -> bool:
        """
        检查 Python 是否在虚拟环境中
        
        Args:
            path: Python 可执行文件路径
            
        Returns:
            是否为虚拟环境中的 Python
        """
        # 标准化路径分隔符,统一使用 /
        normalized_path = path.replace("\\", "/")
        
        # 常见的虚拟环境路径标识
        venv_indicators = [
            "/.venv/",
            "/venv/",
            "/env/",
            "/.virtualenv/",
            "/virtualenv/",
            "/.pyenv/",
            "/anaconda",
            "/miniconda",
            "/conda/",
            "/envs/",  # conda environments
        ]
        
        return any(indicator in normalized_path for indicator in venv_indicators)
    
    def _search_python_installations(self) -> List[PythonVersion]:
        """
        在系统常见位置搜索 Python 安装
        
        Returns:
            找到的 Python 版本列表
        """
        versions = []
        system = platform.system()
        
        if system == "Darwin":  # macOS
            # Homebrew 安装路径
            search_paths = [
                "/usr/local/bin",
                "/opt/homebrew/bin",
                "/Library/Frameworks/Python.framework/Versions",
            ]
            
            # 检查 Homebrew Python
            for base_path in ["/usr/local/bin", "/opt/homebrew/bin"]:
                if os.path.exists(base_path):
                    for entry in os.listdir(base_path):
                        if entry.startswith("python3."):
                            full_path = os.path.join(base_path, entry)
                            # 跳过虚拟环境中的 Python
                            if self._is_venv_python(full_path):
                                continue
                            py_ver = self._check_python_executable(full_path)
                            if py_ver:
                                versions.append(py_ver)
            
            # 检查 Python.org 安装
            framework_path = "/Library/Frameworks/Python.framework/Versions"
            if os.path.exists(framework_path):
                for version_dir in os.listdir(framework_path):
                    if version_dir.replace(".", "").isdigit():
                        py_path = os.path.join(framework_path, version_dir, "bin", "python3")
                        if os.path.exists(py_path):
                            # 跳过虚拟环境中的 Python
                            if self._is_venv_python(py_path):
                                continue
                            py_ver = self._check_python_executable(py_path)
                            if py_ver:
                                versions.append(py_ver)
        
        elif system == "Linux":
            # 常见的 Linux Python 位置
            search_paths = [
                "/usr/bin",
                "/usr/local/bin",
                "/opt/python",
            ]
            
            for base_path in search_paths:
                if os.path.exists(base_path):
                    try:
                        for entry in os.listdir(base_path):
                            if entry.startswith("python3."):
                                py_path = os.path.join(base_path, entry)
                                # 跳过虚拟环境中的 Python
                                if self._is_venv_python(py_path):
                                    continue
                                py_ver = self._check_python_executable(py_path)
                                if py_ver:
                                    versions.append(py_ver)
                    except PermissionError:
                        continue
        
        elif system == "Windows":
            # Windows: 首先尝试使用 py launcher 查找所有已安装的 Python
            try:
                result = subprocess.run(
                    ["py", "-0p"],  # 列出所有 Python 版本及其路径
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    # 解析 py -0p 的输出
                    # 格式: " -3.11-64        C:\Users\xxx\AppData\Local\Programs\Python\Python311\python.exe"
                    for line in result.stdout.strip().split('\n'):
                        if '*' in line:  # 跳过当前活动的标记
                            line = line.replace('*', ' ')
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            py_path = parts[-1]  # 最后一部分是路径
                            if os.path.exists(py_path):
                                # 跳过虚拟环境中的 Python
                                if self._is_venv_python(py_path):
                                    continue
                                py_ver = self._check_python_executable(py_path)
                                if py_ver:
                                    versions.append(py_ver)
            except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
                pass
            
            # 如果 py launcher 不可用,搜索常见的 Windows Python 安装位置
            search_paths = [
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Python"),
                os.path.join(os.environ.get("APPDATA", ""), "Programs", "Python"),
                "C:\\Python",
                "C:\\Program Files\\Python",
            ]
            
            for base_path in search_paths:
                if os.path.exists(base_path):
                    try:
                        for entry in os.listdir(base_path):
                            if entry.startswith("Python3"):
                                py_path = os.path.join(base_path, entry, "python.exe")
                                if os.path.exists(py_path):
                                    # 跳过虚拟环境中的 Python
                                    if self._is_venv_python(py_path):
                                        continue
                                    py_ver = self._check_python_executable(py_path)
                                    if py_ver:
                                        versions.append(py_ver)
                    except PermissionError:
                        continue
        
        return versions
    
    def get_default_python(self) -> Optional[PythonVersion]:
        """
        获取默认的 Python 版本
        
        Returns:
            默认的 PythonVersion，如果不存在则返回 None
        """
        versions = self.get_python_versions()
        for ver in versions:
            if ver.is_default:
                return ver
        return versions[0] if versions else None
    
    def check_git(self, force_refresh: bool = False) -> GitInfo:
        """
        检查 Git 环境
        
        Args:
            force_refresh: 是否强制刷新缓存
            
        Returns:
            GitInfo 对象
        """
        if self._git_info is not None and not force_refresh:
            return self._git_info
        
        try:
            # 检查 git 命令是否可用
            git_path = shutil.which("git")
            if not git_path:
                self._git_info = GitInfo(
                    path="",
                    version="",
                    is_available=False
                )
                return self._git_info
            
            # 获取 Git 版本
            result = subprocess.run(
                ["git", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                version_str = result.stdout.strip().split()[-1]
                self._git_info = GitInfo(
                    path=git_path,
                    version=version_str,
                    is_available=True
                )
            else:
                self._git_info = GitInfo(
                    path=git_path,
                    version="",
                    is_available=False
                )
        
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            self._git_info = GitInfo(
                path="",
                version="",
                is_available=False
            )
        
        return self._git_info
    
    def get_system_info(self) -> Dict[str, str]:
        """
        获取系统信息
        
        Returns:
            系统信息字典
        """
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        }


# 创建全局环境管理器实例
environment_manager = EnvironmentManager()

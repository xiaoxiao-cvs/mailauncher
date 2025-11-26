"""
NapCat 安装服务

完全使用 Python 实现 NapCat 的下载、解压和配置，
不依赖外部 shell 脚本,提供更好的跨平台兼容性和错误处理。

支持平台: macOS, Windows

LEGAL NOTICE - NapCat Integration:
- NapCat is licensed under a Limited Redistribution License
- Copyright © 2024 Mlikiowa
- Project: https://github.com/NapNeko/NapCatQQ
- This installer ONLY downloads official NapCat releases from GitHub
- No NapCat source code is included, modified, or redistributed
- Users must comply with NapCat's license terms:
  * Non-commercial use only
  * No unauthorized modification or redistribution
  * See full license: https://github.com/NapNeko/NapCatQQ/blob/main/LICENSE
"""
import platform
import shutil
import ssl
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Callable, Optional

import aiohttp

from ..core.logger import logger

# 平台检测：Windows 上 chmod 无效，跳过权限设置
_is_windows = platform.system() == "Windows"


def _set_executable(file_path: Path) -> None:
    """设置文件为可执行权限 (Unix only)
    
    Args:
        file_path: 文件路径
    
    Note:
        Windows 上 chmod(0o755) 无效，Windows 通过文件扩展名判断可执行性
    """
    if not _is_windows and file_path.exists():
        try:
            file_path.chmod(0o755)
        except OSError as e:
            logger.warning(f"设置文件权限失败 {file_path}: {e}")


class NapCatInstaller:
    """NapCat 安装器 (支持 macOS 和 Windows)"""
    
    # NapCat 下载地址 - 通用Shell包（无头版本）
    NAPCAT_SHELL_URL = "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip"
    
    def __init__(self):
        """初始化安装器"""
        self.system = platform.system()
        logger.info(f"检测到操作系统: {self.system}")
    
    async def install(
        self,
        instance_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        安装 NapCat
        
        流程:
        - macOS: 使用系统已安装的 QQ → 下载 NapCat → 创建启动脚本
        - Windows: 下载 NapCat Shell 包 → 使用官方 launcher.bat

        Args:
            instance_dir: 实例目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback("开始安装 NapCat...", "info")
            
            logger.info(f"开始在 {instance_dir} 安装 NapCat (系统: {self.system})")
            
            # 定义路径
            napcat_dir = instance_dir / "NapCat"
            config_dir = napcat_dir / "config"
            
            # 创建目录
            napcat_dir.mkdir(parents=True, exist_ok=True)
            config_dir.mkdir(parents=True, exist_ok=True)
            
            if self.system == "Darwin":
                # macOS 系统：使用系统 QQ
                if progress_callback:
                    await progress_callback("[检测] 检测 macOS QQ 安装...", "info")
                
                # 检测 QQ 安装路径
                qq_app_path = Path("/Applications/QQ.app")
                if not qq_app_path.exists():
                    error_msg = (
                        "未检测到 QQ.app，请先安装 QQ for macOS\n"
                        "下载地址: https://im.qq.com/macqq/"
                    )
                    logger.error(error_msg)
                    if progress_callback:
                        await progress_callback(f"[错误] {error_msg}", "error")
                    return False
                
                logger.info(f"检测到 QQ 安装: {qq_app_path}")
                
                napcat_plugin_dir = napcat_dir / "napcat"
                
                # 下载和安装 NapCat
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    await self._download_and_extract_napcat(
                        temp_path, napcat_plugin_dir, progress_callback
                    )
                
                # 创建 macOS 启动脚本
                await self._create_start_script_macos(napcat_dir, qq_app_path, progress_callback)
                
                start_script_path = napcat_dir / "start.sh"
                
            elif self.system == "Windows":
                # Windows 系统：下载 NapCat Shell 包，直接使用官方 launcher-user.bat
                if progress_callback:
                    await progress_callback("[下载] 准备下载 NapCat Shell 包...", "info")
                
                # 下载和解压 NapCat（直接解压到 napcat_dir）
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    await self._download_and_extract_napcat_windows(
                        temp_path, napcat_dir, progress_callback
                    )
                
                # 创建 README 说明文件
                await self._create_readme_windows(napcat_dir, progress_callback)
                
                # 使用官方的 launcher-user.bat 作为启动脚本
                launcher_user = napcat_dir / "launcher-user.bat"
                if launcher_user.exists():
                    start_script_path = launcher_user
                else:
                    start_script_path = napcat_dir / "launcher.bat"
                
            else:
                error_msg = f"不支持的操作系统: {self.system}，仅支持 macOS 和 Windows"
                logger.error(error_msg)
                if progress_callback:
                    await progress_callback(f"[错误] {error_msg}", "error")
                return False
            
            logger.info(f"NapCat 安装成功: {napcat_dir}")
            if progress_callback:
                await progress_callback(
                    f"[成功] NapCat 安装完成！\n"
                    f"安装目录: {napcat_dir}\n"
                    f"启动脚本: {start_script_path}",
                    "success"
                )
            
            return True
                
        except Exception as e:
            logger.error(f"NapCat 安装失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            if progress_callback:
                await progress_callback(f"[错误] NapCat 安装失败: {str(e)}", "error")
            return False
    
    async def _download_and_extract_napcat(
        self,
        temp_path: Path,
        napcat_plugin_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并解压 NapCat (macOS)"""
        if progress_callback:
            await progress_callback("[下载] 下载 NapCat...", "info")
        
        napcat_zip = temp_path / "napcat.zip"
        
        # 创建 SSL 上下文，禁用证书验证
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 下载 NapCat
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(self.NAPCAT_SHELL_URL, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"下载 NapCat 失败: HTTP {response.status}")
                
                with open(napcat_zip, 'wb') as f:
                    downloaded = 0
                    total = int(response.headers.get('content-length', 0))
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0 and progress_callback:
                            percent = (downloaded / total) * 100
                            if int(percent) % 10 == 0:
                                await progress_callback(
                                    f"下载进度: {percent:.0f}%", "info"
                                )
        
        if progress_callback:
            await progress_callback("[完成] NapCat 下载完成", "success")
        
        # 解压 NapCat
        if progress_callback:
            await progress_callback("[解压] 解压 NapCat...", "info")
        
        napcat_temp = temp_path / "napcat_extracted"
        with zipfile.ZipFile(napcat_zip, 'r') as zip_ref:
            zip_ref.extractall(napcat_temp)
        
        # NapCat.Shell.zip 解压后可能有个 NapCat 子文件夹
        napcat_source = napcat_temp / "NapCat"
        if not napcat_source.exists():
            napcat_source = napcat_temp
        
        # 复制到目标位置
        if napcat_plugin_dir.exists():
            shutil.rmtree(napcat_plugin_dir)
        shutil.copytree(napcat_source, napcat_plugin_dir)
        
        # 设置权限 (Unix only)
        for file in napcat_plugin_dir.rglob("*"):
            if file.is_file() and (file.suffix in ['.sh', '.mjs', '.js'] or 'bin' in file.parts):
                _set_executable(file)
        
        if progress_callback:
            await progress_callback("[完成] NapCat 解压完成", "success")
    
    async def _download_and_extract_napcat_windows(
        self,
        temp_path: Path,
        napcat_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并解压 NapCat Windows Shell 包
        
        直接解压到 napcat_dir，保留官方目录结构（包含 launcher.bat）
        """
        if progress_callback:
            await progress_callback("[下载] 下载 NapCat Shell 包...", "info")
        
        napcat_zip = temp_path / "napcat_shell.zip"
        
        # 创建 SSL 上下文，禁用证书验证
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 下载 NapCat Shell 包
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(self.NAPCAT_SHELL_URL, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"下载 NapCat Shell 包失败: HTTP {response.status}")
                
                with open(napcat_zip, 'wb') as f:
                    downloaded = 0
                    total = int(response.headers.get('content-length', 0))
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0 and progress_callback:
                            percent = (downloaded / total) * 100
                            if int(percent) % 10 == 0:
                                await progress_callback(
                                    f"下载进度: {percent:.0f}%", "info"
                                )
        
        if progress_callback:
            await progress_callback("[完成] NapCat Shell 包下载完成", "success")
        
        # 解压 NapCat
        if progress_callback:
            await progress_callback("[解压] 解压 NapCat...", "info")
        
        napcat_temp = temp_path / "napcat_extracted"
        with zipfile.ZipFile(napcat_zip, 'r') as zip_ref:
            zip_ref.extractall(napcat_temp)
        
        # NapCat.Shell.zip 解压后结构：
        # - 可能直接是文件（launcher.bat, napcat.mjs 等）
        # - 或者有个 NapCat 子文件夹
        napcat_source = napcat_temp / "NapCat"
        if not napcat_source.exists():
            napcat_source = napcat_temp
        
        # 检查是否存在 launcher.bat（官方启动脚本）
        launcher_bat = napcat_source / "launcher.bat"
        if not launcher_bat.exists():
            logger.warning(f"未找到 launcher.bat，将查找其他目录结构")
            # 尝试在子目录中查找
            for subdir in napcat_source.iterdir():
                if subdir.is_dir() and (subdir / "launcher.bat").exists():
                    napcat_source = subdir
                    launcher_bat = napcat_source / "launcher.bat"
                    logger.info(f"在子目录找到 launcher.bat: {launcher_bat}")
                    break
        
        # 清理目标目录中的旧文件（保留 config 目录）
        config_backup = None
        config_dir = napcat_dir / "config"
        if config_dir.exists():
            config_backup = temp_path / "config_backup"
            shutil.copytree(config_dir, config_backup)
        
        # 清理 napcat_dir 中除了必要文件外的内容
        for item in napcat_dir.iterdir():
            if item.name not in ["config", "start.bat", "README.md"]:
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
        
        # 复制新文件到目标位置
        for item in napcat_source.iterdir():
            dest = napcat_dir / item.name
            if item.is_dir():
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)
        
        # 恢复 config 目录
        if config_backup and config_backup.exists():
            if config_dir.exists():
                shutil.rmtree(config_dir)
            shutil.copytree(config_backup, config_dir)
        
        # 验证 launcher.bat 存在
        launcher_bat = napcat_dir / "launcher.bat"
        if not launcher_bat.exists():
            raise Exception("NapCat Shell 包解压后未找到 launcher.bat，请检查下载的文件是否完整")
        
        logger.info(f"NapCat Shell 包解压完成，launcher.bat 路径: {launcher_bat}")
        
        if progress_callback:
            await progress_callback("[完成] NapCat 解压完成", "success")
    
    async def _create_start_script_macos(
        self,
        napcat_dir: Path,
        qq_app_path: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """创建 macOS 启动脚本（无头模式）"""
        if progress_callback:
            await progress_callback("[创建] 创建启动脚本...", "info")
        
        start_script = napcat_dir / "start.sh"
        
        # 创建主启动脚本
        start_script.write_text(f"""#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
QQ_APP="/Applications/QQ.app"
QQ_BIN="$QQ_APP/Contents/MacOS/QQ"
NAPCAT_DIR="$SCRIPT_DIR/napcat"
QQ_ACCOUNT="$1"

if [ ! -d "$QQ_APP" ]; then
    echo "错误: 未找到 QQ.app"
    exit 1
fi

if [ ! -f "$NAPCAT_DIR/napcat.mjs" ]; then
    echo "错误: NapCat 插件不存在"
    exit 1
fi

echo "========================================"
echo "启动 NapCat"
echo "========================================"
echo "NapCat 插件: $NAPCAT_DIR"

export NAPCAT_PATH="$NAPCAT_DIR"
export NODE_OPTIONS="--import=file://$NAPCAT_DIR/napcat.mjs"

if [ -n "$QQ_ACCOUNT" ]; then
    echo "QQ 账号: $QQ_ACCOUNT"
    echo "使用快速登录模式 (-q)"
    "$QQ_BIN" --no-sandbox -q "$QQ_ACCOUNT"
else
    echo "无账号参数，使用默认模式"
    "$QQ_BIN" --no-sandbox
fi
""", encoding='utf-8')
        _set_executable(start_script)
        
        # 创建 README 说明文件
        readme = napcat_dir / "README.md"
        readme.write_text("""# NapCat 使用说明 (macOS)

## 目录结构
- `napcat/` - NapCat 插件文件
- `config/` - 配置文件目录
- `start.sh` - 启动脚本

## 启动说明

### 首次启动
首次启动时，二维码会直接显示在终端中：
```bash
./start.sh
```
**请在启动器的终端窗口中查看二维码，使用手机 QQ 扫描完成登录。**

### 快速登录
登录成功后，可以使用 QQ 账号参数快速启动：
```bash
./start.sh <你的QQ号>
```

## 技术支持
- NapCat 项目: https://github.com/NapNeko/NapCatQQ
""", encoding='utf-8')
        
        if progress_callback:
            await progress_callback("[完成] 启动脚本创建完成", "success")
    
    async def _create_readme_windows(
        self,
        napcat_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """创建 Windows README 说明文件"""
        if progress_callback:
            await progress_callback("[创建] 创建说明文件...", "info")
        
        # 创建 README
        readme = napcat_dir / "README.md"
        readme.write_text("""# NapCat 使用说明 (Windows)

## 目录结构
- `launcher-user.bat` - NapCat 官方启动脚本（用户模式，推荐）
- `launcher.bat` - NapCat 官方启动脚本（管理员模式）
- `config/` - 配置文件目录

## 启动说明

### 首次启动
首次启动时，二维码会直接显示在终端中。
**请在启动器的终端窗口中查看二维码，使用手机 QQ 扫描完成登录。**

### 快速登录
登录成功后，可以使用 `-q` 参数加 QQ 账号快速启动：
```cmd
launcher-user.bat -q <你的QQ号>
```

## 技术支持
- NapCat 项目: https://github.com/NapNeko/NapCatQQ
""", encoding='utf-8')
        
        if progress_callback:
            await progress_callback("[完成] 说明文件创建完成", "success")


# 单例实例
_napcat_installer = None

def get_napcat_installer() -> NapCatInstaller:
    """获取 NapCat 安装器单例"""
    global _napcat_installer
    if _napcat_installer is None:
        _napcat_installer = NapCatInstaller()
    return _napcat_installer

"""
NapCat 安装服务 (纯 Python 实现)

完全使用 Python 实现 NapCat 的下载、解压和配置，
不依赖外部 shell 脚本,提供更好的跨平台兼容性和错误处理。

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
import asyncio
import json
import platform
import shutil
import ssl
import struct
import tarfile
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Callable, Optional

import aiohttp

from ..core.logger import logger


class NapCatInstaller:
    """NapCat 安装器"""
    
    # NapCat 下载地址
    # macOS/Linux: 通用Shell包
    NAPCAT_SHELL_URL = "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip"
    # Windows: 一键部署包 (包含QQ和NapCat)
    NAPCAT_WINDOWS_ONEKEY_URL = "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.Windows.OneKey.zip"
    
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
        - Linux: 下载 Linux QQ deb 包 → 解压 → 安装 NapCat
        - macOS: 使用系统已安装的 QQ → 安装 NapCat
        - Windows: 使用系统已安装的 QQ → 安装 NapCat

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
            napcat_plugin_dir = napcat_dir / "napcat"
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
                
                # 下载和安装 NapCat
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    await self._install_napcat_macos(
                        temp_path, napcat_plugin_dir, qq_app_path, progress_callback
                    )
                
                # 创建 macOS 启动脚本
                await self._create_start_script_macos(napcat_dir, qq_app_path, progress_callback)
                
            elif self.system == "Windows":
                # Windows 系统：使用官方一键部署包 (内置QQ和NapCat)
                if progress_callback:
                    await progress_callback("[下载] 下载 NapCat Windows 一键包...", "info")
                
                logger.info("Windows 使用官方一键部署包")
                
                # 下载和安装 NapCat 一键包
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    await self._install_napcat_windows_onekey(
                        temp_path, napcat_dir, progress_callback
                    )
                
                # Windows 一键包说明
                if progress_callback:
                    await progress_callback("[说明] Windows 一键包配置完成", "info")
                
            else:
                error_msg = f"暂不支持的操作系统: {self.system}"
                logger.error(error_msg)
                if progress_callback:
                    await progress_callback(f"[错误] {error_msg}", "error")
                return False
            
            # 确定启动脚本路径
            if self.system == "Windows":
                # Windows 使用一键包自带的启动脚本
                bootmain_bat = napcat_dir / "bootmain" / "napcat.bat"
                if bootmain_bat.exists():
                    start_script_path = bootmain_bat
                else:
                    # 如果是未安装的一键包，指向安装程序
                    start_script_path = napcat_dir / "NapCatInstaller.exe"
            else:
                start_script_path = napcat_dir / "start.sh"
            
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
    
    async def _extract_deb_package(self, deb_file: Path, output_dir: Path) -> Optional[Path]:
        """
        解析 ar 格式的 deb 包并提取 data.tar.* 文件
        
        ar 格式：
        - 全局头：8字节 "!<arch>\n"
        - 文件条目：每个条目60字节头 + 文件内容
        
        Args:
            deb_file: deb 包路径
            output_dir: 输出目录
            
        Returns:
            提取的 data.tar.* 文件路径
        """
        try:
            with open(deb_file, 'rb') as f:
                # 读取全局头
                magic = f.read(8)
                if magic != b'!<arch>\n':
                    logger.error(f"不是有效的 ar 归档文件: {magic}")
                    return None
                
                # 解析每个文件条目
                while True:
                    # 读取文件头（60字节）
                    header = f.read(60)
                    if len(header) < 60:
                        break
                    
                    # 解析头部
                    # 格式: name(16) mtime(12) uid(6) gid(6) mode(8) size(10) magic(2)
                    name = header[0:16].decode('ascii').strip()
                    size_str = header[48:58].decode('ascii').strip()
                    magic = header[58:60]
                    
                    if magic != b'\x60\n':
                        logger.warning(f"无效的文件条目魔数: {magic}")
                        break
                    
                    try:
                        size = int(size_str)
                    except ValueError:
                        logger.error(f"无法解析文件大小: {size_str}")
                        break
                    
                    # 读取文件内容
                    content = f.read(size)
                    
                    # ar 归档要求每个文件以偶数字节对齐
                    if size % 2 == 1:
                        f.read(1)
                    
                    # 检查是否是 data.tar.* 文件
                    if name.startswith('data.tar'):
                        # 移除末尾的 '/' 如果有
                        clean_name = name.rstrip('/')
                        output_file = output_dir / clean_name
                        
                        logger.info(f"找到数据文件: {clean_name} (大小: {size} 字节)")
                        
                        # 写入文件
                        with open(output_file, 'wb') as out_f:
                            out_f.write(content)
                        
                        return output_file
                
                logger.error("在 deb 包中未找到 data.tar.* 文件")
                return None
                
        except Exception as e:
            logger.error(f"解析 deb 包失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    async def _install_linux_qq(
        self,
        temp_path: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 Linux QQ"""
        if progress_callback:
            await progress_callback("[下载] 下载 Linux QQ...", "info")
        
        deb_file = temp_path / "qq.deb"
        
        # 创建 SSL 上下文，禁用证书验证（用于处理自签名证书问题）
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 下载 deb 包
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(self.LINUX_QQ_URL) as response:
                if response.status != 200:
                    raise Exception(f"下载 QQ 失败: HTTP {response.status}")
                
                with open(deb_file, 'wb') as f:
                    downloaded = 0
                    total = int(response.headers.get('content-length', 0))
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0 and progress_callback:
                            percent = (downloaded / total) * 100
                            if int(percent) % 10 == 0:  # 每10%报告一次
                                await progress_callback(
                                    f"下载进度: {percent:.0f}%", "info"
                                )
        
        if progress_callback:
            await progress_callback("[完成] Linux QQ 下载完成", "success")
        
        # 解压 deb 包
        if progress_callback:
            await progress_callback("[解压] 解压 Linux QQ...", "info")
        
        # deb 包是 ar 归档，使用 Python 直接解析
        logger.info("开始从 deb 包提取文件...")
        
        # 使用 Python 解析 ar 归档格式
        data_tar_path = await self._extract_deb_package(deb_file, temp_path)
        
        if not data_tar_path or not data_tar_path.exists():
            raise Exception("无法从 deb 包中提取数据文件")
        
        logger.info(f"成功提取数据文件: {data_tar_path.name}")
        
        # 解压 data.tar.xz
        qq_temp = temp_path / "qq_extracted"
        qq_temp.mkdir()
        
        with tarfile.open(data_tar_path) as tar:
            tar.extractall(qq_temp)
        
        # 复制 QQ 文件
        qq_source = qq_temp / "opt" / "QQ"
        if not qq_source.exists():
            raise Exception("QQ 文件目录不存在")
        
        if qq_dir.exists():
            shutil.rmtree(qq_dir)
        shutil.copytree(qq_source, qq_dir)
        
        # 设置可执行权限
        qq_bin = qq_dir / "qq"
        if qq_bin.exists():
            qq_bin.chmod(0o755)
        
        if progress_callback:
            await progress_callback("[完成] Linux QQ 安装完成", "success")
    
    async def _install_napcat(
        self,
        temp_path: Path,
        napcat_plugin_dir: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 NapCat"""
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
            async with session.get(self.NAPCAT_URL, allow_redirects=True) as response:
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
            # 如果没有子文件夹，直接使用解压目录
            napcat_source = napcat_temp
        
        # 复制到目标位置
        if napcat_plugin_dir.exists():
            shutil.rmtree(napcat_plugin_dir)
        shutil.copytree(napcat_source, napcat_plugin_dir)
        
        # 设置权限
        for file in napcat_plugin_dir.rglob("*"):
            if file.is_file() and (file.suffix in ['.sh', '.mjs', '.js'] or 'bin' in file.parts):
                try:
                    file.chmod(0o755)
                except:
                    pass
        
        if progress_callback:
            await progress_callback("[完成] NapCat 解压完成", "success")
        
        # 集成到 QQ
        if progress_callback:
            await progress_callback("[配置] 集成 NapCat 到 QQ...", "info")
        
        app_path = qq_dir / "resources" / "app"
        app_path.mkdir(parents=True, exist_ok=True)
        
        # 创建 loadNapCat.js
        load_script = app_path / "loadNapCat.js"
        load_script.write_text(f"""(async () => {{
    await import('file://{napcat_plugin_dir.resolve()}/napcat.mjs');
}})();
""")
        
        # 修改 package.json
        package_json = app_path / "package.json"
        if package_json.exists():
            # 备份
            shutil.copy(package_json, app_path / "package.json.bak")
            
            # 修改 main 字段
            with open(package_json, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            pkg['main'] = './loadNapCat.js'
            with open(package_json, 'w', encoding='utf-8') as f:
                json.dump(pkg, f, indent=2, ensure_ascii=False)
        else:
            # 创建新的 package.json
            pkg = {"main": "./loadNapCat.js"}
            with open(package_json, 'w', encoding='utf-8') as f:
                json.dump(pkg, f, indent=2, ensure_ascii=False)
        
        if progress_callback:
            await progress_callback("[完成] NapCat 集成完成", "success")
    
    async def _install_napcat_macos(
        self,
        temp_path: Path,
        napcat_plugin_dir: Path,
        qq_app_path: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 NapCat (macOS) - 无需修改系统 QQ.app"""
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
            async with session.get(self.NAPCAT_URL, allow_redirects=True) as response:
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
        
        # 设置权限
        for file in napcat_plugin_dir.rglob("*"):
            if file.is_file() and (file.suffix in ['.sh', '.mjs', '.js'] or 'bin' in file.parts):
                try:
                    file.chmod(0o755)
                except:
                    pass
        
        if progress_callback:
            await progress_callback("[完成] NapCat 解压完成", "success")
        
        # macOS 策略：不修改系统 QQ.app，通过环境变量加载 NapCat
        if progress_callback:
            await progress_callback("[配置] 配置 NapCat 加载方式...", "info")
        
        logger.info("macOS 使用环境变量方式加载 NapCat，无需修改系统 QQ.app")
        
        if progress_callback:
            await progress_callback("[完成] NapCat 配置完成", "success")
    
    async def _install_napcat_windows_onekey(
        self,
        temp_path: Path,
        napcat_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 NapCat Windows 一键包 (内置QQ和NapCat)"""
        if progress_callback:
            await progress_callback("[下载] 下载 NapCat Windows 一键包...", "info")
        
        napcat_zip = temp_path / "napcat_windows_onekey.zip"
        
        # 创建 SSL 上下文，禁用证书验证
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # 下载 NapCat Windows 一键包
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(self.NAPCAT_WINDOWS_ONEKEY_URL, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"下载 NapCat Windows 一键包失败: HTTP {response.status}")
                
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
            await progress_callback("[完成] NapCat Windows 一键包下载完成", "success")
        
        # 解压 NapCat 一键包
        if progress_callback:
            await progress_callback("[解压] 解压 NapCat 一键包...", "info")
        
        # 直接解压到 napcat_dir
        with zipfile.ZipFile(napcat_zip, 'r') as zip_ref:
            zip_ref.extractall(napcat_dir)
        
        if progress_callback:
            await progress_callback("[完成] NapCat Windows 一键包解压完成", "success")
        
        logger.info(f"Windows 一键包安装完成: {napcat_dir}")
    
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
        
        # 创建主启动脚本（无头模式，使用环境变量加载 NapCat）
        start_script.write_text(f"""#!/bin/bash
# NapCat 启动脚本 (macOS 无头模式)
# 自动生成 - 请勿手动修改

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
QQ_APP="/Applications/QQ.app"
QQ_BIN="$QQ_APP/Contents/MacOS/QQ"
NAPCAT_DIR="$SCRIPT_DIR/napcat"
QQ_ACCOUNT="${{1:-$QQ_ACCOUNT}}"
LOGIN_FLAG="$SCRIPT_DIR/.logged_in"

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[0;33m'
NC='\\033[0m'

# 检查 QQ.app
if [ ! -d "$QQ_APP" ]; then
    echo -e "${{RED}}错误: 未找到 QQ.app${{NC}}"
    echo "请先安装 QQ for macOS: https://im.qq.com/macqq/"
    exit 1
fi

if [ ! -f "$QQ_BIN" ]; then
    echo -e "${{RED}}错误: QQ 可执行文件不存在: $QQ_BIN${{NC}}"
    exit 1
fi

# 检查 NapCat 插件
if [ ! -f "$NAPCAT_DIR/napcat.mjs" ]; then
    echo -e "${{RED}}错误: NapCat 插件不存在: $NAPCAT_DIR/napcat.mjs${{NC}}"
    exit 1
fi

echo -e "${{BLUE}}========================================${{NC}}"
echo -e "${{GREEN}}启动 NapCat (macOS 无头模式)${{NC}}"
echo -e "${{BLUE}}========================================${{NC}}"
echo "NapCat 插件: $NAPCAT_DIR"
echo ""

# 设置环境变量以加载 NapCat
export NAPCAT_PATH="$NAPCAT_DIR"

# 检查是否首次启动
if [ ! -f "$LOGIN_FLAG" ]; then
    echo -e "${{YELLOW}}检测到首次启动，将启动 WebUI 和二维码登录...${{NC}}"
    echo -e "${{YELLOW}}请使用手机 QQ 扫描下方终端显示的二维码进行登录${{NC}}"
    echo -e "${{YELLOW}}登录成功后，程序会自动创建登录标记${{NC}}"
    echo ""
    echo "工作目录: $SCRIPT_DIR"
    echo ""
    
    # 首次启动：无头模式，不带 QQ 账号
    # 通过 NODE_OPTIONS 加载 NapCat
    export NODE_OPTIONS="--import=file://$NAPCAT_DIR/napcat.mjs"
    
    # 所有输出都会显示在终端中，包括二维码
    # --no-sandbox: 无头模式，不显示 GUI 窗口
    "$QQ_BIN" --no-sandbox
    
    # 如果正常退出，创建登录标记
    if [ $? -eq 0 ]; then
        touch "$LOGIN_FLAG"
        echo -e "${{GREEN}}登录成功！登录标记已创建${{NC}}"
        echo -e "${{GREEN}}下次启动将使用快速登录模式${{NC}}"
    fi
else
    # 已经登录过
    if [ -z "$QQ_ACCOUNT" ]; then
        echo -e "${{YELLOW}}提示: 未提供 QQ 账号，使用默认启动模式${{NC}}"
        echo "如需指定账号登录，请使用:"
        echo "  方式 1: ./start.sh <QQ账号>"
        echo "  方式 2: export QQ_ACCOUNT=<QQ账号> && ./start.sh"
        echo ""
        echo "工作目录: $SCRIPT_DIR"
        echo ""
        
        # 通过 NODE_OPTIONS 加载 NapCat
        export NODE_OPTIONS="--import=file://$NAPCAT_DIR/napcat.mjs"
        
        # 无头模式启动（不带账号）
        # --no-sandbox: 无头模式，不显示 GUI 窗口
        "$QQ_BIN" --no-sandbox
    else
        echo "QQ 账号: $QQ_ACCOUNT"
        echo "工作目录: $SCRIPT_DIR"
        echo ""
        
        # 通过 NODE_OPTIONS 加载 NapCat
        export NODE_OPTIONS="--import=file://$NAPCAT_DIR/napcat.mjs"
        
        # 无头模式启动（带账号快速登录）
        # --no-sandbox: 无头模式，不显示 GUI 窗口
        # -q: 快速登录指定账号
        "$QQ_BIN" --no-sandbox -q "$QQ_ACCOUNT"
    fi
fi
""", encoding='utf-8')
        start_script.chmod(0o755)
        
        # 创建重置登录脚本
        reset_script = napcat_dir / "reset_login.sh"
        reset_script.write_text(f"""#!/bin/bash
# NapCat 重置登录脚本 (macOS)
# 用于重新扫码登录

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
LOGIN_FLAG="$SCRIPT_DIR/.logged_in"

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
NC='\\033[0m'

echo -e "${{YELLOW}}========================================${{NC}}"
echo -e "${{YELLOW}}重置 NapCat 登录状态${{NC}}"
echo -e "${{YELLOW}}========================================${{NC}}"

if [ -f "$LOGIN_FLAG" ]; then
    rm -f "$LOGIN_FLAG"
    echo -e "${{GREEN}}✓ 登录标记已删除${{NC}}"
    echo -e "${{GREEN}}下次启动将重新进行扫码登录${{NC}}"
else
    echo -e "${{YELLOW}}! 未找到登录标记，已经是首次登录状态${{NC}}"
fi

echo ""
echo "提示: 运行 ./start.sh 开始重新登录"
""", encoding='utf-8')
        reset_script.chmod(0o755)
        
        # 创建 README 说明文件
        readme = napcat_dir / "README.md"
        readme.write_text(f"""# NapCat 使用说明 (macOS 无头模式)

## 目录结构
- `napcat/` - NapCat 插件文件
- `config/` - 配置文件目录
- `start.sh` - 启动脚本（无头模式）
- `reset_login.sh` - 重置登录状态脚本

## 启动说明

### 无头模式 (Headless Mode)
本启动器使用无头模式运行 NapCat，所有输出（包括二维码、日志）都会显示在启动器的终端窗口中。

### 首次启动
首次启动时，二维码会直接显示在终端中：
```bash
./start.sh
```
**请在启动器的终端窗口中查看二维码，使用手机 QQ 扫描完成登录。**

### 后续启动
登录成功后，可以使用以下方式快速启动：

方式 1: 使用 QQ 账号参数
```bash
./start.sh <你的QQ号>
```

方式 2: 设置环境变量
```bash
export QQ_ACCOUNT=<你的QQ号>
./start.sh
```

方式 3: 默认启动（不带账号）
```bash
./start.sh
```

### 重新登录
如需重新扫码登录（例如换账号），可以运行：
```bash
./reset_login.sh
```
然后重新执行 `./start.sh` 进行扫码登录。

""", encoding='utf-8')
        
        if progress_callback:
            await progress_callback("[完成] 启动脚本和说明文档创建完成", "success")
    
    async def _create_start_script(
        self,
        napcat_dir: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """创建启动脚本（Linux 无头模式）"""
        if progress_callback:
            await progress_callback("[创建] 创建启动脚本...", "info")
        
        start_script = napcat_dir / "start.sh"
        
        # 创建主启动脚本
        start_script.write_text(f"""#!/bin/bash
# NapCat 启动脚本 (Linux 无头模式)
# 自动生成 - 请勿手动修改

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
QQ_BIN="$SCRIPT_DIR/QQ/qq"
QQ_ACCOUNT="${{1:-$QQ_ACCOUNT}}"
LOGIN_FLAG="$SCRIPT_DIR/.logged_in"

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[0;33m'
NC='\\033[0m'

# 检查 QQ 可执行文件
if [ ! -f "$QQ_BIN" ]; then
    echo -e "${{RED}}错误: QQ 可执行文件不存在: $QQ_BIN${{NC}}"
    exit 1
fi

echo -e "${{BLUE}}========================================${{NC}}"
echo -e "${{GREEN}}启动 NapCat (Linux 无头模式)${{NC}}"
echo -e "${{BLUE}}========================================${{NC}}"

# 检查是否首次启动
if [ ! -f "$LOGIN_FLAG" ]; then
    echo -e "${{YELLOW}}检测到首次启动，将启动 WebUI 和二维码登录...${{NC}}"
    echo -e "${{YELLOW}}请使用手机 QQ 扫描下方终端显示的二维码进行登录${{NC}}"
    echo -e "${{YELLOW}}登录成功后，程序会自动创建登录标记${{NC}}"
    echo ""
    echo "工作目录: $SCRIPT_DIR"
    echo ""
    
    # 首次启动：无头模式，不带 QQ 账号，启动 WebUI 和二维码
    # 所有输出（包括二维码）都会显示在终端中
    "$QQ_BIN" --no-sandbox
    
    # 如果启动成功且登录成功，创建登录标记
    if [ $? -eq 0 ]; then
        echo -e "${{GREEN}}登录成功！创建登录标记...${{NC}}"
        touch "$LOGIN_FLAG"
        echo -e "${{GREEN}}下次启动将使用快速登录模式${{NC}}"
    fi
else
    # 已经登录过，检查是否提供了 QQ 账号
    if [ -z "$QQ_ACCOUNT" ]; then
        echo -e "${{YELLOW}}提示: 未提供 QQ 账号，使用默认启动模式${{NC}}"
        echo "如需指定账号登录，请使用:"
        echo "  方式 1: ./start.sh <QQ账号>"
        echo "  方式 2: export QQ_ACCOUNT=<QQ账号> && ./start.sh"
        echo ""
        echo "工作目录: $SCRIPT_DIR"
        echo ""
        
        # 无头模式启动（不带账号）
        "$QQ_BIN" --no-sandbox
    else
        echo "QQ 账号: $QQ_ACCOUNT"
        echo "工作目录: $SCRIPT_DIR"
        echo ""
        
        # 无头模式启动（带账号快速登录）
        "$QQ_BIN" --no-sandbox -q "$QQ_ACCOUNT"
    fi
fi
""", encoding='utf-8')
        start_script.chmod(0o755)
        
        # 创建重置登录脚本
        reset_script = napcat_dir / "reset_login.sh"
        reset_script.write_text(f"""#!/bin/bash
# NapCat 重置登录脚本
# 用于重新扫码登录

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
LOGIN_FLAG="$SCRIPT_DIR/.logged_in"

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
NC='\\033[0m'

echo -e "${{YELLOW}}========================================${{NC}}"
echo -e "${{YELLOW}}重置 NapCat 登录状态${{NC}}"
echo -e "${{YELLOW}}========================================${{NC}}"

if [ -f "$LOGIN_FLAG" ]; then
    rm -f "$LOGIN_FLAG"
    echo -e "${{GREEN}}✓ 登录标记已删除${{NC}}"
    echo -e "${{GREEN}}下次启动将重新进行扫码登录${{NC}}"
else
    echo -e "${{YELLOW}}! 未找到登录标记，已经是首次登录状态${{NC}}"
fi

echo ""
echo "提示: 运行 ./start.sh 开始重新登录"
""", encoding='utf-8')
        reset_script.chmod(0o755)
        
        # 创建 README 说明文件
        readme = napcat_dir / "README.md"
        readme.write_text(f"""# NapCat 使用说明 (Linux 无头模式)

## 目录结构
- `QQ/` - Linux QQ 程序文件
- `napcat/` - NapCat 插件文件
- `config/` - 配置文件目录
- `start.sh` - 启动脚本（无头模式）
- `reset_login.sh` - 重置登录状态脚本

## 启动说明

### 无头模式 (Headless Mode)
本启动器使用无头模式运行 NapCat，所有输出（包括二维码、日志）都会显示在启动器的终端窗口中。

### 首次启动
首次启动时，二维码会直接显示在终端中：
```bash
./start.sh
```
**请在启动器的终端窗口中查看二维码，使用手机 QQ 扫描完成登录。**

### 后续启动
登录成功后，可以使用以下方式快速启动：

方式 1: 使用 QQ 账号参数
```bash
./start.sh <你的QQ号>
```

方式 2: 设置环境变量
```bash
export QQ_ACCOUNT=<你的QQ号>
./start.sh
```

方式 3: 默认启动（不带账号）
```bash
./start.sh
```

### 重新登录
如需重新扫码登录（例如换账号），可以运行：
```bash
./reset_login.sh
```
然后重新执行 `./start.sh` 进行扫码登录。

## 配置文件
配置文件位于 `config/` 目录下，可以根据需要修改 NapCat 的配置。


## 技术支持
- NapCat 项目: https://github.com/NapNeko/NapCatQQ
- 问题反馈: 请到项目 GitHub 提交 Issue
""", encoding='utf-8')
        
        if progress_callback:
            await progress_callback("[完成] 启动脚本和说明文档创建完成", "success")
    



# 单例实例
_napcat_installer = None

def get_napcat_installer() -> NapCatInstaller:
    """获取 NapCat 安装器单例"""
    global _napcat_installer
    if _napcat_installer is None:
        _napcat_installer = NapCatInstaller()
    return _napcat_installer

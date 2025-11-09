"""
NapCat 安装服务 (纯 Python 实现)

完全使用 Python 实现 NapCat 的下载、解压和配置，
不依赖外部 shell 脚本，提供更好的跨平台兼容性和错误处理。
"""
import asyncio
import json
import shutil
import tarfile
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Callable, Optional

import aiohttp

from ..core.logger import logger


class NapCatInstaller:
    """NapCat 安装器"""
    
    # Linux QQ 版本
    LINUX_QQ_VERSION = "3.2.12_240808"
    LINUX_QQ_URL = f"https://dldir1.qq.com/qqfile/qq/QQNT/Linux/QQ_{LINUX_QQ_VERSION}_amd64_01.deb"
    
    # NapCat 下载地址
    NAPCAT_URL = "https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip"
    
    def __init__(self):
        """初始化安装器"""
        pass
    
    async def install(
        self,
        instance_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ) -> bool:
        """
        安装 NapCat
        
        流程:
        1. 下载 Linux QQ deb 包
        2. 解压 deb 包获取 QQ 文件
        3. 下载 NapCat.Shell.zip
        4. 解压并集成到 QQ
        5. 创建启动脚本

        Args:
            instance_dir: 实例目录
            progress_callback: 进度回调 (message, level)

        Returns:
            是否成功
        """
        try:
            if progress_callback:
                await progress_callback("开始安装 NapCat...", "info")
            
            logger.info(f"开始在 {instance_dir} 安装 NapCat")
            
            # 定义路径
            napcat_dir = instance_dir / "NapCat"
            qq_dir = napcat_dir / "QQ"
            napcat_plugin_dir = napcat_dir / "napcat"
            config_dir = napcat_dir / "config"
            
            # 创建目录
            napcat_dir.mkdir(parents=True, exist_ok=True)
            config_dir.mkdir(parents=True, exist_ok=True)
            
            # 使用临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # 1. 下载和安装 Linux QQ
                await self._install_linux_qq(
                    temp_path, qq_dir, progress_callback
                )
                
                # 2. 下载和安装 NapCat
                await self._install_napcat(
                    temp_path, napcat_plugin_dir, qq_dir, progress_callback
                )
            
            # 3. 创建启动脚本
            await self._create_start_script(napcat_dir, qq_dir, progress_callback)
            
            logger.info(f"NapCat 安装成功: {napcat_dir}")
            if progress_callback:
                await progress_callback(
                    f"✅ NapCat 安装完成！\n"
                    f"安装目录: {napcat_dir}\n"
                    f"启动脚本: {napcat_dir}/start.sh",
                    "success"
                )
            
            return True
                
        except Exception as e:
            logger.error(f"NapCat 安装失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            if progress_callback:
                await progress_callback(f"❌ NapCat 安装失败: {str(e)}", "error")
            return False
    
    async def _install_linux_qq(
        self,
        temp_path: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 Linux QQ"""
        if progress_callback:
            await progress_callback("📥 下载 Linux QQ...", "info")
        
        deb_file = temp_path / "qq.deb"
        
        # 下载 deb 包
        async with aiohttp.ClientSession() as session:
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
            await progress_callback("✓ Linux QQ 下载完成", "success")
        
        # 解压 deb 包
        if progress_callback:
            await progress_callback("📦 解压 Linux QQ...", "info")
        
        # deb 包是 ar 归档，包含 data.tar.xz
        data_tar_path = temp_path / "data.tar.xz"
        
        # 使用 ar 提取 data.tar.xz
        process = await asyncio.create_subprocess_exec(
            "ar", "x", str(deb_file), "data.tar.xz",
            cwd=str(temp_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.wait()
        
        if not data_tar_path.exists():
            raise Exception("无法从 deb 包中提取 data.tar.xz")
        
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
            await progress_callback("✓ Linux QQ 安装完成", "success")
    
    async def _install_napcat(
        self,
        temp_path: Path,
        napcat_plugin_dir: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """下载并安装 NapCat"""
        if progress_callback:
            await progress_callback("📥 下载 NapCat...", "info")
        
        napcat_zip = temp_path / "napcat.zip"
        
        # 下载 NapCat
        async with aiohttp.ClientSession() as session:
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
            await progress_callback("✓ NapCat 下载完成", "success")
        
        # 解压 NapCat
        if progress_callback:
            await progress_callback("📦 解压 NapCat...", "info")
        
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
            await progress_callback("✓ NapCat 解压完成", "success")
        
        # 集成到 QQ
        if progress_callback:
            await progress_callback("🔧 集成 NapCat 到 QQ...", "info")
        
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
            await progress_callback("✓ NapCat 集成完成", "success")
    
    async def _create_start_script(
        self,
        napcat_dir: Path,
        qq_dir: Path,
        progress_callback: Optional[Callable[[str, str], Any]] = None,
    ):
        """创建启动脚本"""
        if progress_callback:
            await progress_callback("📝 创建启动脚本...", "info")
        
        start_script = napcat_dir / "start.sh"
        start_script.write_text(f"""#!/bin/bash
# NapCat 启动脚本
# 自动生成 - 请勿手动修改

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
QQ_BIN="$SCRIPT_DIR/QQ/qq"
QQ_ACCOUNT="${{1:-$QQ_ACCOUNT}}"

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
NC='\\033[0m'

# 检查 QQ 账号
if [ -z "$QQ_ACCOUNT" ]; then
    echo -e "${{RED}}错误: 请提供 QQ 账号${{NC}}"
    echo "用法:"
    echo "  方式 1: ./start.sh <QQ账号>"
    echo "  方式 2: export QQ_ACCOUNT=<QQ账号> && ./start.sh"
    exit 1
fi

# 检查 QQ 可执行文件
if [ ! -f "$QQ_BIN" ]; then
    echo -e "${{RED}}错误: QQ 可执行文件不存在: $QQ_BIN${{NC}}"
    exit 1
fi

echo -e "${{BLUE}}========================================${{NC}}"
echo -e "${{GREEN}}启动 NapCat${{NC}}"
echo -e "${{BLUE}}========================================${{NC}}"
echo "QQ 账号: $QQ_ACCOUNT"
echo "工作目录: $SCRIPT_DIR"
echo ""

# 启动 QQ
"$QQ_BIN" --no-sandbox -q "$QQ_ACCOUNT"
""", encoding='utf-8')
        start_script.chmod(0o755)
        
        if progress_callback:
            await progress_callback("✓ 启动脚本创建完成", "success")


# 单例实例
_napcat_installer = None

def get_napcat_installer() -> NapCatInstaller:
    """获取 NapCat 安装器单例"""
    global _napcat_installer
    if _napcat_installer is None:
        _napcat_installer = NapCatInstaller()
    return _napcat_installer

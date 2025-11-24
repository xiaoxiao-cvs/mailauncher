"""
组件更新服务
负责组件的安全更新、完整备份、回滚等操作
"""
import shutil
import subprocess
import zipfile
import tarfile
import tempfile
import httpx
from pathlib import Path
from typing import Optional, Dict, List, Any, Callable
from datetime import datetime
import uuid
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..core.logger import logger
from ..models.db_models import VersionBackupDB, UpdateHistoryDB, ComponentVersionDB
from .version_service import version_service


class ComponentUpdateService:
    """组件更新服务"""
    
    # 需要排除备份/更新的文件和目录
    EXCLUDE_PATTERNS = [
        "data/",
        "*.db",
        "*.sqlite",
        "*.sqlite3",
        "config.toml",
        "config.json",
        ".env",
        ".env.local",
        "logs/",
        "__pycache__/",
        "*.pyc",
        ".git/",
        "node_modules/",
        ".venv/",
        "venv/",
        ".backup/",
        "backups/"
    ]
    
    def __init__(self, instance_path: Path):
        """
        初始化组件更新服务
        
        Args:
            instance_path: 实例根目录路径
        """
        self.instance_path = instance_path
        self.backup_base_path = instance_path / ".backups"
        self.backup_base_path.mkdir(parents=True, exist_ok=True)
    
    async def create_full_backup(
        self,
        component: str,
        component_path: Path,
        db: AsyncSession,
        instance_id: str,
        description: Optional[str] = None
    ) -> Optional[str]:
        """
        创建组件的完整备份
        
        Args:
            component: 组件名称 (main, napcat, napcat-ada)
            component_path: 组件路径
            db: 数据库会话
            instance_id: 实例 ID
            description: 备份描述
        
        Returns:
            备份 ID 或 None(失败时)
        """
        try:
            if not component_path.exists():
                logger.error(f"组件路径不存在: {component_path}")
                return None
            
            # 生成备份 ID
            backup_id = f"backup_{component}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
            backup_dir = self.backup_base_path / backup_id
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # 获取当前版本信息
            version = version_service.get_local_version_from_file(component_path, component)
            commit_hash = version_service.get_local_commit_hash(component_path)
            
            logger.info(f"开始备份 {component} (版本: {version}, commit: {commit_hash})")
            
            # 备份完整目录，排除不必要的文件
            backup_archive = backup_dir / f"{component}_backup.tar.gz"
            total_size = self._create_tarball(
                source_path=component_path,
                output_path=backup_archive,
                exclude_patterns=self.EXCLUDE_PATTERNS
            )
            
            if total_size == 0:
                logger.error("备份创建失败，文件大小为 0")
                shutil.rmtree(backup_dir, ignore_errors=True)
                return None
            
            # 保存备份元数据
            metadata = {
                "component": component,
                "version": version,
                "commit_hash": commit_hash,
                "backup_time": datetime.now().isoformat(),
                "instance_id": instance_id,
                "backup_size": total_size,
                "description": description or f"更新前自动备份",
                "excluded_patterns": self.EXCLUDE_PATTERNS
            }
            
            metadata_file = backup_dir / "metadata.json"
            metadata_file.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
            
            # 记录到数据库
            backup_record = VersionBackupDB(
                id=backup_id,
                instance_id=instance_id,
                component=component,
                version=version,
                commit_hash=commit_hash,
                backup_path=str(backup_archive),
                backup_size=total_size,
                description=description or f"更新前自动备份"
            )
            db.add(backup_record)
            await db.commit()
            
            logger.info(f"备份完成: {backup_id}, 大小: {total_size / 1024 / 1024:.2f} MB")
            return backup_id
            
        except Exception as e:
            logger.error(f"创建备份失败: {e}", exc_info=True)
            if 'backup_dir' in locals() and backup_dir.exists():
                shutil.rmtree(backup_dir, ignore_errors=True)
            return None
    
    def _create_tarball(
        self,
        source_path: Path,
        output_path: Path,
        exclude_patterns: List[str]
    ) -> int:
        """
        创建 tar.gz 压缩包，排除指定模式的文件
        
        Returns:
            压缩包大小(字节)
        """
        try:
            import fnmatch
            
            def should_exclude(path: Path, base_path: Path) -> bool:
                """判断路径是否应该被排除"""
                relative_path = path.relative_to(base_path)
                path_str = str(relative_path)
                
                for pattern in exclude_patterns:
                    # 目录模式
                    if pattern.endswith('/'):
                        if any(part == pattern.rstrip('/') for part in relative_path.parts):
                            return True
                    # 文件名模式
                    elif fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(path.name, pattern):
                        return True
                
                return False
            
            with tarfile.open(output_path, "w:gz") as tar:
                for item in source_path.rglob("*"):
                    if item.is_file() and not should_exclude(item, source_path):
                        arcname = item.relative_to(source_path.parent)
                        tar.add(item, arcname=arcname)
            
            return output_path.stat().st_size
            
        except Exception as e:
            logger.error(f"创建压缩包失败: {e}", exc_info=True)
            return 0
    
    async def update_component_from_git(
        self,
        component: str,
        component_path: Path,
        target_commit: Optional[str] = None,
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> bool:
        """
        通过 Git 更新组件
        
        Args:
            component: 组件名称
            component_path: 组件路径
            target_commit: 目标 commit hash (None 表示拉取最新)
            progress_callback: 进度回调函数(message, percentage)
        
        Returns:
            是否成功
        """
        try:
            if not (component_path / ".git").exists():
                logger.error(f"{component_path} 不是 Git 仓库")
                return False
            
            if progress_callback:
                progress_callback("正在拉取最新代码...", 20)
            
            # Git pull
            result = subprocess.run(
                ["git", "pull", "origin", "main"],
                cwd=str(component_path),
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                logger.error(f"Git pull 失败: {result.stderr}")
                return False
            
            if progress_callback:
                progress_callback("代码拉取完成", 50)
            
            # 如果指定了目标 commit，checkout 到该 commit
            if target_commit:
                result = subprocess.run(
                    ["git", "checkout", target_commit],
                    cwd=str(component_path),
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode != 0:
                    logger.error(f"Checkout 到 {target_commit} 失败: {result.stderr}")
                    return False
            
            if progress_callback:
                progress_callback("正在安装依赖...", 70)
            
            # 安装依赖
            await self._install_dependencies(component, component_path, progress_callback)
            
            if progress_callback:
                progress_callback("更新完成", 100)
            
            logger.info(f"{component} 更新成功")
            return True
            
        except Exception as e:
            logger.error(f"Git 更新失败: {e}", exc_info=True)
            return False
    
    async def update_component_from_release(
        self,
        component: str,
        component_path: Path,
        download_url: str,
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> bool:
        """
        从 Release 下载并更新组件
        
        Args:
            component: 组件名称
            component_path: 组件路径
            download_url: Release 资源下载 URL
            progress_callback: 进度回调
        
        Returns:
            是否成功
        """
        temp_dir = None
        try:
            if progress_callback:
                progress_callback("正在下载更新包...", 10)
            
            # 创建临时目录
            temp_dir = Path(tempfile.mkdtemp())
            download_file = temp_dir / "download.zip"
            
            # 下载文件
            async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
                async with client.stream("GET", download_url) as response:
                    response.raise_for_status()
                    total_size = int(response.headers.get("content-length", 0))
                    downloaded = 0
                    
                    with open(download_file, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            f.write(chunk)
                            downloaded += len(chunk)
                            
                            if total_size > 0 and progress_callback:
                                progress = int((downloaded / total_size) * 40) + 10
                                progress_callback(f"下载中... {downloaded / 1024 / 1024:.1f}MB", progress)
            
            if progress_callback:
                progress_callback("正在解压文件...", 55)
            
            # 解压文件
            extract_dir = temp_dir / "extracted"
            extract_dir.mkdir()
            
            if download_file.suffix == ".zip":
                with zipfile.ZipFile(download_file, "r") as zip_ref:
                    zip_ref.extractall(extract_dir)
            elif download_file.suffix in [".tar", ".gz", ".tgz"]:
                with tarfile.open(download_file, "r:*") as tar_ref:
                    tar_ref.extractall(extract_dir)
            
            if progress_callback:
                progress_callback("正在更新文件...", 70)
            
            # 找到解压后的实际目录(通常有一层包装目录)
            extracted_items = list(extract_dir.iterdir())
            if len(extracted_items) == 1 and extracted_items[0].is_dir():
                source_dir = extracted_items[0]
            else:
                source_dir = extract_dir
            
            # 复制文件到目标目录，排除数据文件
            self._copy_with_exclude(
                source_dir,
                component_path,
                self.EXCLUDE_PATTERNS
            )
            
            if progress_callback:
                progress_callback("正在安装依赖...", 85)
            
            # 安装依赖
            await self._install_dependencies(component, component_path, progress_callback)
            
            if progress_callback:
                progress_callback("更新完成", 100)
            
            logger.info(f"{component} 从 Release 更新成功")
            return True
            
        except Exception as e:
            logger.error(f"从 Release 更新失败: {e}", exc_info=True)
            return False
        finally:
            if temp_dir and temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
    
    def _copy_with_exclude(
        self,
        source: Path,
        destination: Path,
        exclude_patterns: List[str]
    ):
        """复制文件，排除指定模式"""
        import fnmatch
        
        def should_exclude(path: Path, base_path: Path) -> bool:
            try:
                relative_path = path.relative_to(base_path)
                path_str = str(relative_path)
                
                for pattern in exclude_patterns:
                    if pattern.endswith('/'):
                        if any(part == pattern.rstrip('/') for part in relative_path.parts):
                            return True
                    elif fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(path.name, pattern):
                        return True
                return False
            except ValueError:
                return False
        
        for item in source.rglob("*"):
            if not should_exclude(item, source):
                relative_path = item.relative_to(source)
                dest_path = destination / relative_path
                
                if item.is_dir():
                    dest_path.mkdir(parents=True, exist_ok=True)
                else:
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dest_path)
    
    async def _install_dependencies(
        self,
        component: str,
        component_path: Path,
        progress_callback: Optional[Callable[[str, int], None]] = None
    ):
        """安装组件依赖"""
        try:
            if component == "main":
                # Python 项目，安装 requirements.txt
                requirements_file = component_path / "requirements.txt"
                if requirements_file.exists():
                    result = subprocess.run(
                        ["pip", "install", "-r", str(requirements_file)],
                        cwd=str(component_path),
                        capture_output=True,
                        text=True,
                        timeout=600
                    )
                    if result.returncode != 0:
                        logger.warning(f"安装依赖时有警告: {result.stderr}")
            
            elif component in ["napcat", "napcat-ada"]:
                # Node.js 项目，安装 package.json
                package_json = component_path / "package.json"
                if package_json.exists():
                    result = subprocess.run(
                        ["npm", "install"],
                        cwd=str(component_path),
                        capture_output=True,
                        text=True,
                        timeout=600
                    )
                    if result.returncode != 0:
                        logger.warning(f"npm install 时有警告: {result.stderr}")
            
        except Exception as e:
            logger.error(f"安装依赖失败: {e}", exc_info=True)
    
    async def restore_from_backup(
        self,
        backup_id: str,
        component_path: Path,
        db: AsyncSession
    ) -> bool:
        """
        从备份恢复组件
        
        Args:
            backup_id: 备份 ID
            component_path: 组件路径
            db: 数据库会话
        
        Returns:
            是否成功
        """
        try:
            # 查询备份记录
            stmt = select(VersionBackupDB).filter_by(id=backup_id)
            result = await db.execute(stmt)
            backup = result.scalar_one_or_none()
            if not backup:
                logger.error(f"备份记录不存在: {backup_id}")
                return False
            
            backup_archive = Path(backup.backup_path)
            if not backup_archive.exists():
                logger.error(f"备份文件不存在: {backup_archive}")
                return False
            
            logger.info(f"开始从备份恢复: {backup_id}")
            
            # 删除当前组件目录内容(排除数据文件)
            self._clean_component_directory(component_path)
            
            # 解压备份
            with tarfile.open(backup_archive, "r:gz") as tar:
                tar.extractall(component_path.parent)
            
            logger.info(f"从备份 {backup_id} 恢复成功")
            return True
            
        except Exception as e:
            logger.error(f"恢复备份失败: {e}", exc_info=True)
            return False
    
    def _clean_component_directory(self, component_path: Path):
        """清理组件目录，保留数据文件"""
        import fnmatch
        
        def should_keep(path: Path, base_path: Path) -> bool:
            """判断文件是否应该保留"""
            try:
                relative_path = path.relative_to(base_path)
                path_str = str(relative_path)
                
                # 保留数据相关的文件和目录
                keep_patterns = ["data/", "*.db", "*.sqlite*", "config.toml", "config.json", ".env*", "logs/"]
                
                for pattern in keep_patterns:
                    if pattern.endswith('/'):
                        if any(part == pattern.rstrip('/') for part in relative_path.parts):
                            return True
                    elif fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(path.name, pattern):
                        return True
                return False
            except ValueError:
                return False
        
        for item in list(component_path.iterdir()):
            if not should_keep(item, component_path):
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)
    
    async def get_backups_list(self, db: AsyncSession, instance_id: str, component: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        获取备份列表
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            component: 组件名称(可选，None 表示获取所有组件)
        
        Returns:
            备份列表
        """
        try:
            stmt = select(VersionBackupDB).filter_by(instance_id=instance_id)
            
            if component:
                stmt = stmt.filter_by(component=component)
            
            stmt = stmt.order_by(VersionBackupDB.created_at.desc())
            result = await db.execute(stmt)
            backups = result.scalars().all()
            
            return [
                {
                    "id": backup.id,
                    "component": backup.component,
                    "version": backup.version,
                    "commit_hash": backup.commit_hash,
                    "backup_size": backup.backup_size,
                    "created_at": backup.created_at.isoformat(),
                    "description": backup.description
                }
                for backup in backups
            ]
            
        except Exception as e:
            logger.error(f"获取备份列表失败: {e}", exc_info=True)
            return []
    
    async def delete_old_backups(self, db: AsyncSession, instance_id: str, keep_count: int = 3):
        """
        删除旧备份，保留最近的 N 个
        
        Args:
            db: 数据库会话
            instance_id: 实例 ID
            keep_count: 保留的备份数量
        """
        try:
            # 获取所有备份，按时间倒序
            stmt = select(VersionBackupDB).filter_by(
                instance_id=instance_id
            ).order_by(VersionBackupDB.created_at.desc())
            result = await db.execute(stmt)
            backups = result.scalars().all()
            
            # 删除超出保留数量的备份
            for backup in backups[keep_count:]:
                backup_path = Path(backup.backup_path)
                if backup_path.exists():
                    backup_dir = backup_path.parent
                    shutil.rmtree(backup_dir, ignore_errors=True)
                
                # 标记对象为删除 (在 AsyncSession 中 delete 是同步方法)
                await db.delete(backup)
            
            await db.commit()
            logger.info(f"清理旧备份完成，保留最近 {keep_count} 个备份")
            
        except Exception as e:
            logger.error(f"清理备份失败: {e}")
            await db.rollback()

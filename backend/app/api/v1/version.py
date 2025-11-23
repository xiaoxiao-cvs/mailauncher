"""
版本管理 API 路由
提供组件版本检查、更新、备份管理等接口
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path

from ...core.database import get_db
from ...core.logger import logger
from ...models.response import APIResponse
from ...services.version_service import version_service
from ...services.component_update_service import ComponentUpdateService
from ...services.instance_service import get_instance_service
from ...models.db_models import InstanceDB, ComponentVersionDB, UpdateHistoryDB

instance_service = get_instance_service()

router = APIRouter(prefix="/versions", tags=["版本管理"])


@router.get("/instances/{instance_id}/components")
async def get_instance_components_version(
    instance_id: str,
    db: Session = Depends(get_db)
):
    """
    获取实例所有组件的版本信息
    """
    try:
        # 验证实例存在
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        instance_path = Path(instance.path)
        components_info = []
        
        # 检查每个组件的版本
        for component in ["main", "napcat", "napcat-ada"]:
            component_path = instance_path / component
            
            if not component_path.exists():
                components_info.append({
                    "component": component,
                    "installed": False,
                    "status": "not_installed"
                })
                continue
            
            # 获取本地版本信息
            local_version = version_service.get_local_version_from_file(component_path, component)
            local_commit = version_service.get_local_commit_hash(component_path)
            
            # 检查 GitHub 最新版本
            github_info = await version_service.check_github_version(component)
            
            component_info = {
                "component": component,
                "installed": True,
                "local_version": local_version,
                "local_commit": local_commit[:7] if local_commit else None,
                "local_commit_full": local_commit,
                "status": "checking"
            }
            
            if github_info:
                # 判断是否有更新
                has_update = False
                commits_behind = 0
                
                if local_commit and github_info.get("latest_commit"):
                    # 对比 commit
                    if local_commit != github_info["latest_commit"]:
                        repo_config = version_service.GITHUB_REPOS[component]
                        compare_result = await version_service.compare_commits(
                            repo_config["owner"],
                            repo_config["repo"],
                            local_commit[:7],
                            github_info["latest_commit"][:7]
                        )
                        
                        if compare_result:
                            commits_behind = compare_result.get("behind_by", 0)
                            has_update = commits_behind > 0
                
                component_info.update({
                    "status": "update_available" if has_update else "up_to_date",
                    "has_update": has_update,
                    "commits_behind": commits_behind,
                    "latest_version": github_info.get("latest_version"),
                    "latest_commit": github_info.get("latest_commit", "")[:7],
                    "latest_commit_full": github_info.get("latest_commit"),
                    "github_info": github_info
                })
            else:
                component_info["status"] = "check_failed"
            
            components_info.append(component_info)
        
        return APIResponse.success(data=components_info)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取组件版本失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instances/{instance_id}/components/{component}/check")
async def check_component_update(
    instance_id: str,
    component: str,
    db: Session = Depends(get_db)
):
    """
    检查单个组件的更新详情（包括提交对比）
    """
    try:
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        if component not in ["main", "napcat", "napcat-ada"]:
            raise HTTPException(status_code=400, detail="无效的组件名称")
        
        instance_path = Path(instance.path)
        component_path = instance_path / component
        
        if not component_path.exists():
            raise HTTPException(status_code=404, detail="组件未安装")
        
        # 获取本地信息
        local_version = version_service.get_local_version_from_file(component_path, component)
        local_commit = version_service.get_local_commit_hash(component_path)
        
        # 获取 GitHub 信息
        github_info = await version_service.check_github_version(component)
        if not github_info:
            raise HTTPException(status_code=500, detail="无法获取 GitHub 版本信息")
        
        result = {
            "component": component,
            "local_version": local_version,
            "local_commit": local_commit,
            "github_info": github_info,
            "has_update": False,
            "comparison": None
        }
        
        # 对比 commit
        if local_commit and github_info.get("latest_commit"):
            if local_commit != github_info["latest_commit"]:
                repo_config = version_service.GITHUB_REPOS[component]
                comparison = await version_service.compare_commits(
                    repo_config["owner"],
                    repo_config["repo"],
                    local_commit,
                    github_info["latest_commit"]
                )
                
                if comparison and comparison.get("behind_by", 0) > 0:
                    result["has_update"] = True
                    result["comparison"] = comparison
        
        return APIResponse.success(data=result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"检查组件更新失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instances/{instance_id}/components/{component}/update")
async def update_component(
    instance_id: str,
    component: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    create_backup: bool = True,
    update_method: str = "git"  # git or release
):
    """
    执行组件更新
    
    Query Parameters:
        create_backup: 是否创建备份(默认 true)
        update_method: 更新方式 (git 或 release)
    """
    try:
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        if component not in ["main", "napcat", "napcat-ada"]:
            raise HTTPException(status_code=400, detail="无效的组件名称")
        
        instance_path = Path(instance.path)
        component_path = instance_path / component
        
        if not component_path.exists():
            raise HTTPException(status_code=404, detail="组件未安装")
        
        # 创建更新服务实例
        update_service = ComponentUpdateService(instance_path)
        
        # 获取更新前的版本信息
        old_version = version_service.get_local_version_from_file(component_path, component)
        old_commit = version_service.get_local_commit_hash(component_path)
        
        # 创建备份
        backup_id = None
        if create_backup:
            backup_id = update_service.create_full_backup(
                component=component,
                component_path=component_path,
                db=db,
                instance_id=instance_id,
                description=f"更新前自动备份 (版本: {old_version or old_commit[:7] if old_commit else 'unknown'})"
            )
            
            if not backup_id:
                raise HTTPException(status_code=500, detail="创建备份失败")
        
        # 执行更新（根据更新方式）
        success = False
        if update_method == "git":
            success = await update_service.update_component_from_git(
                component=component,
                component_path=component_path
            )
        elif update_method == "release":
            # 获取最新 release 下载链接
            github_info = await version_service.check_github_version(component)
            if not github_info or not github_info.get("assets"):
                raise HTTPException(status_code=400, detail="没有可用的 Release 资源")
            
            download_url = github_info["assets"][0]["download_url"]
            success = await update_service.update_component_from_release(
                component=component,
                component_path=component_path,
                download_url=download_url
            )
        
        # 获取更新后的版本信息
        new_version = version_service.get_local_version_from_file(component_path, component)
        new_commit = version_service.get_local_commit_hash(component_path)
        
        # 记录更新历史
        update_history = UpdateHistoryDB(
            instance_id=instance_id,
            component=component,
            from_version=old_version,
            to_version=new_version,
            from_commit=old_commit,
            to_commit=new_commit,
            status="success" if success else "failed",
            backup_id=backup_id,
            error_message=None if success else "更新执行失败"
        )
        db.add(update_history)
        db.commit()
        
        # 清理旧备份（保留最近 3 个）
        if success and create_backup:
            update_service.delete_old_backups(db, instance_id, keep_count=3)
        
        if success:
            return APIResponse.success(
                message="更新成功",
                data={
                    "backup_id": backup_id,
                    "old_version": old_version,
                    "new_version": new_version,
                    "old_commit": old_commit[:7] if old_commit else None,
                    "new_commit": new_commit[:7] if new_commit else None
                }
            )
        else:
            raise HTTPException(status_code=500, detail="更新失败")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新组件失败: {e}", exc_info=True)
        
        # 记录失败的更新历史
        try:
            update_history = UpdateHistoryDB(
                instance_id=instance_id,
                component=component,
                status="failed",
                error_message=str(e)
            )
            db.add(update_history)
            db.commit()
        except:
            pass
        
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/instances/{instance_id}/backups")
async def get_backups(
    instance_id: str,
    component: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取实例的备份列表
    
    Query Parameters:
        component: 组件名称（可选）
    """
    try:
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        instance_path = Path(instance.path)
        update_service = ComponentUpdateService(instance_path)
        
        backups = update_service.get_backups_list(db, instance_id, component)
        
        return APIResponse.success(data=backups)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取备份列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/instances/{instance_id}/backups/{backup_id}/restore")
async def restore_backup(
    instance_id: str,
    backup_id: str,
    db: Session = Depends(get_db)
):
    """
    从备份恢复组件
    """
    try:
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        # 获取备份信息
        from ...models.db_models import VersionBackupDB
        backup = db.query(VersionBackupDB).filter_by(
            id=backup_id,
            instance_id=instance_id
        ).first()
        
        if not backup:
            raise HTTPException(status_code=404, detail="备份不存在")
        
        instance_path = Path(instance.path)
        component_path = instance_path / backup.component
        
        update_service = ComponentUpdateService(instance_path)
        
        # 执行恢复
        success = update_service.restore_from_backup(
            backup_id=backup_id,
            component_path=component_path,
            db=db
        )
        
        if success:
            # 记录回滚历史
            update_history = UpdateHistoryDB(
                instance_id=instance_id,
                component=backup.component,
                to_version=backup.version,
                to_commit=backup.commit_hash,
                status="rollback",
                backup_id=backup_id
            )
            db.add(update_history)
            db.commit()
            
            return APIResponse.success(
                message="恢复成功",
                data={
                    "backup_id": backup_id,
                    "component": backup.component,
                    "restored_version": backup.version
                }
            )
        else:
            raise HTTPException(status_code=500, detail="恢复失败")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"恢复备份失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/instances/{instance_id}/update-history")
async def get_update_history(
    instance_id: str,
    component: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    获取更新历史记录
    
    Query Parameters:
        component: 组件名称（可选）
        limit: 返回记录数量限制
    """
    try:
        instance = instance_service.get_instance(instance_id, db)
        if not instance:
            raise HTTPException(status_code=404, detail="实例不存在")
        
        query = db.query(UpdateHistoryDB).filter_by(instance_id=instance_id)
        
        if component:
            query = query.filter_by(component=component)
        
        history = query.order_by(UpdateHistoryDB.updated_at.desc()).limit(limit).all()
        
        result = [
            {
                "id": record.id,
                "component": record.component,
                "from_version": record.from_version,
                "to_version": record.to_version,
                "from_commit": record.from_commit,
                "to_commit": record.to_commit,
                "status": record.status,
                "backup_id": record.backup_id,
                "error_message": record.error_message,
                "updated_at": record.updated_at.isoformat()
            }
            for record in history
        ]
        
        return APIResponse.success(data=result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取更新历史失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/components/{component}/releases")
async def get_component_releases(
    component: str,
    limit: int = 10
):
    """
    获取组件的 Release 历史列表
    """
    try:
        if component not in ["main", "napcat", "napcat-ada"]:
            raise HTTPException(status_code=400, detail="无效的组件名称")
        
        repo_config = version_service.GITHUB_REPOS[component]
        
        if not repo_config["has_releases"]:
            return APIResponse.success(data=[], message="该组件不使用 Release 发布")
        
        releases = await version_service.get_all_releases(
            owner=repo_config["owner"],
            repo=repo_config["repo"],
            limit=limit
        )
        
        return APIResponse.success(data=releases)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 Release 列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

"""
部署服务
处理部署任务相关的业务逻辑
"""
from typing import List, Optional
from datetime import datetime
import uuid
import json
from pathlib import Path

from ..models import (
    Deployment,
    DeploymentCreate,
    DeploymentStatus,
    DeploymentLog,
)
from ..core import settings


class DeploymentService:
    """部署服务类"""
    
    def __init__(self):
        """初始化部署服务"""
        self.instances_dir = Path(settings.INSTANCES_DIR)
        self.deployments_file = self.instances_dir / "deployments.json"
        self._deployments: dict[str, Deployment] = {}
        self._logs: dict[str, List[DeploymentLog]] = {}
        self._load_deployments()
    
    def _load_deployments(self) -> None:
        """从文件加载部署数据"""
        if self.deployments_file.exists():
            try:
                with open(self.deployments_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for deploy_data in data:
                        deployment = Deployment(**deploy_data)
                        self._deployments[deployment.id] = deployment
            except Exception as e:
                print(f"加载部署数据失败: {e}")
    
    def _save_deployments(self) -> None:
        """保存部署数据到文件"""
        try:
            with open(self.deployments_file, "w", encoding="utf-8") as f:
                data = [dep.model_dump() for dep in self._deployments.values()]
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            print(f"保存部署数据失败: {e}")
    
    def _generate_deployment_id(self) -> str:
        """生成唯一的部署任务 ID"""
        return f"deploy_{uuid.uuid4().hex[:12]}"
    
    def _add_log(self, deployment_id: str, level: str, message: str) -> None:
        """添加部署日志"""
        if deployment_id not in self._logs:
            self._logs[deployment_id] = []
        
        log = DeploymentLog(
            timestamp=datetime.now(),
            level=level,
            message=message,
        )
        self._logs[deployment_id].append(log)
    
    async def get_all_deployments(
        self,
        status: Optional[DeploymentStatus] = None,
        instance_id: Optional[str] = None,
    ) -> List[Deployment]:
        """获取所有部署任务列表
        
        Args:
            status: 按状态过滤
            instance_id: 按实例过滤
            
        Returns:
            部署任务列表
        """
        deployments = list(self._deployments.values())
        
        # 状态过滤
        if status:
            deployments = [d for d in deployments if d.status == status]
        
        # 实例过滤
        if instance_id:
            deployments = [d for d in deployments if d.instance_id == instance_id]
        
        return deployments
    
    async def get_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """获取指定部署任务
        
        Args:
            deployment_id: 部署任务 ID
            
        Returns:
            部署任务对象，不存在则返回 None
        """
        return self._deployments.get(deployment_id)
    
    async def create_deployment(self, deployment_data: DeploymentCreate) -> Deployment:
        """创建部署任务
        
        Args:
            deployment_data: 部署创建数据
            
        Returns:
            创建的部署任务对象
        """
        deployment_id = self._generate_deployment_id()
        now = datetime.now()
        
        deployment = Deployment(
            id=deployment_id,
            instance_id=deployment_data.instance_id,
            deployment_type=deployment_data.deployment_type,
            description=deployment_data.description,
            status=DeploymentStatus.PENDING,
            progress=0,
            created_at=now,
        )
        
        self._deployments[deployment_id] = deployment
        self._save_deployments()
        
        # 添加初始日志
        self._add_log(deployment_id, "INFO", "部署任务已创建")
        
        # TODO: 在后台异步执行部署任务
        # asyncio.create_task(self._execute_deployment(deployment_id, deployment_data))
        
        return deployment
    
    async def cancel_deployment(self, deployment_id: str) -> bool:
        """取消部署任务
        
        Args:
            deployment_id: 部署任务 ID
            
        Returns:
            取消是否成功
        """
        deployment = self._deployments.get(deployment_id)
        if not deployment:
            return False
        
        if deployment.status not in [DeploymentStatus.PENDING, DeploymentStatus.RUNNING]:
            return False
        
        deployment.status = DeploymentStatus.CANCELLED
        self._save_deployments()
        
        self._add_log(deployment_id, "WARNING", "部署任务已取消")
        
        return True
    
    async def retry_deployment(self, deployment_id: str) -> bool:
        """重试失败的部署任务
        
        Args:
            deployment_id: 部署任务 ID
            
        Returns:
            重试是否成功
        """
        deployment = self._deployments.get(deployment_id)
        if not deployment:
            return False
        
        if deployment.status != DeploymentStatus.FAILED:
            return False
        
        deployment.status = DeploymentStatus.PENDING
        deployment.progress = 0
        deployment.error_message = None
        self._save_deployments()
        
        self._add_log(deployment_id, "INFO", "重试部署任务")
        
        # TODO: 在后台异步执行部署任务
        
        return True
    
    async def get_deployment_logs(self, deployment_id: str) -> List[DeploymentLog]:
        """获取部署日志
        
        Args:
            deployment_id: 部署任务 ID
            
        Returns:
            日志列表
        """
        return self._logs.get(deployment_id, [])
    
    async def _execute_deployment(
        self, deployment_id: str, deployment_data: DeploymentCreate
    ) -> None:
        """执行部署任务（后台任务）
        
        Args:
            deployment_id: 部署任务 ID
            deployment_data: 部署数据
        """
        deployment = self._deployments.get(deployment_id)
        if not deployment:
            return
        
        try:
            # 更新状态为运行中
            deployment.status = DeploymentStatus.RUNNING
            deployment.started_at = datetime.now()
            self._save_deployments()
            
            self._add_log(deployment_id, "INFO", "开始执行部署")
            
            # TODO: 实现真实的部署逻辑
            # 1. 验证资源文件
            # 2. 复制文件到目标位置
            # 3. 更新进度
            # 4. 处理自动启动
            
            # 模拟部署完成
            deployment.status = DeploymentStatus.COMPLETED
            deployment.progress = 100
            deployment.completed_at = datetime.now()
            
            self._add_log(deployment_id, "INFO", "部署完成")
            
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error_message = str(e)
            
            self._add_log(deployment_id, "ERROR", f"部署失败: {e}")
        
        finally:
            self._save_deployments()


# 创建全局部署服务实例
deployment_service = DeploymentService()

"""
实例服务
处理实例相关的业务逻辑
"""
from typing import List, Optional
from datetime import datetime
import uuid
import json
import os
from pathlib import Path

from ..models import (
    Instance,
    InstanceCreate,
    InstanceUpdate,
    InstanceStatus,
    InstanceStatusResponse,
)
from ..core import settings


class InstanceService:
    """实例服务类 - 遵循单一职责原则"""
    
    def __init__(self):
        """初始化实例服务"""
        self.instances_dir = Path(settings.INSTANCES_DIR)
        self.instances_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.instances_dir / "instances.json"
        self._instances: dict[str, Instance] = {}
        self._load_instances()
    
    def _load_instances(self) -> None:
        """从文件加载实例数据"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for inst_data in data:
                        instance = Instance(**inst_data)
                        self._instances[instance.id] = instance
            except Exception as e:
                print(f"加载实例数据失败: {e}")
    
    def _save_instances(self) -> None:
        """保存实例数据到文件"""
        try:
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                data = [inst.model_dump() for inst in self._instances.values()]
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            print(f"保存实例数据失败: {e}")
    
    def _generate_instance_id(self) -> str:
        """生成唯一的实例 ID"""
        return f"inst_{uuid.uuid4().hex[:12]}"
    
    async def get_all_instances(self) -> List[Instance]:
        """获取所有实例列表"""
        return list(self._instances.values())
    
    async def get_instance(self, instance_id: str) -> Optional[Instance]:
        """获取指定实例
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            实例对象，不存在则返回 None
        """
        return self._instances.get(instance_id)
    
    async def create_instance(self, instance_data: InstanceCreate) -> Instance:
        """创建新实例
        
        Args:
            instance_data: 实例创建数据
            
        Returns:
            创建的实例对象
        """
        instance_id = self._generate_instance_id()
        now = datetime.now()
        
        instance = Instance(
            id=instance_id,
            **instance_data.model_dump(),
            status=InstanceStatus.STOPPED,
            created_at=now,
            updated_at=now,
        )
        
        # 创建实例目录
        instance_path = self.instances_dir / instance_id
        instance_path.mkdir(parents=True, exist_ok=True)
        
        # 保存实例
        self._instances[instance_id] = instance
        self._save_instances()
        
        return instance
    
    async def update_instance(
        self, instance_id: str, update_data: InstanceUpdate
    ) -> Optional[Instance]:
        """更新实例信息
        
        Args:
            instance_id: 实例 ID
            update_data: 更新数据
            
        Returns:
            更新后的实例对象，不存在则返回 None
        """
        instance = self._instances.get(instance_id)
        if not instance:
            return None
        
        # 只更新提供的字段
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(instance, field, value)
        
        instance.updated_at = datetime.now()
        self._save_instances()
        
        return instance
    
    async def delete_instance(self, instance_id: str) -> bool:
        """删除实例
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            删除是否成功
        """
        if instance_id not in self._instances:
            return False
        
        # 删除实例数据
        del self._instances[instance_id]
        self._save_instances()
        
        # 删除实例目录（可选，根据需求决定）
        # instance_path = self.instances_dir / instance_id
        # if instance_path.exists():
        #     shutil.rmtree(instance_path)
        
        return True
    
    async def get_instance_status(self, instance_id: str) -> Optional[InstanceStatusResponse]:
        """获取实例运行状态
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            实例状态信息，不存在则返回 None
        """
        instance = self._instances.get(instance_id)
        if not instance:
            return None
        
        # TODO: 实现真实的进程状态检查
        return InstanceStatusResponse(
            id=instance_id,
            status=instance.status,
            pid=None,
            uptime=None,
        )
    
    async def start_instance(self, instance_id: str) -> bool:
        """启动实例
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            启动是否成功
        """
        instance = self._instances.get(instance_id)
        if not instance:
            return False
        
        if instance.status == InstanceStatus.RUNNING:
            return True
        
        # TODO: 实现真实的实例启动逻辑
        instance.status = InstanceStatus.STARTING
        self._save_instances()
        
        # 这里应该启动 Minecraft 进程
        # 启动成功后更新状态为 RUNNING
        instance.status = InstanceStatus.RUNNING
        instance.last_played = datetime.now()
        self._save_instances()
        
        return True
    
    async def stop_instance(self, instance_id: str) -> bool:
        """停止实例
        
        Args:
            instance_id: 实例 ID
            
        Returns:
            停止是否成功
        """
        instance = self._instances.get(instance_id)
        if not instance:
            return False
        
        if instance.status == InstanceStatus.STOPPED:
            return True
        
        # TODO: 实现真实的实例停止逻辑
        instance.status = InstanceStatus.STOPPING
        self._save_instances()
        
        # 这里应该停止 Minecraft 进程
        # 停止成功后更新状态为 STOPPED
        instance.status = InstanceStatus.STOPPED
        self._save_instances()
        
        return True


# 创建全局实例服务实例
instance_service = InstanceService()

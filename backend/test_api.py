"""
API 测试脚本
用于快速测试后端 API 功能
"""
import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api/v1"


def print_response(response: requests.Response) -> None:
    """打印响应信息"""
    print(f"状态码: {response.status_code}")
    try:
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    except:
        print(f"响应: {response.text}")
    print("-" * 50)


def test_create_instance():
    """测试创建实例"""
    print("\n测试: 创建实例")
    data = {
        "name": "测试实例 1.20.1",
        "minecraft_version": "1.20.1",
        "mod_loader": "fabric",
        "mod_loader_version": "0.15.0",
        "description": "用于测试的 Fabric 实例",
        "min_memory": 2048,
        "max_memory": 4096,
    }
    response = requests.post(f"{BASE_URL}/instances", json=data)
    print_response(response)
    return response.json() if response.status_code == 201 else None


def test_get_instances():
    """测试获取实例列表"""
    print("\n测试: 获取实例列表")
    response = requests.get(f"{BASE_URL}/instances")
    print_response(response)
    return response.json() if response.status_code == 200 else None


def test_get_instance(instance_id: str):
    """测试获取实例详情"""
    print(f"\n测试: 获取实例详情 (ID: {instance_id})")
    response = requests.get(f"{BASE_URL}/instances/{instance_id}")
    print_response(response)


def test_update_instance(instance_id: str):
    """测试更新实例"""
    print(f"\n测试: 更新实例 (ID: {instance_id})")
    data = {
        "description": "更新后的描述",
        "max_memory": 8192,
    }
    response = requests.put(f"{BASE_URL}/instances/{instance_id}", json=data)
    print_response(response)


def test_get_instance_status(instance_id: str):
    """测试获取实例状态"""
    print(f"\n测试: 获取实例状态 (ID: {instance_id})")
    response = requests.get(f"{BASE_URL}/instances/{instance_id}/status")
    print_response(response)


def test_start_instance(instance_id: str):
    """测试启动实例"""
    print(f"\n测试: 启动实例 (ID: {instance_id})")
    response = requests.post(f"{BASE_URL}/instances/{instance_id}/start")
    print_response(response)


def test_stop_instance(instance_id: str):
    """测试停止实例"""
    print(f"\n测试: 停止实例 (ID: {instance_id})")
    response = requests.post(f"{BASE_URL}/instances/{instance_id}/stop")
    print_response(response)


def test_create_deployment(instance_id: str):
    """测试创建部署"""
    print(f"\n测试: 创建部署任务 (实例 ID: {instance_id})")
    data = {
        "instance_id": instance_id,
        "deployment_type": "mods",
        "description": "部署测试模组",
        "resources": ["/path/to/mod1.jar", "/path/to/mod2.jar"],
        "auto_start": False,
        "overwrite": True,
    }
    response = requests.post(f"{BASE_URL}/deployments", json=data)
    print_response(response)
    return response.json() if response.status_code == 201 else None


def test_get_deployments():
    """测试获取部署列表"""
    print("\n测试: 获取部署列表")
    response = requests.get(f"{BASE_URL}/deployments")
    print_response(response)


def test_get_deployment(deployment_id: str):
    """测试获取部署详情"""
    print(f"\n测试: 获取部署详情 (ID: {deployment_id})")
    response = requests.get(f"{BASE_URL}/deployments/{deployment_id}")
    print_response(response)


def test_get_deployment_logs(deployment_id: str):
    """测试获取部署日志"""
    print(f"\n测试: 获取部署日志 (ID: {deployment_id})")
    response = requests.get(f"{BASE_URL}/deployments/{deployment_id}/logs")
    print_response(response)


def test_delete_instance(instance_id: str):
    """测试删除实例"""
    print(f"\n测试: 删除实例 (ID: {instance_id})")
    response = requests.delete(f"{BASE_URL}/instances/{instance_id}")
    print_response(response)


def main():
    """运行所有测试"""
    print("=" * 50)
    print("MAI Launcher API 测试")
    print("=" * 50)
    
    try:
        # 测试实例管理
        instance_data = test_create_instance()
        if instance_data:
            instance_id = instance_data.get("id")
            test_get_instances()
            test_get_instance(instance_id)
            test_update_instance(instance_id)
            test_get_instance_status(instance_id)
            test_start_instance(instance_id)
            test_get_instance_status(instance_id)
            test_stop_instance(instance_id)
            
            # 测试部署管理
            deployment_data = test_create_deployment(instance_id)
            if deployment_data:
                deployment_id = deployment_data.get("id")
                test_get_deployments()
                test_get_deployment(deployment_id)
                test_get_deployment_logs(deployment_id)
            
            # 清理：删除测试实例
            test_delete_instance(instance_id)
        
        print("\n" + "=" * 50)
        print("测试完成")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 错误: 无法连接到后端服务")
        print("请确保后端服务正在运行: python main.py")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")


if __name__ == "__main__":
    main()

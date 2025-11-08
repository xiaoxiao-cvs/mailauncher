# MAI Launcher API 端点文档

## API 基础信息

### 版本前缀
所有 API 端点统一使用 `/api/v1` 作为前缀

https://s.apifox.cn/c41fc798-e8ea-49f3-a1db-162a0d0225d8

### 根路径
- **路径**: `GET /`
- **描述**: 健康检查端点
- **响应**: 
  ```json
  {
    "status": "ok",
    "message": "MAI Launcher Backend is running"
  }
  ```

### 统一响应格式

#### 成功响应
```json
{
  "success": true,
  "message": "操作成功消息",
  "data": { /* 响应数据 */ }
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "错误消息",
  "details": { /* 错误详情（可选） */ }
}
```

### HTTP 状态码规范
- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器内部错误
- `503 Service Unavailable` - 服务不可用（如外部 API 调用失败）

### 交互式文档
- **Swagger UI**: `GET /docs`
- **ReDoc**: `GET /redoc`

---

## 1. 实例管理 API

### 1.1 实例查询

#### 获取所有实例列表
- **路径**: `GET /api/v1/instances`
- **描述**: 获取所有已创建的 Minecraft 实例列表
- **响应**: 实例列表（包含基本信息）

#### 获取单个实例详情
- **路径**: `GET /api/v1/instances/{instance_id}`
- **描述**: 获取指定实例的详细信息
- **参数**: `instance_id` - 实例唯一标识符
- **响应**: 实例完整信息

#### 获取实例状态
- **路径**: `GET /api/v1/instances/{instance_id}/status`
- **描述**: 获取实例的运行状态
- **参数**: `instance_id` - 实例唯一标识符
- **响应**: 实例状态信息（运行中/已停止等）

### 1.2 实例操作

#### 创建新实例
- **路径**: `POST /api/v1/instances`
- **描述**: 创建新的 Minecraft 实例
- **请求体**: 
  ```json
  {
    "name": "我的实例",
    "bot_type": "maibot",
    "bot_version": "1.0.0",
    "description": "实例描述",
    "python_path": "/usr/bin/python3",
    "config_path": "/path/to/config"
  }
  ```
- **响应**: 创建的实例完整信息

#### 更新实例配置
- **路径**: `PUT /api/v1/instances/{instance_id}`
- **描述**: 更新实例配置信息
- **参数**: `instance_id` - 实例唯一标识符
- **请求体**: 
  ```json
  {
    "name": "更新的名称",
    "description": "更新的描述",
    "python_path": "/usr/bin/python3",
    "config_path": "/path/to/config"
  }
  ```
- **响应**: 更新后的实例信息

#### 删除实例
- **路径**: `DELETE /api/v1/instances/{instance_id}`
- **描述**: 删除指定实例
- **参数**: `instance_id` - 实例唯一标识符

### 1.3 实例控制

#### 启动实例
- **路径**: `POST /api/v1/instances/{instance_id}/start`
- **描述**: 启动指定的 Minecraft 实例
- **参数**: `instance_id` - 实例唯一标识符

#### 停止实例
- **路径**: `POST /api/v1/instances/{instance_id}/stop`
- **描述**: 停止正在运行的实例
- **参数**: `instance_id` - 实例唯一标识符

## 2. 部署管理 API

### 2.1 部署查询

#### 获取所有部署任务
- **路径**: `GET /api/v1/deployments`
- **描述**: 获取所有部署任务列表
- **查询参数**: 
  - `status` (可选) - 按状态过滤（pending/running/completed/failed）
  - `instance_id` (可选) - 按实例过滤

#### 获取部署详情
- **路径**: `GET /api/v1/deployments/{deployment_id}`
- **描述**: 获取指定部署任务的详细信息
- **参数**: `deployment_id` - 部署任务唯一标识符

#### 获取部署日志
- **路径**: `GET /api/v1/deployments/{deployment_id}/logs`
- **描述**: 获取部署任务的实时日志
- **参数**: `deployment_id` - 部署任务唯一标识符

### 2.2 部署操作

#### 创建部署任务
- **路径**: `POST /api/v1/deployments`
- **描述**: 创建新的部署任务
- **请求体**: 
  ```json
  {
    "instance_id": "inst_xxx",
    "deployment_type": "update",
    "config": {
      "source": "git",
      "repository": "https://github.com/user/repo.git",
      "branch": "main"
    }
  }
  ```
- **响应**: 创建的部署任务信息

#### 取消部署任务
- **路径**: `POST /api/v1/deployments/{deployment_id}/cancel`
- **描述**: 取消正在进行的部署任务
- **参数**: `deployment_id` - 部署任务唯一标识符

#### 重试部署任务
- **路径**: `POST /api/v1/deployments/{deployment_id}/retry`
- **描述**: 重试失败的部署任务
- **参数**: `deployment_id` - 部署任务唯一标识符

## 3. 环境配置 API

### 3.1 Python 版本管理

#### 获取 Python 版本列表
- **路径**: `GET /api/v1/environment/python/versions`
- **描述**: 获取系统中所有可用的 Python 版本
- **查询参数**: 
  - `refresh` (可选) - 是否强制刷新缓存（布尔值）
- **响应**: Python 版本列表，包含路径、版本号、是否为默认版本、是否为选中版本

#### 获取默认 Python 版本
- **路径**: `GET /api/v1/environment/python/default`
- **描述**: 获取当前默认的 Python 版本（优先返回用户选择的版本）
- **响应**: 默认 Python 版本信息

#### 设置默认 Python 版本
- **路径**: `POST /api/v1/environment/python/default`
- **描述**: 设置默认的 Python 版本
- **请求体**: 
  ```json
  {
    "python_path": "/path/to/python"
  }
  ```
- **响应**: 设置结果

### 3.2 Git 环境

#### 获取 Git 信息
- **路径**: `GET /api/v1/environment/git`
- **描述**: 获取 Git 环境信息
- **查询参数**: 
  - `refresh` (可选) - 是否强制刷新缓存
- **响应**: Git 路径、版本号、是否可用

### 3.3 系统信息

#### 获取系统信息
- **路径**: `GET /api/v1/environment/system`
- **描述**: 获取操作系统信息
- **响应**: 系统类型、版本、架构等信息

#### 获取环境配置
- **路径**: `GET /api/v1/environment/config`
- **描述**: 获取当前环境配置
- **响应**: 实例目录、Python 可执行文件、Git 可执行文件路径

#### 环境健康检查
- **路径**: `GET /api/v1/environment/check`
- **描述**: 执行完整的环境检查
- **响应**: 完整的环境健康状态报告，包括 Python、Git、实例目录等

### 3.4 虚拟环境配置

#### 获取虚拟环境类型
- **路径**: `GET /api/v1/environment/venv/type`
- **描述**: 获取虚拟环境类型配置
- **响应**: 当前虚拟环境类型（venv/uv/conda）

#### 设置虚拟环境类型
- **路径**: `POST /api/v1/environment/venv/type`
- **描述**: 设置虚拟环境类型
- **请求体**: 
  ```json
  {
    "venv_type": "venv"  // venv, uv, 或 conda
  }
  ```

## 4. 配置管理 API

### 4.1 通用配置

#### 获取所有配置
- **路径**: `GET /api/v1/config`
- **描述**: 获取所有配置项
- **响应**: 配置项列表

#### 获取指定配置
- **路径**: `GET /api/v1/config/{key}`
- **描述**: 获取指定的配置项
- **参数**: `key` - 配置键名
- **响应**: 配置值

#### 设置配置
- **路径**: `POST /api/v1/config`
- **描述**: 设置配置项
- **请求体**: 
  ```json
  {
    "key": "config_key",
    "value": "config_value",
    "description": "配置描述"
  }
  ```

### 4.2 Python 环境配置

#### 获取所有 Python 环境
- **路径**: `GET /api/v1/config/python/environments`
- **描述**: 获取数据库中保存的所有 Python 环境
- **响应**: Python 环境列表

#### 获取选中的 Python 环境
- **路径**: `GET /api/v1/config/python/selected`
- **描述**: 获取当前选择的 Python 环境
- **响应**: 选中的 Python 环境信息

#### 选择 Python 环境
- **路径**: `POST /api/v1/config/python/select/{path:path}`
- **描述**: 选择指定的 Python 环境
- **参数**: `path` - Python 可执行文件路径
- **响应**: 设置结果

### 4.3 MAIBot 配置

#### 获取 MAIBot 配置
- **路径**: `GET /api/v1/config/maibot`
- **描述**: 获取 MAIBot 的配置信息
- **响应**: MAIBot 路径、配置路径、数据路径、版本等信息

#### 保存 MAIBot 配置
- **路径**: `POST /api/v1/config/maibot`
- **描述**: 保存 MAIBot 配置
- **请求体**: 
  ```json
  {
    "maibot_path": "/path/to/maibot",
    "config_path": "/path/to/config",
    "data_path": "/path/to/data",
    "python_env_id": 1,
    "is_installed": true,
    "version": "1.0.0"
  }
  ```

### 4.4 路径配置

#### 获取所有路径配置
- **路径**: `GET /api/v1/config/paths`
- **描述**: 获取所有路径配置
- **响应**: 路径配置列表

#### 获取指定路径配置
- **路径**: `GET /api/v1/config/paths/{name}`
- **描述**: 获取指定的路径配置
- **参数**: `name` - 路径配置名称
- **响应**: 路径值

#### 设置路径配置
- **路径**: `POST /api/v1/config/paths`
- **描述**: 设置路径配置
- **请求体**: 
  ```json
  {
    "name": "path_name",
    "path": "/path/to/location",
    "path_type": "executable",  // executable 或 directory
    "is_verified": true,
    "description": "路径描述"
  }
  ```

## 5. API 供应商管理

### 5.1 供应商配置

#### 获取所有 API 供应商
- **路径**: `GET /api/v1/config/api-providers`
- **描述**: 获取所有 API 供应商配置
- **响应**: 供应商列表，包含 ID、名称、API URL、API Key、启用状态、优先级、余额等

#### 批量保存 API 供应商
- **路径**: `POST /api/v1/config/api-providers`
- **描述**: 批量保存 API 供应商配置
- **请求体**: 
  ```json
  {
    "providers": [
      {
        "id": 1,
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-...",
        "is_enabled": true,
        "priority": 1
      }
    ]
  }
  ```

#### 删除 API 供应商
- **路径**: `DELETE /api/v1/config/api-providers/{provider_id}`
- **描述**: 删除指定的 API 供应商配置
- **参数**: `provider_id` - 供应商 ID

### 5.2 模型管理

#### 获取供应商模型列表
- **路径**: `POST /api/v1/config/api-providers/{provider_id}/fetch-models`
- **描述**: 从供应商 API 获取支持的模型列表并缓存
- **参数**: `provider_id` - 供应商 ID
- **响应**: 模型列表，包含模型 ID、名称、所有者、支持的功能等

#### 获取缓存的模型列表
- **路径**: `GET /api/v1/config/api-providers/{provider_id}/models`
- **描述**: 获取数据库中缓存的模型列表
- **参数**: `provider_id` - 供应商 ID
- **响应**: 缓存的模型列表

#### 获取供应商余额
- **路径**: `POST /api/v1/config/api-providers/{provider_id}/fetch-balance`
- **描述**: 获取供应商账户余额并缓存
- **参数**: `provider_id` - 供应商 ID
- **响应**: 余额信息

## 6. 日志管理 API

### 6.1 前端日志

#### 保存前端日志
- **路径**: `POST /api/v1/logger/frontend`
- **描述**: 前端批量保存日志到后端
- **请求体**: 
  ```json
  {
    "logs": [
      {
        "timestamp": "2025-01-07T10:00:00Z",
        "level": "info",
        "tag": "App",
        "message": "应用启动",
        "args": [],
        "error": null
      }
    ]
  }
  ```

#### 获取前端日志文件列表
- **路径**: `GET /api/v1/logger/frontend/files`
- **描述**: 获取所有前端日志文件列表
- **响应**: 日志文件列表，包含文件名、大小、修改时间、是否压缩

#### 获取前端日志内容
- **路径**: `GET /api/v1/logger/frontend/content`
- **描述**: 获取指定日志文件的内容
- **查询参数**: 
  - `path` (必需) - 日志文件路径
- **响应**: 日志文件内容

#### 导出前端日志
- **路径**: `GET /api/v1/logger/frontend/export`
- **描述**: 导出所有前端日志为 zip 文件
- **响应**: zip 文件下载

#### 清除前端日志
- **路径**: `DELETE /api/v1/logger/frontend/clear`
- **描述**: 清除所有前端日志文件
- **响应**: 清除结果

## Python 开发注意事项

### 1. 代码组织
- ✅ 遵循单一职责原则，每个模块只负责一个功能域
- ✅ 使用 Pydantic 模型进行数据验证
- ✅ 路由按功能分离到不同的路由器文件
- ✅ 服务层与路由层分离，业务逻辑在 service 层实现

### 2. 错误处理
- ✅ 统一的异常处理机制
- ✅ 使用 HTTPException 返回规范的错误响应
- ✅ 记录详细的错误日志
- ⚠️ 建议：捕获更具体的异常类型，避免过于宽泛的 `except Exception`

### 3. 安全性
- ✅ 输入验证和消毒
- ✅ 防止路径遍历攻击
- ✅ 限制文件上传大小
- ✅ 使用环境变量管理敏感配置
- ⚠️ 建议：生产环境限制 CORS 的 `ALLOWED_ORIGINS`，不要使用 `*`
- ⚠️ 建议：添加 API 限流机制

### 4. 性能优化
- ✅ 使用异步处理（async/await）
- ✅ 合理使用缓存（Python 版本、Git 信息等）
- ✅ 后台任务处理耗时操作
- ⚠️ 建议：为大列表查询添加分页功能
- ⚠️ 建议：优化数据库查询，避免 N+1 问题

### 5. 代码质量
- ✅ 类型注解（Type Hints）
- ✅ 文档字符串（Docstrings）
- ✅ 遵循 PEP 8 代码规范
- ⚠️ 建议：添加单元测试覆盖
- ⚠️ 建议：完善部分函数的类型注解

### 6. 数据库
- ✅ 使用 SQLAlchemy ORM，避免 SQL 注入
- ✅ 异步数据库连接池
- ✅ 事务管理
- ⚠️ 建议：添加数据库迁移工具（如 Alembic）

### 7. 日志管理
- ✅ 结构化日志记录
- ✅ 日志文件自动轮转和压缩
- ✅ 保留策略（最近 7 个日志文件）
- ✅ 前端日志集中管理

## API 使用示例

### 创建实例并启动

```python
import httpx

# 1. 创建实例
response = httpx.post("http://127.0.0.1:11111/api/v1/instances", json={
    "name": "我的机器人",
    "bot_type": "maibot",
    "bot_version": "1.0.0",
    "description": "测试实例"
})
instance = response.json()["data"]
instance_id = instance["id"]

# 2. 启动实例
response = httpx.post(f"http://127.0.0.1:11111/api/v1/instances/{instance_id}/start")
print(response.json())
```

### 配置 API 供应商

```python
import httpx

# 保存供应商配置
response = httpx.post("http://127.0.0.1:11111/api/v1/config/api-providers", json={
    "providers": [
        {
            "name": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-...",
            "is_enabled": True,
            "priority": 1
        }
    ]
})

# 获取模型列表
provider_id = response.json()["data"]["providers"][0]["id"]
models = httpx.post(f"http://127.0.0.1:11111/api/v1/config/api-providers/{provider_id}/fetch-models")
print(models.json())
```

### 环境检查

```python
import httpx

# 完整环境检查
response = httpx.get("http://127.0.0.1:11111/api/v1/environment/check")
env_status = response.json()

if env_status["data"]["is_healthy"]:
    print("环境健康")
else:
    print("环境存在问题，请检查")
```

## 更新日志

### v0.1.0 (2025-01-07)
- ✅ 实例管理 API
- ✅ 部署管理 API
- ✅ 环境配置 API
- ✅ 配置管理 API
- ✅ API 供应商管理
- ✅ 前端日志管理
- ✅ 健康检查端点
- ✅ 交互式 API 文档（Swagger UI / ReDoc）

## 技术栈

- **框架**: FastAPI 0.104+
- **数据库**: SQLite + SQLAlchemy (异步)
- **验证**: Pydantic v2
- **日志**: Python logging + 自定义日志管理
- **CORS**: FastAPI CORS 中间件
- **文档**: 自动生成 OpenAPI 3.0 文档

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

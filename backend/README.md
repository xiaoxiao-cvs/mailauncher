# MAI Launcher Backend

麦麦启动器的后端服务，基于 FastAPI 构建。

## 项目结构

```
backend/
├── main.py                 # 应用主入口
├── requirements.txt        # Python 依赖
├── API.md                  # API 端点文档
├── app/                    # 应用包
│   ├── __init__.py
│   ├── core/               # 核心配置
│   │   ├── __init__.py
│   │   └── config.py       # 配置管理
│   ├── models/             # 数据模型
│   │   ├── __init__.py
│   │   ├── instance.py     # 实例模型
│   │   ├── deployment.py   # 部署模型
│   │   └── response.py     # 响应模型
│   ├── services/           # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── instance_service.py     # 实例服务
│   │   └── deployment_service.py   # 部署服务
│   └── api/                # API 路由层
│       ├── __init__.py
│       └── v1/             # API v1
│           ├── __init__.py
│           ├── instances.py    # 实例路由
│           └── deployments.py  # 部署路由
└── instances/              # 实例数据存储（运行时生成）
```

## 设计原则

### 1. 单一职责原则（SRP）
每个模块只负责一个功能域：
- **models/**: 只定义数据结构
- **services/**: 只处理业务逻辑
- **api/**: 只处理 HTTP 请求/响应

### 2. 分层架构
```
API 路由层 (api/)
    ↓
业务逻辑层 (services/)
    ↓
数据模型层 (models/)
```

### 3. 依赖注入
使用全局服务实例，便于测试和维护。

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行开发服务器

```bash
python main.py
```

或使用 uvicorn：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 访问 API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点概览

### 实例管理
- `GET /api/v1/instances` - 获取所有实例
- `GET /api/v1/instances/{id}` - 获取实例详情
- `POST /api/v1/instances` - 创建实例
- `PUT /api/v1/instances/{id}` - 更新实例
- `DELETE /api/v1/instances/{id}` - 删除实例
- `POST /api/v1/instances/{id}/start` - 启动实例
- `POST /api/v1/instances/{id}/stop` - 停止实例

### 部署管理
- `GET /api/v1/deployments` - 获取所有部署任务
- `GET /api/v1/deployments/{id}` - 获取部署详情
- `POST /api/v1/deployments` - 创建部署任务
- `POST /api/v1/deployments/{id}/cancel` - 取消部署
- `GET /api/v1/deployments/{id}/logs` - 获取部署日志

详细 API 文档请查看 [API.md](./API.md)

## 开发注意事项

### 1. 类型注解
所有函数都应使用类型注解：
```python
async def get_instance(instance_id: str) -> Optional[Instance]:
    pass
```

### 2. 异常处理
使用 FastAPI 的 HTTPException：
```python
from fastapi import HTTPException, status

if not instance:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="实例不存在"
    )
```

### 3. Pydantic 验证
所有输入数据都通过 Pydantic 模型验证：
```python
class InstanceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    minecraft_version: str
```

### 4. 异步编程
使用 async/await 处理 I/O 操作：
```python
async def create_instance(data: InstanceCreate) -> Instance:
    # 异步操作
    pass
```

### 5. 错误日志
重要操作需要记录日志：
```python
import logging

logger = logging.getLogger(__name__)
logger.error(f"创建实例失败: {e}")
```

## 环境变量

可以通过 `.env` 文件配置：

```env
# API 配置
API_V1_PREFIX=/api/v1
PROJECT_NAME=MAI Launcher API

# 存储路径
INSTANCES_DIR=./instances

# 日志级别
LOG_LEVEL=INFO
```

## 待实现功能

- [ ] 实例进程管理（启动/停止 Minecraft）
- [ ] 部署任务后台执行
- [ ] 文件上传处理
- [ ] WebSocket 实时日志推送
- [ ] 数据持久化（数据库）
- [ ] 用户认证和授权
- [ ] 单元测试
- [ ] 性能监控

## 技术栈

- **FastAPI**: 现代高性能 Web 框架
- **Pydantic**: 数据验证和设置管理
- **Uvicorn**: ASGI 服务器
- **Python 3.10+**: 类型注解和异步支持

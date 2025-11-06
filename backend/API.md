# MAI Launcher API 端点文档

## API 版本前缀
所有 API 端点统一使用 `/api/v1` 作为前缀

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
- **请求体**: 实例配置信息（名称、版本、模组加载器等）

#### 更新实例配置
- **路径**: `PUT /api/v1/instances/{instance_id}`
- **描述**: 更新实例配置信息
- **参数**: `instance_id` - 实例唯一标识符
- **请求体**: 更新的配置信息

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
- **请求体**: 部署配置（目标实例、部署类型、资源包等）

#### 取消部署任务
- **路径**: `POST /api/v1/deployments/{deployment_id}/cancel`
- **描述**: 取消正在进行的部署任务
- **参数**: `deployment_id` - 部署任务唯一标识符

#### 重试部署任务
- **路径**: `POST /api/v1/deployments/{deployment_id}/retry`
- **描述**: 重试失败的部署任务
- **参数**: `deployment_id` - 部署任务唯一标识符

## 3. 系统管理 API

### 3.1 系统信息

#### 获取系统状态
- **路径**: `GET /api/v1/system/status`
- **描述**: 获取系统整体运行状态

#### 获取系统配置
- **路径**: `GET /api/v1/system/config`
- **描述**: 获取系统配置信息

#### 更新系统配置
- **路径**: `PUT /api/v1/system/config`
- **描述**: 更新系统配置
- **请求体**: 配置项

## Python 开发注意事项

### 1. 代码组织
- ✅ 遵循单一职责原则，每个模块只负责一个功能域
- ✅ 使用 Pydantic 模型进行数据验证
- ✅ 路由按功能分离到不同的路由器文件

### 2. 错误处理
- ✅ 统一的异常处理机制
- ✅ 使用 HTTPException 返回规范的错误响应
- ✅ 记录详细的错误日志

### 3. 安全性
- ✅ 输入验证和消毒
- ✅ 防止路径遍历攻击
- ✅ 限制文件上传大小
- ✅ 使用环境变量管理敏感配置

### 4. 性能优化
- ✅ 使用异步处理（async/await）
- ✅ 合理使用缓存
- ✅ 分页查询大量数据
- ✅ 后台任务处理耗时操作

### 5. 代码质量
- ✅ 类型注解（Type Hints）
- ✅ 文档字符串（Docstrings）
- ✅ 单元测试覆盖
- ✅ 遵循 PEP 8 代码规范

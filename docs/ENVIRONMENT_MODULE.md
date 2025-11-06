# 环境配置模块文档

## 概述

本模块为 MAI Launcher 提供完整的环境检查与配置功能，包括 Python 版本管理、Git 环境检查和实例安装路径配置。

## 后端实现

### 1. 环境管理器 (`app/core/environment.py`)

核心环境管理类，负责检测和管理系统环境。

#### 主要功能：

**Python 版本管理**
- 自动检测系统中所有可用的 Python 版本
- 支持多种安装方式（系统自带、Homebrew、Python.org 等）
- 识别默认 Python 版本
- 提供版本详细信息（路径、版本号、主版本、次版本、微版本）

**Git 环境检查**
- 检测 Git 是否安装
- 获取 Git 版本信息
- 返回 Git 可执行文件路径

**系统信息**
- 获取操作系统类型
- 获取系统版本信息
- 获取处理器架构

#### 使用示例：

```python
from app.core.environment import environment_manager

# 获取所有 Python 版本
versions = environment_manager.get_python_versions()

# 获取默认 Python
default_py = environment_manager.get_default_python()

# 检查 Git
git_info = environment_manager.check_git()

# 获取系统信息
system_info = environment_manager.get_system_info()
```

### 2. 配置扩展 (`app/core/config.py`)

扩展了配置类以支持环境相关的配置项。

#### 新增配置项：

- `INSTANCES_DIR`: 实例存储路径（默认: `./deployments`）
- `PYTHON_EXECUTABLE`: 自定义 Python 路径（可选）
- `GIT_EXECUTABLE`: 自定义 Git 路径（可选）

#### 新增方法：

- `get_instances_path()`: 获取实例存储路径的绝对路径
- `ensure_instances_dir()`: 确保实例存储目录存在

### 3. 环境配置 API (`app/api/v1/environment.py`)

提供 RESTful API 端点用于环境检查和配置。

#### API 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/environment/python/versions` | GET | 获取所有可用的 Python 版本 |
| `/api/v1/environment/python/default` | GET | 获取默认 Python 版本 |
| `/api/v1/environment/git` | GET | 获取 Git 环境信息 |
| `/api/v1/environment/system` | GET | 获取系统信息 |
| `/api/v1/environment/config` | GET | 获取当前环境配置 |
| `/api/v1/environment/check` | GET | 执行完整的环境检查 |

#### 请求参数：

- `refresh`: 布尔值，是否强制刷新缓存（适用于 Python 和 Git 检查）

#### 响应格式：

```json
{
  "success": true,
  "message": "成功信息",
  "data": {
    // 具体数据
  }
}
```

## 前端实现

### 1. 环境检查组件 (`components/onboarding/EnvironmentCheck.tsx`)

引导页第二步的环境检查与配置界面。

#### 主要功能：

**Git 环境检查**
- 自动检测 Git 是否可用
- 显示 Git 版本信息
- 显示 Git 安装路径
- 提供重新检查功能
- 未安装时提供下载链接

**部署路径配置**
- 显示当前配置的部署路径
- 支持手动输入路径
- 提供文件夹选择按钮（需配合桌面框架）
- 路径验证功能

**环境状态总结**
- 实时显示环境准备度
- Git 环境就绪状态
- 部署路径配置状态

#### 组件属性：

```typescript
interface EnvironmentCheckProps {
  stepColor: string // 当前步骤的主题色
}
```

### 2. 类型定义更新

在 `types/onboarding/index.ts` 中添加了 `isEnvironmentStep` 标志：

```typescript
export interface OnboardingStep {
  // ... 其他属性
  isEnvironmentStep?: boolean // 是否为环境检查步骤
}
```

### 3. 引导内容集成

`OnboardingContent.tsx` 已更新以支持环境检查步骤的显示。

## 使用指南

### 后端启动

```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

### 前端启动

```bash
cd frontend
pnpm dev
```

### 访问引导页

1. 启动前后端服务
2. 访问前端应用（通常是 `http://localhost:3000` 或 `http://localhost:5173`）
3. 进入引导页
4. 导航至"环境检查与配置"步骤

## API 使用示例

### 检查 Git 环境

```bash
curl http://localhost:8000/api/v1/environment/git
```

响应：
```json
{
  "success": true,
  "message": "成功获取 Git 信息",
  "data": {
    "path": "/usr/bin/git",
    "version": "2.39.0",
    "is_available": true
  }
}
```

### 获取 Python 版本列表

```bash
curl http://localhost:8000/api/v1/environment/python/versions
```

响应：
```json
{
  "success": true,
  "message": "成功获取 Python 版本列表",
  "data": {
    "versions": [
      {
        "path": "/usr/local/bin/python3",
        "version": "3.11.5",
        "major": 3,
        "minor": 11,
        "micro": 5,
        "is_default": true
      }
    ],
    "count": 1
  }
}
```

### 完整环境检查

```bash
curl http://localhost:8000/api/v1/environment/check
```

## 注意事项

1. **CORS 配置**: 确保后端 CORS 配置包含前端的域名
2. **文件夹选择**: 浏览器原生不支持文件夹选择，需要配合 Tauri 或 Electron 等桌面框架实现
3. **路径验证**: 前端提供基本的路径格式验证，实际路径可用性应由后端验证
4. **缓存机制**: Python 和 Git 信息会被缓存，可通过 `refresh=true` 参数强制刷新

## 未来改进

1. 支持自定义 Python 和 Git 路径配置
2. 实现桌面端的文件夹选择功能（Tauri API）
3. 添加路径可用性的后端验证
4. 支持更多环境检查项（Node.js、npm 等）
5. 提供环境问题的自动修复建议

## 技术栈

**后端**
- FastAPI
- Pydantic
- Python 标准库（subprocess, shutil, platform）

**前端**
- React
- TypeScript
- Tailwind CSS
- Lucide Icons

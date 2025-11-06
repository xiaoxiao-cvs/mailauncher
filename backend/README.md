# MAI Launcher Backend

后端服务 - 使用 Python FastAPI 实现

## 技术栈

- **语言**: Python 3.10+
- **框架**: FastAPI
- **ASGI 服务器**: Uvicorn
- **数据库**: SQLite (与 MaiBot 保持一致)

## 项目结构

```
backend/
├── main.py              # 应用入口文件
├── requirements.txt     # Python 依赖
├── .gitignore          # Git 忽略配置
└── README.md           # 本文件
```

## 功能模块(规划)

- **路径管理**: 实例安装路径配置
- **进程管理**: MaiBot, NapCat 进程控制
- **配置管理**: 配置文件读写
- **数据库操作**: SQLite 数据访问
- **文件系统**: 文件和目录管理
- **日志服务**: 日志收集和查询

## 快速开始

### 1. 创建虚拟环境

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动开发服务器

```bash
python main.py
```

服务将在 `http://127.0.0.1:8000` 启动

### 4. 查看 API 文档

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## 设计原则

- **单一职责**: 每个模块专注于单一功能
- **依赖注入**: 使用 FastAPI 的依赖注入系统
- **分层架构**: 路由 -> 服务 -> 数据访问
- **类型安全**: 使用 Pydantic 进行数据验证

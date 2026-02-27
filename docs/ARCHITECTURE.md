# MAI Launcher 架构文档

## 项目概述

麦麦启动器 - 为 MaiBot、NapCat 和适配器提供可视化管理的新手友好工具。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 库**: Origin UI (基于 Tailwind CSS) + shadcn/ui
- **路由**: React Router v6
- **状态管理**: Zustand + TanStack Query
- **桌面框架**: Tauri 2
- **包管理器**: pnpm

### 后端 (Rust)
- **IPC 框架**: Tauri 2 命令系统
- **数据库**: SQLite (sqlx, WAL 模式)
- **HTTP 客户端**: reqwest
- **进程管理**: portable-pty + sysinfo
- **序列化**: serde + serde_json

## 项目结构

```
mailauncher/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   │   ├── ui/         # 基础组件
│   │   │   ├── layout/     # 布局组件
│   │   │   └── features/   # 功能组件
│   │   ├── pages/          # 页面组件
│   │   ├── lib/            # 工具函数
│   │   ├── hooks/          # 自定义 Hooks
│   │   │   └── queries/    # TanStack Query hooks
│   │   ├── stores/         # Zustand 状态管理
│   │   ├── types/          # TypeScript 类型定义
│   │   └── services/       # Tauri IPC 调用封装
│   ├── src-tauri/           # Rust 后端
│   │   ├── src/
│   │   │   ├── lib.rs      # 入口：初始化与命令注册
│   │   │   ├── commands/   # Tauri IPC 命令（按业务域分文件）
│   │   │   ├── services/   # 业务逻辑层
│   │   │   ├── models/     # 数据模型（数据库行映射 + IPC 传输类型）
│   │   │   ├── db/         # 数据库连接池与迁移
│   │   │   ├── errors/     # 统一错误处理
│   │   │   ├── state.rs    # 应用全局状态
│   │   │   └── utils/      # 平台工具
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── package.json
├── docs/                    # 项目文档
└── build.sh                 # 构建脚本
```

## 通信架构

前端通过 `tauriInvoke()` 调用 Rust 命令，取代了原来的 HTTP REST API：

```
前端 (React) → tauriInvoke('command_name', args) → Rust Command → Service → Database
```

- 命令层（commands/）：参数反序列化、权限检查、调用服务层
- 服务层（services/）：业务逻辑、数据库操作、外部 API 调用
- 模型层（models/）：数据库行映射、IPC 传输结构

## 核心功能模块

### 1. 实例管理
- MaiBot 实例的创建、配置、启停
- NapCat 与适配器组件管理
- 进程生命周期管理（PTY 终端）

### 2. 配置管理
- TOML 配置文件编辑（树形视图 + 原始编辑）
- KV 键值配置存储
- Python 环境与路径管理

### 3. 下载与版本管理
- MaiBot/NapCat 版本下载
- 组件版本检测与更新
- 启动器自动更新（Tauri Updater）

### 4. 统计与监控
- LLM 使用统计（从 MaiBot 数据库查询）
- 前端日志管理（JSONL 格式）
- 计划任务 CRUD

## 开发规范

- 使用 TypeScript strict 模式
- 遵循 React Hooks 最佳实践
- Rust 代码使用 thiserror 统一错误处理
- 前端通过 TanStack Query 管理服务端状态
- 组件采用函数式组件

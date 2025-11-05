# MAI Launcher 架构文档

## 项目概述

麦麦启动器 - 为 MaiBot、NapCat 和适配器提供可视化管理的新手友好工具。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 库**: Origin UI (基于 Tailwind CSS)
- **路由**: React Router v6
- **状态管理**: Zustand
- **包管理器**: pnpm

## 项目结构

```
mailauncher/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   │   ├── ui/         # Origin UI 基础组件
│   │   │   ├── layout/     # 布局组件
│   │   │   └── features/   # 功能组件
│   │   ├── pages/          # 页面组件
│   │   ├── lib/            # 工具函数
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── stores/         # Zustand 状态管理
│   │   ├── types/          # TypeScript 类型定义
│   │   └── services/       # API 服务
│   ├── public/             # 静态资源
│   └── package.json
├── backend/                 # 后端服务 (待开发)
├── docs/                    # 项目文档
└── old/                     # 旧版本备份
```

## 核心功能模块

### 1. 安装管理
- MaiBot 下载与安装
- NapCat 下载与安装
- 适配器安装

### 2. 配置管理
- TOML 配置文件编辑 (bot_config.toml, model_config.toml)
- JSON 配置文件编辑 (onebot11.json)
- 配置验证

### 3. 数据库管理
- 表情包管理
- 消息记录查看
- 用户信息管理

## 开发规范

- 使用 TypeScript strict 模式
- 遵循 React Hooks 最佳实践
- 组件采用函数式组件
- 使用 CSS 变量进行主题定制

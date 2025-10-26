# mailauncher

MaiLauncher 启动器前端

## 概述

MaiLauncher 前端是一个基于 Vue3 构建的现代化 Web 应用程序，提供直观的用户界面来管理 MaiBot 实例。它通过 WebSocket 和 HTTP API 与后端服务进行通信，为用户提供实时的实例管理、部署监控和交互体验。

## 主要功能

- **实例管理**: 创建、启动、停止、重启和删除 MaiBot 实例
- **可视化部署**: 通过图形界面部署不同版本的 MaiBot，支持实时进度跟踪
- **实时终端**: 集成 xterm.js 提供与实例的直接终端交互
- **聊天界面**: 与 Bot 进行实时对话和交互（开发中）
- **状态监控**: 实时显示系统资源使用情况和实例状态
- **主题定制**: 支持多种主题和界面个性化设置

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **UI 组件库**: DaisyUI + Tailwind CSS
- **构建工具**: Vite
- **状态管理**: Pinia
- **图标**: Iconify
- **终端**: xterm.js
- **图表**: ECharts
- **跨平台**: Tauri

## 项目结构

```
mailauncher/
├── index.html              # 应用入口HTML文件
├── package.json            # 项目依赖和脚本配置
├── vite.config.js          # Vite构建配置
├── tailwind.config.js      # Tailwind CSS配置
├── README.md               # 项目说明文件
├── LICENSE                 # 项目许可证 (GNU General Public License v3)
├── public/                 # 静态资源目录
│   ├── tauri.svg
│   └── assets/
├── src/
│   ├── App.vue             # 主应用组件
│   ├── main.js             # 应用入口点
│   ├── components/         # Vue组件
│   │   ├── AppSidebar.vue
│   │   ├── HomeView.vue
│   │   ├── InstancesPanel.vue
│   │   ├── DownloadsPanel.vue
│   │   ├── chat/           # 聊天相关组件
│   │   ├── downloads/      # 下载中心组件
│   │   ├── instances/      # 实例管理组件
│   │   └── settings/       # 设置相关组件
│   ├── services/           # 服务层
│   │   ├── apiService.js
│   │   ├── websocket.js
│   │   ├── toastService.js
│   │   └── theme.js
│   ├── stores/             # Pinia状态管理
│   │   ├── instanceStore.js
│   │   ├── deployStore.js
│   │   └── systemStore.js
│   ├── utils/              # 工具函数
│   │   ├── formatters.js
│   │   └── apiAdapters.js
│   └── assets/             # 样式和静态资源
│       ├── global.css
│       └── css/
└── src-tauri/              # Tauri桌面应用配置
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
```

## API 文档

前端通过 HTTP API 和 WebSocket 接口与后端服务进行通信。

主要的 API 端点包括：

- 实例管理: `/api/v1/instances`, `/api/v1/instance/{id}/start`, 等。
- 部署 API: `/api/v1/deploy/versions`, `/api/v1/deploy/deploy`, 等。
- 系统 API: `/api/v1/system/health`, `/api/v1/system/metrics`, 等。
- WebSocket 接口: `/api/v1/ws/{session_id}` (用于通用 WebSocket 通信), 以及特定的日志 WebSocket 端点。

详细的 API 接口说明请参见后端项目的 `backend_api.md` 文件。

## 配置

项目支持多环境配置：

- `.env.development`: 开发环境配置
- `.env.production`: 生产环境配置

关键配置项：

- `VITE_API_BASE_URL`: 后端 API 基础 URL
- `VITE_WS_BASE_URL`: WebSocket 连接 URL

## 如何运行

1. **安装依赖**:

   ```bash
   pnpm install
   ```

2. **配置**: 根据需要创建和修改环境配置文件 (`.env.development`, `.env.production`)。

3. **开发模式**:

   ```bash
   pnpm dev
   ```

   应用将在 `http://localhost:5173` 启动

4. **构建生产版本**:

   ```bash
   pnpm build
   ```

5. **构建桌面应用**:
   ```bash
   pnpm tauri build
   ```

## 开发计划 📅

### 已完成功能 ✅

- [x] **基础 Web 界面框架** - 基于 Vue3 + DaisyUI 的现代化界面
- [x] **实例管理系统** - 实例列表、状态监控、启停控制
- [x] **可视化部署中心** - 版本选择、配置部署、实时进度跟踪
- [x] **WebSocket 实时通信** - 部署日志、实例状态实时更新
- [x] **多实例管理** - 支持多个 MaiBot 实例并行管理
- [x] **实例详情终端** - 集成 xterm.js 的实时终端界面
- [x] **聊天室功能** - 与 Bot 的交互聊天界面（正在开发中）
- [x] **API 后端服务** - 完整的 FastAPI 后端支持
- [x] **跨平台支持** - Windows/Linux/macOS 自动构建
- [x] **实时日志系统** - WebSocket 实时日志流
- [x] **下载管理** - 版本下载、依赖安装
- [x] **状态监控** - 系统资源、实例状态仪表盘

### 近期计划 (v0.1.x)

- [ ] **实例配置管理** - Bot 配置、适配器设置
- [ ] 资源监控面板增强
- [ ] 仪表盘自定义卡片
- [ ] 实例一键更新
- [ ] 启动器自动更新
- [ ] 改进错误处理机制
- [ ] 批量操作功能

### 长期计划 (v2.0+)

- [ ] 插件系统
- [ ] 多节点的实例管理

## 贡献指南 🤝

欢迎提交 Pull Request 或创建 issues！

## 问题反馈 🐛

如果你发现了 bug 或有新功能建议，请创建 issue。

## 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 授权。

## 作者

筱筱 - [@xiaoxiao-cvs](https://github.com/xiaoxiao-cvs)  
墨梓柒 - [@DrSmoothl](https://github.com/DrSmoothl)

## 致谢

- Vue.js 社区提供的优秀前端框架
- DaisyUI 提供的现代化 UI 组件库
- xterm.js 提供的终端组件
- 所有贡献者和用户

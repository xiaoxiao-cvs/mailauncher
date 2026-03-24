# MAI Launcher

MAI Launcher 是一个面向 MaiBot、NapCat 及相关适配器的桌面管理工具，提供实例创建、组件安装、配置编辑、进程管理、日志查看和运行状态监控等能力。

当前版本已经完成从 Python 后端到 Rust 后端的整体重构。项目基于 Tauri 2 构建，前端使用 React + TypeScript，桌面端核心能力由 Rust 提供，前后端通过 Tauri IPC 直接通信。

## 当前版本说明

- 启动器本体已经不再使用 Python 作为后端运行时
- 原有独立后端通信模型已切换为 Tauri 命令和事件机制
- 进程管理、下载、数据库访问、配置处理和状态投影已经迁移到 Rust
- 实例运行方式已抽象为运行时配置，支持 local、wsl2、docker 三类运行时
- 被管理组件本身是否依赖 Python，取决于组件实现；但启动器自身已经是完整的 Rust 桌面应用

## 核心能力

### 实例与组件管理

- 创建、启动、停止、删除多个独立实例
- 管理 MaiBot、NapCat 和适配器等组件
- 按运行时配置选择本地、WSL2 或 Docker 执行方式
- 统一聚合实例和组件状态，区分 running、partial、stopped、failed 等运行态

### 配置编辑

- 可视化编辑 bot_config.toml、model_config.toml 等配置文件
- 支持树形编辑与文本编辑切换
- 尽量保留注释和原始结构，降低配置文件损坏风险
- 提供 API Provider、环境路径等相关配置管理能力

### 进程与终端能力

- 基于 portable-pty 的跨平台终端管理
- 实时查看实例输出和安装日志
- 支持运行状态重发现与生命周期恢复
- 区分外部接管进程能力与终端重连能力

### 下载、更新与数据管理

- 下载和管理 MaiBot、NapCat 及相关组件版本
- 使用 SQLite 持久化实例配置、任务记录和日志数据
- 支持启动器自动更新
- 提供统计、计划任务和运行信息相关能力

## 技术架构

### 桌面端

- Tauri 2
- Rust
- Tokio
- sqlx + SQLite
- reqwest
- portable-pty
- sysinfo
- serde / toml / toml_edit

### 前端

- React 18
- TypeScript
- Vite 6
- Tailwind CSS
- shadcn/ui 与 Origin UI 风格组件
- TanStack Query
- Zustand

### 通信模型

```text
React UI -> Tauri invoke / events -> Rust commands -> services -> database / runtime adapters
```

桌面端核心逻辑不再依赖单独启动的 Python 服务，分发结构和运行链路都更直接。

## 项目结构

```text
mailauncher/
├── frontend/               # React + TypeScript + Vite 前端
├── src-tauri/              # Tauri 配置与 Rust 后端
│   ├── src/                # commands, services, runtime, lifecycle, db 等模块
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                   # 架构、设计系统与 RFC 文档
├── BUILD.md                # 构建与打包说明
├── build.sh                # 一键构建脚本
└── README.md
```

## 平台与分发

### 支持平台

| 平台 | 说明 |
| --- | --- |
| Windows 10/11 x64 | 提供安装包，适合作为主要桌面环境 |
| macOS 10.13+ | 支持 Intel 和 Apple Silicon |
| Linux | 构建链路支持，具体发行包以发布页为准 |

### 下载

最新版本请前往 GitHub Releases：

https://github.com/xiaoxiao-cvs/mailauncher/releases

常见产物包括：

- Windows: NSIS 安装包和 MSI 安装包
- macOS: DMG
- Linux: DEB / AppImage（如果该版本发布）

## 本地开发

### 环境要求

- Node.js 18+
- pnpm 8+
- Rust 1.77+
- 适用于 Tauri 2 的本机构建依赖

### 安装依赖

```bash
pnpm install
pnpm --dir frontend install
```

### 启动开发环境

```bash
pnpm tauri:dev
```

该命令会启动前端开发服务器，并打开 Tauri 桌面窗口。

### 前端单独开发

```bash
pnpm --dir frontend dev
```

### 检查 Rust 后端

```bash
cd src-tauri
cargo check
```

## 构建与打包

### 一键构建

```bash
./build.sh
```

### 手动构建

```bash
pnpm install
pnpm --dir frontend install
pnpm --dir frontend build
pnpm tauri:build
```

构建产物默认位于：

```text
src-tauri/target/release/bundle/
```

更详细的构建说明见 BUILD.md。

## 文档

- docs/ARCHITECTURE.md：当前前后端架构、运行时抽象与生命周期设计
- docs/DESIGN_SYSTEM.md：界面设计规范
- docs/RFC-001-rust-migration-and-docker-management.md：Rust 迁移与 Docker 管理设计记录
- docs/RFC-002-runtime-abstraction-and-wsl2-readiness.md：运行时抽象与 WSL2 设计记录
- BUILD.md：本地构建与发布流程

## 开发说明

- 前端通过 Tauri IPC 调用 Rust 命令，不再依赖旧式后端服务进程
- Rust 侧按 commands、services、runtime、lifecycle、db、models 等模块划分职责
- 运行时适配器负责本地、WSL2、Docker 三类环境的统一抽象
- 状态投影逻辑会区分真实进程状态、外部接管状态和终端重连能力

## 迁移背景

这个项目最初基于 Python 后端实现。随着桌面端能力扩展，原有架构在分发、跨平台运行时一致性、进程生命周期管理和状态建模方面逐渐暴露出复杂度。

当前版本重构的重点包括：

- 将桌面端核心逻辑迁移到 Rust
- 通过 Tauri IPC 替代独立后端通信层
- 引入运行时抽象，统一 local / wsl2 / docker 的执行模型
- 重整生命周期与组件状态投影逻辑
- 简化打包链路，去掉 Python 后端分发负担

## 第三方集成说明

本项目会对 MaiBot、NapCat 及相关组件进行下载、配置和启动管理。相关第三方软件遵循各自的许可证与分发规则。

### NapCat

- 项目地址：https://github.com/NapNeko/NapCatQQ
- 协议：Limited Redistribution License
- 启动器仅下载和启动官方发布内容，不修改或再分发其源代码

### MaiBot

- 项目地址：https://github.com/MaiM-with-u/MaiBot
- 使用时请遵循 MaiBot 自身许可证要求

## 许可证

MAI Launcher 启动器本身的代码采用 GNU Affero General Public License v3.0。

这表示项目本体遵循 AGPL 的分发和修改条款；如果你分发修改版，或以网络服务形式向他人提供修改后的程序，通常也需要按 AGPL 提供对应源代码。

完整条款见 LICENSE。第三方组件仍分别遵循各自的许可证。

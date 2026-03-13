# MAI Launcher 打包指南

## 概述

MAI Launcher 是一个 Tauri 桌面应用，包含 Rust 后端和 React 前端。本指南说明如何将整个应用打包成独立的可执行文件。

### 支持平台

| 平台 | 架构 | 安装包格式 |
|------|------|------------|
| 🍎 macOS | Intel + Apple Silicon (Universal) | `.dmg` |
| 🪟 Windows | x64 | `.exe` (NSIS) / `.msi` |
| 🐧 Linux | x64 | `.deb` / `.AppImage` |

### 自动化构建

项目使用 **GitHub Actions** 自动构建和发布。当触发工作流时，会同时在 macOS 和 Windows 上并行构建，并自动创建 GitHub Release。

查看 `.github/workflows/build-and-release.yml` 了解详细配置。

## 架构

```
MAI Launcher (Tauri App)
├── 前端 (React + Vite)
└── 后端 (Rust / Tauri IPC)
```

启动流程：
1. 用户启动 Tauri 应用
2. Rust 后端在进程内初始化（数据库、服务等）
3. 前端通过 Tauri IPC (`invoke`) 调用 Rust 命令
4. 用户关闭应用时，进程自动退出

## 环境要求

### 基础要求
- **Node.js**: 18+
- **pnpm**: 8+
- **Rust**: 1.77+ (Tauri 2.x)

### 安装依赖

```bash
# 1. 安装根目录 Tauri CLI 依赖
pnpm install

# 2. 安装前端依赖
pnpm --dir frontend install
```

## 开发模式

```bash
pnpm tauri:dev
```

这将自动启动 Vite 开发服务器和 Tauri 窗口。

## 生产打包

### 一键打包（推荐）

```bash
./build.sh
```

此脚本将自动完成：
1. 使用 Vite 构建前端
2. 使用 Tauri 将前后端打包成应用程序

### 手动打包

```bash
pnpm install
pnpm --dir frontend install
pnpm --dir frontend build
pnpm tauri:build
```

### 生成的文件

打包完成后，应用程序位于：

**本地构建：**
- **macOS**: `src-tauri/target/release/bundle/dmg/MAI Launcher_*.dmg`
- **Windows NSIS**: `src-tauri/target/release/bundle/nsis/MAI Launcher_*-setup.exe`
- **Windows MSI**: `src-tauri/target/release/bundle/msi/MAI Launcher_*.msi`
- **Linux DEB**: `src-tauri/target/release/bundle/deb/mai-launcher_*.deb`
- **Linux AppImage**: `src-tauri/target/release/bundle/appimage/mai-launcher_*.AppImage`

**GitHub Actions 构建：**
- **macOS Universal**: `MAI-Launcher-{version}-dev-macos-universal.dmg`
- **Windows x64**: `MAI-Launcher-{version}-dev-windows-x64-setup.exe`
- **Windows x64 MSI**: `MAI-Launcher-{version}-dev-windows-x64.msi`

## 配置说明

### Tauri 配置

**文件**: `src-tauri/tauri.conf.json`

关键配置：
- `beforeBuildCommand`: 在 Tauri 构建前编译前端
- `resources`: 额外的资源文件
- `security.csp`: 内容安全策略

### Rust 后端

**文件**: `src-tauri/src/lib.rs`

启动逻辑：
- 初始化 SQLite 数据库（WAL 模式）
- 运行建表迁移
- 注册 Tauri IPC 命令

## 目录结构

```
mailauncher/
├── frontend/                     # React 前端
│   ├── src/                      # 前端源代码
│   ├── package.json
│   └── vite.config.ts
├── src-tauri/                    # Tauri 配置和 Rust 后端代码
│   ├── src/
│   │   ├── lib.rs                # Rust 入口
│   │   ├── commands/             # Tauri IPC 命令
│   │   ├── services/             # 业务逻辑服务
│   │   ├── models/               # 数据模型
│   │   ├── db/                   # 数据库连接与迁移
│   │   ├── errors/               # 错误处理
│   │   └── utils/                # 工具函数
│   ├── tauri.conf.json           # Tauri 配置
│   └── Cargo.toml                # Rust 依赖
├── docs/                         # 项目文档
├── build.sh                      # 一键打包脚本
└── README.md
```

## 常见问题

### 1. Rust 编译失败

**检查步骤**:
```bash
cd src-tauri
cargo check
```
确认 Rust 工具链版本 >= 1.77。

### 2. macOS 打包应用无法运行

**问题**: macOS 阻止未签名应用

**解决方案**:
```bash
xattr -cr "/Applications/MAI Launcher.app"
```

## 性能优化

### 前端构建优化

已在 `vite.config.ts` 中配置:
- 代码分割
- 手动分块
- Rollup 优化

## 发布流程

### 1. 版本更新

更新以下文件中的版本号:
- `src-tauri/tauri.conf.json`: `"version": "x.y.z"`
- `frontend/package.json`: `"version": "x.y.z"`

### 2. 自动构建发布（推荐）

使用 GitHub Actions 自动构建所有平台：

1. 进入 GitHub 仓库的 **Actions** 页面
2. 选择 **Build and Release (Dev)** 工作流
3. 点击 **Run workflow** 按钮
4. 选择分支并触发构建

### 3. 本地构建

```bash
# macOS / Linux
./build.sh

# Windows (PowerShell)
pnpm install
pnpm --dir frontend install
pnpm tauri:build
```

### 4. 测试

- 安装打包的应用
- 测试核心功能（实例管理、下载、配置、计划任务等）
- 验证 Tauri IPC 通信

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **桌面框架**: Tauri 2
- **UI**: Tailwind CSS + shadcn/ui
- **状态管理**: TanStack Query + Zustand
- **日志**: consola

### 后端 (Rust)
- **框架**: Tauri 2 IPC
- **数据库**: SQLite (sqlx + WAL)
- **HTTP**: reqwest
- **进程管理**: portable-pty + sysinfo
- **序列化**: serde + serde_json

## 维护

### 更新依赖

```bash
# 前端依赖
pnpm --dir frontend update

# Rust 依赖
cd src-tauri
cargo update
```

### 数据目录

- **macOS**: `~/Library/Application Support/com.mailauncher.app/mailauncher-data/`
- **Windows**: `%APPDATA%\com.mailauncher.app\mailauncher-data\`
- **Linux**: `~/.local/share/com.mailauncher.app/mailauncher-data/`

## 许可证

查看 LICENSE 文件。

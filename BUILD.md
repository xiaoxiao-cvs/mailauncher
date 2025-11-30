# MAI Launcher 打包指南

## 概述

MAI Launcher 是一个 Tauri 桌面应用，包含 FastAPI 后端和 React 前端。本指南说明如何将整个应用打包成独立的可执行文件。

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
└── 后端 (FastAPI + Python)
    └── 打包为独立可执行文件 (PyInstaller)
```

启动流程：
1. 用户启动 Tauri 应用
2. Tauri 自动启动后端进程 (Python 可执行文件)
3. 前端连接到 `http://localhost:11111`
4. 用户关闭应用时，后端进程自动终止

## 环境要求

### 基础要求
- **Python**: 3.11+
- **Node.js**: 18+
- **pnpm**: 8+
- **Rust**: 1.70+ (用于 Tauri)

### 安装依赖

```bash
# 1. 创建并激活 Python 虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# 或
.venv\Scripts\activate     # Windows

# 2. 安装 Python 依赖
pip install -r backend/requirements.txt

# 3. 安装前端依赖
cd frontend
pnpm install
cd ..
```

## 开发模式

### 方式一：使用脚本（推荐）

```bash
./dev.sh
```

这将自动启动：
- 后端服务器: `http://localhost:11111`
- 前端开发服务器: `http://localhost:3000`

按 `Ctrl+C` 停止所有服务器。

### 方式二：手动启动

```bash
# 终端 1: 启动后端
cd backend
python main.py

# 终端 2: 启动前端
cd frontend
pnpm dev
```

### 方式三：使用 Tauri 开发模式

```bash
cd frontend
pnpm tauri dev
```

⚠️ 注意：使用此方式前需要手动启动后端服务器。

## 生产打包

### 一键打包（推荐）

```bash
./build.sh
```

此脚本将自动完成：
1. 使用 PyInstaller 打包后端为可执行文件
2. 使用 Vite 构建前端
3. 使用 Tauri 将前后端打包成应用程序

### 手动打包

```bash
# 1. 打包后端
cd backend
pyinstaller mai-backend.spec --clean --distpath ../frontend/src-tauri/backend-dist

# 2. 构建并打包前端
cd ../frontend
pnpm install
pnpm build
pnpm tauri build
```

### 生成的文件

打包完成后，应用程序位于：

**本地构建：**
- **macOS**: `frontend/src-tauri/target/release/bundle/dmg/MAI Launcher_*.dmg`
- **Windows NSIS**: `frontend/src-tauri/target/release/bundle/nsis/MAI Launcher_*-setup.exe`
- **Windows MSI**: `frontend/src-tauri/target/release/bundle/msi/MAI Launcher_*.msi`
- **Linux DEB**: `frontend/src-tauri/target/release/bundle/deb/mai-launcher_*.deb`
- **Linux AppImage**: `frontend/src-tauri/target/release/bundle/appimage/mai-launcher_*.AppImage`

**GitHub Actions 构建：**
- **macOS Universal**: `MAI-Launcher-{version}-dev-macos-universal.dmg`
- **Windows x64**: `MAI-Launcher-{version}-dev-windows-x64-setup.exe`
- **Windows x64 MSI**: `MAI-Launcher-{version}-dev-windows-x64.msi`

## 配置说明

### 后端配置

**文件**: `backend/mai-backend.spec`

关键配置：
- `datas`: 包含的数据文件（app 目录）
- `hiddenimports`: 需要显式包含的模块（uvicorn, fastapi 等）
- `console`: 设置为 `True` 以显示控制台窗口（用于查看日志）

### Tauri 配置

**文件**: `frontend/src-tauri/tauri.conf.json`

关键配置：
- `beforeBuildCommand`: 在 Tauri 构建前打包后端
- `resources`: 包含后端可执行文件到应用资源中
- `security.csp`: 允许连接到 `http://localhost:11111`

### Rust 启动逻辑

**文件**: `frontend/src-tauri/src/lib.rs`

启动逻辑：
- **开发模式**: 使用 `python3 main.py` 直接运行后端
- **生产模式**: 运行打包的后端可执行文件
- **进程管理**: 应用关闭时自动终止后端进程

## 目录结构

```
mailauncher/
├── backend/                      # Python 后端
│   ├── main.py                   # 后端入口
│   ├── mai-backend.spec          # PyInstaller 配置
│   ├── requirements.txt          # Python 依赖
│   ├── app/                      # 应用代码
│   └── data/                     # 数据目录
│       ├── database/             # SQLite 数据库
│       └── Log/                  # 日志文件
│           ├── backend/          # 后端日志
│           └── frontend/         # 前端日志
├── frontend/                     # React 前端
│   ├── src/                      # 源代码
│   ├── src-tauri/                # Tauri 配置和 Rust 代码
│   │   ├── src/lib.rs            # Rust 入口（包含后端启动逻辑）
│   │   ├── tauri.conf.json       # Tauri 配置
│   │   └── backend-dist/         # 打包的后端（构建时生成）
│   ├── package.json
│   └── vite.config.ts
├── build.sh                      # 一键打包脚本
├── dev.sh                        # 开发模式启动脚本
└── README.md
```

## 常见问题

### 1. PyInstaller 打包失败

**问题**: `ModuleNotFoundError` 或缺少依赖

**解决方案**: 在 `mai-backend.spec` 的 `hiddenimports` 中添加缺失的模块：

```python
hiddenimports=[
    'your_missing_module',
    # ... 其他模块
],
```

### 2. 后端进程未启动

**开发模式检查**:
```bash
# 确认 Python 可执行
which python3

# 手动测试后端
cd backend
python3 main.py
```

**生产模式检查**:
- 确认后端可执行文件存在: `frontend/src-tauri/backend-dist/mai-backend/mai-backend`
- 检查文件权限: `ls -la frontend/src-tauri/backend-dist/mai-backend/mai-backend`

### 3. 前端无法连接到后端

**检查步骤**:
1. 确认后端正在运行: `curl http://localhost:11111/api/v1/health`
2. 检查 CSP 配置: `tauri.conf.json` 中包含 `http://localhost:11111`
3. 检查前端配置: `frontend/src/config/api.ts` 中的 `API_URL`

### 4. 日志未保存

**检查步骤**:
1. 确认日志目录存在:
   ```bash
   ls -la backend/data/Log/backend/
   ls -la backend/data/Log/frontend/
   ```
2. 检查文件权限
3. 查看后端日志获取错误信息

### 5. macOS 打包应用无法运行

**问题**: macOS 阻止未签名应用

**解决方案**:
```bash
# 移除隔离属性
xattr -cr "/Applications/MAI Launcher.app"

# 或在系统偏好设置中允许
# 系统偏好设置 -> 安全性与隐私 -> 通用 -> 仍要打开
```

## 性能优化

### 后端打包优化

1. **排除不必要的依赖**:
   在 `mai-backend.spec` 的 `excludes` 中添加不需要的模块

2. **启用 UPX 压缩**:
   ```python
   upx=True,  # 已默认启用
   ```

3. **单文件模式**:
   修改 `mai-backend.spec`:
   ```python
   exe = EXE(
       pyz,
       a.scripts,
       a.binaries,  # 添加这行
       a.zipfiles,  # 添加这行
       a.datas,     # 添加这行
       # ...
       onefile=True,  # 添加这行
   )
   ```

### 前端构建优化

已在 `vite.config.ts` 中配置:
- 代码分割
- 手动分块
- Rollup 优化

## 发布流程

### 1. 版本更新

更新以下文件中的版本号:
- `frontend/src-tauri/tauri.conf.json`: `"version": "x.y.z"`
- `frontend/package.json`: `"version": "x.y.z"`
- `backend/app/core/config.py`: `VERSION = "x.y.z"`

### 2. 自动构建发布（推荐）

使用 GitHub Actions 自动构建所有平台：

1. 进入 GitHub 仓库的 **Actions** 页面
2. 选择 **Build and Release (Dev)** 工作流
3. 点击 **Run workflow** 按钮
4. 选择分支并触发构建

构建完成后，会自动：
- 同时在 macOS 和 Windows 上并行构建
- 创建包含所有平台安装包的 GitHub Release
- 生成 `latest.json` 更新清单文件
- 保留最近 3 个开发版本，自动清理旧版本

### 3. 本地构建

如需本地构建：

```bash
# macOS / Linux
./build.sh

# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
cd frontend
pnpm install
pnpm tauri build
```

### 4. 测试

- 安装打包的应用
- 测试核心功能
- 检查日志系统
- 验证前后端通信

### 5. 发布说明

GitHub Release 会自动包含：
- 📦 macOS Universal DMG (支持 Intel 和 Apple Silicon)
- 📦 Windows x64 NSIS 安装程序
- 📦 Windows x64 MSI 安装程序
- 📄 `latest.json` 自动更新清单

> ⚠️ **注意**：开发版本 (Dev) 会标记为预发布版本 (pre-release)，不会触发用户的自动更新。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 4
- **桌面框架**: Tauri 2
- **UI**: Tailwind CSS
- **日志**: consola

### 后端
- **框架**: FastAPI 0.109
- **服务器**: Uvicorn 0.27
- **数据库**: SQLite (SQLAlchemy 2.0)
- **日志**: loguru 0.7
- **打包**: PyInstaller 6.16

## 维护

### 更新依赖

```bash
# Python 依赖
pip list --outdated
pip install --upgrade <package>
pip freeze > backend/requirements.txt

# 前端依赖
pnpm update
pnpm update --latest  # 更新到最新版本
```

### 日志位置

- **开发模式**: `backend/data/Log/`
- **生产模式**: 应用数据目录中的 `data/Log/`
  - macOS: `~/Library/Application Support/com.mailauncher.app/data/Log/`
  - Windows: `%APPDATA%\com.mailauncher.app\data\Log\`
  - Linux: `~/.local/share/com.mailauncher.app/data/Log/`

## 许可证

查看 LICENSE 文件。

## 支持

如有问题，请提交 Issue 或联系维护团队。

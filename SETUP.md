# MaiLauncher 环境设置指南

## 🛠️ 环境要求

### 必需软件

1. **Node.js 18+** - JavaScript 运行时
2. **pnpm** - 包管理器
3. **Python 3.10+** - 后端运行时
4. **Rust** - Tauri 构建工具
5. **Git** - 版本控制

### 安装步骤

#### 1. 安装 Rust

```powershell
# 下载并运行 Rust 安装程序
Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe
```

安装完成后重启 PowerShell，然后验证：

```powershell
rustc --version
cargo --version
```

#### 2. 验证其他环境

```powershell
# 检查 Node.js
node --version

# 检查 pnpm
pnpm --version

# 检查 Python
python --version
```

## 🔧 项目配置

### 后端配置

1. 后端已配置在固定端口 **23456**
2. 后端可执行文件位置: `src-tauri/resources/MaiLauncher-Backend.exe`
3. 后端启动配置在 `src-tauri/src/lib.rs`

### 前端配置

1. 开发服务器端口: **3000**
2. API 连接固定到: `http://127.0.0.1:23456`
3. WebSocket 连接: `ws://127.0.0.1:23456/ws`

## 🚀 运行步骤

### 开发模式

```powershell
# 1. 启动后端服务器 (用于测试)
cd "d:\桌面\mailauncher-backend"
python main.py

# 2. 在新终端启动前端开发服务器
cd "d:\桌面\mailauncher"
pnpm dev

# 3. 在另一个新终端启动 Tauri 开发模式
cd "d:\桌面\mailauncher"
pnpm tauri dev
```

### 生产打包

```powershell
cd "d:\桌面\mailauncher"
.\build.ps1
```

## 📁 关键文件

### 配置文件

- `src-tauri/tauri.conf.json` - Tauri 主配置
- `src-tauri/capabilities/default.json` - 权限配置
- `src/config/backendConfig.js` - 前端后端连接配置
- `.env.development` / `.env.production` - 环境变量

### 关键代码

- `src/utils/api.js` - 新的 API 连接工具
- `src-tauri/src/lib.rs` - Rust 后端启动逻辑
- `src/components/common/ConnectionTest.vue` - 连接测试组件

## 🔍 测试连接

### HTTP API 测试

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:23456/api/test" -Method GET
```

### 前端连接测试

访问 `http://localhost:3000` 并查看主页的"连接测试"部分

## 📦 打包产物

成功打包后，您将在以下位置找到文件：

- 可执行文件: `src-tauri/target/release/mailauncher.exe`
- 安装程序: `src-tauri/target/release/bundle/nsis/MaiLauncher_0.1.0_x64-setup.exe`

## ❗ 常见问题

1. **Rust 未安装** - 按照上述步骤安装 Rust
2. **端口冲突** - 确保 23456 端口未被占用
3. **权限问题** - 以管理员权限运行 PowerShell
4. **防火墙阻止** - 允许应用程序通过防火墙

## 🎯 下一步

安装 Rust 后，运行：

```powershell
cd "d:\桌面\mailauncher"
pnpm tauri dev
```

这将启动完整的桌面应用程序，包括自动启动后端服务器。

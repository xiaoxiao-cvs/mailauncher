# MAI Launcher

<div align="center">

**麦麦启动器** - 为 MaiBot、NapCat 和适配器提供可视化管理的新手友好工具

一站式 QQ 机器人部署与管理解决方案

[下载安装](#-下载安装) • [特色功能](#-特色功能) • [技术栈](#技术栈) • [文档](#文档)

</div>

---

##  下载安装

### 系统要求

| 平台 | 最低版本 | 架构 |
|------|----------|------|
|  macOS | 10.13+ | Intel / Apple Silicon |
|  Windows | 10/11 | x64 |

### 下载地址

前往 [GitHub Releases](https://github.com/xiaoxiao-cvs/mailauncher/releases) 下载最新版本：

| 平台 | 安装包 | 说明 |
|------|--------|------|
| macOS | `MAI-Launcher-*-macos-universal.dmg` | 同时支持 Intel 和 Apple Silicon |
| Windows | `MAI-Launcher-*-windows-x64-setup.exe` | NSIS 安装程序（推荐） |
| Windows | `MAI-Launcher-*-windows-x64.msi` | MSI 安装程序 |

### 安装步骤

#### macOS
1. 下载 `.dmg` 文件
2. 打开 DMG，将 MAI Launcher 拖入"应用程序"文件夹
3. 首次启动时，右键点击应用 → 选择"打开"以绕过 Gatekeeper
4. 如提示"应用已损坏"，运行 `./fix-app-macos.sh` 修复

#### Windows
1. 下载 `.exe` 安装程序
2. 运行安装程序，按提示完成安装
3. 从开始菜单或桌面快捷方式启动

---

##  特色功能

###  一键部署
- **智能实例管理**：创建、启动、停止多个独立的 Bot 实例
- **自动化下载安装**：从 GitHub 自动拉取 MaiBot、NapCat、适配器等组件
- **跨平台安装**：
  -  macOS：使用系统已安装的 QQ
  -  Windows：使用系统已安装的 QQ，支持 winpty PTY 模式
- **版本选择**：支持选择不同版本的 MaiBot（Main/Dev 分支）

###  可视化配置管理
- **TOML 配置编辑器**：
  - 树形可视化编辑 `bot_config.toml` 和 `model_config.toml`
  - 支持注释保留，编辑不丢失配置说明
  - 实时语法验证，智能错误提示
  - 文本模式/树形模式双向切换
- **JSON 配置支持**：编辑 OneBot11 适配器配置
- **多实例配置隔离**：每个实例独立配置，互不干扰

###  实时进程管理
- **PTY 终端支持**：
  - Windows 通过 winpty 支持伪终端
  - Unix/Linux 原生 pty 支持
  - 实时捕获进程输出，支持 ANSI 颜色
- **WebSocket 实时通信**：
  - 实时查看安装/部署进度
  - 动态推送日志和错误信息
  - 多客户端同步连接
- **进程生命周期管理**：
  - 启动/停止/重启实例
  - 进程状态监控
  - 自动清理僵尸进程

###  高级功能
- **部署任务跟踪**：记录每次部署的详细日志和状态
- **下载进度管理**：断点续传、进度实时显示
- **API Provider 管理**：统一管理 OpenAI、Anthropic 等 AI 接口配置
- **环境信息检测**：自动检测系统环境、Python 版本、依赖包状态
- **数据库管理**：SQLite 存储实例配置、部署记录、运行日志

###  现代化界面
- 基于 Origin UI 的精美设计
- 深色/浅色主题支持
- 响应式布局，适配各种屏幕尺寸
- 流畅的动画和交互体验

## 项目结构

```
mailauncher/
├── frontend/              # React + TypeScript + Vite 前端
│   ├── src/
│   │   ├── components/   # UI 组件（侧边栏、配置编辑器等）
│   │   ├── pages/        # 页面（实例管理、下载、设置等）
│   │   ├── services/     # Tauri IPC 服务层
│   │   ├── stores/       # Zustand 状态管理
│   │   └── types/        # TypeScript 类型定义
│   ├── package.json
│   └── vite.config.ts
├── src-tauri/             # Tauri 桌面应用配置与 Rust 后端
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                # 项目文档
│   ├── ARCHITECTURE.md  # 架构设计文档
│   └── DESIGN_SYSTEM.md # UI 设计系统
├── build.sh             # 一键打包脚本
└── README.md
```


#### macOS 用户注意事项

如果构建后提示"App 已损坏"，运行修复脚本：

```bash
./fix-app-macos.sh
```

或手动执行：

```bash
# 移除隔离属性
xattr -cr "/Applications/MAI Launcher.app"

# 应用 ad-hoc 签名
codesign --force --deep --sign - "/Applications/MAI Launcher.app"
```

## 技术栈

### 桌面应用
- **Tauri 2.x**: 轻量级桌面应用框架
- **Rust**: Tauri 底层实现

### 前端
- **React 18**: 现代化 UI 框架
- **TypeScript**: 类型安全
- **Vite 6**: 极速构建工具
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Origin UI**: 精美的组件库
- **React Router v6**: 路由管理
- **Zustand**: 轻量级状态管理
- **Iconify**: 海量图标库

### 原生后端
- **Rust + Tauri IPC**: 进程内命令调用与事件通信
- **sqlx + SQLite**: 本地数据库与迁移
- **reqwest**: HTTP 请求与下载
- **portable-pty + sysinfo**: 进程管理与资源监控
- **serde / toml / toml_edit**: 配置与序列化

### 进程管理
- **Tokio**: Rust 异步运行时
- **portable-pty**: 跨平台 PTY 支持
- **sysinfo**: 进程资源采样

### 实时通信
- **Tauri Commands**: 类型安全 IPC 调用
- **Tauri Events / Channels**: 状态与流式消息推送

## 📚 文档

- [架构设计文档](./docs/ARCHITECTURE.md) - 项目架构和开发规范
- [构建打包指南](./BUILD.md) - 详细的打包流程
- [配置编辑器说明](./frontend/CONFIG_EDITOR_README.md) - 配置编辑器使用指南

## 🛠️ 开发规范

请查看 [架构文档](./docs/ARCHITECTURE.md) 了解详细的开发规范和项目架构。

### 代码风格
- Rust 使用 cargo fmt / clippy
- TypeScript 使用 ESLint + Prettier
- 使用有意义的变量和函数命名
- 添加必要的注释和文档字符串

### Git 提交规范
```
feat(scope): 新功能
fix(scope): 修复 bug
docs(scope): 文档更新
refactor(scope): 重构
perf(scope): 性能优化
test(scope): 测试相关
chore(scope): 构建/工具链相关
```

## 📋 功能路线图

- [x] 实例管理（创建、启动、停止、删除）
- [x] MaiBot 自动下载与安装
- [x] NapCat 跨平台安装（Linux/macOS/Windows）
- [x] 适配器下载管理
- [x] TOML 配置文件可视化编辑
- [x] WebSocket 实时日志推送
- [x] PTY 终端支持
- [x] 部署任务跟踪
- [x] API Provider 管理
- [ ] 数据库管理界面（表情包、消息记录）
- [ ] 插件市场
- [ ] 自动更新检测
- [ ] 多语言支持（i18n）
- [ ] 备份与恢复功能
- [ ] 性能监控仪表盘

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 报告 Bug
请提供以下信息：
- 操作系统版本
- Python 版本
- 详细的复现步骤
- 错误日志（位于 `backend/data/Log/`）

## ⚠️ 第三方集成说明

本项目集成了以下第三方软件，它们各自遵循独立的开源协议：

### NapCat
- **协议**: Limited Redistribution License
- **版权**: Copyright © 2024 Mlikiowa
- **项目地址**: https://github.com/NapNeko/NapCatQQ
- **使用方式**: 本启动器仅下载和启动官方发布的 NapCat 包，不包含、修改或再分发 NapCat 源代码
- **重要说明**: 
  - ❌ NapCat 禁止商业使用
  - ❌ 未经授权不得基于 NapCat 代码进行二次开发
  - ⚠️ 使用者需自行遵守 NapCat 的许可证条款
  - 📄 完整协议：https://github.com/NapNeko/NapCatQQ/blob/main/LICENSE

### MaiBot
- **项目地址**: https://github.com/MaiM-with-u/MaiBot
- 请遵循 MaiBot 的相应开源协议

### Linux QQ
- 仅在 Linux 系统下自动下载腾讯官方发布的 QQ for Linux 安装包
- 版本：3.2.12_240808
- 下载地址：https://dldir1.qq.com/qqfile/qq/QQNT/Linux/

## 📄 License

本项目（MAI Launcher 启动器本身的代码）采用 **GNU General Public License v3.0**

- ✅ 允许自由使用、修改、分发
- ✅ 允许商业使用（需开源）
- ✅ 修改后的代码必须以相同协议开源
- ⚠️ 不提供任何担保

详见 [LICENSE](./LICENSE) 文件。

## 💬 联系方式

- Issues: [GitHub Issues](https://github.com/xiaoxiao-cvs/mailauncher/issues)
- 讨论: [GitHub Discussions](https://github.com/xiaoxiao-cvs/mailauncher/discussions)

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star ⭐！

---

<div align="center">

Made with ❤️ by MAI Launcher Team

</div>
- ⚠️ 修改后的版本必须同样开源
- ⚠️ 需保留原作者版权信息

**重要提示**:
1. 本启动器的 GPL-3.0 协议仅适用于启动器本身的代码
2. 通过本启动器下载/管理的第三方软件（如 NapCat）各自遵循其独立协议
3. 使用者需自行确保遵守所有相关软件的许可证条款
4. 若计划商业使用本启动器，请注意 NapCat 禁止商业使用的限制

详见 [LICENSE](./LICENSE) 文件

# RFC-001: Rust 底层下沉与 Docker 部署管理

- **状态**: 草案 (Draft)
- **作者**: MAI Launcher Team
- **创建日期**: 2026-02-27
- **最后更新**: 2026-02-27
- **目标版本**: v0.2.0

---

## 1. 摘要

本 RFC 提出对 MAI Launcher 进行两项重大架构演进：

1. **Rust 底层下沉** — 将现有的 Python (FastAPI) 后端逐步迁移到 Tauri 的 Rust 层，消除 PyInstaller 打包依赖，大幅减小应用体积并提升性能与稳定性。
2. **Docker 部署管理** — 新增 Docker 容器化部署模式，为用户提供除"克隆仓库 + 本地运行"之外的标准化部署方式，同时解决 NapCat 在宿主机运行的风控问题。

两项工作同步推进，在 Rust 层通过 Tauri Commands 直接对接 Docker API，形成统一的原生后端架构。

---

## 2. 动机

### 2.1 当前架构痛点

**三层通信开销过大**

当前架构为 Tauri (Rust) → HTTP/WebSocket → Python (FastAPI) → Subprocess。Rust 层几乎只承担启动 Python 后端进程的职责，所有业务请求都需要经过 HTTP 网络栈中转，引入不必要的序列化/反序列化开销和端口占用。

**打包体积臃肿**

Python 后端通过 PyInstaller 打包后嵌入 Tauri Resources，包含了完整的 Python 运行时和所有依赖库。仅后端二进制就占数十 MB，导致最终安装包体积远超预期，不符合 Tauri 框架"轻量桌面应用"的定位。

**部署方式单一**

目前仅支持"克隆 Git 仓库 → 安装 Python 依赖 → 本地启动"的部署方式。这要求用户预装 Git、Python、pip 等工具链，对新手极不友好。缺乏容器化部署方案意味着无法利用 Docker 的环境隔离优势。

**NapCat 风控问题**

NapCat 在宿主机直接运行时面临较高的风控风险。社区实践表明，在 Docker 容器或 WSL2 环境中运行 NapCat 可显著降低风控触发概率。当前启动器缺乏对这些运行环境的管理能力。

### 2.2 预期收益

| 维度 | 当前 | 目标 |
|------|------|------|
| 安装包体积 | ~100MB+ (含 PyInstaller 产物) | ~15-20MB (纯 Rust 后端) |
| 前后端通信 | HTTP/WebSocket (需端口) | Tauri IPC (进程内通信) |
| 外部依赖 | Git, Python, pip | 仅 Docker (容器模式) 或 Git (本地模式) |
| NapCat 稳定性 | 宿主机直接运行 | 容器隔离运行，风控更低 |
| 进程管理可靠性 | Python subprocess | Rust 原生进程控制 |
| 跨平台一致性 | 分平台大量 if/else | Rust 编译期平台分离 + Docker 统一 |

---

## 3. 设计概览

### 3.1 目标架构

```
┌──────────────────────────────────────────────────────────┐
│                     MAI Launcher                         │
├──────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  UI Layer: Origin UI + Tailwind CSS                │  │
│  │  State: Zustand                                    │  │
│  │  Communication: @tauri-apps/api (invoke + listen)  │  │
│  └──────────────────┬─────────────────────────────────┘  │
│                     │ Tauri IPC                           │
│  ┌──────────────────▼─────────────────────────────────┐  │
│  │  Rust Backend (Tauri Commands + Events)             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │  │
│  │  │ 进程管理  │ │ Git 操作  │ │ 文件/下载管理     │   │  │
│  │  │(portable │ │ (git2)   │ │ (tokio + reqwest) │   │  │
│  │  │  -pty)   │ │          │ │                   │   │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │  │
│  │  │ Docker   │ │ 数据库    │ │ 配置管理          │   │  │
│  │  │ 管理     │ │ (sqlx)   │ │ (toml/serde)      │   │  │
│  │  │(bollard) │ │          │ │                   │   │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │ WSL2 管理 (Windows only, wslapi)             │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 部署模式

迁移完成后，启动器将支持三种部署模式，用户在创建实例时选择：

**模式一：本地部署（Local）**

保留现有的"克隆仓库 + 本地运行"方式，但由 Rust 层直接执行 Git 操作和进程管理，不再经过 Python 中间层。适合开发者和需要深度定制的用户。

**模式二：Docker 部署（Docker）**

通过 Docker Engine API 管理容器化的 MaiBot、NapCat 及适配器。启动器自动生成 Docker Compose 配置、拉取镜像、管理容器生命周期。适合大多数用户，也是推荐的默认模式。

**模式三：WSL2 + Docker 部署（WSL2）**

面向 Windows 用户，当宿主机未安装 Docker Desktop 但已启用 WSL2 时，引导用户在 WSL2 内使用 Docker。本质上是 Docker 模式的 Windows 平台增强，不作为独立的裸跑模式。

---

## 4. Rust 下沉方案

### 4.1 分阶段迁移计划

迁移分三个阶段进行，每个阶段交付可运行的完整版本，确保不会出现中间状态的"半成品"。

#### Phase 1：通信层迁移（消除 Python 后端）

**目标**：将前端与后端的通信从 HTTP/WebSocket 切换为 Tauri IPC，完全移除 Python 后端及 PyInstaller 打包。

**核心变更**：

- 将现有 FastAPI 路由逐一对应为 Tauri Commands
- 将 WebSocket 实时推送替换为 Tauri Events（`app_handle.emit()`）
- 前端的 `fetch()` / `WebSocket` 调用替换为 `invoke()` / `listen()`
- 移除 `mai-backend.spec`、`requirements.txt` 等 Python 后端构建配置
- 移除 `tauri.conf.json` 中的 `backend-dist` 资源打包

**需迁移的 API 端点清单**：

以下为现有 Python 后端提供的核心 API，需逐一迁移为 Tauri Commands：

| Python 服务模块 | 功能描述 | 对应 Rust 模块 |
|------------------|----------|----------------|
| instance_service | 实例 CRUD、状态查询 | `commands::instance` |
| deployment_service | 部署任务创建与追踪 | `commands::deployment` |
| download_service | Git 仓库克隆 | `commands::download` |
| download_manager | 文件下载与进度管理 | `commands::download` |
| install_service | 依赖安装 (pip install) | `commands::install` |
| process_manager | 进程启动/停止/监控 | `commands::process` |
| napcat_installer | NapCat 下载与安装 | `commands::napcat` |
| config_service | 实例配置读写 | `commands::config` |
| maibot_config_service | TOML 配置编辑 | `commands::config` |
| api_provider_service | AI API 配置管理 | `commands::api_provider` |

**数据库迁移**：

- 从 Python SQLAlchemy (async) 迁移到 Rust sqlx
- 保持 SQLite 作为存储引擎不变
- 数据库 schema 保持兼容，支持从旧版本无缝升级

**前端改造点**：

- `frontend/src/config/api.ts` 中的 BASE_URL 和所有 fetch 请求替换为 invoke 调用
- `frontend/src/services/` 目录下的 API 服务层重写
- `frontend/src/components/GlobalWebSocketManager.tsx` 替换为 Tauri Event 监听
- 所有 WebSocket 连接逻辑迁移为 `listen()` / `unlisten()`

#### Phase 2：核心服务原生化

**目标**：用 Rust 原生库替换 subprocess 调用外部工具的方式，消除对 Git CLI、Python 等外部程序的硬依赖。

**Git 操作原生化**

- 使用 `git2` crate（libgit2 绑定）实现仓库克隆、分支切换、拉取更新
- 不再依赖用户系统安装的 Git
- 支持克隆进度回调，通过 Tauri Events 推送给前端
- 支持 shallow clone 以加速首次下载

**进程管理增强**

- 使用 `portable-pty` crate 替代 Python 的 winpty 绑定和 Unix pty
- 统一的跨平台 PTY 抽象，终端输出通过 Tauri Events 实时推送
- Rust 级别的进程生命周期管理，信号处理更可靠
- 僵尸进程清理更彻底（利用 Rust 的 RAII 和 Drop trait）

**下载管理增强**

- 使用 `reqwest` + `tokio` 实现异步并发下载
- 原生支持断点续传（HTTP Range 请求）
- 下载进度通过 Tauri Events 推送
- 文件校验（SHA256）在 Rust 层完成，避免大文件在语言间传递

**Python 环境管理**

- 虽然核心操作下沉到 Rust，但 MaiBot 本身仍是 Python 项目
- Rust 层负责检测 Python 版本、创建 venv、调用 pip install
- 这些操作本质上仍是 subprocess 调用，但由 Rust 直接管理，更可靠

#### Phase 3：深度优化（可选）

**目标**：在架构完全稳定后进行的优化项，非必需。

- 数据库迁移到 sqlx 的编译期查询检查
- 引入 Rust 级别的配置热重载
- 进程输出的 ANSI 解析移至 Rust 层，减轻前端渲染压力
- 考虑是否引入 Tauri 插件系统以支持社区扩展

### 4.2 Rust 模块结构

迁移完成后，Tauri 后端的 Rust 代码组织如下：

```
frontend/src-tauri/src/
├── lib.rs                    # Tauri 应用入口与插件注册
├── commands/                 # Tauri Commands（对应原 API 路由）
│   ├── mod.rs
│   ├── instance.rs           # 实例管理命令
│   ├── deployment.rs         # 部署任务命令
│   ├── download.rs           # 下载/克隆命令
│   ├── install.rs            # 依赖安装命令
│   ├── process.rs            # 进程管理命令
│   ├── napcat.rs             # NapCat 安装命令
│   ├── config.rs             # 配置读写命令
│   ├── api_provider.rs       # API Provider 命令
│   ├── docker.rs             # Docker 管理命令
│   └── wsl.rs                # WSL2 管理命令 (Windows only)
├── services/                 # 业务逻辑层
│   ├── mod.rs
│   ├── instance_service.rs
│   ├── deployment_service.rs
│   ├── download_service.rs
│   ├── install_service.rs
│   ├── process_manager.rs
│   ├── napcat_installer.rs
│   ├── config_service.rs
│   ├── docker_service.rs
│   └── wsl_service.rs
├── models/                   # 数据模型
│   ├── mod.rs
│   ├── instance.rs
│   ├── deployment.rs
│   ├── download.rs
│   ├── config.rs
│   └── docker.rs
├── db/                       # 数据库层
│   ├── mod.rs
│   ├── migrations/
│   └── queries/
├── platform/                 # 平台特定代码
│   ├── mod.rs
│   ├── windows.rs
│   ├── macos.rs
│   └── linux.rs
└── utils/                    # 工具函数
    ├── mod.rs
    ├── paths.rs
    └── errors.rs
```

### 4.3 Rust Crate 依赖规划

| Crate | 用途 | 替代的 Python 组件 |
|-------|------|-------------------|
| `tauri` 2.x | 应用框架、IPC、事件系统 | FastAPI 路由 + WebSocket |
| `tokio` | 异步运行时 | asyncio |
| `sqlx` (sqlite) | 数据库访问 | SQLAlchemy async |
| `git2` | Git 操作 | subprocess git |
| `reqwest` | HTTP 请求/下载 | aiohttp |
| `bollard` | Docker Engine API | (新增功能) |
| `portable-pty` | 跨平台 PTY | winpty + Python pty |
| `serde` + `toml` | TOML 配置解析 | Python toml |
| `serde_json` | JSON 处理 | Python json |
| `zip` / `tar` | 压缩包解压 | Python zipfile/tarfile |
| `sha2` | 文件校验 | Python hashlib |
| `chrono` | 时间处理 | Python datetime |
| `uuid` | UUID 生成 | Python uuid |
| `thiserror` | 错误类型定义 | Python exceptions |
| `tracing` | 日志与追踪 | Python logging |

### 4.4 前端通信层迁移方案

**现有模式（HTTP + WebSocket）**：

前端通过 `fetch()` 调用 `http://localhost:PORT/api/v1/...`，通过 WebSocket 接收实时推送。所有 API 调用封装在 `frontend/src/services/` 和 `frontend/src/config/api.ts` 中。

**目标模式（Tauri IPC）**：

前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust Commands，通过 `listen()` 接收 Rust Events。

迁移策略：

1. 在 `frontend/src/services/` 中创建适配层，保持调用接口不变
2. 底层实现从 fetch 切换为 invoke，对上层组件透明
3. 事件监听从 WebSocket 切换为 Tauri Events
4. 逐模块替换，确保每个模块可独立验证

### 4.5 数据兼容性

- SQLite 数据库文件保持兼容，Rust 层读取现有的 schema
- 提供数据库 migration 机制，通过版本号管理 schema 变更
- 实例目录结构保持不变，迁移对用户数据透明
- 配置文件格式不变（TOML / JSON）

---

## 5. Docker 管理方案

### 5.1 功能范围

Docker 管理作为一个完整的部署模式引入，覆盖从环境检测到容器生命周期管理的全流程。

#### 5.1.1 环境检测与引导

**Docker 可用性检测**

启动器启动时及用户选择 Docker 模式时，检测 Docker 环境：

- 检测 Docker Engine 是否安装（通过 Docker socket 连接测试）
- 检测 Docker Compose 是否可用
- 获取 Docker 版本信息和运行状态
- 检测可用磁盘空间是否足够

**引导安装**

若检测到 Docker 未安装：

- Windows：引导安装 Docker Desktop 或通过 WSL2 内安装
- macOS：引导安装 Docker Desktop
- Linux：引导通过包管理器安装 Docker Engine

#### 5.1.2 镜像管理

**镜像拉取**

- 从 Docker Hub 或配置的镜像仓库拉取 MaiBot、NapCat 等官方镜像
- 支持指定版本标签
- 拉取进度通过 Tauri Events 实时推送到前端
- 支持配置镜像加速器（针对中国大陆网络环境）

**镜像信息**

- 列出本地已有的相关镜像
- 显示镜像版本、大小、创建时间
- 支持删除不再需要的旧镜像

#### 5.1.3 Compose 编排

**自动生成 Docker Compose 配置**

启动器根据用户的实例配置自动生成 `docker-compose.yml`，包含：

- MaiBot 主服务容器
- NapCat 容器
- NapCat 适配器容器
- MongoDB 容器（如 MaiBot 需要）
- 容器间网络配置
- Volume 挂载（配置文件、数据持久化）
- 端口映射
- 环境变量注入
- 重启策略

**配置映射**

用户在启动器中编辑的配置文件需要正确映射到容器内：

- `bot_config.toml` → 容器内对应路径
- `model_config.toml` → 容器内对应路径
- OneBot 适配器配置 → 容器内对应路径
- 用户通过启动器修改配置后，容器自动感知变更

#### 5.1.4 容器生命周期管理

**基本操作**

- 创建并启动容器组（docker compose up）
- 停止容器组（docker compose stop）
- 重启容器组（docker compose restart）
- 销毁容器组（docker compose down）
- 单个容器的启动/停止/重启

**状态监控**

- 实时容器运行状态（running / stopped / restarting / error）
- 容器资源占用（CPU / 内存 / 网络 I/O）
- 容器健康检查状态

**日志管理**

- 实时流式日志输出（docker logs -f），通过 Tauri Events 推送
- 按容器筛选日志
- 日志搜索与过滤
- 历史日志查看

#### 5.1.5 数据持久化

**Volume 策略**

- 配置文件：bind mount 到启动器管理的实例目录
- 数据库文件（MongoDB 等）：named volume，由 Docker 管理
- 日志文件：bind mount，便于启动器读取

**备份与恢复**

- 支持导出实例配置和数据
- 支持从备份恢复实例

### 5.2 Docker API 对接

通过 `bollard` crate 直接对接 Docker Engine API，不依赖 Docker CLI。

**连接方式**

- Linux / macOS：Unix socket (`/var/run/docker.sock`)
- Windows (Docker Desktop)：Named pipe (`//./pipe/docker_engine`)
- Windows (WSL2 内)：通过 WSL2 interop 访问 WSL 内的 Docker socket

**核心 API 调用映射**

| 启动器功能 | Docker Engine API |
|-----------|-------------------|
| 检测 Docker | `GET /version`, `GET /_ping` |
| 拉取镜像 | `POST /images/create` |
| 列出镜像 | `GET /images/json` |
| 创建容器 | `POST /containers/create` |
| 启动容器 | `POST /containers/{id}/start` |
| 停止容器 | `POST /containers/{id}/stop` |
| 删除容器 | `DELETE /containers/{id}` |
| 容器日志 | `GET /containers/{id}/logs` (stream) |
| 容器状态 | `GET /containers/{id}/json` |
| 资源统计 | `GET /containers/{id}/stats` (stream) |
| 创建网络 | `POST /networks/create` |
| 管理 Volume | `POST /volumes/create`, `GET /volumes` |

**Compose 兼容**

`bollard` 不直接支持 Docker Compose，需要自行实现编排逻辑：

- 解析生成的 `docker-compose.yml` 为容器创建参数
- 按依赖顺序创建网络 → Volume → 容器
- 管理容器组的统一生命周期
- 或者作为替代方案，通过 subprocess 调用 `docker compose` CLI

推荐采用混合方案：用 `bollard` 处理镜像拉取、容器状态监控、日志流等需要流式传输的操作；用 `docker compose` CLI 处理编排层面的创建/启动/停止操作，因为 Compose 的依赖解析和网络配置较为复杂，直接复用 CLI 更稳定。

### 5.3 用户界面设计

**实例创建流程新增选项**

在现有的实例创建向导中增加部署模式选择步骤：

```
步骤一：基本信息（实例名称、描述）
步骤二：部署模式选择（本地 / Docker / WSL2+Docker）  ← 新增
步骤三：版本选择（MaiBot 版本、NapCat 版本）
步骤四：配置（端口、账号等基本配置）
步骤五：确认并创建
```

**Docker 模式实例管理页面**

在现有的实例详情页中，Docker 模式的实例展示额外信息：

- 容器状态面板（各容器运行状态一览）
- 资源监控面板（CPU / 内存图表）
- 容器日志标签页（多容器日志切换）
- Docker Compose 配置查看/编辑

**设置页面扩展**

- Docker 连接配置（socket 路径 / TCP 地址）
- 镜像仓库 / 加速器配置
- 默认资源限制配置

---

## 6. WSL2 管理方案

### 6.1 定位

WSL2 管理作为 Docker 模式在 Windows 平台的辅助方案，而非独立的部署模式。其核心价值在于：

- 当 Windows 用户未安装 Docker Desktop 时，引导通过 WSL2 使用 Docker
- 利用 WSL2 的 Linux 环境规避 NapCat 在 Windows 上的特定风控问题
- 降低 Windows 用户使用 Docker 的门槛

### 6.2 功能范围

**WSL2 环境检测**

- 检测 Windows 版本是否支持 WSL2（Windows 10 2004+ / Windows 11）
- 检测 WSL2 是否已启用
- 列出已安装的 WSL 分发版
- 检测 WSL2 内是否已安装 Docker

**WSL2 环境引导**

- 引导用户启用 WSL2 功能（需管理员权限）
- 引导安装 Linux 分发版（推荐 Ubuntu）
- 引导在 WSL2 内安装 Docker Engine

**WSL2 内 Docker 管理**

- 通过 `wsl.exe` 执行 WSL2 内的 Docker 命令
- 宿主机与 WSL2 之间的文件路径自动转换
- WSL2 网络端口自动转发

### 6.3 实现约束

- 仅在 Windows 平台编译和启用相关代码（`#[cfg(target_os = "windows")]`）
- 不引入 WSL2 内"裸跑"模式（即不支持在 WSL2 内直接 clone + pip install）
- WSL2 仅作为 Docker 的宿主环境，所有业务逻辑仍通过 Docker 容器承载

---

## 7. 数据模型变更

### 7.1 实例模型扩展

现有的 Instance 模型需要扩展以支持多种部署模式：

**新增字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| `deploy_mode` | enum (local, docker, wsl2_docker) | 部署模式 |
| `docker_compose_path` | string, nullable | Compose 文件路径 |
| `container_ids` | json, nullable | 关联的容器 ID 列表 |
| `docker_network` | string, nullable | 专属 Docker 网络名称 |
| `wsl_distro` | string, nullable | WSL 分发版名称 (Windows only) |

### 7.2 新增 Docker 相关模型

**ContainerInfo**

| 字段 | 类型 | 说明 |
|------|------|------|
| `container_id` | string | Docker 容器 ID |
| `instance_id` | string | 关联的启动器实例 ID |
| `name` | string | 容器名称 |
| `image` | string | 镜像名称:标签 |
| `status` | enum | 容器状态 |
| `ports` | json | 端口映射 |
| `created_at` | datetime | 创建时间 |

**ImageInfo**

| 字段 | 类型 | 说明 |
|------|------|------|
| `image_id` | string | 镜像 ID |
| `repository` | string | 仓库名 |
| `tag` | string | 标签 |
| `size` | integer | 镜像大小 (bytes) |
| `pulled_at` | datetime | 拉取时间 |

---

## 8. 迁移与兼容性

### 8.1 用户数据迁移

**数据库迁移**

- 提供自动化数据库 migration（schema 升级）
- 旧版本创建的实例自动标记为 `deploy_mode = local`
- 不影响现有实例的正常运行

**配置文件兼容**

- 所有现有配置文件格式保持不变
- Docker 模式中，配置文件存储在同样的实例目录结构下
- 增加 `docker-compose.yml` 和 Docker 相关配置文件

### 8.2 渐进式发布策略

| 版本 | 内容 | 对用户的影响 |
|------|------|-------------|
| v0.2.0-alpha | Phase 1 完成，Python 后端移除 | 功能无变化，安装包更小 |
| v0.2.0-beta | Docker 管理基础功能 | 新增 Docker 部署选项 |
| v0.2.0-rc | Phase 2 核心完成 + WSL2 支持 | Git 依赖消除，全功能可用 |
| v0.2.0 | 稳定版发布 | 三种部署模式完整支持 |

### 8.3 回退方案

- 在迁移初期，保留 Python 后端代码在仓库中（独立分支），不删除
- 如果 Rust 迁移出现严重阻塞问题，可快速回退到 Python 后端
- Phase 1 完成并验证稳定后，归档 Python 后端代码

---

## 9. 风险评估

### 9.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| `git2` 在 Windows 上的 SSH/HTTPS 认证兼容性 | 克隆私有仓库失败 | 中 | 回退到 subprocess 调用 git CLI 作为备选 |
| `bollard` 与特定 Docker 版本不兼容 | Docker 管理功能异常 | 低 | bollard 维护活跃，跟进上游修复 |
| `portable-pty` 在特定平台的 edge case | 终端输出异常 | 中 | 保留 raw subprocess 模式作为降级方案 |
| SQLAlchemy → sqlx 迁移数据丢失 | 用户数据丢失 | 低 | 迁移前自动备份，提供手动恢复工具 |
| 前端通信层大面积改动引入 bug | UI 功能回退 | 中 | 逐模块迁移，每个模块独立测试 |

### 9.2 工程风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Rust 开发周期超出预期 | 版本延期 | 中 | 严格控制 Phase 范围，优先交付核心功能 |
| 需要同时维护 Rust 和 Python 两套代码 | 维护成本翻倍 | 中 | Phase 1 尽快完成，缩短双线并存期 |
| Docker 用户环境多样性导致兼容问题 | Docker 模式可靠性 | 高 | 充分测试不同 Docker 版本，提供详细错误提示和排查指引 |

---

## 10. 测试策略

### 10.1 单元测试

- Rust 层各 service 模块独立单元测试
- 使用 mock 隔离 Docker API、文件系统、数据库等外部依赖
- 数据库操作使用内存 SQLite 测试

### 10.2 集成测试

- Tauri Commands 端到端测试（invoke → service → 返回结果）
- Docker 管理集成测试（需要 Docker 环境）
- 数据库迁移测试（从旧版 schema 升级）

### 10.3 平台测试矩阵

| 测试项 | Windows | macOS | Linux |
|--------|---------|-------|-------|
| 本地模式（进程管理） | ✓ | ✓ | ✓ |
| 本地模式（Git 克隆） | ✓ | ✓ | ✓ |
| Docker 模式（Docker Desktop） | ✓ | ✓ | - |
| Docker 模式（Docker Engine） | - | - | ✓ |
| WSL2 + Docker | ✓ | - | - |
| PTY 终端输出 | ✓ | ✓ | ✓ |

---

## 11. 里程碑与时间线

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: 通信层迁移                                     │
│  ├─ M1.1 Rust 项目结构搭建 + 数据库层                    │
│  ├─ M1.2 实例管理 Commands 迁移                          │
│  ├─ M1.3 进程管理 Commands 迁移                          │
│  ├─ M1.4 下载/安装 Commands 迁移                         │
│  ├─ M1.5 配置管理 Commands 迁移                          │
│  ├─ M1.6 前端通信层切换                                  │
│  ├─ M1.7 WebSocket → Tauri Events 迁移                   │
│  └─ M1.8 移除 Python 后端，验证与发布 alpha               │
│                                                         │
│  Docker 管理（与 Phase 1 并行）                           │
│  ├─ M2.1 Docker 环境检测与连接                            │
│  ├─ M2.2 镜像管理（拉取/列出/删除）                       │
│  ├─ M2.3 Compose 配置生成                                │
│  ├─ M2.4 容器生命周期管理                                 │
│  ├─ M2.5 容器日志流与状态监控                             │
│  ├─ M2.6 前端 Docker 管理界面                             │
│  └─ M2.7 集成测试与发布 beta                              │
│                                                         │
│  Phase 2: 核心服务原生化                                  │
│  ├─ M3.1 git2 集成（替代 Git CLI）                        │
│  ├─ M3.2 portable-pty 集成（替代 winpty/Python pty）      │
│  ├─ M3.3 reqwest 下载管理（替代 aiohttp）                 │
│  └─ M3.4 WSL2 管理支持 (Windows)                         │
│                                                         │
│  发布 v0.2.0 正式版                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 12. 开放问题

以下问题需要在实施过程中进一步讨论和决策：

1. **Python 环境管理的长期方案** — 即使 Rust 下沉完成，MaiBot 本身仍需 Python 运行。本地模式下仍需检测/安装 Python 和创建 venv。是否考虑在 Docker 模式彻底消除对宿主机 Python 的依赖后，将本地模式标记为"高级/开发者模式"？

2. **Docker Compose 实现方案选择** — 是通过 `bollard` 自行实现编排逻辑，还是混合调用 `docker compose` CLI？前者控制力更强但工作量大，后者更实用但引入了对 Docker Compose CLI 的依赖。

3. **镜像分发策略** — MaiBot 的 Docker 镜像发布在哪个 Registry？是否需要支持多 Registry（Docker Hub + ghcr.io）？中国大陆用户的镜像加速方案如何设计？

4. **多实例 Docker 网络隔离** — 多个 MaiBot 实例运行时，容器网络如何隔离？每个实例一个独立的 Docker network，还是共享网络通过端口区分？

5. **Windows 上 Docker Desktop 的授权问题** — Docker Desktop 对大型组织有商业授权要求。WSL2 内直接安装 Docker Engine 是否应作为 Windows 的推荐方案？

---

## 13. 参考资料

- [Tauri 2.x 文档 - Commands](https://v2.tauri.app/develop/calling-rust/)
- [Tauri 2.x 文档 - Events](https://v2.tauri.app/develop/calling-rust/#events)
- [bollard - Docker API client for Rust](https://github.com/fussybeaver/bollard)
- [git2-rs - libgit2 bindings for Rust](https://github.com/rust-lang/git2-rs)
- [portable-pty - Cross platform PTY](https://github.com/wez/wezterm/tree/main/pty)
- [sqlx - Async SQL toolkit for Rust](https://github.com/launchbadge/sqlx)
- [Docker Engine API](https://docs.docker.com/engine/api/)
- [WSL2 Documentation](https://learn.microsoft.com/en-us/windows/wsl/)

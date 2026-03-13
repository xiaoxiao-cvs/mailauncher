# RFC-002: 运行时抽象与 WSL2 接入前置规范

- 状态: Draft
- 作者: GitHub Copilot
- 创建日期: 2026-03-13
- 目标版本: v0.3.x

---

## 1. 摘要

在实现 WSL2 支持前，MAI Launcher 需要先把“实例是什么、实例运行在哪里、组件如何启动、路径如何映射、状态如何收敛”定义成稳定协议，而不是继续在命令构建阶段叠加平台分支。

本 RFC 定义一个可扩展到 Windows、macOS、Linux、Docker 和 WSL2 的统一运行时模型，目标是让多实例启动器具备行业可维护性，而不是演变为按平台堆条件分支的启动脚本集合。

---

## 2. 当前问题

当前后端已经具备基础跨平台能力，但还没有形成可扩展的运行时边界。

### 2.1 平台与运行时耦合

- 命令构建逻辑直接写在 process_service 中。
- 路径解析依赖 cfg!(target_os = ...)，但实例并没有声明“目标运行时”。
- Windows/macOS 是“宿主机直接运行”，未来 WSL2 会变成“宿主机管理访客机进程”，这不是同一层问题。

### 2.2 实例模型缺少运行时元数据

instances 表当前只有 instance_path、python_path、qq_account 等字段，没有描述：

- 运行模式: local / docker / wsl2
- 宿主平台与目标平台
- 访客根目录
- 路径映射规则
- 信号策略
- 终端能力

这会导致 WSL2 接入后，大量逻辑只能从“当前编译平台”猜行为，无法从“实例配置”决定行为。

### 2.3 生命周期状态过粗

当前实例状态主要是 stopped / starting / running，缺少：

- partial: 部分组件启动成功
- stopping: 正在优雅退出
- degraded: 主组件存活但依赖组件异常
- failed: 本次启动失败并附错误原因

多组件实例如果继续只用单字符串状态，后续排障会非常痛苦。

### 2.4 组件清单是硬编码的

当前组件顺序和目录名基本写死为：

- MaiBot
- NapCat
- MaiBot-Napcat-Adapter

这适合当前版本，但不适合作为长期规范。行业化的多实例启动器必须有“组件清单”概念，而不是靠目录存在与否推断全部行为。

---

## 3. 设计目标

### 3.1 必须达成

- 同一个实例模型可以表达 local、docker、wsl2 三种运行方式。
- 进程启动、停止、信号、终端、路径映射通过统一接口完成。
- 宿主机平台和目标运行时平台解耦。
- 前端看到的是稳定的实例/组件状态，不感知底层平台细节。
- 新增运行时时，不允许修改所有业务命令。

### 3.2 明确不做

- 不把 WSL2 视为“Linux 编译目标”。它是 Windows 下的一种运行时后端。
- 不把 Docker Desktop、原生 Docker Engine、WSL2 裸进程混为一个概念。
- 不继续用 cfg! 分支承担实例运行时决策。

---

## 4. 规范模型

### 4.1 实例运行时配置

建议为实例增加 runtime_profile，至少包含：

```json
{
  "kind": "local",
  "host_os": "windows",
  "guest_os": null,
  "workspace_root": "deployments/demo",
  "guest_workspace_root": null,
  "python": {
    "mode": "venv",
    "path": null
  },
  "terminal": {
    "interactive": true,
    "supports_resize": true
  },
  "signal_policy": {
    "graceful_stop": "ctrl_c",
    "force_stop": "kill"
  }
}
```

WSL2 实例应改为：

```json
{
  "kind": "wsl2",
  "host_os": "windows",
  "guest_os": "linux",
  "workspace_root": "deployments/demo",
  "guest_workspace_root": "/home/user/mailauncher-instances/demo",
  "distribution": "Ubuntu-24.04",
  "path_mapping": "explicit"
}
```

关键点：实例运行时必须是数据驱动，而不是代码猜测。

### 4.2 组件清单

建议引入 ComponentSpec：

- component_id
- display_name
- relative_workdir
- startup_kind: python_script / shell / executable / container
- startup_target
- args_template
- depends_on
- health_check
- stop_strategy

这样启动顺序、依赖关系和健康检查都来自清单，不再散落在多个 match 分支里。

### 4.3 生命周期状态机

建议实例级状态最少扩展为：

- pending
- starting
- running
- partial
- stopping
- stopped
- failed
- unknown

组件级状态至少包含：

- starting
- running
- stopping
- stopped
- failed

实例状态由组件状态聚合得出，而不是直接在命令里写固定字符串。

---

## 5. 后端分层建议

### 5.1 建议新增的核心抽象

#### RuntimeAdapter

职责：针对不同运行时构建命令、启动进程、停止进程、映射路径、提供终端能力。

建议接口：

- resolve_component_command(instance, component) -> ResolvedCommand
- start(exec_request) -> RunningHandle
- stop(handle, strategy)
- supports_terminal_resize() -> bool
- map_host_path(path) -> guest_path

#### InstanceRuntimeResolver

职责：根据实例配置解析当前应使用 local/docker/wsl2 哪种适配器。

#### StateProjector

职责：把组件实际状态投影为实例状态，并统一写回数据库。

#### ComponentRegistry

职责：维护实例实际可用组件，而不是在多个命令里重复判断目录是否存在。

### 5.2 建议目录结构

建议逐步把相关代码收敛为：

```text
src-tauri/src/
  runtime/
    mod.rs
    adapter.rs
    local.rs
    wsl.rs
    docker.rs
    path_mapper.rs
  lifecycle/
    state_machine.rs
    projector.rs
  components/
    registry.rs
    spec.rs
```

---

## 6. WSL2 接入原则

### 6.1 WSL2 的定位

WSL2 不是“多写几个 Linux 命令”这么简单。它带来的是：

- 双文件系统
- 双路径语义
- 双进程空间
- 双信号模型
- 终端交互链路变化

所以 WSL2 必须作为独立运行时适配器实现。

### 6.2 WSL2 必须显式解决的五件事

1. 路径映射
Windows 路径和 WSL2 路径不能靠字符串替换猜，必须有单独的 PathMapper。

2. 工作区落点
必须明确实例源码是放在 Windows 文件系统，还是复制/同步到 WSL2 文件系统。

3. Python 解释器归属
python_path 不能继续只表达宿主路径，WSL2 下它应属于 guest runtime。

4. 进程标识
Windows 端看到的 launcher 进程和 WSL2 内真正业务进程不是同一个 PID 空间，必须定义 host_pid 与 guest_pid。

5. 停止策略
Ctrl+C、SIGTERM、SIGKILL 在 WSL2 下应由 guest runtime 执行，不能沿用本地 PTY 假设。

---

## 7. 实施顺序

建议严格按下面顺序做，而不是直接写 WSL2 分支。

### Phase 0: Tauri 工程根目录化

- 将 Tauri 工程从 frontend/src-tauri 提升到仓库根目录的 src-tauri
- 将根目录作为桌面应用主工程入口，frontend 回归为纯前端子项目
- 统一构建脚本、CI、文档和版本入口，消除“前端项目内再嵌套桌面工程”的历史结构
- 完成这一步后，后续 runtime、lifecycle、component registry 重构才有稳定边界

### Phase A: 抽象先行

- 新增 runtime_profile 数据结构
- 新增 RuntimeAdapter trait
- 把 build_component_command 从 process_service 拆到 local adapter
- 把实例状态写回集中到 StateProjector

### Phase B: 组件清单化

- 引入 ComponentSpec
- 启动顺序与依赖从硬编码迁移到组件注册表
- 为组件增加健康检查与 stop_strategy

### Phase C: WSL2 最小实现

- 只支持 local source + guest execution
- 支持显式 distribution 配置
- 支持 guest path mapping
- 支持 guest python / bash / shell command execution

### Phase D: 观测与恢复

- 持久化 host_pid / guest_pid
- 持久化最近启动错误
- 应用重启后恢复运行态探测
- 为 partial / failed / unknown 补齐前端展示

---

## 8. 最低验收标准

在开始写 WSL2 代码之前，至少满足：

- Local 运行时已经通过 RuntimeAdapter 接口提供服务。
- 启动/停止/状态聚合不再散落在 command 层。
- 实例表已能存储 runtime_profile 或等价字段。
- python_path 不再被默认解释为宿主机路径。
- 组件状态与实例状态可以独立表达。

如果这五项没完成，WSL2 支持大概率会把现有代码推向不可维护状态。

---

## 9. 结论

这套后端目前作为 Windows/macOS 的本地多实例启动器，方向是对的，基础也已经有了：

- Rust 原生进程管理
- SQLite 本地状态
- Tauri 事件流终端输出
- 基础跨平台目录策略

但它还没有进入“行业规范的多实例启动器”阶段。差的不是功能数量，而是运行时边界、状态机和实例模型。

先把运行时抽象立住，再做 WSL2，后面 Docker、Linux 原生、远程主机管理才会是线性扩展，而不是指数级返工。
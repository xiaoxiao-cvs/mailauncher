# 下载组件

## 概述

下载组件提供了一个完整的界面，用于下载和安装 Maibot 及其相关依赖组件。采用复选框+批量安装的交互模式，所有内容在单屏内显示，无需滚动。

## 设计特点

### 1. 单屏布局
- 所有内容适配单屏显示，无滚动条
- 垂直居中布局，最大宽度 4xl
- 紧凑的间距和组件尺寸

### 2. 复选框交互
- 使用复选框选择要安装的组件
- 默认选中所有必需组件
- 已完成或已安装的组件自动禁用
- 最后统一点击"开始安装"按钮

### 3. Maibot 版本集成
- 版本选择器嵌入在 Maibot 组件下方
- 只在选中 Maibot 时显示
- 增强版本选择与组件的关联性
- 3列网格布局，紧凑展示

## 功能特性

### 1. 部署路径管理
- 紧凑模式显示
- 从后端加载引导页设置的部署路径
- 支持手动输入路径
- 支持通过文件选择器选择文件夹

### 2. Maibot 版本选择
- **最新代码 (main)**：从主分支获取最新代码
- **Tag 版本**：稳定版本发布（从后端 API 获取）
- **分支版本**：开发分支（从后端 API 获取）
- 图标标识：代码/标签/分支

### 3. 组件选择管理

#### 必需组件
1. **Maibot**：MAI 机器人核心框架
   - 支持版本选择（嵌入式）
   - 显示"必需"标签

2. **MaiBot-Napcat-Adapter**：Napcat 适配器
   - 自动安装最新版
   - 显示"必需"标签

3. **Napcat**：无头模式/终端模式
   - 自动安装最新版
   - 显示"必需"标签

4. **MaiMBot-LPMM**（仅 macOS）：编译 Quick-algo
   - macOS 系统必需
   - 在安装 Maibot 时自动安装
   - 显示"必需"标签

#### 组件状态
- **未选中**：灰色边框，白色背景
- **已选中**：蓝色边框，渐变背景
- **已完成/已安装**：显示绿色标签，降低透明度，禁用复选框

### 4. 底部操作栏
- **左侧提示**：
  - 未设置路径：黄色警告图标
  - 未选择组件：灰色提示
  - 已完成：绿色成功提示
  - 正常：显示已选数量
- **右侧按钮**：
  - 渐变蓝色背景
  - 显示"开始安装"或"安装中..."
  - 禁用状态：无路径或无选择或正在安装

## 组件结构

```
src/components/downloads/
├── index.ts                      # 组件导出
├── DownloadItemComponent.tsx     # 单个下载项组件（已弃用）
├── DeploymentPathSelector.tsx    # 部署路径选择器（支持紧凑模式）
├── MaibotVersionSelector.tsx     # Maibot 版本选择器（已弃用）
└── README.md                     # 本文档

src/hooks/
└── useDownload.ts                # 下载管理 Hook（新增复选框逻辑）

src/types/
└── download.ts                   # 类型定义

src/pages/
└── DownloadsPage.tsx             # 下载页面主组件（全新实现）
```

## 使用的技术

- **状态管理**：React Hooks (useState, useEffect, useCallback)
- **复选框状态**：Set 数据结构管理选中项
- **UI 组件**：shadcn/ui
- **图标**：Iconify (ph 图标集)
- **样式**：Tailwind CSS
- **文件选择**：Tauri Dialog Plugin
- **日志**：自定义 Logger

## 待实现功能（需要后端 API）

### 1. 部署路径保存
```typescript
POST /api/v1/environment/config
{
  "instances_dir": "/path/to/deployments"
}
```

### 2. 获取 Maibot 版本列表
```typescript
GET /api/v1/maibot/versions
// 返回可用的 tags 和 branches
```

### 3. 下载组件
```typescript
POST /api/v1/downloads
{
  "component": "maibot" | "napcat" | "adapter" | "quick-algo",
  "version": "latest" | "tag_name" | "branch_name",
  "deployment_path": "/path/to/deployments"
}
```

### 4. 查询下载进度
```typescript
GET /api/v1/downloads/{download_id}
// 返回下载进度和状态
```

### 5. 检查组件是否已安装
```typescript
GET /api/v1/downloads/status
// 返回各组件的安装状态
```

## 设计说明

### 平台检测
组件会自动检测操作系统类型：
- **macOS**：显示 Quick-algo 编译组件
- **Windows/Linux**：不显示 Quick-algo 组件

### 用户体验
1. **渐进式引导**：从部署路径 → 版本选择 → 组件下载
2. **清晰的状态反馈**：每个组件显示实时状态和进度
3. **错误处理**：失败时显示错误信息并提供重试选项
4. **视觉一致性**：与引导页保持相同的设计风格

### 响应式布局
- 主内容区最大宽度 5xl，居中显示
- 自适应侧边栏的展开/收起状态
- 支持深色模式

## 未来优化

1. **断点续传**：支持下载中断后继续
2. **增量更新**：检测已安装版本，仅下载更新部分
3. **依赖检查**：下载前验证系统依赖
4. **安装验证**：下载后验证组件完整性
5. **并行下载**：支持多个组件同时下载

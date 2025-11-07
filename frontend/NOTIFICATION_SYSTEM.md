# 通知系统与安装概要功能

## 📋 功能概述

实现了类似 macOS Safari 下载通知的交互设计，包括：

1. **侧边栏通知中心**：铃铛图标 + 红色徽章
2. **通知气泡弹窗**：纯白背景，展示任务列表
3. **安装概要卡片**：点击安装后右侧展示概要信息
4. **全屏日志模态框**：点击任务查看详细日志

## 🎨 设计特点

### 1. 通知类型与颜色
- **任务通知**：白色背景 + 阴影（下载/安装任务）
- **消息通知**：浅蓝色背景 (`#e3f2fd`)
- **警告通知**：黄色背景 (`#fff3e0`)
- **错误通知**：红色背景 (`#ffebee`)

### 2. 交互流程

```
用户点击"开始安装"
  ↓
侧边栏铃铛显示徽章数字
  ↓
下载页面右侧淡出 → 淡入概要卡片
  ├─ 显示：实例名、版本、组件、路径
  ├─ 提示：可在通知中查看进度
  └─ 骨架屏 loading (500ms)
  ↓
监听安装状态（通过 WebSocket）
  ├─ 安装成功 → 1.5秒后恢复下载页
  └─ 安装失败 → 1.5秒后恢复下载页
  
点击侧边栏铃铛
  ↓
弹出通知气泡（从左侧滑入）
  ├─ 显示所有任务
  ├─ 进度条 + 概要信息
  └─ 右侧删除按钮

点击任务卡片
  ↓
全屏模糊模态框
  ├─ 显示详细日志（黑底白字）
  ├─ 实时滚动到最新
  └─ ESC 或左上角 X 关闭
```

## 📁 文件结构

```
frontend/src/
├── types/
│   └── notification.ts                # 通知类型定义
├── hooks/
│   ├── useNotifications.ts            # 通知管理 hook
│   └── useInstallOverview.ts          # 安装概要状态管理 hook
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.tsx       # 铃铛图标组件
│   │   ├── NotificationPopover.tsx    # 气泡弹窗组件
│   │   ├── NotificationItem.tsx       # 单个任务卡片组件
│   │   └── index.ts
│   └── install/
│       ├── InstallOverview.tsx        # 安装概要卡片组件
│       ├── InstallLogModal.tsx        # 全屏日志模态框组件
│       └── index.ts
├── components/sidebar/
│   └── Sidebar.tsx                    # 已集成通知铃铛
└── pages/
    └── DownloadsPage.tsx              # 已集成安装概要
```

## 🔧 核心组件说明

### 1. useNotifications Hook

**功能**：
- 管理所有通知列表
- 计算未读数量（只计算进行中的任务）
- 提供添加/删除/更新通知的方法
- WebSocket 消息转换为通知

**主要方法**：
```typescript
const {
  notifications,          // 通知列表
  unreadCount,           // 未读数量
  isPopoverOpen,         // 气泡是否打开
  addTaskNotification,   // 添加任务通知
  updateTaskProgress,    // 更新任务进度
  addMessageNotification,// 添加消息通知
  addWarningNotification,// 添加警告通知
  addErrorNotification,  // 添加错误通知
  removeNotification,    // 删除单个通知
  clearAllNotifications, // 清空所有通知
  togglePopover,         // 切换气泡显示
  closePopover,          // 关闭气泡
  openPopover,           // 打开气泡
} = useNotifications()
```

### 2. useInstallOverview Hook

**功能**：
- 管理概要卡片的显示/隐藏
- 保持状态（切换页面后保持）
- 骨架屏加载动画
- 安装完成后自动隐藏

**主要方法**：
```typescript
const {
  state,           // 概要状态
  showOverview,    // 显示概要卡片
  updateStatus,    // 更新任务状态
  hideOverview,    // 隐藏概要卡片
  resetOverview,   // 重置状态
} = useInstallOverview()
```

### 3. NotificationBell 组件

**Props**：
```typescript
{
  unreadCount: number,      // 未读数量
  isCollapsed: boolean,     // 侧边栏是否收起
  onClick: () => void,      // 点击事件
}
```

**特性**：
- 红色徽章显示未读数量
- 超过 9 个显示 "9+"
- 支持侧边栏收起/展开状态

### 4. NotificationPopover 组件

**Props**：
```typescript
{
  isOpen: boolean,                                  // 是否显示
  notifications: Notification[],                    // 通知列表
  onRemove: (id: string) => void,                  // 删除回调
  onClearAll: () => void,                          // 清空所有
  onClose: () => void,                             // 关闭回调
  onNotificationClick: (notification: Notification) => void, // 点击回调
}
```

**特性**：
- 点击外部关闭
- 从左侧滑入动画
- 箭头指示器
- 空状态提示

### 5. InstallOverview 组件

**Props**：
```typescript
{
  state: InstallOverviewState,  // 概要状态
}
```

**特性**：
- 骨架屏 loading 效果（500ms）
- 平滑的淡入淡出动画
- 状态图标（⏳📥⚙️✅❌）
- 提示用户可在通知中查看进度

### 6. InstallLogModal 组件

**Props**：
```typescript
{
  isOpen: boolean,              // 是否显示
  taskId: string | null,        // 任务 ID
  instanceName: string,         // 实例名称
  onClose: () => void,          // 关闭回调
}
```

**特性**：
- 全屏背景模糊
- 自动滚动到最新日志
- ESC 键关闭
- 颜色区分日志级别（ERROR/WARN/INFO/DEBUG）

## 🔄 WebSocket 集成（TODO）

目前使用模拟数据演示功能，需要后续集成真实的 WebSocket：

```typescript
// 在 InstallLogModal.tsx 中
useEffect(() => {
  if (!isOpen || !taskId) return

  const ws = new WebSocket(`ws://localhost:11111/api/v1/ws/downloads/${taskId}`)
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    switch (data.type) {
      case 'log':
        // 添加日志
        setLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          level: data.level,
          message: data.message
        }])
        break
      
      case 'progress':
        // 更新进度
        setProgress(data.progress)
        break
      
      case 'status':
        // 更新状态
        setStatus(data.status)
        break
    }
  }

  return () => ws?.close()
}, [isOpen, taskId])
```

在 `DownloadsPage.tsx` 中，也需要用实际的任务 ID 替换 `temp_task_id`。

## 🎯 使用示例

### 在下载页面使用

下载页面已经自动集成，点击"开始安装"按钮即可触发整个流程。

### 手动添加通知

```typescript
import { useNotifications } from '@/hooks'

function MyComponent() {
  const { addTaskNotification, addMessageNotification } = useNotifications()

  // 添加任务通知
  addTaskNotification({
    taskId: 'task_123',
    instanceName: 'My Bot',
    version: 'v2.0.0',
    components: ['Maibot', 'Napcat'],
    deploymentPath: '/path/to/deployment',
  })

  // 添加消息通知
  addMessageNotification('提示', '这是一条消息')
}
```

### 更新任务进度

```typescript
import { useNotifications } from '@/hooks'
import { TaskStatus } from '@/types/notification'

function MyComponent() {
  const { updateTaskProgress } = useNotifications()

  // 更新进度
  updateTaskProgress('task_123', 50, TaskStatus.INSTALLING)
}
```

## 🚀 下一步改进

1. **WebSocket 真实集成**：替换模拟数据
2. **持久化存储**：通知存储到 localStorage
3. **通知声音**：安装完成时播放提示音
4. **桌面通知**：使用 Tauri 的通知 API
5. **任务历史**：查看已完成的历史任务
6. **重试功能**：失败的任务支持重试

## 📝 注意事项

1. 初始化时会自动添加一条提示消息："💡 提示 - 点击任务可查看详细日志"
2. 未读徽章只计算**进行中**的任务（pending/downloading/installing）
3. 安装成功或失败后，概要卡片会在 1.5 秒后自动隐藏
4. 点击通知气泡外部会自动关闭气泡
5. 日志模态框支持 ESC 键快速关闭

# 侧边栏组件

## 概述

侧边栏组件提供应用的主导航功能，支持展开和收起两种状态。

## 组件结构

```
sidebar/
├── Sidebar.tsx           # 主侧边栏组件
├── SidebarNavItem.tsx    # 导航项子组件
├── constants.ts          # 导航配置常量
├── index.ts              # 统一导出
└── README.md             # 文档
```

## 设计特点

### 布局设计
- **默认状态**：展开（显示图标+文字）
- **收起状态**：仅显示图标
- **右侧倒角**：圆角设计（rounded-3xl）
- **响应式宽度**：展开 256px，收起 80px

### 视觉效果
- **高亮框**：当前页面用圆角矩形框标识
- **指示长点**：展开状态下，高亮框左侧显示实色长点
- **四边等宽**：收起状态下，高亮框四边等宽
- **平滑过渡**：300ms 过渡动画

### 图标系统
使用 **Iconify** 的 **Phosphor (ph)** 图标集 thin 变体：
- `ph:house-thin` - 主页
- `ph:stack-thin` - 实例管理
- `ph:download-simple-thin` - 下载
- `ph:gear-thin` - 设置
- `ph:caret-left-thin` / `ph:caret-right-thin` - 展开/收起

## 主题配色

遵循项目主题系统，使用已有的配色方案：

### 亮色主题
- 背景：`bg-white`
- 文字：`text-[#03045e]`
- 次要文字：`text-[#023e8a]/70`
- 高亮色：`text-[#0077b6]`
- hover：`bg-[#023e8a]/5`

### 暗色主题
- 背景：`dark:bg-[#0f0f0f]`
- 文字：`dark:text-white`
- 次要文字：`dark:text-white/70`
- 高亮色：`dark:text-[#00b4d8]`
- hover：`dark:bg-white/5`

## 使用方法

```tsx
import { Sidebar } from '@/components/sidebar'

function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        {/* 页面内容 */}
      </main>
    </div>
  )
}
```

## 添加新导航项

在 `constants.ts` 中添加配置：

```typescript
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // ... 现有项目
  {
    id: 'new-page',
    label: '新页面',
    icon: 'ph:icon-name-thin',
    path: '/new-page',
  },
]
```

## 单一职责原则

- **Sidebar.tsx**：布局、状态管理、整体结构
- **SidebarNavItem.tsx**：单个导航项的渲染和交互
- **constants.ts**：配置数据
- **types/sidebar.ts**：类型定义

## 依赖

- `@iconify/react` - 图标系统
- `react-router-dom` - 路由导航
- 项目主题系统 (`useTheme`)

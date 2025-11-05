# 引导页组件

基于单一职责原则重构的引导页系统。

## 📁 文件结构

```
src/
├── components/
│   └── onboarding/
│       ├── OnboardingPage.tsx          # 主组件（协调器）
│       ├── OnboardingSidebar.tsx       # 侧边栏组件
│       ├── OnboardingContent.tsx       # 内容展示组件
│       ├── constants.tsx               # 步骤数据配置
│       └── index.ts                    # 模块导出
├── hooks/
│   └── useOnboardingAnimation.ts       # 动画逻辑 Hook
├── types/
│   └── onboarding/
│       └── index.ts                    # 类型定义
└── App.tsx                              # 应用入口（仅导入）
```

## 🎯 单一职责原则体现

### 1. **OnboardingPage.tsx** - 协调器
- **职责**：协调各个子组件，管理引导流程状态
- **功能**：
  - 管理当前步骤状态
  - 处理步骤切换逻辑
  - 协调动画执行
  - 处理完成/跳过回调

### 2. **OnboardingSidebar.tsx** - 侧边栏 UI
- **职责**：展示步骤列表和 Logo
- **功能**：
  - 显示所有步骤
  - 高亮当前步骤
  - 显示已完成标记
  - 支持点击切换步骤

### 3. **OnboardingContent.tsx** - 内容 UI
- **职责**：展示当前步骤的详细内容
- **功能**：
  - 显示步骤标题和描述
  - 展示特性列表
  - 提供前进/后退按钮
  - 移动端适配

### 4. **constants.tsx** - 数据配置
- **职责**：存储步骤数据
- **功能**：
  - 定义所有引导步骤
  - 配置图标、颜色、文案

### 6. **types/onboarding/index.ts** - 类型定义
- **职责**：提供类型安全
- **功能**：
  - 定义步骤数据结构
  - 定义回调函数类型

### 7. **App.tsx** - 应用入口
- **职责**：路由管理和组件组合
- **功能**：
  - 导入并渲染引导页
  - 处理引导完成后的跳转

## 🚀 使用方法

### 基本使用

```tsx
import { OnboardingPage } from '@/components/onboarding'

function App() {
  return (
    <OnboardingPage 
      onComplete={() => console.log('完成')}
      onSkip={() => console.log('跳过')}
    />
  )
}
```

### 自定义步骤数据

如需修改步骤内容，编辑 `constants.tsx`：

```tsx
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: '自定义标题',
    subtitle: '自定义副标题',
    description: ['特性1', '特性2', '特性3'],
    icon: <YourIcon className="w-8 h-8" />,
    gradient: 'from-[#color1] to-[#color2]',
    color: '#color'
  },
  // ... 更多步骤
]
```

### 自定义动画

动画参数在 `src/hooks/useOnboardingAnimation.ts` 中配置：

```tsx
// 初始动画
animate(contentRef.current, {
  opacity: [0, 1],
  translateY: [30, 0],
  duration: 800,  // 调整时长
  ease: 'outQuad'  // 调整缓动
})
```

## 📊 动画逻辑

- **下一步**：向上退出 ⬆️，从下进入 ⬆️
- **上一步**：向下退出 ⬇️，从上进入 ⬇️
- **点击步骤**：根据目标位置自动判断方向

## 🎨 样式自定义

样式主要在各组件的 className 中定义，使用 Tailwind CSS。

动态颜色通过 CSS 变量传递：
```tsx
style={{
  '--step-color': currentStepData.color,
  '--icon-color': step.color,
  // ...
}}
```

对应的 CSS 类在 `App.css` 中定义。

## 🔧 扩展建议

1. **添加新步骤**：编辑 `constants.tsx`
2. **修改动画**：编辑 `src/hooks/useOnboardingAnimation.ts`
3. **调整布局**：编辑对应的 UI 组件
4. **添加新功能**：在 `OnboardingPage.tsx` 中协调

## ✅ 优势

- ✅ **高内聚低耦合**：每个模块职责单一
- ✅ **易于测试**：可独立测试每个组件
- ✅ **易于维护**：修改不影响其他模块
- ✅ **可复用性强**：子组件可在其他地方使用
- ✅ **类型安全**：完整的 TypeScript 支持

## 🔄 与旧代码对比

### 旧代码（App.tsx 中）
- ❌ 所有逻辑混在一起（370+ 行）
- ❌ 难以测试和维护
- ❌ 无法复用

### 新代码（模块化）
- ✅ 职责清晰（每个文件 < 150 行）
- ✅ 易于测试
- ✅ 组件可复用
- ✅ App.tsx 只有 25 行

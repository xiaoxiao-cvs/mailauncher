# MAIBot 配置可视化编辑器实现

## 功能概述

为MAIBot Launcher实现了一个可视化的配置管理界面，允许用户通过友好的界面编辑Bot Config和Model Config。

## 🎨 树形结构设计

### Bot Config 分组结构

配置项按功能模块分为6大类：

#### 📋 基础配置
- Bot基础配置
  - 平台类型
  - QQ账号
  - 其他平台账号
  - 昵称
  - 别名列表

#### 🎭 人格与表达
- 人格与行为
  - 基础人格
  - 回复风格
  - 兴趣爱好
  - 群聊行为规则
  - 识图风格
  - 私聊行为规则
  - 人格状态池
  - 状态切换概率
- 表达学习
  - 表达模式
  - 学习配置列表
  - 表达共享组

#### 💬 聊天行为
- 聊天行为
  - 发言频率
  - 提及必回
  - 上下文长度
  - 主动聊天频率
  - 规划器平滑度
  - 动态发言规则
  - 动态主动聊天规则
- 关键词触发
  - 关键词规则
  - 正则规则

#### 🔧 功能模块
- 记忆系统
- 工具系统
- 情绪系统
- 表情包系统
- 语音识别
- 知识库系统

#### 📝 消息处理
- 消息过滤
- 回复后处理
- 中文错别字
- 回复分割

#### ⚙️ 系统配置
- 日志系统
- 调试选项
- MAIM消息服务
- 遥测统计

### Model Config 分组结构

#### 🔌 API提供商
- API提供商列表
  - 名称
  - API地址
  - API密钥
  - 客户端类型
  - 最大重试次数
  - 超时时间
  - 重试间隔

#### 🤖 模型配置
- 模型列表
  - 模型标识符
  - 名称
  - API提供商
  - 输入价格
  - 输出价格
  - 强制流式输出
  - 额外参数

#### 📋 任务配置
- 模型任务配置
  - 各类任务的模型分配

## 实现的功能

### 1. 配置模态框 (ConfigModal)
- **全屏毛玻璃效果**: 点击"Bot配置"后，背景应用半透明毛玻璃效果
- **70%屏幕占比**: 模态框占据70%的视口宽高，居中显示
- **双配置切换**: 顶部提供Bot Config和Model Config的快速切换按钮
- **响应式设计**: 适配暗色模式

### 2. 树形配置导航 (ConfigTreeView)
- **搜索功能**: 内置搜索框，可快速定位配置项
- **分层展示**: 
  - Bot Config 和 Model Config 作为顶层节点
  - 嵌套的配置项以树形结构展示
  - 支持展开/折叠节点
- **智能搜索**: 搜索时自动展开所有匹配项
- **视觉反馈**: 选中的配置项高亮显示

### 3. 配置编辑器
- **类型智能识别**: 根据值类型自动选择合适的编辑控件
  - **字符串**: 短文本使用Input，长文本使用Textarea
  - **数字**: Number输入框
  - **布尔值**: Switch开关
  - **数组/对象**: JSON格式的Textarea，带语法高亮
- **注释显示**: 显示配置项的注释信息（蓝色提示框）
- **实时验证**: JSON格式实时验证
- **保存与重置**: 
  - 保存按钮：将更改提交到后端
  - 重置按钮：恢复到原始值
  - 更改检测：只有修改后才能保存

### 4. API集成 (configApi)
完整的后端API集成：
- `getBotConfig()`: 获取Bot配置
- `getModelConfig()`: 获取Model配置
- `updateBotConfig()`: 更新Bot配置
- `updateModelConfig()`: 更新Model配置
- `deleteBotConfigKey()`: 删除Bot配置键
- `deleteModelConfigKey()`: 删除Model配置键
- `addBotConfigArrayItem()`: 添加Bot配置数组项
- `addModelConfigArrayItem()`: 添加Model配置数组项

## 文件结构

```
frontend/src/
├── components/
│   ├── ConfigModal.tsx          # 主配置模态框组件
│   ├── ConfigTreeView.tsx       # 树形配置导航组件
│   ├── comp-571.tsx            # Tree组件示例（shadcn）
│   ├── tree.tsx                # Tree基础组件
│   └── ui/
│       ├── input.tsx           # 输入框
│       ├── textarea.tsx        # 文本域
│       ├── switch.tsx          # 开关
│       ├── scroll-area.tsx     # 滚动区域
│       └── separator.tsx       # 分隔符
├── services/
│   └── configApi.ts            # 配置API服务
└── pages/
    └── InstanceDetailPage.tsx  # 实例详情页（集成入口）
```

## 技术栈

- **React 18**: 核心框架
- **TypeScript**: 类型安全
- **@headless-tree/core & @headless-tree/react**: 树形组件库
- **shadcn/ui**: UI组件库
- **Tailwind CSS**: 样式框架
- **sonner**: Toast通知

## 使用方式

1. 进入实例详情页
2. 在左侧"配置管理"卡片中点击"Bot 配置"按钮
3. 在弹出的模态框中：
   - 使用顶部按钮切换Bot Config或Model Config
   - 使用搜索框快速查找配置项
   - 点击左侧树形结构中的叶子节点
   - 在右侧编辑器中修改值
   - 点击"保存更改"按钮提交

## 后续扩展

该架构为将来添加Ada配置预留了空间：
- 顶层可以继续添加"Ada Config"等其他配置
- 树形结构支持任意深度的嵌套
- 编辑器可以根据需要扩展更多数据类型

## 注意事项

1. **配置路径格式**: 
   - 简单键：`bot.nickname`
   - 数组索引：`models[0].name`
   - 嵌套对象：`personality.states[0]`

2. **JSON编辑**: 
   - 数组和对象以JSON格式编辑
   - 必须是合法的JSON格式
   - 格式错误时不会保存

3. **实例ID**: 
   - 如果提供instanceId，则编辑该实例的配置
   - 如果不提供，则编辑默认配置

## API响应格式

```typescript
interface ConfigWithComments {
  data: Record<string, any>      // 配置数据
  comments: Record<string, string> // 注释映射
  file_path: string              // 文件路径
}
```

## 开发日志

- ✅ 安装shadcn Tree组件 (comp-571)
- ✅ 创建configApi服务
- ✅ 实现ConfigTreeView组件
- ✅ 实现ConfigModal组件
- ✅ 集成到InstanceDetailPage
- ✅ 所有TypeScript类型检查通过

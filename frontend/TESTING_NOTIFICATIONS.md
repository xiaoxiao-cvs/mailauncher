# 通知系统测试工具使用指南

## 🧪 快速开始

打开浏览器控制台（F12），输入以下命令测试通知系统：

### 查看帮助
```javascript
testNotification.help()
```

## 📨 基础通知测试

### 1. 消息通知（浅蓝色背景）
```javascript
testNotification.info('提示', '这是一条测试消息')
testNotification.info('欢迎', '欢迎使用 MAI Launcher')
```

### 2. 警告通知（黄色背景）
```javascript
testNotification.warning('注意', '磁盘空间不足')
testNotification.warning('警告', '配置文件可能存在问题')
```

### 3. 错误通知（红色背景）
```javascript
testNotification.error('错误', '网络连接失败')
testNotification.error('失败', '安装过程中发生错误')
```

## 📦 任务通知测试

### 1. 创建任务通知
```javascript
// 创建一个任务，返回任务 ID
const taskId = testNotification.task('我的机器人', 'v2.0.0', ['Maibot', 'Napcat'])

// 或者使用更多组件
testNotification.task('测试实例', 'v1.5.0', ['Maibot', 'Napcat', 'Adapter', 'LPMM'])
```

### 2. 更新任务进度

**方法 1：使用返回的任务 ID**
```javascript
const taskId = testNotification.task('我的机器人', 'v2.0.0', ['Maibot'])

// 更新进度
testNotification.updateTask(taskId, 30, 'downloading')  // 下载中 30%
testNotification.updateTask(taskId, 60, 'installing')   // 安装中 60%
testNotification.updateTask(taskId, 100, 'success')     // 成功 100%
```

**方法 2：自动使用最后创建的任务**
```javascript
testNotification.task('测试', 'v1.0', ['Maibot'])
testNotification.updateTask(undefined, 50, 'downloading')  // 会自动使用刚创建的任务
```

**可用的状态值：**
- `'pending'` - 等待中
- `'downloading'` - 下载中
- `'installing'` - 安装中
- `'success'` - 成功
- `'failed'` - 失败

### 3. 模拟完整安装流程
```javascript
// 自动播放一个完整的安装动画（5秒）
testNotification.demo()
```

## 🔧 工具命令

### 清空所有通知
```javascript
testNotification.clearAll()
```

## 💡 实用示例

### 示例 1：测试多条消息
```javascript
testNotification.info('消息1', '这是第一条消息')
testNotification.warning('消息2', '这是第二条警告')
testNotification.error('消息3', '这是第三条错误')
```

### 示例 2：模拟下载流程
```javascript
// 创建任务
const taskId = testNotification.task('生产环境机器人', 'v2.1.0', ['Maibot', 'Napcat'])

// 模拟下载进度
setTimeout(() => testNotification.updateTask(taskId, 10, 'downloading'), 500)
setTimeout(() => testNotification.updateTask(taskId, 30, 'downloading'), 1000)
setTimeout(() => testNotification.updateTask(taskId, 50, 'downloading'), 1500)
setTimeout(() => testNotification.updateTask(taskId, 70, 'installing'), 2000)
setTimeout(() => testNotification.updateTask(taskId, 90, 'installing'), 2500)
setTimeout(() => testNotification.updateTask(taskId, 100, 'success'), 3000)
```

### 示例 3：测试失败场景
```javascript
const taskId = testNotification.task('测试失败', 'v1.0.0', ['Maibot'])
testNotification.updateTask(taskId, 20, 'downloading')
testNotification.updateTask(taskId, 0, 'failed')  // 失败
testNotification.error('安装失败', '网络连接超时')
```

### 示例 4：测试多个任务
```javascript
// 创建多个任务
const task1 = testNotification.task('机器人A', 'v2.0.0', ['Maibot'])
const task2 = testNotification.task('机器人B', 'v1.5.0', ['Maibot', 'Napcat'])
const task3 = testNotification.task('机器人C', 'v3.0.0', ['Maibot', 'Adapter'])

// 分别更新进度
testNotification.updateTask(task1, 50, 'installing')
testNotification.updateTask(task2, 30, 'downloading')
testNotification.updateTask(task3, 100, 'success')
```

## 🎯 测试检查清单

测试完整的通知功能：

- [ ] 点击侧边栏铃铛，气泡正常弹出
- [ ] 消息通知显示浅蓝色背景
- [ ] 警告通知显示黄色背景
- [ ] 错误通知显示红色背景
- [ ] 任务通知显示白色背景 + 阴影
- [ ] 任务进度条正常更新
- [ ] 点击任务卡片打开日志模态框
- [ ] 点击气泡外部关闭气泡
- [ ] 全部删除按钮正常工作
- [ ] 单个通知的删除按钮正常工作
- [ ] 铃铛徽章数字正确显示
- [ ] 深色模式下样式正常

## 🐛 调试技巧

### 查看通知列表
控制台会自动输出通知列表更新日志：
```
🔔 通知列表更新: [...]
🔢 未读数量: 3
```

### 清空并重新测试
```javascript
testNotification.clearAll()
testNotification.demo()  // 重新播放演示
```

### 快速测试命令（复制粘贴）
```javascript
// 一键测试所有类型
testNotification.info('消息', '这是消息通知')
testNotification.warning('警告', '这是警告通知')
testNotification.error('错误', '这是错误通知')
testNotification.demo()
```

## 📝 注意事项

1. 测试工具仅在**开发环境**中可用
2. 任务通知会显示在通知中心，可以点击查看详细日志
3. 成功/失败的任务会在 1.5 秒后自动从概要卡片中隐藏
4. 初始会有一条提示消息："💡 提示 - 点击任务可查看详细日志"

## 🚀 生产环境

在生产环境中，`testNotification` 不会被注册，所有通知都通过正常的 API 调用创建。

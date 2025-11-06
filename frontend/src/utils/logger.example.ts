/**
 * 日志系统使用示例
 */

import logger, { connectivityLogger, environmentLogger, apiLogger } from './logger'

// 基础使用
logger.info('应用启动')
logger.success('操作成功')
logger.warn('这是一个警告')
logger.error('发生错误', new Error('示例错误'))

// 使用带标签的 logger
connectivityLogger.info('检查后端连接')
environmentLogger.success('Git 环境检查完成')
apiLogger.error('API 请求失败', { url: '/api/test', status: 500 })

// 在生产环境中，warn 以下级别的日志不会显示在控制台
// 但所有日志都会保存到 localStorage

// 日志管理
import { logManager } from './logger'

// 获取所有日志
const allLogs = logManager.getAllLogs()
console.log('所有日志:', allLogs)

// 导出日志（用于下载）
const exportData = logManager.exportLogs()

// 清除所有日志
// logManager.clearAllLogs()

// 手动刷新（保存缓冲区中的日志）
logManager.flush()

/**
 * 日志系统配置
 * 使用 consola 提供结构化日志功能
 * 
 * 功能：
 * 1. 控制台彩色输出
 * 2. 文件保存到后端 data/Log/frontend/ 目录（JSON Lines 格式）
 * 3. 自动压缩历史日志（后端处理）
 * 4. 自动清理旧日志（后端处理）
 * 5. 支持不同模块的标签
 */

import { createConsola, LogLevels, LogLevel } from 'consola'
import { getApiUrl } from '@/config/api'

interface LogEntry {
  timestamp: string
  level: string
  tag?: string
  message: string
  args?: unknown[]
  error?: {
    message: string
    stack?: string
    name?: string
  }
}

class LoggerConfig {
  private logBuffer: LogEntry[] = []
  private readonly BUFFER_SIZE = 50 // 每 50 条日志保存一次
  private readonly SAVE_INTERVAL = 30000 // 30秒自动保存一次
  private saveTimer: number | null = null
  private isSaving = false

  constructor() {
    this.setupAutoSave()
  }

  /**
   * 添加日志条目
   */
  addLog(level: LogLevel, tag: string | undefined, message: string, args?: unknown[]): void {
    // 将 level 数字转换为字符串
    const levelName = ['silent', 'fatal', 'error', 'warn', 'log', 'info', 'success', 'fail', 'ready', 'start', 'box', 'debug', 'trace', 'verbose'][level] || 'info'
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      tag,
      message,
      args: args && args.length > 0 ? args : undefined
    }

    // 处理错误对象
    if (args && args.length > 0) {
      const errorArg = args.find(arg => arg instanceof Error)
      if (errorArg instanceof Error) {
        entry.error = {
          message: errorArg.message,
          stack: errorArg.stack,
          name: errorArg.name
        }
      }
    }

    this.logBuffer.push(entry)

    // 缓冲区满时自动保存
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      this.flush()
    }
  }

  /**
   * 刷新缓冲区，发送到后端保存
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || this.isSaving) return

    this.isSaving = true
    const logsToSave = [...this.logBuffer]
    this.logBuffer = [] // 立即清空缓冲区

    try {
      const apiUrl = getApiUrl() // 动态获取 API URL
      await fetch(`${apiUrl}/logger/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSave
        })
      })
    } catch (error) {
      // 保存失败时，日志只保留在控制台
      console.error('[Logger] 保存日志到后端失败:', error)
      // 不要把日志放回缓冲区，避免无限重试
    } finally {
      this.isSaving = false
    }
  }

  /**
   * 设置自动保存定时器
   */
  private setupAutoSave(): void {
    // 页面关闭前保存
    window.addEventListener('beforeunload', () => {
      // 使用 sendBeacon API 确保日志能发送出去
      if (this.logBuffer.length > 0) {
        const apiUrl = getApiUrl() // 动态获取 API URL
        const blob = new Blob(
          [JSON.stringify({ logs: this.logBuffer })],
          { type: 'application/json' }
        )
        navigator.sendBeacon(`${apiUrl}/logger/frontend`, blob)
        this.logBuffer = []
      }
    })

    // 定时保存
    this.saveTimer = window.setInterval(() => {
      this.flush()
    }, this.SAVE_INTERVAL)

    // 页面可见性变化时保存
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush()
      }
    })
  }

  /**
   * 停止日志系统
   */
  destroy(): void {
    if (this.saveTimer !== null) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
    this.flush()
  }
}

// 创建日志配置实例
const loggerConfig = new LoggerConfig()

// 创建 consola 实例
const logger = createConsola({
  level: import.meta.env.PROD ? LogLevels.warn : LogLevels.debug,
  formatOptions: {
    colors: true,
    compact: false,
    date: true
  },
  reporters: [
    {
      log: (logObj) => {
        // 保存日志到后端
        loggerConfig.addLog(
          logObj.level,
          logObj.tag,
          logObj.args[0] as string,
          logObj.args.slice(1)
        )
      }
    }
  ]
})

/**
 * 为不同模块创建带标签的 logger
 */
export const connectivityLogger = logger.withTag('connectivity')
export const environmentLogger = logger.withTag('environment')
export const apiLogger = logger.withTag('api')
export const routerLogger = logger.withTag('router')
export const themeLogger = logger.withTag('theme')
export const storageLogger = logger.withTag('storage')

/**
 * 导出日志管理函数
 */
export const logManager = {
  flush: () => loggerConfig.flush(),
  destroy: () => loggerConfig.destroy()
}

export default logger

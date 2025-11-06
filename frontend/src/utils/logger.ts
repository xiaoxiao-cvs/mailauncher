/**
 * 日志系统配置
 * 使用 consola 提供结构化日志功能
 * 
 * 功能：
 * 1. 控制台彩色输出
 * 2. 文件保存（JSON Lines 格式）
 * 3. 自动压缩历史日志
 * 4. 自动清理旧日志
 * 5. 支持不同模块的标签
 */

import { createConsola, LogLevels, LogLevel } from 'consola'
import { strToU8, zipSync } from 'fflate'

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
  private readonly MAX_LOG_FILES = 7
  private readonly LOG_KEY_PREFIX = 'mai_launcher_logs_'
  private readonly LOG_INDEX_KEY = 'mai_launcher_log_index'
  private readonly LOG_CONFIG_KEY = 'mai_launcher_log_config'
  private currentSessionKey: string
  private logBuffer: LogEntry[] = []
  private readonly BUFFER_SIZE = 50 // 每 50 条日志保存一次
  private readonly SAVE_INTERVAL = 30000 // 30秒自动保存一次

  constructor() {
    this.currentSessionKey = this.generateSessionKey()
    this.setupAutoSave()
    this.compressAndCleanup()
  }

  /**
   * 生成当前会话的日志键名
   */
  private generateSessionKey(): string {
    const now = new Date()
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0]
    return `${this.LOG_KEY_PREFIX}${timestamp}`
  }

  /**
   * 获取日志索引（所有日志文件的键名列表）
   */
  private getLogIndex(): string[] {
    try {
      const indexJson = localStorage.getItem(this.LOG_INDEX_KEY)
      return indexJson ? JSON.parse(indexJson) : []
    } catch {
      return []
    }
  }

  /**
   * 更新日志索引
   */
  private updateLogIndex(keys: string[]): void {
    try {
      localStorage.setItem(this.LOG_INDEX_KEY, JSON.stringify(keys))
    } catch (error) {
      console.error('更新日志索引失败:', error)
    }
  }

  /**
   * 添加日志到索引
   */
  private addToIndex(key: string): void {
    const index = this.getLogIndex()
    if (!index.includes(key)) {
      index.push(key)
      this.updateLogIndex(index)
    }
  }

  /**
   * 保存日志配置
   */
  private saveLogConfig(): void {
    try {
      const config = {
        maxLogFiles: this.MAX_LOG_FILES,
        currentSession: this.currentSessionKey,
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem(this.LOG_CONFIG_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('保存日志配置失败:', error)
    }
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
   * 刷新缓冲区，保存到 localStorage
   */
  flush(): void {
    if (this.logBuffer.length === 0) return

    try {
      // 获取现有日志
      const existingJson = localStorage.getItem(this.currentSessionKey)
      const existingLogs: LogEntry[] = existingJson ? JSON.parse(existingJson) : []

      // 合并日志
      const allLogs = [...existingLogs, ...this.logBuffer]

      // 保存日志
      localStorage.setItem(this.currentSessionKey, JSON.stringify(allLogs))

      // 添加到索引
      this.addToIndex(this.currentSessionKey)

      // 保存配置
      this.saveLogConfig()

      // 清空缓冲区
      this.logBuffer = []
    } catch (error) {
      console.error('保存日志失败:', error)
      // 如果存储空间不足，尝试清理旧日志
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanupOldLogs(true)
        // 重试一次
        try {
          localStorage.setItem(this.currentSessionKey, JSON.stringify(this.logBuffer))
          this.logBuffer = []
        } catch {
          console.error('保存日志失败，即使清理后仍无法保存')
        }
      }
    }
  }

  /**
   * 设置自动保存定时器
   */
  private setupAutoSave(): void {
    // 页面关闭前保存
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    // 定时保存
    setInterval(() => {
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
   * 压缩历史日志
   */
  private compressLog(key: string): void {
    try {
      const logJson = localStorage.getItem(key)
      if (!logJson) return

      // 检查是否已压缩
      if (key.endsWith('_compressed')) return

      // 压缩日志
      const compressed = zipSync({
        [`${key}.json`]: strToU8(logJson)
      })

      // 转换为 base64
      const base64 = btoa(String.fromCharCode(...compressed))

      // 保存压缩后的日志
      const compressedKey = `${key}_compressed`
      localStorage.setItem(compressedKey, base64)

      // 删除原始日志
      localStorage.removeItem(key)

      // 更新索引
      const index = this.getLogIndex()
      const updatedIndex = index.map(k => k === key ? compressedKey : k)
      this.updateLogIndex(updatedIndex)

      console.info(`已压缩日志: ${key} -> ${compressedKey}`)
    } catch (error) {
      console.error(`压缩日志失败 ${key}:`, error)
    }
  }

  /**
   * 清理旧日志
   */
  private cleanupOldLogs(aggressive = false): void {
    try {
      const index = this.getLogIndex()
      
      // 排除当前会话的日志
      const oldLogs = index.filter(key => 
        !key.includes(this.currentSessionKey)
      )

      // 按时间排序（从键名提取时间戳）
      const sortedLogs = oldLogs.sort((a, b) => {
        const timeA = a.replace(this.LOG_KEY_PREFIX, '').replace('_compressed', '')
        const timeB = b.replace(this.LOG_KEY_PREFIX, '').replace('_compressed', '')
        return timeB.localeCompare(timeA) // 降序，最新的在前
      })

      // 确定要保留的数量
      const keepCount = aggressive ? Math.floor(this.MAX_LOG_FILES / 2) : this.MAX_LOG_FILES

      // 删除超出保留数量的日志
      if (sortedLogs.length > keepCount) {
        const logsToDelete = sortedLogs.slice(keepCount)
        
        for (const key of logsToDelete) {
          localStorage.removeItem(key)
          console.info(`已删除旧日志: ${key}`)
        }

        // 更新索引
        const remainingLogs = [
          this.currentSessionKey,
          ...sortedLogs.slice(0, keepCount)
        ]
        this.updateLogIndex(remainingLogs)
      }
    } catch (error) {
      console.error('清理旧日志失败:', error)
    }
  }

  /**
   * 压缩并清理日志
   */
  private compressAndCleanup(): void {
    try {
      const index = this.getLogIndex()

      // 压缩除当前会话外的所有未压缩日志
      for (const key of index) {
        if (!key.includes(this.currentSessionKey) && !key.endsWith('_compressed')) {
          this.compressLog(key)
        }
      }

      // 清理旧日志
      this.cleanupOldLogs()
    } catch (error) {
      console.error('压缩和清理日志失败:', error)
    }
  }

  /**
   * 获取所有日志
   */
  getAllLogs(): Array<{ key: string; logs: LogEntry[]; compressed: boolean }> {
    const index = this.getLogIndex()
    const result: Array<{ key: string; logs: LogEntry[]; compressed: boolean }> = []

    for (const key of index) {
      try {
        const isCompressed = key.endsWith('_compressed')
        const data = localStorage.getItem(key)
        
        if (data) {
          if (isCompressed) {
            // 对于压缩的日志，只返回元信息
            result.push({
              key,
              logs: [],
              compressed: true
            })
          } else {
            const logs = JSON.parse(data)
            result.push({
              key,
              logs,
              compressed: false
            })
          }
        }
      } catch (error) {
        console.error(`读取日志失败 ${key}:`, error)
      }
    }

    return result
  }

  /**
   * 导出日志（用于下载）
   */
  exportLogs(): string {
    const allLogs = this.getAllLogs()
    return JSON.stringify(allLogs, null, 2)
  }

  /**
   * 清除所有日志
   */
  clearAllLogs(): void {
    const index = this.getLogIndex()
    for (const key of index) {
      localStorage.removeItem(key)
    }
    localStorage.removeItem(this.LOG_INDEX_KEY)
    localStorage.removeItem(this.LOG_CONFIG_KEY)
    this.logBuffer = []
    console.info('所有日志已清除')
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
        // 保存日志到 localStorage
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
  getAllLogs: () => loggerConfig.getAllLogs(),
  exportLogs: () => loggerConfig.exportLogs(),
  clearAllLogs: () => loggerConfig.clearAllLogs(),
  flush: () => loggerConfig.flush()
}

export default logger

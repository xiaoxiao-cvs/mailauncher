import enhancedToastService from './enhancedToastService.js';

/**
 * 全局错误处理器
 * 自动捕获并显示未处理的错误
 */
class GlobalErrorHandler {
  constructor() {
    this.initialized = false;
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  /**
   * 初始化全局错误处理
   */
  init() {
    if (this.initialized) return;

    // Vue错误处理
    if (window.Vue && window.Vue.config) {
      window.Vue.config.errorHandler = this.handleVueError.bind(this);
    }

    // 全局JavaScript错误
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    // Promise未捕获的拒绝
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // 自定义错误事件
    window.addEventListener('app-error', this.handleAppError.bind(this));

    this.initialized = true;
    console.log('🛡️ 全局错误处理器已初始化');
  }

  /**
   * 处理Vue错误
   */
  handleVueError(err, vm, info) {
    console.error('Vue错误:', err, info);
    
    const errorDetails = {
      stack: err.stack,
      context: {
        component: vm?.$options.name || vm?.$options._componentTag || 'Unknown',
        lifecycle: info,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        '检查组件的props和data是否正确',
        '查看Vue DevTools获取更多调试信息',
        '确认模板语法是否正确'
      ]
    };

    enhancedToastService.showError(
      '组件运行时错误',
      errorDetails,
      { 
        duration: 8000,
        size: 'medium'
      }
    );

    this.logError('vue', err, { vm, info });
  }

  /**
   * 处理全局JavaScript错误
   */
  handleGlobalError(event) {
    const { error, filename, lineno, colno, message } = event;
    
    console.error('全局错误:', error || message);

    const errorDetails = {
      stack: error?.stack,
      context: {
        filename: filename,
        line: lineno,
        column: colno,
        message: message,
        timestamp: new Date().toISOString()
      },
      suggestions: [
        '检查控制台中的完整错误信息',
        '确认相关文件是否正确加载',
        '查看网络面板检查资源加载情况'
      ]
    };

    // 过滤一些常见的非关键错误
    if (this.shouldIgnoreError(message)) {
      return;
    }

    enhancedToastService.showError(
      '脚本运行错误',
      errorDetails,
      { 
        duration: 6000,
        size: 'medium'
      }
    );

    this.logError('global', error || new Error(message), { filename, lineno, colno });
  }

  /**
   * 处理未捕获的Promise拒绝
   */
  handleUnhandledRejection(event) {
    console.error('未处理的Promise拒绝:', event.reason);

    const error = event.reason;
    let errorDetails = {};

    if (error instanceof Error) {
      errorDetails = {
        stack: error.stack,
        context: {
          name: error.name,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    } else if (typeof error === 'object') {
      errorDetails = {
        context: {
          details: JSON.stringify(error, null, 2),
          timestamp: new Date().toISOString()
        }
      };
    } else {
      errorDetails = {
        context: {
          details: String(error),
          timestamp: new Date().toISOString()
        }
      };
    }

    errorDetails.suggestions = [
      '检查异步操作的错误处理',
      '确认Promise链中的catch块',
      '查看网络请求是否成功'
    ];

    enhancedToastService.showError(
      '异步操作失败',
      errorDetails,
      { 
        duration: 7000,
        size: 'medium'
      }
    );

    this.logError('promise', error);

    // 阻止控制台输出重复错误
    event.preventDefault();
  }

  /**
   * 处理自定义应用错误
   */
  handleAppError(event) {
    const { error, context, operation } = event.detail;
    
    console.error(`应用错误 [${operation}]:`, error);

    const errorDetails = {
      stack: error?.stack,
      context: {
        operation,
        ...context,
        timestamp: new Date().toISOString()
      },
      suggestions: error?.suggestions || [
        '重试当前操作',
        '检查网络连接',
        '刷新页面重试'
      ]
    };

    enhancedToastService.showError(
      `操作失败: ${operation}`,
      errorDetails,
      { 
        duration: 8000,
        size: 'medium'
      }
    );

    this.logError('app', error, context);
  }

  /**
   * 判断是否应该忽略某些错误
   */
  shouldIgnoreError(message) {
    const ignoredPatterns = [
      /Script error/i,
      /Non-Error promise rejection captured/i,
      /ResizeObserver loop limit exceeded/i,
      /Loading chunk \d+ failed/i
    ];

    return ignoredPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 记录错误到队列
   */
  logError(type, error, context = {}) {
    const errorLog = {
      type,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errorQueue.push(errorLog);

    // 限制队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // 可以在这里添加错误上报逻辑
    this.reportError(errorLog);
  }

  /**
   * 上报错误（可选）
   */
  reportError(errorLog) {
    // 这里可以添加错误上报到服务器的逻辑
    // 例如发送到错误监控服务
    if (process.env.NODE_ENV === 'development') {
      console.log('错误日志:', errorLog);
    }
  }

  /**
   * 手动触发应用错误
   */
  triggerAppError(error, operation, context = {}) {
    const event = new CustomEvent('app-error', {
      detail: { error, operation, context }
    });
    window.dispatchEvent(event);
  }

  /**
   * 获取错误队列
   */
  getErrorQueue() {
    return [...this.errorQueue];
  }

  /**
   * 清空错误队列
   */
  clearErrorQueue() {
    this.errorQueue.length = 0;
  }
}

// 创建全局实例
const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;

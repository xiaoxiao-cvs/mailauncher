/**
 * WebSocket服务
 * 注意：后端已从项目移出，此服务将使用模拟模式
 */
import { isMockModeActive } from "../services/apiService"; // 导入模拟模式检查函数

// 获取当前WebSocket URL
const getWebSocketUrl = (path = "/api/logs/ws") => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
};

// 模拟模式标志 - 如果WebSocket连接失败，我们将使用模拟模式
// let useMockMode = false; // 移除本地的 useMockMode，使用全局的

/**
 * WebSocket服务类
 * 提供可靠的WebSocket连接，支持自动重连功能
 */

export class WebSocketService {
  constructor(options = {}) {
    this.url = options.url;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.autoReconnect = options.autoReconnect !== false;

    this.ws = null;
    this.reconnectAttempts = 0;
    this.listeners = {
      open: [],
      message: [],
      close: [],
      error: [],
    };

    // 后端已从项目移出，使用模拟模式
    console.log("WebSocketService: 后端已从项目移出，启用模拟模式");

    // 模拟WebSocket连接关闭事件
    setTimeout(() => {
      this._trigger("error", { message: "No backend available" });
      this._trigger("close", {
        code: 1000,
        reason: "No backend available, using mock mode",
      });
    }, 500);

    // 启动模拟数据定时器（如果需要模拟消息推送）
    this._startMockDataInterval(options);
  }

  /**
   * 建立WebSocket连接
   * 注意：由于后端已移出，不会实际建立连接
   */
  connect() {
    console.log("WebSocketService: 后端已从项目移出，不尝试建立WebSocket连接");

    // 触发模拟的错误和关闭事件
    setTimeout(() => {
      this._trigger("error", {
        message: "Cannot connect: No backend available",
      });
      this._trigger("close", {
        code: 1000,
        reason: "No backend available, using mock mode",
      });
    }, 300);

    return false;
  }

  /**
   * 安排重新连接
   * @private
   */
  _scheduleReconnect() {
    console.log("WebSocketService: 后端已从项目移出，不尝试重新连接");
    return false;
  }

  /**
   * 启动模拟数据定时器（可选）
   * @private
   */
  _startMockDataInterval(options) {
    // 如果不需要模拟消息推送，可以删除此函数
    if (options.mockMessages === false) {
      return;
    }

    // 获取模拟数据类型
    const mockType = options.url.includes("logs") ? "logs" : "generic";

    // 模拟定期发送消息（每10秒）
    setInterval(() => {
      if (mockType === "logs") {
        const mockLogTypes = ["INFO", "WARNING", "ERROR", "SUCCESS"];
        const mockLogType =
          mockLogTypes[Math.floor(Math.random() * mockLogTypes.length)];

        const now = new Date();
        const time = now.toLocaleTimeString();

        const mockLog = {
          time,
          level: mockLogType,
          message: `[模拟] 这是一条模拟的${mockLogType}级别日志消息 (${now.toISOString()})`,
          source: options.url.includes("system") ? "system" : "instance",
          isMock: true,
        };

        this._trigger("message", mockLog);
      }
    }, 10000); // 每10秒发送一条模拟消息
  }

  /**
   * 发送消息
   * 注意：由于后端已移出，此方法不会实际发送消息
   * @param {*} data 要发送的数据
   */
  send(data) {
    console.warn("WebSocketService: 尝试发送消息，但后端已从项目移出");
    return false;
  }

  /**
   * 关闭连接
   */
  disconnect() {
    // 无需实际操作
  }

  /**
   * 注册事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  off(event, callback) {
    if (!this.listeners[event]) return this;

    if (!callback) {
      this.listeners[event] = [];
    } else {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }
    return this;
  }

  /**
   * 触发事件
   * @param {string} event 事件名称
   * @param {*} data 事件数据
   * @private
   */
  _trigger(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`执行${event}事件监听器失败:`, error);
      }
    });
  }
}

// 创建单例实例用于全局共享
let logWebSocketInstance = null;

/**
 * 获取日志WebSocket服务实例
 * @returns {WebSocketService} WebSocketService实例
 */
export const getLogWebSocketService = () => {
  if (!logWebSocketInstance) {
    logWebSocketInstance = new WebSocketService({
      url: getWebSocketUrl("/api/logs/ws"),
      reconnectDelay: 3000,
      maxReconnectAttempts: 3, // 减少重连尝试次数，更快进入模拟模式
      autoReconnect: true,
    });
  }
  return logWebSocketInstance;
};

export default WebSocketService;

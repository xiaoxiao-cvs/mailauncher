/**
 * WebSocket服务
 * 注意：后端已从项目移出，此服务将使用模拟模式
 */
import { isMockModeActive } from "./apiService"; // 导入模拟模式检查函数
import backendConfig from "@/config/backendConfig"; // 导入后端配置

// 获取当前WebSocket URL
const getWebSocketUrl = (path = "/api/logs/ws") => {
  // 检查是否使用代理模式
  const useProxy = import.meta.env.VITE_USE_PROXY === "true";

  if (useProxy) {
    // 使用代理时，使用当前host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  } else {
    // 不使用代理时，直接连接到后端
    // 使用8095作为日志WebSocket端口
    const protocol = "ws:";
    const logPort = 8095; // 设置默认日志端口为8095
    return `${protocol}//${backendConfig.server.host}:${logPort}${path}`;
  }
};

// 模拟模式标志 - 如果WebSocket连接失败，我们将使用模拟模式
// let useMockMode = false; // 移除本地的 useMockMode，使用全局的

/**
 * WebSocket服务类，用于处理WebSocket连接
 * 支持自动重连和事件订阅
 */
export class WebSocketService {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {string} options.url WebSocket URL
   * @param {boolean} options.autoReconnect 是否自动重连
   * @param {number} options.reconnectDelay 重连延迟(毫秒)
   * @param {number} options.maxReconnectAttempts 最大重连尝试次数
   */
  constructor(options = {}) {
    this.url = options.url || "";
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

    this.websocket = null;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.eventHandlers = {
      open: [],
      close: [],
      message: [],
      error: [],
    };

    // 检查是否为模拟数据模式
    this.useMockMode =
      window._useMockData || localStorage.getItem("useMockData") === "true";

    // 如果是模拟模式，创建一个简单的模拟数据生成器
    if (this.useMockMode) {
      this.mockDataInterval = null;
      this.createMockConnection();
    }
  }
  /**
   * 创建模拟WebSocket连接
   */
  createMockConnection() {
    console.log("[模拟WebSocket] 创建模拟连接");

    // 触发 open 事件
    setTimeout(() => {
      this.triggerEvent("open", { type: "open", isMock: true });

      // 根据URL类型设置不同的模拟数据发送频率
      let interval = 2000; // 默认日志WebSocket频率
      if (this.url && this.url.includes("/api/v1/ws/")) {
        interval = 8000; // 终端WebSocket频率较低，避免太多干扰
      }

      // 开始定期发送模拟数据
      this.mockDataInterval = setInterval(() => {
        this.triggerEvent("message", this.generateMockData());
      }, interval);
    }, 500);
  }
  /**
   * 生成模拟WebSocket数据
   * @returns {Object} 模拟数据
   */
  generateMockData() {
    // 检查URL类型，为不同类型的WebSocket生成不同格式的模拟数据
    if (this.url && this.url.includes("/api/v1/ws/")) {
      // 终端WebSocket模拟数据
      const terminalMessages = [
        "[模拟终端] Bot正在运行...",
        "[模拟终端] 收到新消息处理中",
        "[模拟终端] 插件加载完成",
        "[模拟终端] 数据库连接正常",
        "[模拟终端] 系统状态检查完成",
        "[模拟终端] 处理队列: 0 待处理任务",
        "[模拟终端] 内存使用: 128MB / 512MB",
      ];

      return {
        type: "output",
        data: terminalMessages[
          Math.floor(Math.random() * terminalMessages.length)
        ],
        isMock: true,
      };
    } else {
      // 日志WebSocket模拟数据
      const mockLogs = [
        {
          time: "2023-10-15 12:30:45",
          level: "INFO",
          source: "system",
          message: "[模拟数据] 系统正常运行中",
          isMock: true,
        },
        {
          time: "2023-10-15 12:31:15",
          level: "WARNING",
          source: "system",
          message: "[模拟数据] 检测到系统负载较高",
          isMock: true,
        },
        {
          time: "2023-10-15 12:32:00",
          level: "ERROR",
          source: "system",
          message: "[模拟数据] 无法连接到数据库",
          isMock: true,
        },
        {
          time: "2023-10-15 12:33:20",
          level: "DEBUG",
          source: "system",
          message: "[模拟数据] 调试信息输出",
          isMock: true,
        },
        {
          time: "2023-10-15 12:34:05",
          level: "INFO",
          source: "system",
          message: "[模拟数据] API调用成功",
          isMock: true,
        },
      ];

      // 随机返回一条日志
      return mockLogs[Math.floor(Math.random() * mockLogs.length)];
    }
  }

  /**
   * 建立WebSocket连接
   */
  connect() {
    // 如果是模拟模式，不创建真实连接
    if (this.useMockMode) {
      return;
    }

    if (
      this.websocket &&
      (this.websocket.readyState === WebSocket.CONNECTING ||
        this.websocket.readyState === WebSocket.OPEN)
    ) {
      console.warn("WebSocket已经处于连接状态，不需要重复连接");
      return;
    }

    try {
      this.websocket = new WebSocket(this.url);

      this.websocket.onopen = (event) => {
        console.log("WebSocket连接已建立:", this.url);
        this.reconnectAttempts = 0;
        this.triggerEvent("open", event);
      };
      this.websocket.onclose = (event) => {
        console.log("WebSocket连接已关闭:", event.code, event.reason);
        this.triggerEvent("close", event);

        // 如果是异常关闭（code 1006表示连接异常中断），且不是模拟模式，考虑切换到模拟模式
        if (event.code === 1006 && !this.useMockMode) {
          console.warn("WebSocket异常关闭，可能是后端错误，准备切换到模拟模式");
          this.reconnectAttempts++; // 增加重连计数
        }

        if (this.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.websocket.onmessage = (event) => {
        let data = event.data;
        try {
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
        } catch (e) {
          // 如果解析失败，保持原始数据格式
        }
        this.triggerEvent("message", data);
      };
      this.websocket.onerror = (event) => {
        console.error("WebSocket错误:", event);
        this.triggerEvent("error", event);

        // 如果连接失败且还没有切换到模拟模式，则自动切换
        if (
          !this.useMockMode &&
          this.reconnectAttempts >= this.maxReconnectAttempts
        ) {
          console.warn("WebSocket连接失败次数过多，自动切换到模拟模式");
          this.switchToMockMode();
        }
      };
    } catch (error) {
      console.error("WebSocket连接失败:", error);
      this.triggerEvent("error", { error });

      // 如果连接失败且还没有切换到模拟模式，增加重连计数
      if (!this.useMockMode) {
        if (
          this.autoReconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        } else {
          console.warn("WebSocket连接失败，自动切换到模拟模式");
          this.switchToMockMode();
        }
      }
    }
  }
  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (
      this.maxReconnectAttempts &&
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      console.warn(
        `WebSocket已达到最大重连尝试次数(${this.maxReconnectAttempts})，切换到模拟模式`
      );
      this.switchToMockMode();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay;

    console.log(
      `WebSocket将在${delay}毫秒后尝试重连(第${this.reconnectAttempts}次)`
    );

    this.reconnectTimeout = setTimeout(() => {
      console.log(`WebSocket正在尝试重连(第${this.reconnectAttempts}次)...`);
      this.connect();
    }, delay);
  }

  /**
   * 断开WebSocket连接
   * @param {number} code 关闭代码
   * @param {string} reason 关闭原因
   */
  disconnect(code = 1000, reason = "Normal closure") {
    // 如果是模拟模式，清除模拟数据定时器
    if (this.useMockMode && this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
      this.triggerEvent("close", { code, reason, isMock: true });
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.websocket) {
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close(code, reason);
      }
      this.websocket = null;
    }
  }

  /**
   * 发送数据
   * @param {*} data 要发送的数据
   * @returns {boolean} 是否发送成功
   */
  send(data) {
    // 模拟模式下，模拟发送成功
    if (this.useMockMode) {
      console.log("[模拟WebSocket] 发送数据:", data);
      return true;
    }

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket未连接，无法发送数据");
      return false;
    }

    try {
      const message = typeof data === "object" ? JSON.stringify(data) : data;
      this.websocket.send(message);
      return true;
    } catch (error) {
      console.error("WebSocket发送数据失败:", error);
      return false;
    }
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {*} data 事件数据
   */
  triggerEvent(eventName, data) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`执行${eventName}事件处理器出错:`, error);
        }
      });
    }
  }

  /**
   * 注册事件处理函数
   * @param {string} eventName 事件名称
   * @param {Function} handler 处理函数
   */
  on(eventName, handler) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(handler);
  }

  /**
   * 移除事件处理函数
   * @param {string} eventName 事件名称
   * @param {Function} handler 处理函数 (如果不指定，则移除所有该事件的处理函数)
   */
  off(eventName, handler) {
    if (!this.eventHandlers[eventName]) return;

    if (handler) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        (h) => h !== handler
      );
    } else {
      this.eventHandlers[eventName] = [];
    }
  }

  /**
   * 获取WebSocket当前状态
   * @returns {number} WebSocket状态码
   */
  getState() {
    if (this.useMockMode) {
      return WebSocket.OPEN; // 模拟模式下返回连接状态
    }
    return this.websocket ? this.websocket.readyState : WebSocket.CLOSED;
  }

  /**
   * 切换到模拟模式
   */
  switchToMockMode() {
    console.log("[WebSocket] 切换到模拟模式");
    this.useMockMode = true;

    // 清理现有的WebSocket连接
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // 清理重连定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 启动模拟连接
    this.createMockConnection();
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

// 创建单例实例用于终端WebSocket连接
let terminalWebSocketInstances = new Map();

/**
 * 获取或创建终端WebSocket服务实例
 * @param {string} sessionId 会话ID，格式为 {instance_id}_{type}
 * @returns {WebSocketService} WebSocketService实例
 */
export const getTerminalWebSocketService = (sessionId) => {
  // 检查是否已存在该会话的连接
  if (terminalWebSocketInstances.has(sessionId)) {
    const existingInstance = terminalWebSocketInstances.get(sessionId);
    if (existingInstance && existingInstance.getState() === WebSocket.OPEN) {
      return existingInstance;
    } else {
      // 清理无效连接
      terminalWebSocketInstances.delete(sessionId);
    }
  }
  // 创建新的终端WebSocket连接
  const terminalWS = new WebSocketService({
    url: getWebSocketUrl(`/api/v1/ws/${sessionId}`),
    reconnectDelay: 1500, // 减少重连延迟
    maxReconnectAttempts: 1, // 减少最大重连次数，更快进入模拟模式
    autoReconnect: true,
  });

  // 存储实例
  terminalWebSocketInstances.set(sessionId, terminalWS);

  // 监听连接关闭，清理实例
  terminalWS.on("close", () => {
    terminalWebSocketInstances.delete(sessionId);
  });

  return terminalWS;
};

/**
 * 关闭指定会话的终端WebSocket连接
 * @param {string} sessionId 会话ID
 */
export const closeTerminalWebSocket = (sessionId) => {
  if (terminalWebSocketInstances.has(sessionId)) {
    const instance = terminalWebSocketInstances.get(sessionId);
    instance.disconnect();
    terminalWebSocketInstances.delete(sessionId);
  }
};

/**
 * 关闭所有终端WebSocket连接
 */
export const closeAllTerminalWebSockets = () => {
  for (const [sessionId, instance] of terminalWebSocketInstances) {
    instance.disconnect();
  }
  terminalWebSocketInstances.clear();
};

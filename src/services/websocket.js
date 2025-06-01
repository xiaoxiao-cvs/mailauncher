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
    // 使用后端配置的端口
    const protocol = "ws:";
    return `${protocol}//${backendConfig.server.host}:${backendConfig.server.port}${path}`;
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
   */ constructor(options = {}) {
    this.url = options.url || "";
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 1000; // 缩短重连延迟到1秒
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.heartbeatTimeout = null;
    this.heartbeatInterval = options.heartbeatInterval || 2000; // 2秒心跳，更快检测连接状态
    this.lastHeartbeat = null;
    this.connectionStartTime = null; // 记录连接开始时间，用于日志恢复
    this.visibilityListenerAdded = false; // 标记是否已添加页面可见性监听器
    this.visibilityChangeHandler = null; // 保存监听器函数引用
    this.visibilityReconnectTimer = null; // 页面可见性重连计时器
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

    // 页面可见性变化监听
    this.setupVisibilityListener();
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
        this.connectionStartTime = Date.now();
        this.startHeartbeat(); // 启动心跳机制

        // 对于终端WebSocket，在连接建立后请求历史日志恢复
        if (this.url && this.url.includes("/api/v1/ws/")) {
          // 延迟一下再请求历史日志，确保连接稳定
          setTimeout(() => {
            this.requestHistoryLogs();
          }, 100);
        }

        this.triggerEvent("open", event);
      };
      this.websocket.onclose = (event) => {
        console.log("WebSocket连接已关闭:", event.code, event.reason);
        this.stopHeartbeat(); // 停止心跳机制
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

        // 处理心跳响应
        if (data && data.type === "pong") {
          this.lastHeartbeat = Date.now();
          return; // 不触发普通消息事件
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
   * 安排重连 - 智能重连机制
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

    // 智能重连延迟：指数退避算法，但有上限
    const baseDelay = this.reconnectDelay;
    const maxDelay = 15000; // 最大延迟15秒
    const delay = Math.min(
      baseDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      maxDelay
    );

    console.log(
      `WebSocket将在${Math.round(delay)}毫秒后尝试重连(第${
        this.reconnectAttempts
      }次)`
    );

    this.reconnectTimeout = setTimeout(() => {
      // 检查页面可见性，如果页面不可见则延迟重连
      if (document.visibilityState === "hidden") {
        console.log("页面不可见，延迟重连...");
        this.scheduleReconnect(); // 递归调用，增加延迟
        return;
      }

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

    // 清理定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 清理页面可见性重连计时器
    if (this.visibilityReconnectTimer) {
      clearTimeout(this.visibilityReconnectTimer);
      this.visibilityReconnectTimer = null;
    }

    // 清理页面可见性监听器
    this.removeVisibilityListener();

    this.stopHeartbeat(); // 停止心跳

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

    // 清理重连和心跳定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    // 启动模拟连接
    this.createMockConnection();
  }
  /**
   * 设置页面可见性监听器
   */
  setupVisibilityListener() {
    // 避免重复设置监听器
    if (this.visibilityListenerAdded) {
      return;
    }

    this.visibilityChangeHandler = () => {
      if (document.visibilityState === "visible" && !this.useMockMode) {
        // 页面变为可见时检查连接状态，但要避免频繁重连
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          console.log("页面重新可见，WebSocket连接已断开，尝试重连...");
          // 添加防抖延迟，避免频繁重连
          clearTimeout(this.visibilityReconnectTimer);
          this.visibilityReconnectTimer = setTimeout(() => {
            this.connect();
          }, 1000); // 1秒延迟
        } else {
          console.log("页面重新可见，WebSocket连接正常");
        }
      }
    };

    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
    this.visibilityListenerAdded = true;
  }
  /**
   * 移除页面可见性监听器
   */
  removeVisibilityListener() {
    if (this.visibilityChangeHandler && this.visibilityListenerAdded) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
      this.visibilityListenerAdded = false;
      this.visibilityChangeHandler = null;
    }
  }

  /**
   * 启动心跳机制
   */
  startHeartbeat() {
    if (this.useMockMode) return;

    this.stopHeartbeat(); // 先清理已有的心跳
    this.lastHeartbeat = Date.now();
    this.connectionStartTime = Date.now(); // 记录连接建立时间

    this.heartbeatTimeout = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // 发送心跳包，只在首次连接时包含连接开始时间用于日志恢复
        const pingMessage = {
          type: "ping",
          timestamp: Date.now(),
        };

        // 只在首次心跳时请求历史日志恢复
        if (
          this.connectionStartTime &&
          Date.now() - this.connectionStartTime < this.heartbeatInterval * 2
        ) {
          pingMessage.connectionStartTime = this.connectionStartTime;
        }

        this.send(pingMessage);

        // 检查上次心跳响应 - 缩短超时判断时间
        const now = Date.now();
        if (
          this.lastHeartbeat &&
          now - this.lastHeartbeat > this.heartbeatInterval * 1.5 // 从2倍改为1.5倍，更快检测断线
        ) {
          console.warn("心跳超时，重新连接...");
          this.websocket.close(1000, "Heartbeat timeout");
        }
      }
    }, this.heartbeatInterval);
  }
  /**
   * 停止心跳机制
   */
  stopHeartbeat() {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * 请求历史日志
   */
  requestHistoryLogs() {
    if (this.useMockMode) return;

    // 发送历史日志请求消息
    const historyRequest = {
      type: "request_history",
      timestamp: Date.now(),
      // 请求从程序启动到现在的所有日志
      fromTime: this.connectionStartTime || Date.now() - 24 * 60 * 60 * 1000, // 默认24小时内的日志
      toTime: Date.now(),
    };

    console.log("请求历史日志:", historyRequest);
    this.send(historyRequest);
  }
  /**
   * 检查连接状态并尝试恢复
   */
  checkConnectionHealth() {
    if (this.useMockMode) return true;

    const isConnected =
      this.websocket && this.websocket.readyState === WebSocket.OPEN;

    if (!isConnected) {
      console.log(
        `WebSocket连接断开，当前状态: ${this.websocket?.readyState || "null"}`
      );

      if (this.autoReconnect) {
        console.log("检测到连接断开，尝试重连...");
        this.connect();
      }
    } else {
      // 连接正常，重置重连计数
      this.reconnectAttempts = 0;
    }

    return isConnected;
  }

  /**
   * 强制重新连接
   */
  forceReconnect() {
    console.log("强制重新连接WebSocket");

    if (this.useMockMode) {
      console.log("模拟模式下无需重连");
      return;
    }

    // 先断开现有连接
    if (this.websocket) {
      this.websocket.close(1000, "Force reconnect");
    }

    // 清理状态
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 重置重连计数
    this.reconnectAttempts = 0;

    // 立即重连
    setTimeout(() => {
      this.connect();
    }, 100);
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
      reconnectDelay: 1000, // 缩短日志WebSocket重连延迟
      heartbeatInterval: 2000, // 2秒心跳间隔，更快响应
      maxReconnectAttempts: 5, // 增加重连尝试次数
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
 * @param {boolean} forceReconnect 是否强制重新连接
 * @returns {WebSocketService} WebSocketService实例
 */
export const getTerminalWebSocketService = (
  sessionId,
  forceReconnect = false
) => {
  // 如果强制重连，先清理现有连接
  if (forceReconnect && terminalWebSocketInstances.has(sessionId)) {
    const existingInstance = terminalWebSocketInstances.get(sessionId);
    if (existingInstance) {
      console.log(`[终端WebSocket] 强制重连，清理现有连接: ${sessionId}`);
      existingInstance.disconnect();
    }
    terminalWebSocketInstances.delete(sessionId);
  }
  // 检查是否已存在该会话的连接
  if (terminalWebSocketInstances.has(sessionId)) {
    const existingInstance = terminalWebSocketInstances.get(sessionId);

    // 更严格的连接状态检查
    const isHealthy =
      existingInstance &&
      (existingInstance.useMockMode ||
        existingInstance.getState() === WebSocket.OPEN);

    if (isHealthy) {
      console.log(`[终端WebSocket] 复用现有连接: ${sessionId}`, {
        状态: existingInstance.getState(),
        模拟模式: existingInstance.useMockMode,
        重连次数: existingInstance.reconnectAttempts,
        最后心跳: existingInstance.lastHeartbeat
          ? new Date(existingInstance.lastHeartbeat).toLocaleTimeString()
          : "无",
      });

      // 如果是真实连接，检查连接健康状态
      if (!existingInstance.useMockMode) {
        const healthCheck = existingInstance.checkConnectionHealth();
        if (!healthCheck) {
          console.warn(
            `[终端WebSocket] 健康检查失败，强制重新连接: ${sessionId}`
          );
          existingInstance.forceReconnect();
        }
      }

      return existingInstance;
    } else {
      // 清理无效连接
      console.log(
        `[终端WebSocket] 清理无效连接: ${sessionId}, 状态: ${existingInstance?.getState()}`
      );
      if (existingInstance) {
        existingInstance.disconnect();
      }
      terminalWebSocketInstances.delete(sessionId);
    }
  } // 创建新的终端WebSocket连接
  const terminalWS = new WebSocketService({
    url: getWebSocketUrl(`/api/v1/ws/${sessionId}`),
    reconnectDelay: 800, // 进一步缩短重连延迟，提高响应性
    heartbeatInterval: 2000, // 2秒心跳，更快检测连接状态
    maxReconnectAttempts: 8, // 增加重连尝试次数
    autoReconnect: true,
  });

  console.log(`[终端WebSocket] 创建新连接: ${sessionId}`);

  // 存储实例
  terminalWebSocketInstances.set(sessionId, terminalWS);

  // 监听连接关闭，清理实例
  terminalWS.on("close", (event) => {
    console.log(`[终端WebSocket] 连接关闭: ${sessionId}`, event);
    // 只有在正常关闭或者不再需要重连时才删除实例
    if (!event.isMock && (!terminalWS.autoReconnect || event.code === 1000)) {
      terminalWebSocketInstances.delete(sessionId);
    }
  });

  // 监听连接错误
  terminalWS.on("error", (error) => {
    console.error(`[终端WebSocket] 连接错误: ${sessionId}`, error);
  });

  // 监听重连成功
  terminalWS.on("open", (event) => {
    if (event.isMock) {
      console.log(`[终端WebSocket] 模拟连接建立: ${sessionId}`);
    } else {
      console.log(`[终端WebSocket] 连接建立成功: ${sessionId}`);
    }
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

/**
 * 获取终端WebSocket连接状态
 * @param {string} sessionId 会话ID
 * @returns {Object} 连接状态信息
 */
export const getTerminalWebSocketStatus = (sessionId) => {
  if (terminalWebSocketInstances.has(sessionId)) {
    const instance = terminalWebSocketInstances.get(sessionId);
    return {
      exists: true,
      state: instance.getState(),
      isMockMode: instance.useMockMode,
      reconnectAttempts: instance.reconnectAttempts,
    };
  }
  return {
    exists: false,
    state: WebSocket.CLOSED,
    isMockMode: false,
    reconnectAttempts: 0,
  };
};

/**
 * 重连指定的终端WebSocket
 * @param {string} sessionId 会话ID
 * @returns {boolean} 是否成功触发重连
 */
export const reconnectTerminalWebSocket = (sessionId) => {
  if (terminalWebSocketInstances.has(sessionId)) {
    const instance = terminalWebSocketInstances.get(sessionId);
    if (instance.getState() !== WebSocket.OPEN) {
      console.log(`[终端WebSocket] 手动触发重连: ${sessionId}`);
      instance.connect();
      return true;
    }
  }
  return false;
};

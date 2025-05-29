/**
 * 部署专用WebSocket服务
 * 用于处理部署过程中的实时通信和日志接收
 */
import backendConfig from "@/config/backendConfig";

export class DeployWebSocketService {
  constructor() {
    this.websocket = null;
    this.connected = false;
    this.sessionId = null;
    this.eventHandlers = {
      open: [],
      close: [],
      message: [],
      error: [],
      progress: [],
      completed: [],
      status: [],
    };

    // 连接配置
    this.maxReconnectAttempts = 3;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
  }

  /**
   * 建立WebSocket连接
   * @param {Object} options 连接选项
   * @returns {Promise<string>} 返回sessionId
   */
  async connect(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 生成唯一的会话ID
        this.sessionId =
          options.sessionId ||
          `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 构建WebSocket URL
        const wsUrl = this.buildWebSocketUrl(this.sessionId);

        console.log(`[DeployWebSocket] 连接到: ${wsUrl}`);

        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = (event) => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log(
            `[DeployWebSocket] 连接已建立 (会话ID: ${this.sessionId})`
          );
          this.triggerEvent("open", { sessionId: this.sessionId, event });
          resolve(this.sessionId);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.websocket.onclose = (event) => {
          this.connected = false;
          console.log(
            `[DeployWebSocket] 连接已关闭: ${event.code} ${event.reason}`
          );
          this.triggerEvent("close", {
            code: event.code,
            reason: event.reason,
          });

          // 如果是异常关闭，尝试重连
          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        this.websocket.onerror = (error) => {
          this.connected = false;
          console.error(`[DeployWebSocket] 连接错误:`, error);
          this.triggerEvent("error", { error });
          reject(error);
        };

        // 设置连接超时
        setTimeout(() => {
          if (!this.connected) {
            this.disconnect();
            reject(new Error("WebSocket连接超时"));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 构建WebSocket URL
   * @param {string} sessionId 会话ID
   * @returns {string} WebSocket URL
   */
  buildWebSocketUrl(sessionId) {
    const useProxy = import.meta.env.VITE_USE_PROXY === "true";

    if (useProxy) {
      // 使用代理模式
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}/api/v1/ws/${sessionId}`;
    } else {
      // 直接连接后端
      const backendUrl = backendConfig.getBackendUrl();
      const url = new URL(backendUrl);
      const protocol = url.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${url.host}/api/v1/ws/${sessionId}`;
    }
  }

  /**
   * 处理接收到的消息
   * @param {MessageEvent} event WebSocket消息事件
   */
  handleMessage(event) {
    try {
      let data = event.data;

      // 尝试解析JSON
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // 如果不是JSON，作为纯文本处理
          data = { type: "output", data: event.data };
        }
      }

      console.log(`[DeployWebSocket] 收到消息:`, data);

      // 触发通用消息事件
      this.triggerEvent("message", data);

      // 根据消息类型触发特定事件
      if (data.type) {
        switch (data.type) {
          case "progress":
            this.triggerEvent("progress", data);
            break;
          case "status":
            this.triggerEvent("status", data);
            break;
          case "completed":
            this.triggerEvent("completed", data);
            break;
          case "error":
            this.triggerEvent("error", data);
            break;
          case "output":
            this.triggerEvent("output", data);
            break;
        }
      }
    } catch (error) {
      console.error(`[DeployWebSocket] 处理消息失败:`, error);
    }
  }

  /**
   * 发送消息
   * @param {Object|string} data 要发送的数据
   * @returns {boolean} 是否发送成功
   */
  send(data) {
    if (!this.connected || !this.websocket) {
      console.warn(`[DeployWebSocket] 连接未建立，无法发送消息`);
      return false;
    }

    try {
      const message = typeof data === "object" ? JSON.stringify(data) : data;
      this.websocket.send(message);
      console.log(`[DeployWebSocket] 发送消息:`, data);
      return true;
    } catch (error) {
      console.error(`[DeployWebSocket] 发送消息失败:`, error);
      return false;
    }
  }

  /**
   * 发送部署参数
   * @param {Object} deployConfig 部署配置
   */
  sendDeployConfig(deployConfig) {
    return this.send({
      type: "deploy_start",
      config: deployConfig,
    });
  }

  /**
   * 断开连接
   * @param {number} code 关闭代码
   * @param {string} reason 关闭原因
   */
  disconnect(code = 1000, reason = "Normal closure") {
    if (this.websocket) {
      this.websocket.close(code, reason);
      this.websocket = null;
    }
    this.connected = false;
    this.sessionId = null;
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        `[DeployWebSocket] 已达到最大重连次数 (${this.maxReconnectAttempts})`
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[DeployWebSocket] ${this.reconnectDelay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`
    );

    setTimeout(() => {
      if (!this.connected && this.sessionId) {
        this.connect({ sessionId: this.sessionId });
      }
    }, this.reconnectDelay);
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
   * @param {Function} handler 处理函数
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
          console.error(
            `[DeployWebSocket] 事件处理函数执行失败 (${eventName}):`,
            error
          );
        }
      });
    }
  }

  /**
   * 获取当前连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 获取会话ID
   * @returns {string|null} 当前会话ID
   */
  getSessionId() {
    return this.sessionId;
  }
}

// 创建单例实例
export const deployWebSocketService = new DeployWebSocketService();

export default deployWebSocketService;

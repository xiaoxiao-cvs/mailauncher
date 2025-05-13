/**
 * WebSocket服务
 * 统一处理WebSocket连接管理、消息处理、重连等逻辑
 */

// 获取当前WebSocket URL
const getWebSocketUrl = (path = '/api/logs/ws') => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
};

// 模拟模式标志 - 如果WebSocket连接失败，我们将使用模拟模式
let useMockMode = false;

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
      error: []
    };
    
    if (this.url) {
      this.connect();
    }
  }
  
  /**
   * 建立WebSocket连接
   */
  connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.warn('WebSocket已经连接，不需要重新连接');
      return;
    }
    
    try {
      console.log('正在连接WebSocket:', this.url);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket连接已建立');
        this.reconnectAttempts = 0;
        this._trigger('open', event);
      };
      
      this.ws.onmessage = (event) => {
        let data = event.data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          // 如果不是JSON，保持原样
        }
        this._trigger('message', data);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket连接已关闭');
        this._trigger('close', event);
        
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect();
        }
      };
      
      this.ws.onerror = (event) => {
        console.error('WebSocket错误:', event);
        this._trigger('error', event);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this._scheduleReconnect();
      }
    }
  }
  
  /**
   * 安排重新连接
   * @private
   */
  _scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(`计划重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      console.log(`尝试重新连接 #${this.reconnectAttempts}`);
      this.connect();
    }, this.reconnectDelay);
  }
  
  /**
   * 发送消息
   * @param {*} data 要发送的数据
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('无法发送消息，WebSocket未连接');
      return false;
    }
    
    try {
      let message = data;
      if (typeof data === 'object') {
        message = JSON.stringify(data);
      }
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }
  
  /**
   * 关闭连接
   */
  disconnect() {
    if (this.ws) {
      this.autoReconnect = false;
      this.ws.close();
    }
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
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
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
    this.listeners[event].forEach(callback => {
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
      url: getWebSocketUrl('/api/logs/ws'),
      reconnectDelay: 3000,
      maxReconnectAttempts: 3, // 减少重连尝试次数，更快进入模拟模式
      autoReconnect: true
    });
  }
  return logWebSocketInstance;
};

export default WebSocketService;

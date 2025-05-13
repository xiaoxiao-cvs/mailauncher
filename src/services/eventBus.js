/**
 * 事件总线
 * 用于组件间通信的简单实现
 */
class EventBus {
  constructor() {
    this._events = {};
  }

  /**
   * 添加事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this; // 支持链式调用
  }

  /**
   * 发布事件
   * @param {string} event 事件名称
   * @param {...any} args 事件参数
   */
  emit(event, ...args) {
    if (!this._events[event]) return;
    this._events[event].forEach((callback) => callback(...args));
    return this; // 支持链式调用
  }

  /**
   * 移除事件监听器
   * @param {string} event 事件名称
   * @param {Function} callback 要移除的回调函数，如果不提供则移除该事件的所有监听器
   */
  off(event, callback) {
    if (!this._events[event]) return;
    if (callback) {
      this._events[event] = this._events[event].filter((cb) => cb !== callback);
    } else {
      delete this._events[event];
    }
    return this; // 支持链式调用
  }

  /**
   * 只监听一次事件
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * 清空所有事件监听器
   */
  clear() {
    this._events = {};
    return this; // 支持链式调用
  }
}

// 创建全局单例实例
const eventBus = new EventBus();

export default eventBus;

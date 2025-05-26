/**
 * 改进版事件总线
 * 包含防抖和事件跟踪功能，避免事件泛滥和循环触发
 */

class EventBus {
  constructor() {
    this.events = {};
    this.eventStats = {}; // 用于跟踪事件触发统计
    this.debug = false;
  }

  // 开启调试模式
  enableDebug() {
    this.debug = true;
    console.log("事件总线调试模式已开启");
  }

  // 添加事件监听
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
      this.eventStats[event] = {
        listeners: 0,
        triggered: 0,
        lastTrigger: null,
      };
    }

    // 避免重复添加相同的回调函数
    const callbackExists = this.events[event].some((cb) => cb === callback);
    if (!callbackExists) {
      this.events[event].push(callback);
      this.eventStats[event].listeners++;

      if (this.debug) {
        console.log(
          `[EventBus] 已添加事件监听: ${event}, 当前监听器数量: ${this.eventStats[event].listeners}`
        );
      }
    } else if (this.debug) {
      console.warn(`[EventBus] 尝试添加重复的事件监听: ${event}`);
    }
  }

  // 移除事件监听
  off(event, callback) {
    if (!this.events[event]) return;

    if (callback) {
      // 移除特定回调
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
      if (this.events[event].length === 0) {
        delete this.events[event];
        if (this.debug) {
          console.log(`[EventBus] 已移除所有 ${event} 事件监听器`);
        }
      } else {
        this.eventStats[event].listeners = this.events[event].length;
        if (this.debug) {
          console.log(
            `[EventBus] 已移除 ${event} 事件的一个监听器, 剩余: ${this.events[event].length}`
          );
        }
      }
    } else {
      // 移除所有回调
      delete this.events[event];
      if (this.debug) {
        console.log(`[EventBus] 已移除所有 ${event} 事件监听器`);
      }
    }
  }

  // 触发事件
  emit(event, ...args) {
    if (!this.events[event]) return;

    // 记录事件统计
    this.eventStats[event].triggered++;
    this.eventStats[event].lastTrigger = new Date();

    // 检测可能的事件泛滥
    const now = Date.now();
    if (
      this.eventStats[event].lastTriggerTime &&
      now - this.eventStats[event].lastTriggerTime < 100 &&
      this.eventStats[event].recentTriggers > 10
    ) {
      console.warn(`[EventBus] 检测到事件泛滥: ${event} 在短时间内触发了多次`);
      // 重置并延迟执行
      this.eventStats[event].recentTriggers = 0;
      setTimeout(() => this._executeEvent(event, args), 100);
      return;
    }

    this.eventStats[event].lastTriggerTime = now;
    this.eventStats[event].recentTriggers =
      (this.eventStats[event].recentTriggers || 0) + 1;

    // 正常执行事件
    this._executeEvent(event, args);
  }

  // 实际执行事件回调
  _executeEvent(event, args) {
    if (this.debug) {
      console.log(
        `[EventBus] 触发事件: ${event}, 监听器数量: ${this.events[event].length}`
      );
    }

    this.events[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventBus] 事件处理错误: ${event}`, error);
      }
    });
  }

  // 清除所有事件监听
  clear() {
    this.events = {};
    this.eventStats = {};
    if (this.debug) {
      console.log("[EventBus] 已清除所有事件监听器");
    }
  }

  // 获取事件统计
  getStats() {
    return this.eventStats;
  }
}

// 创建单例
const eventBus = new EventBus();

// 在开发环境中启用调试
if (import.meta.env.DEV) {
  eventBus.enableDebug();
}

export default eventBus;

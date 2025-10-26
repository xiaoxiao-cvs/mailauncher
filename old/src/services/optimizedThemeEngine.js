/**
 * 优化的主题切换引擎
 * 解决强制重排和性能问题
 */

class OptimizedThemeEngine {
  constructor() {
    this.currentTheme = 'light';
    this.isTransitioning = false;
    this.pendingAnimationFrame = null;
    this.performanceMetrics = {
      switchCount: 0,
      totalTime: 0,
      averageTime: 0
    };
    
    // 预计算的样式缓存
    this.themeStyles = new Map();
    this.cachedElements = new WeakMap();
    
    this.init();
  }

  init() {
    // 检测当前主题
    this.currentTheme = this.detectCurrentTheme();
    
    // 预计算样式
    this.precomputeStyles();
    
    // 设置性能优化
    this.setupPerformanceOptimizations();
    
    console.log('🚀 OptimizedThemeEngine initialized');
  }

  detectCurrentTheme() {
    return document.documentElement.dataset.theme || 
           localStorage.getItem('theme') || 
           'light';
  }

  precomputeStyles() {
    this.themeStyles.set('light', {
      'data-theme': 'light',
      'data-bs-theme': 'light',
      className: 'theme-light'
    });
    
    this.themeStyles.set('dark', {
      'data-theme': 'dark', 
      'data-bs-theme': 'dark',
      className: 'theme-dark'
    });
  }

  setupPerformanceOptimizations() {
    // 注入性能优化CSS
    if (!document.getElementById('theme-performance-optimizations')) {
      const style = document.createElement('style');
      style.id = 'theme-performance-optimizations';
      style.textContent = `
        /* 禁用所有动画和过渡 */
        .theme-switching,
        .theme-switching *,
        .theme-switching *::before,
        .theme-switching *::after {
          transition: none !important;
          animation: none !important;
          transform: none !important;
        }
        
        /* GPU加速优化 */
        html {
          will-change: auto;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        /* 减少重绘区域 */
        .content-area,
        .sidebar,
        .settings-drawer-container {
          contain: layout style paint;
        }
        
        /* 避免复杂选择器 */
        [data-theme="dark"] { color-scheme: dark; }
        [data-theme="light"] { color-scheme: light; }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 切换主题 - 主要入口
   */
  async toggle() {
    if (this.isTransitioning) {
      return Promise.resolve();
    }
    
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    return this.switchTheme(newTheme);
  }

  /**
   * 切换到指定主题 - 优化版本
   */
  async switchTheme(theme) {
    if (this.isTransitioning || this.currentTheme === theme) {
      return Promise.resolve();
    }

    const startTime = performance.now();
    this.isTransitioning = true;
    this.performanceMetrics.switchCount++;

    try {
      // 使用 requestAnimationFrame 批量处理DOM更新
      await new Promise(resolve => {
        this.pendingAnimationFrame = requestAnimationFrame(() => {
          this.performOptimizedSwitch(theme);
          resolve();
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      this.updatePerformanceMetrics(duration);
      
      console.log(`⚡ Theme switched to ${theme} in ${duration.toFixed(2)}ms`);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Theme switch failed:', error);
      return Promise.reject(error);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * 执行优化的主题切换
   */
  performOptimizedSwitch(theme) {
    // 1. 立即禁用所有动画
    document.documentElement.classList.add('theme-switching');
    
    // 2. 批量更新DOM属性 - 避免强制重排
    this.batchUpdateDOMAttributes(theme);
    
    // 3. 更新状态
    this.currentTheme = theme;
    
    // 4. 异步恢复动画和通知
    setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
      this.notifyThemeChange(theme);
      this.saveThemeSettings(theme);
    }, 16); // 一帧后恢复
  }

  /**
   * 批量更新DOM属性 - 避免重复查询
   */
  batchUpdateDOMAttributes(theme) {
    const root = document.documentElement;
    const body = document.body;
    const themeData = this.themeStyles.get(theme);
    
    // 使用 DocumentFragment 来批量更新
    const updates = () => {
      // 更新根元素
      Object.entries(themeData).forEach(([key, value]) => {
        if (key !== 'className') {
          root.setAttribute(key, value);
        }
      });
      
      // 更新body
      body.setAttribute('data-theme', theme);
      body.setAttribute('data-bs-theme', theme);
      
      // 更新主要容器的data-theme属性
      const containers = ['app-container', 'content-area', 'home-view', 'instances-panel'];
      containers.forEach(className => {
        const elements = document.getElementsByClassName(className);
        for (let i = 0; i < elements.length; i++) {
          elements[i].setAttribute('data-theme', theme);
        }
      });
    };
    
    // 在单个DOM更新周期内完成所有更新
    updates();
  }

  /**
   * 通知主题变更
   */
  notifyThemeChange(theme) {
    try {
      // 发送自定义事件
      const event = new CustomEvent('theme-changed', {
        detail: { 
          theme,
          timestamp: Date.now(),
          engine: 'optimized',
          performance: this.performanceMetrics
        },
        bubbles: false
      });
      document.dispatchEvent(event);
      
      // 兼容旧的事件
      window.dispatchEvent(new CustomEvent('theme-changed-after', {
        detail: { theme }
      }));
      
    } catch (e) {
      console.warn('Cannot dispatch theme event:', e);
    }
  }

  /**
   * 异步保存主题设置
   */
  saveThemeSettings(theme) {
    // 使用 setTimeout 确保不阻塞主线程
    setTimeout(() => {
      try {
        localStorage.setItem('theme', theme);
        localStorage.setItem('darkMode', (theme === 'dark').toString());
      } catch (e) {
        console.warn('Cannot save theme settings:', e);
      }
    }, 0);
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(duration) {
    this.performanceMetrics.totalTime += duration;
    this.performanceMetrics.averageTime = 
      this.performanceMetrics.totalTime / this.performanceMetrics.switchCount;
  }

  /**
   * 预热主题切换
   */
  preWarm() {
    // 预热DOM查询
    document.documentElement.getAttribute('data-theme');
    document.body.getAttribute('data-theme');
    
    // 预热样式计算
    const computedStyle = getComputedStyle(document.documentElement);
    computedStyle.getPropertyValue('--bg-color');
  }

  /**
   * 强制同步主题状态
   */
  syncTheme() {
    const domTheme = document.documentElement.dataset.theme;
    if (domTheme && domTheme !== this.currentTheme) {
      this.currentTheme = domTheme;
      console.log(`Theme synced to: ${domTheme}`);
    }
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      currentTheme: this.currentTheme,
      isTransitioning: this.isTransitioning
    };
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats() {
    this.performanceMetrics = {
      switchCount: 0,
      totalTime: 0,
      averageTime: 0
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.pendingAnimationFrame) {
      cancelAnimationFrame(this.pendingAnimationFrame);
    }
    
    document.documentElement.classList.remove('theme-switching');
    
    const style = document.getElementById('theme-performance-optimizations');
    if (style) style.remove();
    
    console.log('OptimizedThemeEngine destroyed');
  }
}

// 创建全局实例
const optimizedTheme = new OptimizedThemeEngine();

// 导出
export { optimizedTheme, OptimizedThemeEngine };

// 全局访问
window.optimizedTheme = optimizedTheme;

// 兼容性别名
window.themeEngine = optimizedTheme;

console.log('⚡ OptimizedThemeEngine loaded - Performance optimized');

/**
 * 使用预渲染、批量操作和GPU加速
 */

class UltraPerformanceThemeService {
  constructor() {
    this.currentTheme = 'light';
    this.isAnimating = false;
    this.preloadedStyles = new Map();
    this.themeClassCache = new Map();
    this.elementsCache = new WeakMap();
    
    this.initializeOptimizations();
  }

  initializeOptimizations() {
    // 1. 预加载主题样式
    this.preloadThemeStyles();
    
    // 2. 创建批量操作队列
    this.batchQueue = [];
    this.batchTimer = null;
    
    // 3. 设置元素缓存
    this.cacheFrequentlyAccessedElements();
    
    // 4. 创建GPU加速图层
    this.setupGPULayers();
  }

  preloadThemeStyles() {
    // 预创建主题样式对象
    this.preloadedStyles.set('light', {
      '--theme-bg-primary': '#ffffff',
      '--theme-text-primary': '#000000',
      '--theme-border': '#dee2e6'
    });
    
    this.preloadedStyles.set('dark', {
      '--theme-bg-primary': '#1a1d23',
      '--theme-text-primary': 'rgba(255, 255, 255, 0.87)',
      '--theme-border': '#343a40'
    });
  }

  cacheFrequentlyAccessedElements() {
    // 缓存经常访问的元素
    this.cachedElements = {
      html: document.documentElement,
      body: document.body,
      containers: document.querySelectorAll('.app-container, .content-area, .settings-drawer-container'),
      themeElements: document.querySelectorAll('[class*="theme-"], [data-theme]')
    };
  }

  setupGPULayers() {
    // 为关键元素创建GPU图层
    const criticalElements = document.querySelectorAll('.settings-drawer-container, .app-container');
    criticalElements.forEach(el => {
      el.style.willChange = 'background-color, color';
      el.style.transform = 'translateZ(0)';
    });
  }

  // 超快速主题切换
  async switchThemeUltraFast(newTheme) {
    if (this.isAnimating || this.currentTheme === newTheme) {
      return;
    }

    this.isAnimating = true;
    const startTime = performance.now();

    try {
      // 1. 立即禁用所有过渡
      this.disableAllTransitions();

      // 2. 使用双缓冲技术
      await this.performDoubleBufferedSwitch(newTheme);

      // 3. 批量应用样式变更
      this.applyBatchedStyleChanges(newTheme);

      // 4. 恢复过渡（延迟）
      this.scheduleTransitionRestore();

      this.currentTheme = newTheme;
      
      const endTime = performance.now();
      console.log(`超快速主题切换完成: ${(endTime - startTime).toFixed(2)}ms`);
      
    } finally {
      this.isAnimating = false;
    }
  }

  disableAllTransitions() {
    // 添加瞬时切换类
    this.cachedElements.html.classList.add('theme-instant-switch');
    document.head.insertAdjacentHTML('beforeend', `
      <style id="theme-instant-disable">
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
        }
      </style>
    `);
  }

  async performDoubleBufferedSwitch(newTheme) {
    return new Promise(resolve => {
      // 使用requestAnimationFrame进行双缓冲
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 第一帧：准备新样式
          this.prepareNewTheme(newTheme);
          
          requestAnimationFrame(() => {
            // 第二帧：应用新样式
            this.applyNewTheme(newTheme);
            resolve();
          });
        });
      });
    });
  }

  prepareNewTheme(newTheme) {
    // 预设CSS变量
    const themeVars = this.preloadedStyles.get(newTheme);
    Object.entries(themeVars).forEach(([prop, value]) => {
      this.cachedElements.html.style.setProperty(prop, value);
    });
  }

  applyNewTheme(newTheme) {
    // 批量更新data-theme属性
    const elementsToUpdate = [
      this.cachedElements.html,
      this.cachedElements.body,
      ...this.cachedElements.containers
    ];

    // 使用DocumentFragment减少重排
    const fragment = document.createDocumentFragment();
    
    elementsToUpdate.forEach(el => {
      if (el) {
        el.setAttribute('data-theme', newTheme);
        
        // 移除旧主题类
        el.classList.remove('theme-light', 'theme-dark', 'dark-mode');
        
        // 添加新主题类
        if (newTheme === 'dark') {
          el.classList.add('theme-dark', 'dark-mode');
        } else {
          el.classList.add('theme-light');
        }
      }
    });

    // 触发重绘优化
    this.optimizeRepaint();
  }

  applyBatchedStyleChanges(newTheme) {
    // 批量应用样式类
    const themeClass = `theme-batch-${newTheme}`;
    
    // 使用单个类切换代替多个属性修改
    this.cachedElements.html.className = 
      this.cachedElements.html.className.replace(/theme-batch-\w+/g, '') + ` ${themeClass}`;
  }

  optimizeRepaint() {
    // 强制GPU合成
    const tempEl = document.createElement('div');
    tempEl.style.transform = 'translateZ(0)';
    tempEl.style.opacity = '0';
    tempEl.style.pointerEvents = 'none';
    document.body.appendChild(tempEl);
    
    // 立即移除，触发重绘
    requestAnimationFrame(() => {
      document.body.removeChild(tempEl);
    });
  }

  scheduleTransitionRestore() {
    // 延迟恢复过渡动画
    setTimeout(() => {
      // 移除瞬时切换类
      this.cachedElements.html.classList.remove('theme-instant-switch');
      
      // 移除禁用过渡的样式
      const disableStyle = document.getElementById('theme-instant-disable');
      if (disableStyle) {
        disableStyle.remove();
      }
    }, 50);
  }

  // 预测性预加载
  preloadNextTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    
    // 预加载反向主题的CSS
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = `/theme-${nextTheme}.css`;
    document.head.appendChild(link);
  }

  // 内存优化
  cleanupCache() {
    this.elementsCache = new WeakMap();
    this.themeClassCache.clear();
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // 获取性能指标
  getPerformanceMetrics() {
    return {
      cacheSize: this.themeClassCache.size,
      queueLength: this.batchQueue.length,
      isAnimating: this.isAnimating,
      currentTheme: this.currentTheme
    };
  }
}

// 创建全局实例
const ultraThemeService = new UltraPerformanceThemeService();

// 导出服务
export default ultraThemeService;

// 开发环境调试
if (import.meta.env?.MODE === 'development') {
  window.ultraThemeService = ultraThemeService;
  console.log('🚀 超级主题切换服务已启用');
}

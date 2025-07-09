/**
 * 下拉框文字显示运行时修复工具
 * 当CSS修复不足以解决问题时，使用JavaScript强制修复
 */

class SelectFixUtil {
  constructor() {
    this.observer = null;
    this.fixedElements = new Set();
  }

  /**
   * 初始化修复工具
   */
  init() {
    console.log('🔧 初始化下拉框文字显示修复工具');
    
    // 立即修复现有的选择框
    this.fixExistingSelects();
    
    // 设置DOM变化监听器
    this.setupMutationObserver();
    
    // 设置主题变化监听器
    this.setupThemeChangeListener();
    
    // 设置定期检查
    this.setupPeriodicCheck();
  }

  /**
   * 修复现有的选择框
   */
  fixExistingSelects() {
    const selects = document.querySelectorAll('select, .select');
    selects.forEach(select => this.fixSelectElement(select));
  }

  /**
   * 修复单个选择框元素
   */
  fixSelectElement(select) {
    if (this.fixedElements.has(select)) return;

    try {
      // 强制设置文字颜色
      const computedStyle = getComputedStyle(select);
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      // 获取主题颜色变量
      const rootStyles = getComputedStyle(document.documentElement);
      const bcColor = rootStyles.getPropertyValue('--bc').trim();
      const b1Color = rootStyles.getPropertyValue('--b1').trim();
      
      if (bcColor) {
        select.style.setProperty('color', `hsl(${bcColor})`, 'important');
      } else {
        // 后备颜色方案
        const fallbackColor = currentTheme && currentTheme.includes('dark') ? '#ffffff' : '#000000';
        select.style.setProperty('color', fallbackColor, 'important');
      }
      
      if (b1Color) {
        select.style.setProperty('background-color', `hsl(${b1Color})`, 'important');
      }

      // 修复选项的颜色
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        if (bcColor) {
          option.style.setProperty('color', `hsl(${bcColor})`, 'important');
        }
        if (b1Color) {
          option.style.setProperty('background-color', `hsl(${b1Color})`, 'important');
        }
      });

      // 标记为已修复
      this.fixedElements.add(select);
      
      console.log('✅ 修复了选择框:', select);
    } catch (error) {
      console.warn('⚠️ 修复选择框时出错:', error);
    }
  }

  /**
   * 设置DOM变化监听器
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // 检查新添加的节点
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查是否是选择框
            if (node.tagName === 'SELECT' || node.classList?.contains('select')) {
              this.fixSelectElement(node);
            }
            
            // 检查子元素中的选择框
            const selects = node.querySelectorAll?.('select, .select');
            selects?.forEach(select => this.fixSelectElement(select));
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 设置主题变化监听器
   */
  setupThemeChangeListener() {
    // 监听主题属性变化
    const themeObserver = new MutationObserver(() => {
      console.log('🎨 检测到主题变化，重新修复所有选择框');
      this.fixedElements.clear();
      setTimeout(() => {
        this.fixExistingSelects();
      }, 100);
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
  }

  /**
   * 设置定期检查
   */
  setupPeriodicCheck() {
    // 每5秒检查一次是否有未修复的选择框
    setInterval(() => {
      const selects = document.querySelectorAll('select, .select');
      let unfixedCount = 0;
      
      selects.forEach(select => {
        if (!this.fixedElements.has(select)) {
          this.fixSelectElement(select);
          unfixedCount++;
        }
      });
      
      if (unfixedCount > 0) {
        console.log(`🔄 定期检查发现并修复了 ${unfixedCount} 个未修复的选择框`);
      }
    }, 5000);
  }

  /**
   * 手动强制修复所有选择框
   */
  forceFixAll() {
    console.log('🔧 手动强制修复所有选择框');
    this.fixedElements.clear();
    this.fixExistingSelects();
  }

  /**
   * 销毁修复工具
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.fixedElements.clear();
    console.log('🗑️ 下拉框修复工具已销毁');
  }
}

// 创建全局实例
const selectFixUtil = new SelectFixUtil();

// 导出工具类和实例
export { SelectFixUtil, selectFixUtil };

// 在DOM加载完成后自动初始化
document.addEventListener('DOMContentLoaded', () => {
  selectFixUtil.init();
});

// 如果DOM已经加载完成，立即初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    selectFixUtil.init();
  });
} else {
  selectFixUtil.init();
}

// 全局暴露修复工具，方便调试
if (typeof window !== 'undefined') {
  window.selectFixUtil = selectFixUtil;
}

export default selectFixUtil;

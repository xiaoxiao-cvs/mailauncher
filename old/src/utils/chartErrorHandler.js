/**
 * ECharts 错误处理和安全性工具
 */

/**
 * 安全地检查数据格式
 * @param {any} data - 要检查的数据
 * @param {string} dataType - 期望的数据类型
 * @returns {boolean} 数据是否有效
 */
export const validateChartData = (data, dataType = 'array') => {
  if (data === null || data === undefined) {
    console.warn('Chart data is null or undefined');
    return false;
  }
  
  // 支持多种数据类型检查
  if ((dataType === 'array' || dataType === 'bar' || dataType === 'line') && !Array.isArray(data)) {
    console.warn('Chart data is not an array:', typeof data);
    return false;
  }
  
  if ((dataType === 'array' || dataType === 'bar' || dataType === 'line') && data.length === 0) {
    console.warn('Chart data array is empty');
    return false;
  }
  
  // 对于bar和line类型，进行额外的数据验证
  if (dataType === 'bar' || dataType === 'line') {
    // 检查数据是否包含有效的数值
    const hasValidData = data.every(item => {
      return typeof item === 'number' || (typeof item === 'string' && !isNaN(parseFloat(item)));
    });
    
    if (!hasValidData) {
      console.warn('Chart data contains invalid values');
      return false;
    }
  }
  
  return true;
};

/**
 * 安全地检查容器元素
 * @param {HTMLElement} container - DOM容器元素
 * @returns {boolean} 容器是否有效
 */
export const validateContainer = (container) => {
  if (!container) {
    console.warn('Chart container is null or undefined');
    return false;
  }
  
  if (!(container instanceof HTMLElement)) {
    console.warn('Chart container is not a valid DOM element');
    return false;
  }
  
  if (!container.offsetWidth || !container.offsetHeight) {
    console.warn('Chart container has no dimensions:', {
      width: container.offsetWidth,
      height: container.offsetHeight
    });
    return false;
  }
  
  return true;
};

/**
 * 安全地创建图表配置选项
 * @param {Object} baseOption - 基础配置
 * @param {Object} customOptions - 自定义配置
 * @returns {Object} 安全的配置对象
 */
export const createSafeOption = (baseOption, customOptions = {}) => {
  try {
    // 深度克隆基础配置以避免引用问题
    const safeOption = JSON.parse(JSON.stringify(baseOption));
    
    // 合并自定义配置
    return {
      ...safeOption,
      ...customOptions,
      // 确保关键配置存在
      animation: false,
      grid: safeOption.grid || {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      tooltip: safeOption.tooltip || {
        trigger: 'axis'
      }
    };
  } catch (error) {
    console.error('Error creating safe chart option:', error);
    return baseOption;
  }
};

/**
 * 验证图表配置选项的完整性
 * @param {Object} option - 图表配置选项
 * @returns {boolean} 配置是否有效
 */
export const validateChartOption = (option) => {
  if (!option || typeof option !== 'object') {
    console.warn('Chart option is not a valid object');
    return false;
  }
  
  // 检查series配置
  if (option.series && Array.isArray(option.series)) {
    for (let i = 0; i < option.series.length; i++) {
      const series = option.series[i];
      if (!series || typeof series !== 'object') {
        console.warn(`Series[${i}] is not a valid object`);
        return false;
      }
      
      // 确保series有type属性
      if (!series.type) {
        console.warn(`Series[${i}] is missing 'type' property`);
        return false;
      }
      
      // 对于bar和line类型，检查data属性
      if ((series.type === 'bar' || series.type === 'line') && !series.data) {
        console.warn(`Series[${i}] of type '${series.type}' is missing 'data' property`);
        return false;
      }
    }
  }
  
  return true;
};

/**
 * 安全地设置图表选项
 * @param {echarts.ECharts} chart - 图表实例
 * @param {Object} option - 配置选项
 * @returns {boolean} 是否设置成功
 */
export const safeSetOption = (chart, option) => {
  if (!chart) {
    console.warn('Cannot set option: chart instance is null');
    return false;
  }
  
  if (!option || typeof option !== 'object') {
    console.warn('Cannot set option: invalid option object');
    return false;
  }
  
  // 验证配置选项的完整性
  if (!validateChartOption(option)) {
    console.error('Chart option validation failed');
    return false;
  }
  
  try {
    chart.setOption(option, true); // 第二个参数为true表示不合并
    return true;
  } catch (error) {
    console.error('Error setting chart option:', error);
    
    // 尝试使用安全的降级配置
    try {
      const fallbackOption = {
        ...option,
        animation: false,
        series: option.series?.map(s => ({
          ...s,
          type: s.type || 'bar', // 确保type属性存在
          data: s.data || [] // 确保data属性存在
        })) || []
      };
      
      chart.setOption(fallbackOption, true);
      console.warn('Applied fallback chart configuration');
      return true;
    } catch (fallbackError) {
      console.error('Fallback chart configuration also failed:', fallbackError);
      return false;
    }
  }
};

/**
 * 安全地销毁图表
 * @param {echarts.ECharts} chart - 图表实例
 */
export const safeDisposeChart = (chart) => {
  if (!chart) {
    return;
  }
  
  try {
    if (typeof chart.dispose === 'function') {
      chart.dispose();
    }
  } catch (error) {
    console.error('Error disposing chart:', error);
  }
};

/**
 * 安全地调整图表大小
 * @param {echarts.ECharts} chart - 图表实例
 * @param {Object} options - 调整选项
 */
export const safeResizeChart = (chart, options = {}) => {
  if (!chart) {
    return;
  }
  
  try {
    if (typeof chart.resize === 'function') {
      chart.resize(options);
    }
  } catch (error) {
    console.error('Error resizing chart:', error);
  }
};

/**
 * 创建错误处理包装器
 * @param {Function} fn - 要包装的函数
 * @param {string} fnName - 函数名称（用于错误日志）
 * @returns {Function} 包装后的函数
 */
export const withErrorHandler = (fn, fnName = 'unknown') => {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error(`Error in ${fnName}:`, error);
      return null;
    }
  };
};

/**
 * 全局错误处理器
 */
export const setupGlobalErrorHandler = () => {
  // 捕获未处理的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('echarts')) {
      console.error('ECharts related unhandled promise rejection:', event.reason);
      event.preventDefault(); // 阻止默认的错误处理
    }
  });
  
  // 捕获全局错误
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('echarts')) {
      console.error('ECharts related global error:', event.error);
    }
  });
};

export default {
  validateChartData,
  validateContainer,
  validateChartOption,
  createSafeOption,
  safeSetOption,
  safeDisposeChart,
  safeResizeChart,
  withErrorHandler,
  setupGlobalErrorHandler
};

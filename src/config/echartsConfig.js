/**
 * ECharts 全局配置
 * 用于解决非被动事件监听器警告并优化性能
 */

// ECharts 全局默认配置
export const defaultEChartsOptions = {
  // 启用被动事件监听器
  usePassiveEvent: true,
  // 设备像素比
  devicePixelRatio: window.devicePixelRatio || 1,
  // 禁用动画以提高性能
  animation: false,
  // 默认主题配置
  theme: null,
  // 渲染器类型（'canvas' 或 'svg'）
  renderer: "canvas",
};

/**
 * 创建带有默认配置的 ECharts 实例
 * @param {HTMLElement} container - 容器元素
 * @param {string} theme - 主题名称
 * @param {Object} opts - 额外选项
 * @returns {echarts.ECharts} ECharts 实例
 */
export const createChart = (container, theme = null, opts = {}) => {
  const options = {
    ...defaultEChartsOptions,
    ...opts,
  };

  // 动态导入 echarts 以避免循环依赖
  return import("echarts").then(({ default: echarts }) => {
    return echarts.init(container, theme, options);
  });
};

/**
 * 批量创建图表实例
 * @param {Array} chartConfigs - 图表配置数组
 * @returns {Promise<Array>} 图表实例数组
 */
export const createCharts = async (chartConfigs) => {
  const { default: echarts } = await import("echarts");

  return chartConfigs.map((config) => {
    const { container, theme = null, opts = {} } = config;
    const options = {
      ...defaultEChartsOptions,
      ...opts,
    };
    return echarts.init(container, theme, options);
  });
};

/**
 * 默认的图表通用选项
 */
export const commonChartOptions = {
  // 工具提示配置
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(50, 50, 50, 0.9)",
    borderColor: "#777",
    borderWidth: 1,
    textStyle: {
      color: "#fff",
    },
  },

  // 网格配置
  grid: {
    left: "8%",
    right: "5%",
    bottom: "10%",
    top: "15%",
    containLabel: true,
  },

  // 图例配置
  legend: {
    type: "scroll",
    orient: "horizontal",
    left: "center",
    top: "top",
  },

  // 动画配置（禁用以提高性能）
  animation: false,
  animationThreshold: 2000,
  animationDuration: 0,
  animationEasing: "cubicOut",
  animationDelay: 0,
};

/**
 * 响应式处理
 * @param {Array} charts - 图表实例数组
 */
export const handleChartResize = (charts) => {
  const resizeHandler = () => {
    charts.forEach((chart) => {
      if (chart && typeof chart.resize === "function") {
        chart.resize();
      }
    });
  };

  // 防抖处理
  let resizeTimer = null;
  const debouncedResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeHandler, 300);
  };

  window.addEventListener("resize", debouncedResize, { passive: true });

  // 返回清理函数
  return () => {
    window.removeEventListener("resize", debouncedResize);
    if (resizeTimer) clearTimeout(resizeTimer);
  };
};

/**
 * 清理图表实例
 * @param {Array} charts - 图表实例数组
 */
export const disposeCharts = (charts) => {
  charts.forEach((chart) => {
    if (chart && typeof chart.dispose === "function") {
      chart.dispose();
    }
  });
};

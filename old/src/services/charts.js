import * as echarts from "echarts";
import { defaultEChartsOptions } from "../config/echartsConfig.js";

/**
 * 初始化CPU使用率图表
 * @param {HTMLElement} container 容器元素
 * @param {Array} data 图表数据
 * @param {Array} timeLabels 时间标签
 * @param {boolean} isDarkMode 是否是深色模式
 * @returns {echarts.ECharts} 图表实例
 */
export const initCpuChart = (container, data, timeLabels, isDarkMode) => {
  // 安全检查
  if (!container || !data || !timeLabels) {
    console.error('Missing required parameters for CPU chart');
    return null;
  }
  
  if (!Array.isArray(data) || !Array.isArray(timeLabels)) {
    console.error('Data and timeLabels must be arrays');
    return null;
  }
  
  try {
    const chart = echarts.init(container, null, defaultEChartsOptions);
    const option = {
      animation: false,
      title: {
        text: "CPU使用率",
        textStyle: { color: isDarkMode ? "#eee" : "#333", fontSize: 14 },
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: isDarkMode ? "#eee" : "#333", formatter: "{value}%" },
      },
      series: [
        {
          data: data,
          type: "line",
          name: "使用率",
          smooth: true,
          lineStyle: {
            width: 3,
            color:
              window.currentThemeColor || (isDarkMode ? "#5983ff" : "#4a7eff"),
          },
          itemStyle: {
            color:
              window.currentThemeColor || (isDarkMode ? "#5983ff" : "#4a7eff"),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isDarkMode
                  ? "rgba(89, 131, 255, 0.7)"
                  : "rgba(74, 126, 255, 0.5)",
              },
              {
                offset: 1,
                color: isDarkMode
                  ? "rgba(89, 131, 255, 0.1)"
                  : "rgba(74, 126, 255, 0.05)",
              },
            ]),
          },
        },
      ],
      grid: {
        left: "8%",
        right: "5%",
        bottom: "10%",
        top: "15%",
        containLabel: true,
      },
      backgroundColor: isDarkMode
        ? "rgba(29, 29, 29, 0.6)"
        : "rgba(255, 255, 255, 0.6)",
    };
    chart.setOption(option);
    return chart;
  } catch (error) {
    console.error('Error creating CPU chart:', error);
    return null;
  }
};

/**
 * 初始化内存使用图表
 * @param {HTMLElement} container 容器元素
 * @param {Array} data 图表数据
 * @param {Array} timeLabels 时间标签
 * @param {number} maxMemoryGB 最大内存值
 * @param {boolean} isDarkMode 是否是深色模式
 * @returns {echarts.ECharts} 图表实例
 */
export const initMemoryChart = (
  container,
  data,
  timeLabels,
  maxMemoryGB,
  isDarkMode
) => {
  // 确保echarts已导入
  if (typeof echarts === "undefined") {
    console.error("echarts is not defined");
    return null;
  }
  
  // 安全检查
  if (!container || !data || !timeLabels) {
    console.error('Missing required parameters for Memory chart');
    return null;
  }
  
  if (!Array.isArray(data) || !Array.isArray(timeLabels)) {
    console.error('Data and timeLabels must be arrays');
    return null;
  }
  
  try {
    const chart = echarts.init(container, null, defaultEChartsOptions);

    const option = {
      animation: false,
      title: {
        text: "内存使用",
        textStyle: {
          color: isDarkMode ? "hsl(var(--bc))" : "hsl(var(--bc))",
          fontSize: 14,
        },
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLabel: { color: isDarkMode ? "hsl(var(--bc))" : "hsl(var(--bc))" },
      },
      yAxis: {
        type: "value",
        max: maxMemoryGB,
        axisLabel: {
          color: isDarkMode ? "hsl(var(--bc))" : "hsl(var(--bc))",
          formatter: "{value} GB",
        },
      },
      series: [
        {
          data: data,
          type: "line",
          name: "使用量",
          smooth: true,
          lineStyle: {
            width: 3,
            color: isDarkMode ? "hsl(var(--p))" : "hsl(var(--p))",
          },
          itemStyle: {
            color: isDarkMode ? "hsl(var(--p))" : "hsl(var(--p))",
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isDarkMode ? "hsla(var(--p), 0.7)" : "hsla(var(--p), 0.5)",
              },
              {
                offset: 1,
                color: isDarkMode
                  ? "hsla(var(--p), 0.1)"
                  : "hsla(var(--p), 0.05)",
              },
            ]),
          },
        },
      ],
      grid: {
        left: "8%",
        right: "5%",
        bottom: "10%",
        top: "15%",
        containLabel: true,
      },
      backgroundColor: isDarkMode
        ? "hsl(var(--b1) / 0.6)"
        : "hsl(var(--b1) / 0.6)",
    };

    chart.setOption(option);
    return chart;
  } catch (error) {
    console.error('Error creating Memory chart:', error);
    return null;
  }
};

/**
 * 初始化网络流量图表
 * @param {HTMLElement} container 容器元素
 * @param {Array} data 图表数据
 * @param {Array} timeLabels 时间标签
 * @param {number} maxNetworkKBs 最大网络值
 * @param {boolean} isDarkMode 是否是深色模式
 * @returns {echarts.ECharts} 图表实例
 */
export const initNetworkChart = (
  container,
  data,
  timeLabels,
  maxNetworkKBs,
  isDarkMode
) => {
  // 安全检查
  if (!container || !data || !timeLabels) {
    console.error('Missing required parameters for Network chart');
    return null;
  }
  
  if (!Array.isArray(data) || !Array.isArray(timeLabels)) {
    console.error('Data and timeLabels must be arrays');
    return null;
  }
  
  try {
    const chart = echarts.init(container, null, defaultEChartsOptions);
    const option = {
      animation: false,
      title: {
        text: "网络流量",
        textStyle: { color: isDarkMode ? "#eee" : "#333", fontSize: 14 },
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
      yAxis: {
        type: "value",
        max: maxNetworkKBs,
        axisLabel: {
          color: isDarkMode ? "#eee" : "#333",
          formatter: "{value} KB/s",
        },
      },
      series: [
        {
          data: data,
          type: "line",
          name: "流量",
          smooth: true,
          lineStyle: {
            width: 3,
            color: isDarkMode ? "#ff6b6b" : "#ff4757",
          },
          itemStyle: {
            color: isDarkMode ? "#ff6b6b" : "#ff4757",
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: isDarkMode
                  ? "rgba(255, 107, 107, 0.7)"
                  : "rgba(255, 71, 87, 0.5)",
              },
              {
                offset: 1,
                color: isDarkMode
                  ? "rgba(255, 107, 107, 0.1)"
                  : "rgba(255, 71, 87, 0.05)",
              },
            ]),
          },
        },
      ],
      grid: {
        left: "8%",
        right: "5%",
        bottom: "10%",
        top: "15%",
        containLabel: true,
      },
      backgroundColor: isDarkMode
        ? "rgba(29, 29, 29, 0.6)"
        : "rgba(255, 255, 255, 0.6)",
    };
    chart.setOption(option);
    return chart;
  } catch (error) {
    console.error('Error creating Network chart:', error);
    return null;
  }
};

/**
 * 初始化消息图表
 * @param {HTMLElement} container 容器元素
 * @param {Array} data 图表数据
 * @param {Array} timeLabels 时间标签
 * @param {boolean} isDarkMode 是否是深色模式
 * @returns {echarts.ECharts} 图表实例
 */
export const initMessageChart = (container, data, timeLabels, isDarkMode) => {
  // 安全检查
  if (!container || !data || !timeLabels) {
    console.error('Missing required parameters for Message chart');
    return null;
  }
  
  if (!Array.isArray(data) || !Array.isArray(timeLabels)) {
    console.error('Data and timeLabels must be arrays');
    return null;
  }
  
  try {
    const chart = echarts.init(container, null, defaultEChartsOptions);
    const option = {
      animation: false,
      title: {
        text: "消息统计",
        textStyle: { color: isDarkMode ? "#eee" : "#333", fontSize: 14 },
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
      series: [
        {
          data: data,
          type: "bar",
          name: "消息数",
          itemStyle: {
            color: isDarkMode ? "#5983ff" : "#4a7eff",
          },
        },
      ],
      grid: {
        left: "8%",
        right: "5%",
        bottom: "10%",
        top: "15%",
        containLabel: true,
      },
      backgroundColor: isDarkMode
        ? "rgba(29, 29, 29, 0.6)"
        : "rgba(255, 255, 255, 0.6)",
    };
    chart.setOption(option);
    return chart;
  } catch (error) {
    console.error('Error creating Message chart:', error);
    return null;
  }
};

/**
 * 更新图表数据
 * @param {echarts.ECharts} chart 图表实例
 * @param {Array} newData 新数据
 * @param {Array} newLabels 新标签
 */
export const updateChartData = (chart, newData, newLabels) => {
  if (!chart || !newData || !newLabels) {
    console.warn('Invalid chart or data for update');
    return;
  }
  
  try {
    chart.setOption({
      xAxis: {
        data: newLabels,
      },
      series: [
        {
          data: newData,
        },
      ],
    });
  } catch (error) {
    console.error('Error updating chart data:', error);
  }
};

/**
 * 更新图表主题
 * @param {echarts.ECharts} chart 图表实例
 * @param {boolean} isDarkMode 是否是深色模式
 */
export const updateChartTheme = (chart, isDarkMode) => {
  if (!chart) {
    console.warn('Invalid chart for theme update');
    return;
  }
  
  try {
    chart.setOption({
      backgroundColor: isDarkMode
        ? "rgba(29, 29, 29, 0.6)"
        : "rgba(255, 255, 255, 0.6)",
      title: {
        textStyle: { color: isDarkMode ? "#eee" : "#333" },
      },
      xAxis: {
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
      yAxis: {
        axisLabel: { color: isDarkMode ? "#eee" : "#333" },
      },
    });
  } catch (error) {
    console.error('Error updating chart theme:', error);
  }
};

/**
 * 更新图表Y轴最大值
 * @param {echarts.ECharts} chart 图表实例
 * @param {number} maxValue 最大值
 */
export const updateChartYMax = (chart, maxValue) => {
  if (!chart || typeof maxValue !== 'number') {
    console.warn('Invalid chart or maxValue for Y-axis update');
    return;
  }
  
  try {
    chart.setOption({
      yAxis: {
        max: maxValue,
      },
    });
  } catch (error) {
    console.error('Error updating chart Y-axis max:', error);
  }
};

/**
 * 处理图表尺寸调整
 * @param {echarts.ECharts} chart 图表实例
 */
export const handleResize = (chart) => {
  if (!chart || typeof chart.resize !== 'function') {
    console.warn('Invalid chart for resize');
    return;
  }
  
  try {
    chart.resize();
  } catch (error) {
    console.error('Error resizing chart:', error);
  }
};

/**
 * 防抖函数
 * @param {Function} fn 要防抖的函数
 * @param {number} delay 延迟时间（毫秒）
 */
export const debounce = (fn, delay) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

export default {
  initCpuChart,
  initMemoryChart,
  initNetworkChart,
  initMessageChart,
  updateChartData,
  updateChartTheme,
  updateChartYMax,
  handleResize,
  debounce,
};

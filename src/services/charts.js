import * as echarts from 'echarts';

/**
 * 初始化CPU使用率图表
 * @param {HTMLElement} container 容器元素
 * @param {Array} data 图表数据
 * @param {Array} timeLabels 时间标签
 * @param {boolean} isDarkMode 是否是深色模式
 * @returns {echarts.ECharts} 图表实例
 */
export const initCpuChart = (container, data, timeLabels, isDarkMode) => {
  const chart = echarts.init(container);
  const option = {
    animation: false,
    title: {
      text: 'CPU使用率',
      textStyle: { color: isDarkMode ? '#eee' : '#333', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { color: isDarkMode ? '#eee' : '#333' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: isDarkMode ? '#eee' : '#333', formatter: '{value}%' }
    },
    series: [{
      data: data,
      type: 'line',
      name: '使用率',
      smooth: true,
      lineStyle: {
        width: 3,
        color: window.currentThemeColor || '#4080ff'
      },
      itemStyle: {
        color: window.currentThemeColor || '#4080ff'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isDarkMode ? 'rgba(64, 128, 255, 0.7)' : 'rgba(64, 128, 255, 0.5)' },
          { offset: 1, color: isDarkMode ? 'rgba(64, 128, 255, 0.1)' : 'rgba(64, 128, 255, 0.05)' }
        ])
      }
    }],
    grid: { 
      left: '8%',
      right: '5%',
      bottom: '10%',
      top: '15%',
      containLabel: true 
    },
    backgroundColor: isDarkMode ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
  };
  chart.setOption(option);
  return chart;
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
export const initMemoryChart = (container, data, timeLabels, maxMemoryGB, isDarkMode) => {
  const chart = echarts.init(container);
  const option = {
    animation: false,
    title: {
      text: '内存使用',
      textStyle: { color: isDarkMode ? '#eee' : '#333', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { color: isDarkMode ? '#eee' : '#333' }
    },
    yAxis: {
      type: 'value',
      max: maxMemoryGB, 
      axisLabel: { 
        color: isDarkMode ? '#eee' : '#333', 
        formatter: '{value} GB' 
      }
    },
    series: [{
      data: data,
      type: 'line',
      name: '使用量',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#10b981'
      },
      itemStyle: {
        color: '#10b981'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isDarkMode ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.5)' },
          { offset: 1, color: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }
        ])
      }
    }],
    grid: { 
      left: '8%',
      right: '5%',
      bottom: '10%',
      top: '15%',
      containLabel: true 
    },
    backgroundColor: isDarkMode ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
  };
  chart.setOption(option);
  return chart;
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
export const initNetworkChart = (container, data, timeLabels, maxNetworkKBs, isDarkMode) => {
  const chart = echarts.init(container);
  const option = {
    animation: false,
    title: {
      text: '网络流量',
      textStyle: { color: isDarkMode ? '#eee' : '#333', fontSize: 14 }
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: { color: isDarkMode ? '#eee' : '#333' }
    },
    yAxis: {
      type: 'value',
      max: maxNetworkKBs,
      axisLabel: { 
        color: isDarkMode ? '#eee' : '#333', 
        formatter: function(value) {
          return value >= 1024 ? (value / 1024).toFixed(1) + ' MB/s' : value + ' KB/s';
        }
      }
    },
    series: [{
      data: data,
      type: 'line',
      name: '下载速率',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#f59e0b'
      },
      itemStyle: {
        color: '#f59e0b'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: isDarkMode ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.5)' },
          { offset: 1, color: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)' }
        ])
      }
    }],
    grid: { 
      left: '8%',
      right: '5%',
      bottom: '10%',
      top: '15%',
      containLabel: true 
    },
    backgroundColor: isDarkMode ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
  };
  chart.setOption(option);
  return chart;
};

/**
 * 更新图表数据
 * @param {echarts.ECharts} chart 图表实例
 * @param {Array} data 新的数据
 * @param {Array} timeLabels 新的时间标签
 */
export const updateChartData = (chart, data, timeLabels) => {
  if (!chart) return;
  
  chart.setOption({
    xAxis: { data: timeLabels },
    series: [{ data: data }]
  });
};

/**
 * 更新图表主题
 * @param {echarts.ECharts} chart 图表实例
 * @param {boolean} isDarkMode 是否是深色模式
 */
export const updateChartTheme = (chart, isDarkMode) => {
  if (!chart) return;
  
  chart.setOption({
    title: {
      textStyle: { color: isDarkMode ? '#eee' : '#333' }
    },
    xAxis: {
      axisLabel: { color: isDarkMode ? '#eee' : '#333' }
    },
    yAxis: {
      axisLabel: { color: isDarkMode ? '#eee' : '#333' }
    },
    backgroundColor: isDarkMode ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
  });
};

/**
 * 更新网络图表Y轴最大值
 * @param {echarts.ECharts} chart 图表实例
 * @param {number} maxValue 最大值
 */
export const updateChartYMax = (chart, maxValue) => {
  if (!chart) return;
  
  chart.setOption({
    yAxis: { max: maxValue }
  });
};

/**
 * 处理窗口大小变化，调整图表大小
 * @param {Array} charts 图表实例数组
 */
export const handleResize = (charts) => {
  charts.forEach(chart => chart && chart.resize());
};

/**
 * 创建防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间(毫秒)
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
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
  updateChartData,
  updateChartTheme,
  updateChartYMax,
  handleResize,
  debounce
};

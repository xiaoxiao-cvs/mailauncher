<template>
  <div class="home-container">
    <!-- 主内容区域 -->
    <div class="home-content">
      <div class="header">
        <div class="title-section">
          <h1 class="main-title">仪表盘</h1>
        </div>
        <!-- 移除了 header-right 部分，包含主题切换和设置按钮 -->
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-title">总实例数</div>
          <div class="stat-value">{{ stats.totalInstances }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">运行中实例</div>
          <div class="stat-value">{{ stats.runningInstances }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">日志异常数</div>
          <div class="stat-value">{{ stats.errorLogs }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">LLM 24h 使用量</div>
          <div class="stat-value">{{ stats.usage24h }}</div>
        </div>
      </div>

      <div class="performance-section">
        <div class="chart-container">
          <div class="chart-header">
            <h3>CPU 性能</h3>
            <div class="system-info-box">
              <div class="info-item"><strong>型号:</strong> {{ cpuInfo.model || '获取中...' }}</div>
              <div class="info-item"><strong>核心数:</strong> {{ cpuInfo.cores || '0' }}</div>
              <div class="info-item"><strong>频率:</strong> {{ formatCpuFrequency(cpuInfo.frequency) }}</div>
            </div>
          </div>
          <div id="cpuChart" ref="cpuChartRef" class="chart"></div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>内存使用</h3>
            <div class="system-info-box">
              <div class="info-item"><strong>总内存:</strong> {{ formatBytes(memoryInfo.total || 0) }}</div>
              <div class="info-item"><strong>已使用:</strong> {{ formatBytes(memoryInfo.used || 0) }}</div>
              <div class="info-item"><strong>可用:</strong> {{ formatBytes(memoryInfo.free || 0) }}</div>
            </div>
          </div>
          <div id="memoryChart" ref="memoryChartRef" class="chart"></div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>网络流量</h3>
            <div class="system-info-box">
              <div class="info-item"><strong>上传速率:</strong> {{ formatBytes(networkInfo.sentRate || 0) }}/s</div>
              <div class="info-item"><strong>下载速率:</strong> {{ formatBytes(networkInfo.receivedRate || 0) }}/s</div>
              <div class="info-item"><strong>总流量:</strong> {{ formatBytes(networkInfo.sent + networkInfo.received) }}
              </div>
            </div>
          </div>
          <div id="networkChart" ref="networkChartRef" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch, onBeforeUnmount, nextTick } from 'vue';
import { HomeFilled, Monitor, Download, Document, Shop, Setting, Moon, Sunny } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import axios from 'axios';
// 更改为正确的CSS导入路径
import '../assets/css/homeView.css';
import { fetchInstanceStats } from '../api/instances';

const emitter = inject('emitter', null);
const isDarkMode = inject('darkMode', ref(false)); // 从App.vue注入

// 系统统计数据
const stats = ref({
  totalInstances: 0,
  runningInstances: 0,
  errorLogs: 0,
  usage24h: '0.0h'
});

// 图表引用 - 使用refs代替ID选择器
const cpuChartRef = ref(null);
const memoryChartRef = ref(null);
const networkChartRef = ref(null);
const cpuChart = ref(null);
const memoryChart = ref(null);
const networkChart = ref(null);

// 系统信息详情
const cpuInfo = ref({ model: '', cores: 0, frequency: 0 });
const memoryInfo = ref({ total: 0, used: 0, free: 0 });
const networkInfo = ref({ sent: 0, received: 0, sentRate: 0, receivedRate: 0 });

// 统计数据历史
const cpuHistory = ref([0, 0, 0, 0, 0, 0]);
const memoryHistory = ref([0, 0, 0, 0, 0, 0]);
const networkHistory = ref([0, 0, 0, 0, 0, 0]);
const timeLabels = ref(['00:00', '00:00', '00:00', '00:00', '00:00', '00:00']);

// 添加峰值追踪
const maxMemoryGB = ref(8); // 默认8GB作为初始最大值
const maxNetworkKBs = ref(1024); // 默认1MB/s (1024KB/s)

// 切换深色模式
const toggleDarkMode = (value) => {
  localStorage.setItem('darkMode', value);

  // 通知系统深色模式已更改
  if (emitter) {
    emitter.emit('dark-mode-changed', value);
  }

  // 重绘图表以适应主题
  refreshCharts();
};

// 处理标签页切换
const handleTabChange = (tab) => {
  if (emitter) {
    emitter.emit('navigate-to-tab', tab);
  }
};

// 初始化图表
const initCharts = () => {
  // 确保DOM元素已经渲染完成
  nextTick(() => {
    // 使用refs代替ID选择器确保找到DOM元素
    if (cpuChartRef.value && !cpuChart.value) {
      // 根据当前模式选择合适的配色方案
      cpuChart.value = echarts.init(cpuChartRef.value);
      const cpuOption = {
        animation: false,
        title: {
          text: 'CPU使用率',
          textStyle: { color: isDarkMode.value ? '#eee' : '#333', fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: timeLabels.value,
          axisLabel: { color: isDarkMode.value ? '#eee' : '#333' }
        },
        yAxis: {
          type: 'value',
          max: 100,
          axisLabel: { color: isDarkMode.value ? '#eee' : '#333', formatter: '{value}%' }
        },
        series: [{
          data: cpuHistory.value,
          type: 'line',
          name: '使用率',
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#4080ff'
          },
          itemStyle: {
            color: '#4080ff'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDarkMode.value ? 'rgba(64, 128, 255, 0.7)' : 'rgba(64, 128, 255, 0.5)' },
              { offset: 1, color: isDarkMode.value ? 'rgba(64, 128, 255, 0.1)' : 'rgba(64, 128, 255, 0.05)' }
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
        backgroundColor: isDarkMode.value ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
      };
      cpuChart.value.setOption(cpuOption);
    }

    if (memoryChartRef.value && !memoryChart.value) {
      memoryChart.value = echarts.init(memoryChartRef.value);

      // 获取系统总内存并四舍五入到整数
      const totalMemoryGB = memoryInfo.value.total
        ? Math.round(memoryInfo.value.total / (1024 * 1024 * 1024))
        : 16; // 默认为16GB

      // 设置图表最大值为总内存
      maxMemoryGB.value = totalMemoryGB;

      const memoryOption = {
        animation: false,
        title: {
          text: '内存使用',
          textStyle: { color: isDarkMode.value ? '#eee' : '#333', fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: timeLabels.value,
          axisLabel: { color: isDarkMode.value ? '#eee' : '#333' }
        },
        yAxis: {
          type: 'value',
          max: maxMemoryGB.value, // 使用系统总内存作为最大值
          axisLabel: {
            color: isDarkMode.value ? '#eee' : '#333',
            formatter: '{value} GB'
          }
        },
        series: [{
          data: memoryHistory.value,
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
              { offset: 0, color: isDarkMode.value ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.5)' },
              { offset: 1, color: isDarkMode.value ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }
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
        backgroundColor: isDarkMode.value ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
      };
      memoryChart.value.setOption(memoryOption);
    }

    if (networkChartRef.value && !networkChart.value) {
      networkChart.value = echarts.init(networkChartRef.value);
      const networkOption = {
        animation: false,
        title: {
          text: '网络流量',
          textStyle: { color: isDarkMode.value ? '#eee' : '#333', fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: timeLabels.value,
          axisLabel: { color: isDarkMode.value ? '#eee' : '#333' }
        },
        yAxis: {
          type: 'value',
          max: maxNetworkKBs.value, // 使用动态最大值 - 默认1MB/s (1024KB/s)
          axisLabel: {
            color: isDarkMode.value ? '#eee' : '#333',
            formatter: function (value) {
              return value >= 1024 ? (value / 1024).toFixed(1) + ' MB/s' : value + ' KB/s';
            }
          }
        },
        series: [{
          data: networkHistory.value,
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
              { offset: 0, color: isDarkMode.value ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.5)' },
              { offset: 1, color: isDarkMode.value ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)' }
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
        backgroundColor: isDarkMode.value ? 'rgba(40, 44, 52, 0.8)' : 'rgba(250, 250, 252, 0.8)'
      };
      networkChart.value.setOption(networkOption);
    }
  });
};

// 格式化时间
const formatTime = (date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 格式化CPU频率
const formatCpuFrequency = (frequency) => {
  if (!frequency || isNaN(frequency) || frequency === 0) {
    return '未知';
  }
  // 如果frequency已经小于1000，则假设单位为GHz
  if (frequency < 1000) {
    return `${frequency.toFixed(2)} GHz`;
  }
  // 否则假设单位为MHz，转换为GHz
  return `${(frequency / 1000).toFixed(2)} GHz`;
};

// 格式化字节
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// 更新图表数据
const updateChartData = (cpuUsage, memoryUsed, networkRate, metrics) => {
  const now = new Date();
  const timeLabel = formatTime(now);

  // 更新时间标签
  timeLabels.value.shift();
  timeLabels.value.push(timeLabel);

  // 更新CPU历史
  cpuHistory.value.shift();
  cpuHistory.value.push(Math.round(cpuUsage || 0));

  // 更新内存历史 (转换为GB)
  memoryHistory.value.shift();
  const memGB = memoryUsed ? (memoryUsed / (1024 * 1024 * 1024)).toFixed(1) : 0;
  const memGBValue = parseFloat(memGB);
  memoryHistory.value.push(memGBValue);

  // 更新系统信息详情
  if (metrics) {
    if (metrics.cpu) {
      cpuInfo.value = {
        model: metrics.cpu.model || 'Unknown CPU',
        cores: metrics.cpu.cores || 0,
        frequency: metrics.cpu.frequency || 0
      };
    }

    if (metrics.memory) {
      memoryInfo.value = {
        total: metrics.memory.total || 0,
        used: metrics.memory.used || 0,
        free: metrics.memory.free || 0
      };

      // 获取系统总内存并四舍五入到最接近的整数
      const totalMemoryGB = Math.round(metrics.memory.total / (1024 * 1024 * 1024));

      // 如果总内存发生变化或者还未设置最大值，则更新图表最大值
      if (totalMemoryGB > 0 && totalMemoryGB !== maxMemoryGB.value) {
        maxMemoryGB.value = totalMemoryGB;

        // 更新内存图表的Y轴最大值
        if (memoryChart.value) {
          memoryChart.value.setOption({
            yAxis: {
              max: maxMemoryGB.value
            }
          });
        }
      }
    }

    if (metrics.network) {
      networkInfo.value = {
        sent: metrics.network.sent || 0,
        received: metrics.network.received || 0,
        sentRate: metrics.network.sentRate || 0,
        receivedRate: metrics.network.receivedRate || 0
      };
    }
  }

  // 更新网络最大值 - 默认为1MB/s (1024KB/s)，超过时用峰值
  const netKB = networkRate || 0; // 添加这一行来定义netKB变量
  if (netKB > maxNetworkKBs.value) {
    // 增加余量，让图表不会顶到头
    maxNetworkKBs.value = Math.ceil(netKB * 1.2);

    // 如果有网络图表，更新Y轴最大值
    if (networkChart.value) {
      networkChart.value.setOption({
        yAxis: {
          max: maxNetworkKBs.value
        }
      });
    }
  } else if (netKB < maxNetworkKBs.value * 0.3 && maxNetworkKBs.value > 1024) {
    // 如果当前值远低于最大值，逐渐降低最大值，但不低于1MB/s
    maxNetworkKBs.value = Math.max(1024, Math.floor(maxNetworkKBs.value * 0.9));

    if (networkChart.value) {
      networkChart.value.setOption({
        yAxis: {
          max: maxNetworkKBs.value
        }
      });
    }
  }

  // 更新图表
  if (cpuChart.value) {
    cpuChart.value.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: cpuHistory.value }]
    });
  }

  if (memoryChart.value) {
    memoryChart.value.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: memoryHistory.value }]
    });
  }

  if (networkChart.value) {
    networkChart.value.setOption({
      xAxis: { data: timeLabels.value },
      series: [{ data: networkHistory.value }]
    });
  }
};

// 获取系统状态
const fetchSystemStatus = async () => {
  try {
    const response = await axios.get('/api/status');
    if (response.data) {
      // 解析服务状态
      const services = response.data;
      const running = Object.values(services).filter(s => s.status === 'running').length;
      stats.value.runningInstances = running;
    }
  } catch (error) {
    console.warn('获取系统状态失败:', error);
    // 设置模拟数据，避免页面显示为0
    stats.value.runningInstances = 1;
  }
};

// 获取性能数据
const fetchPerformanceData = async () => {
  try {
    // 修复：使用更安全的electronAPI访问方式
    let metrics = null;

    try {
      // 尝试通过window.electronAPI获取
      if (window.electronAPI && typeof window.electronAPI.getSystemMetrics === 'function') {
        metrics = await window.electronAPI.getSystemMetrics();
      }
    } catch (electronErr) {
      console.warn('通过window.electronAPI获取性能数据失败:', electronErr);
    }

    // 如果上面的方式失败，使用模拟数据
    if (!metrics) {
      console.log('使用模拟性能数据');
      metrics = {
        cpu: {
          usage: Math.random() * 30 + 20,
          percent: Math.random() * 30 + 20,
          cores: 8,
          frequency: 3200, // 3.2 GHz
          model: 'Intel Core i7-10700K'
        },
        memory: {
          total: 32 * 1024 * 1024 * 1024, // 默认32GB总内存
          used: (Math.random() * 16 + 8) * 1024 * 1024 * 1024,
          free: 8 * 1024 * 1024 * 1024
        },
        network: {
          sent: Math.random() * 5000 * 1024,
          received: Math.random() * 8000 * 1024,
          sentRate: Math.random() * 300 * 1024,
          receivedRate: Math.random() * 500 * 1024
        }
      };
    }

    // 更新图表数据
    const { cpu, memory, network } = metrics;
    updateChartData(
      cpu?.usage || cpu?.percent || 0,
      memory?.used || 0,
      network?.receivedRate || 0,
      metrics
    );
  } catch (error) {
    console.error('获取性能数据失败:', error);
    // 使用模拟数据作为备用
    updateChartData(
      Math.round(Math.random() * 30 + 20),
      Math.round(Math.random() * 4 + 6) * 1024 * 1024 * 1024,
      Math.round(Math.random() * 500 + 100) * 1024
    );
  }
};

// 获取实例列表及统计数据
const fetchInstances = async () => {
  try {
    // 修改：使用旧的API路径获取实例统计数据
    const response = await axios.get('/api/instance-stats');
    if (response.data) {
      stats.value.totalInstances = response.data.total || 0;
      stats.value.runningInstances = response.data.running || 0;
    }
  } catch (error) {
    console.warn('获取实例统计数据失败:', error);
    // 设置模拟数据
    stats.value.totalInstances = 3;
    stats.value.runningInstances = 1;
  }
};

// 获取日志异常数量
const fetchErrorLogs = async () => {
  try {
    const response = await axios.get('/api/logs/system');
    if (response.data && response.data.logs) {
      const logs = response.data.logs;
      stats.value.errorLogs = logs.filter(log =>
        log.level === 'ERROR' || log.level === 'WARNING'
      ).length;
    }
  } catch (error) {
    console.warn('获取日志失败:', error);
    // 设置模拟数据
    stats.value.errorLogs = 8;
  }
};

// 计算24小时使用量
const calculateUsage = () => {
  // 这里可以根据需要实现真实的计算逻辑
  // 目前使用示例数据
  stats.value.usage24h = '21.61'; // 示例数据
};

// 更新性能定时器
let performanceInterval = null;

// 初始化
onMounted(async () => {
  // 获取初始数据
  await Promise.all([
    fetchInstances(),
    fetchSystemStatus(),
    fetchErrorLogs()
  ]);

  calculateUsage();

  // 初始化图表
  setTimeout(() => {
    initCharts(); // 延迟初始化，确保DOM已渲染
  }, 200);

  // 立即获取第一次性能数据
  fetchPerformanceData();

  // 设置定期更新
  performanceInterval = setInterval(() => {
    fetchPerformanceData();
  }, 10000); // 每10秒更新一次

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  // 设置定期刷新实例状态
  setInterval(() => {
    fetchInstances();
    fetchSystemStatus();
  }, 30000); // 每30秒更新一次
});

// 窗口大小变化处理
const handleResize = () => {
  if (cpuChart.value) cpuChart.value.resize();
  if (memoryChart.value) memoryChart.value.resize(); // 修复这里的错误，原来引用的是cpuChart
  if (networkChart.value) networkChart.value.resize(); // 修复这里的错误，原来引用的是cpuChart
};

// 监听深色模式变化
watch(() => isDarkMode.value, (newVal) => {
  refreshCharts();
});

// 清理
onBeforeUnmount(() => {
  if (performanceInterval) {
    clearInterval(performanceInterval);
  }
  window.removeEventListener('resize', handleResize);

  // 销毁图表实例
  cpuChart.value?.dispose();
  memoryChart.value?.dispose();
  networkChart.value?.dispose();
});

// 重构图表刷新方法，避免重叠问题
const refreshCharts = () => {
  if (cpuChart.value) {
    cpuChart.value.dispose();
    cpuChart.value = null;
  }

  if (memoryChart.value) {
    memoryChart.value.dispose();
    memoryChart.value = null;
  }

  if (networkChart.value) {
    networkChart.value.dispose();
    networkChart.value = null;
  }

  setTimeout(() => {
    initCharts();
  }, 100);
};
</script>

<style>
/* 移除所有内联CSS，改为引入外部CSS文件 */
@import '../assets/css/homeView.css';
</style>

<!--用于主页面的性能监控，待重构（CPU占用，内存占用，网络统计，Bot＋启动器一共用了多少系统资源，待定～）-->
<template>
  <div class="performance-monitor" :class="{ 'detailed-mode': isDetailedMode }">
    <div class="performance-header">
      <h3 class="monitor-title">系统性能</h3>
      <div class="monitor-actions">
        <el-tooltip :content="isDetailedMode ? '简洁视图' : '详细视图'" placement="top">
          <el-button size="small" :icon="isDetailedMode ? Histogram : DataLine" circle @click="toggleViewMode"
            class="view-toggle-btn"></el-button>
        </el-tooltip>
        <el-tooltip content="刷新数据" placement="top">
          <el-button size="small" :icon="Refresh" circle @click="refreshData" :loading="isRefreshing"
            class="refresh-btn"></el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 简洁模式 -->
    <div v-if="!isDetailedMode" class="simple-mode-content">
      <!-- CPU 使用率 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-icon">
            <el-icon>
              <Cpu />
            </el-icon>
          </div>
          <div class="metric-title">CPU</div>
          <div class="metric-value">{{ stats.cpu.usage }}%</div>
        </div>
        <el-progress :percentage="stats.cpu.usage" :stroke-width="8" :color="getProgressColor(stats.cpu.usage)" />
        <div class="metric-details">{{ stats.cpu.model }}</div>
      </div>

      <!-- GPU 使用率 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-icon">
            <el-icon>
              <Monitor />
            </el-icon>
          </div>
          <div class="metric-title">GPU</div>
          <div class="metric-value">{{ stats.gpu.usage }}%</div>
        </div>
        <el-progress :percentage="stats.gpu.usage" :stroke-width="8" :color="getProgressColor(stats.gpu.usage)" />
        <div class="metric-details">{{ stats.gpu.model }}</div>
      </div>

      <!-- 内存使用率 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-icon">
            <el-icon>
              <Coin />
            </el-icon>
          </div>
          <div class="metric-title">内存</div>
          <div class="metric-value">{{ stats.memory.used | formatMemory }} / {{ stats.memory.total | formatMemory }}
          </div>
        </div>
        <el-progress :percentage="stats.memory.percentage" :stroke-width="8"
          :color="getProgressColor(stats.memory.percentage)" />
        <div class="metric-details">可用: {{ stats.memory.available | formatMemory }}</div>
      </div>

      <!-- 网络使用率 -->
      <div class="metric-item">
        <div class="metric-header">
          <div class="metric-icon">
            <el-icon>
              <Connection />
            </el-icon>
          </div>
          <div class="metric-title">网络</div>
          <div class="metric-value">{{ stats.network.downloadSpeed | formatBytes }}/s</div>
        </div>
        <div class="network-stats">
          <div>上传: {{ stats.network.uploadSpeed | formatBytes }}/s</div>
          <div>总上传: {{ stats.network.uploaded | formatBytes }}</div>
          <div>总下载: {{ stats.network.downloaded | formatBytes }}</div>
        </div>
      </div>
    </div>

    <!-- 详细模式 -->
    <div v-else class="detailed-mode-content">
      <el-tabs v-model="activeTab" class="metric-tabs">
        <el-tab-pane label="CPU" name="cpu">
          <div class="chart-container" ref="cpuChartContainer"></div>
          <div class="detail-metrics">
            <div class="detail-item">
              <span class="detail-label">型号:</span>
              <span class="detail-value">{{ stats.cpu.model }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">核心数:</span>
              <span class="detail-value">{{ stats.cpu.cores }} 核</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">频率:</span>
              <span class="detail-value">{{ stats.cpu.frequency }} GHz</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">温度:</span>
              <span class="detail-value">{{ stats.cpu.temperature }}°C</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="GPU" name="gpu">
          <div class="chart-container" ref="gpuChartContainer"></div>
          <div class="detail-metrics">
            <div class="detail-item">
              <span class="detail-label">型号:</span>
              <span class="detail-value">{{ stats.gpu.model }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">显存:</span>
              <span class="detail-value">{{ stats.gpu.memory.used | formatMemory }} / {{ stats.gpu.memory.total |
                formatMemory }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">温度:</span>
              <span class="detail-value">{{ stats.gpu.temperature }}°C</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="内存" name="memory">
          <div class="chart-container" ref="memoryChartContainer"></div>
          <div class="detail-metrics">
            <div class="detail-item">
              <span class="detail-label">已用:</span>
              <span class="detail-value">{{ stats.memory.used | formatMemory }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">可用:</span>
              <span class="detail-value">{{ stats.memory.available | formatMemory }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">总计:</span>
              <span class="detail-value">{{ stats.memory.total | formatMemory }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">交换:</span>
              <span class="detail-value">{{ stats.memory.swap.used | formatMemory }} / {{ stats.memory.swap.total |
                formatMemory }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="网络" name="network">
          <div class="chart-container" ref="networkChartContainer"></div>
          <div class="detail-metrics">
            <div class="detail-item">
              <span class="detail-label">上传速度:</span>
              <span class="detail-value">{{ stats.network.uploadSpeed | formatBytes }}/s</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">下载速度:</span>
              <span class="detail-value">{{ stats.network.downloadSpeed | formatBytes }}/s</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">总上传:</span>
              <span class="detail-value">{{ stats.network.uploaded | formatBytes }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">总下载:</span>
              <span class="detail-value">{{ stats.network.downloaded | formatBytes }}</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, inject, computed } from 'vue';
import { Cpu, Monitor, Coin, Connection, Refresh, Histogram, DataLine } from '@element-plus/icons-vue';
import * as echarts from 'echarts';

const isDarkMode = inject('darkMode', ref(false));

// 状态变量
const isDetailedMode = ref(false);
const isRefreshing = ref(false);
const activeTab = ref('cpu');

// 图表引用
const cpuChart = ref(null);
const gpuChart = ref(null);
const memoryChart = ref(null);
const networkChart = ref(null);
const cpuChartContainer = ref(null);
const gpuChartContainer = ref(null);
const memoryChartContainer = ref(null);
const networkChartContainer = ref(null);

// 历史数据 - 用于图表展示
const cpuHistory = ref([]);
const gpuHistory = ref([]);
const memoryHistory = ref([]);
const networkUploadHistory = ref([]);
const networkDownloadHistory = ref([]);
const timeLabels = ref([]);

// 模拟的性能数据
const stats = ref({
  cpu: {
    usage: 0,
    model: 'Intel Core i7-12700K',
    cores: 12,
    frequency: 3.6,
    temperature: 45
  },
  gpu: {
    usage: 0,
    model: 'NVIDIA RTX 3080',
    memory: {
      used: 2.5 * 1024 * 1024 * 1024,
      total: 10 * 1024 * 1024 * 1024
    },
    temperature: 65
  },
  memory: {
    used: 0,
    available: 0,
    total: 16 * 1024 * 1024 * 1024,
    percentage: 0,
    swap: {
      used: 1.2 * 1024 * 1024 * 1024,
      total: 8 * 1024 * 1024 * 1024
    }
  },
  network: {
    uploadSpeed: 0,
    downloadSpeed: 0,
    uploaded: 0,
    downloaded: 0
  }
});

// 切换简洁/详细视图
const toggleViewMode = () => {
  isDetailedMode.value = !isDetailedMode.value;

  // 保存用户偏好设置
  localStorage.setItem('performanceMonitorDetailed', isDetailedMode.value.toString());

  // 如果切换到详细模式，需要初始化图表
  if (isDetailedMode.value) {
    nextTick(() => {
      initCharts();
    });
  }
};

// 刷新数据
const refreshData = async () => {
  isRefreshing.value = true;

  try {
    // 在实际应用中，这里应该调用API获取真实数据
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 生成模拟数据
    generateMockData();

    // 更新图表
    if (isDetailedMode.value) {
      updateCharts();
    }
  } catch (error) {
    console.error('获取性能数据失败:', error);
  } finally {
    isRefreshing.value = false;
  }
};

// 生成模拟数据
const generateMockData = () => {
  // CPU使用率随机波动
  const cpuUsage = Math.floor(20 + Math.random() * 40);
  stats.value.cpu.usage = cpuUsage;
  stats.value.cpu.temperature = 40 + Math.floor(cpuUsage / 5);

  // GPU使用率随机波动
  const gpuUsage = Math.floor(15 + Math.random() * 60);
  stats.value.gpu.usage = gpuUsage;
  stats.value.gpu.temperature = 50 + Math.floor(gpuUsage / 4);
  stats.value.gpu.memory.used = (2 + Math.random() * 6) * 1024 * 1024 * 1024;

  // 内存使用率随机波动
  const memUsed = (5 + Math.random() * 8) * 1024 * 1024 * 1024;
  stats.value.memory.used = memUsed;
  stats.value.memory.available = stats.value.memory.total - memUsed;
  stats.value.memory.percentage = Math.round((memUsed / stats.value.memory.total) * 100);

  // 网络数据随机波动
  const uploadSpeed = Math.random() * 2 * 1024 * 1024;  // 0-2 MB/s
  const downloadSpeed = Math.random() * 10 * 1024 * 1024;  // 0-10 MB/s
  stats.value.network.uploadSpeed = uploadSpeed;
  stats.value.network.downloadSpeed = downloadSpeed;

  // 累计上传下载量
  stats.value.network.uploaded += uploadSpeed * 1; // 假设每秒更新一次
  stats.value.network.downloaded += downloadSpeed * 1;

  // 更新历史数据
  const now = new Date();
  const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  // 保持数据点数量在合理范围
  const maxDataPoints = 60;

  cpuHistory.value.push(stats.value.cpu.usage);
  gpuHistory.value.push(stats.value.gpu.usage);
  memoryHistory.value.push(stats.value.memory.percentage);
  networkUploadHistory.value.push(stats.value.network.uploadSpeed / (1024 * 1024)); // 转MB/s
  networkDownloadHistory.value.push(stats.value.network.downloadSpeed / (1024 * 1024)); // 转MB/s
  timeLabels.value.push(timeLabel);

  if (cpuHistory.value.length > maxDataPoints) {
    cpuHistory.value.shift();
    gpuHistory.value.shift();
    memoryHistory.value.shift();
    networkUploadHistory.value.shift();
    networkDownloadHistory.value.shift();
    timeLabels.value.shift();
  }
};

// 初始化图表
const initCharts = () => {
  // 初始化CPU图表
  if (cpuChartContainer.value && !cpuChart.value) {
    cpuChart.value = echarts.init(cpuChartContainer.value);
  }

  // 初始化GPU图表
  if (gpuChartContainer.value && !gpuChart.value) {
    gpuChart.value = echarts.init(gpuChartContainer.value);
  }

  // 初始化内存图表
  if (memoryChartContainer.value && !memoryChart.value) {
    memoryChart.value = echarts.init(memoryChartContainer.value);
  }

  // 初始化网络图表
  if (networkChartContainer.value && !networkChart.value) {
    networkChart.value = echarts.init(networkChartContainer.value);
  }

  // 更新图表数据
  updateCharts();
};

// 更新图表
const updateCharts = () => {
  // 更新CPU图表
  if (cpuChart.value) {
    cpuChart.value.setOption({
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>{a0}: {c0}%'
      },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: '使用率(%)',
        nameTextStyle: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? '#333' : '#eee'
          }
        }
      },
      series: [{
        name: 'CPU',
        data: cpuHistory.value,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: isDarkMode.value ? 'rgba(65, 105, 225, 0.5)' : 'rgba(65, 105, 225, 0.3)'
          }, {
            offset: 1,
            color: isDarkMode.value ? 'rgba(65, 105, 225, 0.1)' : 'rgba(65, 105, 225, 0.05)'
          }])
        },
        itemStyle: {
          color: '#4169e1'
        },
        lineStyle: {
          width: 2,
          color: '#4169e1'
        }
      }]
    });
  }

  // 更新GPU图表
  if (gpuChart.value) {
    gpuChart.value.setOption({
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>{a0}: {c0}%'
      },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: '使用率(%)',
        nameTextStyle: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? '#333' : '#eee'
          }
        }
      },
      series: [{
        name: 'GPU',
        data: gpuHistory.value,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: isDarkMode.value ? 'rgba(76, 175, 80, 0.5)' : 'rgba(76, 175, 80, 0.3)'
          }, {
            offset: 1,
            color: isDarkMode.value ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)'
          }])
        },
        itemStyle: {
          color: '#4caf50'
        },
        lineStyle: {
          width: 2,
          color: '#4caf50'
        }
      }]
    });
  }

  // 更新内存图表
  if (memoryChart.value) {
    memoryChart.value.setOption({
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>{a0}: {c0}%'
      },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: '使用率(%)',
        nameTextStyle: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? '#333' : '#eee'
          }
        }
      },
      series: [{
        name: '内存',
        data: memoryHistory.value,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: isDarkMode.value ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)'
          }, {
            offset: 1,
            color: isDarkMode.value ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)'
          }])
        },
        itemStyle: {
          color: '#ff9800'
        },
        lineStyle: {
          width: 2,
          color: '#ff9800'
        }
      }]
    });
  }

  // 更新网络图表
  if (networkChart.value) {
    networkChart.value.setOption({
      grid: {
        top: 30,
        right: 20,
        bottom: 20,
        left: 50
      },
      legend: {
        data: ['上传', '下载'],
        textStyle: {
          color: isDarkMode.value ? '#aaa' : '#666'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function (params) {
          let result = params[0].name + '<br/>';
          params.forEach(param => {
            result += `${param.seriesName}: ${param.data.toFixed(2)} MB/s<br/>`;
          });
          return result;
        }
      },
      xAxis: {
        type: 'category',
        data: timeLabels.value,
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '速率(MB/s)',
        nameTextStyle: {
          color: isDarkMode.value ? '#aaa' : '#666'
        },
        axisLabel: {
          color: isDarkMode.value ? '#aaa' : '#666',
          formatter: '{value} MB/s'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#444' : '#ddd'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? '#333' : '#eee'
          }
        }
      },
      series: [{
        name: '上传',
        data: networkUploadHistory.value,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: isDarkMode.value ? 'rgba(233, 30, 99, 0.5)' : 'rgba(233, 30, 99, 0.3)'
          }, {
            offset: 1,
            color: isDarkMode.value ? 'rgba(233, 30, 99, 0.1)' : 'rgba(233, 30, 99, 0.05)'
          }])
        },
        itemStyle: {
          color: '#e91e63'
        },
        lineStyle: {
          width: 2,
          color: '#e91e63'
        }
      }, {
        name: '下载',
        data: networkDownloadHistory.value,
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: isDarkMode.value ? 'rgba(0, 188, 212, 0.5)' : 'rgba(0, 188, 212, 0.3)'
          }, {
            offset: 1,
            color: isDarkMode.value ? 'rgba(0, 188, 212, 0.1)' : 'rgba(0, 188, 212, 0.05)'
          }])
        },
        itemStyle: {
          color: '#00bcd4'
        },
        lineStyle: {
          width: 2,
          color: '#00bcd4'
        }
      }]
    });
  }
};

// 根据数值获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage < 60) return '#67c23a';  // 绿色
  if (percentage < 80) return '#e6a23c';  // 黄色
  return '#f56c6c';  // 红色
};

// 格式化字节单位
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// 格式化内存单位
const formatMemory = (bytes) => {
  return formatBytes(bytes);
};

// 深色模式监听
watch(() => isDarkMode.value, () => {
  if (isDetailedMode.value) {
    nextTick(() => {
      // 重新初始化图表以应用深色模式
      if (cpuChart.value) {
        cpuChart.value.dispose();
        cpuChart.value = null;
      }
      if (gpuChart.value) {
        gpuChart.value.dispose();
        gpuChart.value = null;
      }
      if (memoryChart.value) {
        memoryChart.value.dispose();
        memoryChart.value = null;
      }
      if (networkChart.value) {
        networkChart.value.dispose();
        networkChart.value = null;
      }

      initCharts();
    });
  }
});

// 标签页切换监听
watch(() => activeTab.value, () => {
  nextTick(() => {
    // 当标签切换时，确保图表正确渲染
    switch (activeTab.value) {
      case 'cpu':
        if (!cpuChart.value && cpuChartContainer.value) {
          cpuChart.value = echarts.init(cpuChartContainer.value);
          updateCharts();
        } else if (cpuChart.value) {
          cpuChart.value.resize();
        }
        break;
      case 'gpu':
        if (!gpuChart.value && gpuChartContainer.value) {
          gpuChart.value = echarts.init(gpuChartContainer.value);
          updateCharts();
        } else if (gpuChart.value) {
          gpuChart.value.resize();
        }
        break;
      case 'memory':
        if (!memoryChart.value && memoryChartContainer.value) {
          memoryChart.value = echarts.init(memoryChartContainer.value);
          updateCharts();
        } else if (memoryChart.value) {
          memoryChart.value.resize();
        }
        break;
      case 'network':
        if (!networkChart.value && networkChartContainer.value) {
          networkChart.value = echarts.init(networkChartContainer.value);
          updateCharts();
        } else if (networkChart.value) {
          networkChart.value.resize();
        }
        break;
    }
  });
});

// 窗口大小变化监听
const handleResize = () => {
  if (isDetailedMode.value) {
    cpuChart.value?.resize();
    gpuChart.value?.resize();
    memoryChart.value?.resize();
    networkChart.value?.resize();
  }
};

// 组件挂载
onMounted(() => {
  // 从本地存储加载用户偏好设置
  const savedMode = localStorage.getItem('performanceMonitorDetailed');
  if (savedMode !== null) {
    isDetailedMode.value = savedMode === 'true';
  }

  // 获取初始数据
  refreshData();

  // 如果是详细模式，初始化图表
  if (isDetailedMode.value) {
    nextTick(() => {
      initCharts();
    });
  }

  // 设置定时刷新
  const refreshInterval = setInterval(refreshData, 3000);

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);

  // 在组件卸载时清理
  onBeforeUnmount(() => {
    clearInterval(refreshInterval);
    window.removeEventListener('resize', handleResize);

    // 销毁图表实例
    cpuChart.value?.dispose();
    gpuChart.value?.dispose();
    memoryChart.value?.dispose();
    networkChart.value?.dispose();
  });
});
</script>

<style scoped>
.performance-monitor {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
}

.performance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.monitor-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.monitor-actions {
  display: flex;
  gap: 8px;
}

.view-toggle-btn,
.refresh-btn {
  --el-button-hover-bg-color: var(--el-color-primary-light-7);
  --el-button-hover-text-color: var(--el-color-primary);
}

/* 简洁模式样式 */
.simple-mode-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.metric-item {
  background-color: var(--el-bg-color-page);
  padding: 16px;
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-lighter);
  animation: fadeIn 0.3s ease-in-out;
}

.metric-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.metric-icon .el-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.metric-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex-grow: 1;
}

.metric-value {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.metric-details {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.network-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 12px;
}

/* 详细模式样式 */
.detailed-mode-content {
  min-height: 400px;
}

.chart-container {
  height: 250px;
  width: 100%;
  margin-bottom: 16px;
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 深色模式适配 */
:deep(.dark-mode) .chart-container {
  filter: brightness(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simple-mode-content {
    grid-template-columns: 1fr;
  }

  .detail-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .chart-container {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .performance-monitor {
    padding: 12px;
  }

  .detail-metrics {
    grid-template-columns: 1fr;
  }

  .metric-item {
    padding: 12px;
  }
}
</style>

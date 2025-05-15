<template>
  <div class="bg-gradient-to-br from-primary/10 to-secondary/10 min-h-screen p-4 lg:p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 页面标题 - 去除按钮 -->
      <div class="mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-base-content">控制台</h1>
      </div>

      <!-- 不规则卡片布局 - 重新排列 -->
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <!-- 消息数图表卡片 (占用更大区域) -->
        <div class="card bg-base-100 shadow-xl md:col-span-3 lg:col-span-4">
          <div class="card-body">
            <h2 class="card-title">消息数量统计</h2>
            <p class="text-sm text-base-content/70">本周发送消息总量达 {{ messageStats.total }} 条</p>
            <div class="message-chart-container h-[250px]" ref="messageChartRef"></div>
            <div class="flex justify-between text-sm mt-2">
              <div class="flex gap-2">
                <button class="btn btn-xs" :class="activeChart === 'day' ? 'btn-primary' : 'btn-ghost'"
                  @click="switchChartPeriod('day')">日</button>
                <button class="btn btn-xs" :class="activeChart === 'week' ? 'btn-primary' : 'btn-ghost'"
                  @click="switchChartPeriod('week')">周</button>
                <button class="btn btn-xs" :class="activeChart === 'month' ? 'btn-primary' : 'btn-ghost'"
                  @click="switchChartPeriod('month')">月</button>
              </div>
              <!-- 删除图表和明细按钮 -->
            </div>
          </div>
        </div>

        <!-- 状态卡片 - 增强版 -->
        <div class="card bg-base-100 shadow-xl md:col-span-1 lg:col-span-2">
          <div class="card-body">
            <div class="flex justify-between items-center">
              <div class="indicator flex items-center">
                <div class="status-dot"></div>
                <div class="text-2xl font-bold ml-2">运行中</div>
              </div>
              <span class="text-success text-3xl">
                <i class="fas fa-check-circle"></i>
              </span>
            </div>
            <p class="text-sm text-base-content/70">所有系统正常运行</p>

            <!-- CPU信息 -->
            <div class="mt-4 p-2 bg-base-200/50 rounded-lg border border-base-300">
              <div class="flex justify-between items-center">
                <div class="text-xs text-base-content/80">处理器</div>
                <div class="text-xs font-medium">{{ systemStats.cpuModel }}</div>
              </div>
              <div class="flex justify-between items-center mt-1">
                <div class="text-xs text-base-content/80">核心数</div>
                <div class="text-xs font-medium">{{ systemStats.cpuCores }}核</div>
              </div>
            </div>

            <!-- CPU使用率 -->
            <div class="mt-3">
              <div class="flex justify-between text-sm">
                <span>CPU使用率</span>
                <span class="font-medium">{{ systemStats.cpu }}%</span>
              </div>
              <progress class="progress progress-success mt-1" :value="systemStats.cpu" max="100"></progress>
            </div>

            <!-- 内存使用率 -->
            <div class="mt-3">
              <div class="flex justify-between text-sm">
                <span>内存使用率</span>
                <span class="font-medium">{{ systemStats.memory }}%</span>
              </div>
              <progress class="progress progress-info mt-1" :value="systemStats.memory" max="100"></progress>
              <div class="flex justify-between text-xs text-base-content/70 mt-1">
                <span>已用: {{ formatMemory(systemStats.memoryUsed) }}</span>
                <span>总计: {{ formatMemory(systemStats.memoryTotal) }}</span>
              </div>
            </div>

            <!-- 网络状态 -->
            <div class="mt-3">
              <div class="flex justify-between text-sm">
                <span>网络流量</span>
                <span class="font-medium">{{ formatBandwidth(systemStats.networkRate) }}/s</span>
              </div>
              <div class="flex justify-between text-xs text-base-content/70 mt-1">
                <span>上传: {{ formatData(systemStats.networkUp) }}</span>
                <span>下载: {{ formatData(systemStats.networkDown) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 通知卡片 -->
        <div class="card bg-base-100 shadow-xl md:col-span-2 lg:col-span-3">
          <div class="card-body p-5">
            <h3 class="font-bold mb-4">最新通知</h3>
            <div class="space-y-3">
              <div v-for="(notice, i) in notifications" :key="i"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors">
                <div :class="`w-8 h-8 rounded-full flex items-center justify-center ${notice.iconBg}`">
                  <i :class="`${notice.icon} text-white`"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm">{{ notice.title }}</p>
                  <p class="text-xs text-base-content/70 truncate">{{ notice.desc }}</p>
                </div>
                <span class="text-xs text-base-content/50">{{ notice.time }}</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-xs w-full mt-3">查看全部</button>
          </div>
        </div>

        <!-- 实例状态卡片 - 修复表格对齐 -->
        <div class="card bg-base-100 shadow-xl md:col-span-2 lg:col-span-3">
          <div class="card-body p-5">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold">实例状态</h3>
              <span class="badge badge-primary">{{ instanceStats.running }}/{{ instanceStats.total }}</span>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-xs w-full">
                <thead>
                  <tr>
                    <th class="w-1/4">名称</th>
                    <th class="w-1/4 text-center">状态</th>
                    <th class="w-1/3 text-center">正常运行时间</th>
                    <th class="w-1/6 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(instance, i) in instances" :key="i" class="hover">
                    <td class="font-medium">{{ instance.name }}</td>
                    <td class="text-center">
                      <div class="badge" :class="getStatusBadgeClass(instance.status)">
                        {{ getStatusText(instance.status) }}
                      </div>
                    </td>
                    <td class="text-center">{{ instance.uptime || '-' }}</td>
                    <td class="text-center">
                      <button class="btn btn-xs btn-ghost rounded-md">
                        <i :class="`fas fa-${getStatusActionIcon(instance.status)}`"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card-actions justify-end mt-2">
              <button class="btn btn-xs btn-outline" @click="navigateToInstances">管理实例</button>
            </div>
          </div>
        </div>

        <!-- 终端卡片已移除 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { initMessageChart } from '../services/charts';

const isDarkMode = inject('darkMode', ref(false));

// 图表引用
const messageChartRef = ref(null);
const messageChart = ref(null);

// 消息统计数据
const messageStats = ref({
  total: '12,450',
  increase: '15%'
});

// 系统状态
const systemStats = ref({
  cpu: 21,
  memory: 36,
  cpuModel: 'AMD EPYC 7K62',
  cpuCores: 96,
  memoryUsed: 5.8 * 1024 * 1024 * 1024, // 5.8 GB in bytes
  memoryTotal: 1024 * 1024 * 1024 * 1024, // 16 GB in bytes
  networkRate: 1.2 * 1024 * 1024, // 1.2 MB/s in bytes
  networkUp: 128 * 1024 * 1024, // 128 MB in bytes
  networkDown: 365 * 1024 * 1024 // 365 MB in bytes
});

// 实例统计
const instanceStats = ref({
  total: 5,
  running: 3
});

// 增强实例列表，添加运行时间和维护状态
const instances = ref([
  { name: '本地实例-1', status: 'running', uptime: '3天4小时' },
  { name: '本地实例-2', status: 'running', uptime: '12小时30分' },
  { name: '远程实例-1', status: 'running', uptime: '18小时15分' },
  { name: '远程实例-2', status: 'stopped', uptime: null },
  { name: '测试实例-1', status: 'maintenance', uptime: '2小时15分' }
]);

// 通知列表
const notifications = ref([
  {
    title: '系统更新',
    desc: '系统已更新到最新版本v1.1.4',
    time: '10分钟前',
    icon: 'fas fa-sync',
    iconBg: 'bg-info'
  },
]);

// 图表数据
const chartData = {
  day: {
    data: [30, 40, 20, 50, 40, 80, 90, 95, 70, 75, 85, 95],
    labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM']
  },
  week: {
    data: [320, 420, 380, 520, 600, 720, 850],
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  month: {
    data: [1200, 1900, 1500, 2100, 2500, 1800, 2800, 2200, 2400, 2000, 3000, 3200],
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  }
};

// 当前活跃图表
const activeChart = ref('week');

// 切换图表周期
const switchChartPeriod = (period) => {
  activeChart.value = period;
  updateMessageChart();
};

// 初始化消息图表
const initCharts = () => {
  nextTick(() => {
    // 消息图表
    if (messageChartRef.value && !messageChart.value) {
      messageChart.value = echarts.init(messageChartRef.value);
      updateMessageChart();
    }
  });
};

// 更新消息图表数据
const updateMessageChart = () => {
  if (messageChart.value) {
    const data = chartData[activeChart.value].data;
    const labels = chartData[activeChart.value].labels;

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c} 条消息'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#555' : '#ddd'
          }
        },
        axisLabel: {
          color: isDarkMode.value ? '#ccc' : '#666',
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: isDarkMode.value ? '#555' : '#ddd'
          }
        },
        axisLabel: {
          color: isDarkMode.value ? '#ccc' : '#666',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      series: [
        {
          data: data,
          type: 'bar',
          itemStyle: {
            color: isDarkMode.value ? '#5983ff' : '#4a7eff'
          },
          emphasis: {
            itemStyle: {
              color: isDarkMode.value ? '#7a9dff' : '#6b93ff'
            }
          }
        }
      ]
    };

    messageChart.value.setOption(option);
  }
};

// 窗口大小变化处理
const handleResize = () => {
  messageChart.value?.resize();
};

// 监听深色模式变化
watch(() => isDarkMode.value, () => {
  nextTick(() => {
    // 重新渲染图表
    updateMessageChart();
  });
});

// 格式化内存大小
const formatMemory = (bytes) => {
  if (!bytes) return '0 GB';
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// 格式化带宽
const formatBandwidth = (bytes) => {
  if (!bytes) return '0 KB/s';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

// 格式化数据大小
const formatData = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(0)} KB`;
  } else if (kb < 1024 * 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
};

// 获取状态样式
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'running': return 'badge-success text-white';
    case 'stopped': return 'badge-warning text-white';
    case 'error': return 'badge-error text-white';
    case 'maintenance': return 'badge-info text-white';
    default: return 'badge-ghost';
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'running': return '运行中';
    case 'stopped': return '已停止';
    case 'error': return '错误';
    case 'maintenance': return '维护中';
    default: return '未知';
  }
};

// 获取状态操作按钮图标
const getStatusActionIcon = (status) => {
  switch (status) {
    case 'running': return 'stop';
    case 'stopped': return 'play';
    case 'maintenance': return 'wrench';
    case 'error': return 'exclamation-circle';
    default: return 'question-circle';
  }
};

// 添加到脚本部分，用于导航到实例管理页面
const navigateToInstances = () => {
  if (emitter) {
    emitter.emit('navigate-to-tab', 'instances');
  }
};

// 初始化
onMounted(() => {
  initCharts();

  window.addEventListener('resize', handleResize);

  // 定期更新数据示例
  setInterval(() => {
    // 随机更新CPU和内存使用率
    systemStats.value = {
      ...systemStats.value,
      cpu: Math.floor(Math.random() * 10) + 15, // 15-25% 范围
      memory: Math.floor(Math.random() * 10) + 30, // 30-40% 范围
      networkRate: (0.8 + Math.random() * 0.8) * 1024 * 1024, // 0.8-1.6 MB/s
      networkUp: systemStats.value.networkUp + (Math.random() * 1024 * 512), // 增加一些上传数据
      networkDown: systemStats.value.networkDown + (Math.random() * 1024 * 1024) // 增加一些下载数据
    };
  }, 10000);
});

// 清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  messageChart.value?.dispose();
});
</script>

<style scoped>
.card-stats {
  @apply bg-base-100 shadow-lg transition-all duration-300 p-5;
}

.card-stats:hover {
  @apply shadow-xl translate-y-[-2px];
}

.message-chart-container {
  width: 100%;
  min-height: 250px;
}

/* 适应深色模式 */
:deep(.dark-mode) .message-chart-container {
  filter: brightness(1.05);
}

/* 设置全部卡片过渡效果 */
.card {
  @apply transition-all duration-300;
}

.card:hover {
  @apply shadow-xl translate-y-[-2px];
}

/* 状态卡片样式增强 */
.badge {
  @apply px-3 py-1;
}

/* 表格对齐修复 */
.table th {
  @apply text-base-content/70 font-medium;
}

.table td {
  @apply py-2;
}

/* 确保圆形按钮居中 */
.btn-ghost {
  @apply flex items-center justify-center;
}

/* 状态指示点样式修复 */
.status-dot {
  @apply w-3 h-3 rounded-full bg-success animate-pulse;
  box-shadow: 0 0 5px 1px rgba(72, 199, 116, 0.5);
}

/* 使用自定义dot而不是DaisyUI的indicator-item */
.indicator {
  position: relative;
}
</style>

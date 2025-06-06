<template>
  <div class="bg-gradient-to-br from-primary/10 to-secondary/10 min-h-screen p-4 lg:p-6" :data-theme="currentTheme"
    :class="themeClasses">
    <div class="max-w-7xl mx-auto">
      <!-- 页面标题 -->
      <div class="mb-6 flex justify-between items-center">
        <h1 class="text-2xl md:text-3xl font-bold text-base-content">控制台</h1>
      </div>
      <!-- 卡片布局 -->
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4"> <!-- 消息数图表卡片 -->
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
            </div>
          </div>
        </div> <!-- 状态卡片 -->
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
            </div> <!-- CPU使用率 -->
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
        </div> <!-- 通知卡片 -->
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
        </div> <!-- 实例状态卡片 -->
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
              <button class="animated-button btn btn-xs btn-outline" @click="navigateToInstances">管理实例</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch, onBeforeUnmount, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import { initMessageChart } from '../services/charts';
import { defaultEChartsOptions } from '../config/echartsConfig.js';
import { adaptInstancesList, adaptInstancesListWithUptime } from '../utils/apiAdapters';

// 导入优化的状态管理
import { useInstanceStore } from '../stores/instanceStore';
import { useSystemStore } from '../stores/systemStore';
import { usePollingStore } from '../stores/pollingStore';

// 计算属性获取当前主题
const currentTheme = computed(() => {
  return inject('currentTheme', ref('light'));
});

// 是否为暗色模式
const isDarkMode = computed(() => {
  return inject('darkMode', ref(false));
});

// 主题类计算
const themeClasses = computed(() => {
  return {
    'dark-mode': isDarkMode.value,
    'theme-dark': currentTheme.value === 'dark',
    'theme-light': currentTheme.value === 'light' || !currentTheme.value
  };
});

const emitter = inject('emitter', null);

// 使用优化的状态管理
const instanceStore = useInstanceStore();
const systemStore = useSystemStore();
const pollingStore = usePollingStore();

// 图表引用
const messageChartRef = ref(null);
const messageChart = ref(null);

// 图表相关引用

// 消息统计数据
const messageStats = ref({
  total: '12,450',
  increase: '15%'
});

// 使用计算属性从store获取数据，避免重复请求
const systemStats = computed(() => {
  const metrics = systemStore.systemStats || {}; // 修正为 systemStats
  return {
    // 映射嵌套的数据结构为扁平化结构，添加安全的空值检查
    cpu: metrics.cpu?.usage || 0,
    cpuModel: metrics.cpu?.model || 'Unknown CPU',
    cpuCores: metrics.cpu?.cores || 8,
    memory: metrics.memory?.usage || 0, // 直接使用已适配的usage百分比
    memoryUsed: metrics.memory?.used || 0,
    memoryTotal: metrics.memory?.total || 0,
    disk: metrics.disk?.usage || 0, // 直接使用已适配的usage百分比
    networkUp: metrics.network?.up || 0,
    networkDown: metrics.network?.down || 0,
    networkRate: metrics.network?.rate || 0
  };
});
const instanceStats = computed(() => instanceStore.instanceStats);
const instances = computed(() => {
  // 转换实例数据格式以适配表格显示
  return instanceStore.instances.map(instance => ({
    ...instance,
    uptime: instance.uptime || calculateUptime(instance.startTime)
  }));
});

// 通知列表
const notifications = ref([
  {
    title: '系统更新',
    desc: '系统已更新到最新版本v0.1.0-Preview.3',
    time: '114514分钟前',
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
      // 使用全局配置创建 ECharts 实例
      messageChart.value = echarts.init(messageChartRef.value, null, defaultEChartsOptions);
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

// 更新图表主题
const updateChartTheme = (isDark) => {
  if (!messageChart.value) return;

  const theme = {
    backgroundColor: isDark ? 'transparent' : 'transparent',
    textStyle: {
      color: isDark ? '#cccccc' : '#333333'
    },
    axisPointer: {
      lineStyle: {
        color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
      },
      crossStyle: {
        color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
      }
    },
    xAxis: {
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
        }
      },
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    yAxis: {
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
        }
      },
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  messageChart.value.setOption({
    backgroundColor: theme.backgroundColor,
    textStyle: theme.textStyle,
    axisPointer: theme.axisPointer,
    xAxis: {
      axisLine: theme.xAxis.axisLine,
      splitLine: theme.xAxis.splitLine
    },
    yAxis: {
      axisLine: theme.yAxis.axisLine,
      splitLine: theme.yAxis.splitLine
    }
  });
};

// 窗口大小变化处理 - 重命名为handleWindowResize
const handleWindowResize = () => {
  messageChart.value?.resize();
};

// 监听深色模式变化
watch(() => isDarkMode.value, () => {
  nextTick(() => {
    // 重新渲染图表
    updateMessageChart();
  });
});

// 计算运行时间的辅助函数
const calculateUptime = (startTime) => {
  if (!startTime) return '-';
  const now = new Date();
  const start = new Date(startTime);
  const diff = now - start;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}天${hours}时`;
  if (hours > 0) return `${hours}时${minutes}分`;
  return `${minutes}分钟`;
};

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

// 实例相关辅助函数
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'running':
      return 'badge-success';
    case 'stopped':
      return 'badge-error';
    case 'starting':
      return 'badge-warning';
    case 'stopping':
      return 'badge-warning';
    default:
      return 'badge-ghost';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'running':
      return '运行中';
    case 'stopped':
      return '已停止';
    case 'starting':
      return '启动中';
    case 'stopping':
      return '停止中';
    default:
      return '未知';
  }
};

const getStatusActionIcon = (status) => {
  switch (status) {
    case 'running':
      return 'stop';
    case 'stopped':
      return 'play';
    case 'starting':
    case 'stopping':
      return 'spinner fa-spin';
    default:
      return 'question';
  }
};

// 导航到实例管理页面 - 使用事件总线触发页面过渡动画
const navigateToInstances = () => {
  if (emitter) {
    // 使用事件总线进行导航，触发 App.vue 中的页面过渡动画
    emitter.emit('navigate-to-tab', 'instances');
    console.log('已发送导航事件到实例管理页面');
  } else {
    // 降级处理：直接使用路由器导航
    const router = inject('router', null);
    if (router) {
      router.push('/instances');
    } else {
      window.location.href = '#/instances';
    }
  }
};

// 优化：使用统一的store管理，避免重复请求
const loadData = async () => {
  try {
    // 使用store统一获取数据，自动处理缓存和防重复请求
    await Promise.all([
      instanceStore.fetchInstances(),
      systemStore.fetchSystemStats()
    ]);

    console.log('首页数据加载完成');
  } catch (e) {
    console.error('加载首页数据失败', e);
  }
};

// 优化：使用统一的轮询管理
const startAutoRefresh = () => {
  // 通知轮询store当前在首页，需要实例和系统数据
  pollingStore.adjustPollingByPageState('home');

  console.log('首页轮询已启动');
};

// 优化：统一停止轮询
const stopAutoRefresh = () => {
  // 通知轮询store切换到后台模式
  pollingStore.adjustPollingByPageState('background');

  console.log('首页轮询已调整为后台模式');
};



// 添加主题变更监听
onMounted(() => {
  initCharts();

  window.addEventListener('resize', handleWindowResize);

  // 优化：使用统一的数据加载
  loadData();

  // 启动自动刷新
  startAutoRefresh();

  // 添加主题变更事件监听
  const handleThemeChanged = (event) => {
    const newTheme = event.detail?.theme || localStorage.getItem('theme') || 'light';
    const isDark = newTheme === 'dark';    // 获取当前组件根元素
    const homeViewElement = document.querySelector('.page');
    if (homeViewElement) {
      // 设置数据主题
      homeViewElement.setAttribute('data-theme', newTheme);

      // 添加或移除暗色模式类
      if (isDark) {
        homeViewElement.classList.add('dark-mode', 'theme-dark');
        homeViewElement.classList.remove('theme-light');
      } else {
        homeViewElement.classList.remove('dark-mode', 'theme-dark');
        homeViewElement.classList.add('theme-light');
      }
    }

    // 如果有图表，可能需要更新图表主题
    updateChartTheme(isDark);
  };

  window.addEventListener('theme-changed', handleThemeChanged);
  window.addEventListener('theme-changed-after', handleThemeChanged);

  // 组件卸载时移除事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('theme-changed', handleThemeChanged);
    window.removeEventListener('theme-changed-after', handleThemeChanged);
  });
});

// 清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  messageChart.value?.dispose();

  // 停止自动刷新
  stopAutoRefresh();
});
</script>

<style scoped lang="postcss">
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
  @apply px-3 py-1 transition-all duration-200;
}

.badge:hover {
  transform: scale(1.05);
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

/* 卡片内容布局优化 */
.card-body {
  @apply p-5 flex flex-col;
  height: 100%;
}

/* 确保状态文本与按钮对齐 */
.status-text {
  @apply ml-1 text-sm;
  vertical-align: middle;
}

/* 增强的表格行悬停效果 */
.table tbody tr:hover {
  transform: scale(1.01);
  transition: transform 0.1s ease;
}
</style>

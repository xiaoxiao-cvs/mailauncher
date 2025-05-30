<template>
  <div class="bg-gradient-to-br from-primary/10 to-secondary/10 min-h-screen p-4 lg:p-6">
    <div class="max-w-7xl mx-auto"> <!-- 页面标题 -->
      <div class="mb-6 flex justify-between items-center">
        <h1 class="text-2xl md:text-3xl font-bold text-base-content">控制台</h1>
      </div> <!-- 卡片布局 -->
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
              <button class="btn btn-xs btn-outline" @click="navigateToInstances">管理实例</button>
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
import SimpleIcons from './common/SimpleIcons.vue'; // 导入简单图标组件
import { adaptInstancesList, adaptInstancesListWithUptime } from '../utils/apiAdapters';

// 导入优化的状态管理
import { useInstanceStore } from '../stores/instanceStore';
import { useSystemStore } from '../stores/systemStore';
import { usePollingStore } from '../stores/pollingStore';

const isDarkMode = inject('darkMode', ref(false));
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

// 导航到实例管理页面
const navigateToInstances = () => {
  const router = inject('router', null);
  if (router) {
    router.push('/instances');
  } else {
    window.location.href = '#/instances';
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

// 切换编辑模式
const toggleEditMode = async () => {
  if (isEditMode.value) {
    // 退出编辑模式，询问是否保存
    const confirmed = confirm('是否保存当前布局设置？');
    if (confirmed) {
      // 用户点击了"保存并退出"
      saveLayout();
    } else {
      // 用户点击了"不保存退出"，什么都不做
      console.log('不保存布局退出编辑模式');
    }
    isEditMode.value = false;
  } else {
    // 进入编辑模式
    isEditMode.value = true;
  }
};

// 保存布局设置
const saveLayout = () => {
  try {
    const layout = {
      msgChartSize: msgChartSize.value,
      statusCardSize: statusCardSize.value,
      noticeCardSize: noticeCardSize.value,
      instanceCardSize: instanceCardSize.value,
    };
    localStorage.setItem('dashboard-layout', JSON.stringify(layout));

    // 使用toast服务而不是alert
    const toast = inject('toast', null);
    if (toast) {
      toast.success('布局设置已保存');
    } else {
      alert('布局设置已保存');
    }

    isEditMode.value = false;  // 保存后退出编辑模式

    // 触发窗口resize事件，以便图表可以正确调整大小
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  } catch (e) {
    console.error('保存布局设置失败', e);

    const toast = inject('toast', null);
    if (toast) {
      toast.error('保存布局设置失败: ' + e.message);
    } else {
      alert('保存布局设置失败: ' + e.message);
    }
  }
};

// 开始调整大小 - 修复拖拽功能
const startResize = (e, cardType, handleType) => {
  e.preventDefault();
  currentCard = cardType;
  startX = e.clientX;
  handleDirection = handleType; // 'left' 或 'right'

  // 详细日志便于调试
  console.log(`开始调整卡片: ${cardType}, 方向: ${handleType}, 初始位置: ${startX}px`);

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', stopResize);

  // 添加调整中的视觉提示
  document.body.style.cursor = 'col-resize';
  document.body.classList.add('select-none');
  document.body.classList.add('resizing');

  // 标记正在调整的卡片
  if (cardType === 'chart') chartCard.value.classList.add('resizing-card');
  if (cardType === 'status') statusCard.value.classList.add('resizing-card');
  if (cardType === 'notice') noticeCard.value.classList.add('resizing-card');
  if (cardType === 'instance') instanceCard.value.classList.add('resizing-card');
};

// 处理拖动中的调整 - 修复拖拽功能
const handleResizeMove = (e) => {
  if (!currentCard) return;

  const deltaX = e.clientX - startX;
  console.log(`拖动中: ${currentCard}, 位移: ${deltaX}px, 方向: ${handleDirection}`);

  const RESIZE_THRESHOLD = 30; // 降低阈值使拖动更灵敏

  // 根据不同的卡片类型和手柄方向调整布局类
  switch (currentCard) {
    case 'chart':
      if (handleDirection === 'right' && deltaX > RESIZE_THRESHOLD) {
        // 向右拖动，增加图表宽度
        msgChartSize.value = 'md:col-span-4 lg:col-span-5';
        statusCardSize.value = 'md:col-span-1 lg:col-span-1';
        startX = e.clientX;
      } else if (handleDirection === 'right' && deltaX < -RESIZE_THRESHOLD) {
        // 向左拖动，减少图表宽度
        msgChartSize.value = 'md:col-span-2 lg:col-span-3';
        statusCardSize.value = 'md:col-span-2 lg:col-span-3';
        startX = e.clientX;
      }
      break;
    case 'status':
      if (handleDirection === 'left' && deltaX < -RESIZE_THRESHOLD) {
        // 向左拖动左侧手柄，增加状态卡片宽度
        msgChartSize.value = 'md:col-span-2 lg:col-span-3';
        statusCardSize.value = 'md:col-span-2 lg:col-span-3';
        startX = e.clientX;
      } else if (handleDirection === 'left' && deltaX > RESIZE_THRESHOLD) {
        // 向右拖动左侧手柄，减少状态卡片宽度
        msgChartSize.value = 'md:col-span-4 lg:col-span-5';
        statusCardSize.value = 'md:col-span-1 lg:col-span-1';
        startX = e.clientX;
      }
      break;
    case 'notice':
      if (handleDirection === 'right' && deltaX > RESIZE_THRESHOLD) {
        // 向右拖动，增加通知卡片宽度
        noticeCardSize.value = 'md:col-span-3 lg:col-span-4';
        instanceCardSize.value = 'md:col-span-1 lg:col-span-2';
        startX = e.clientX;
      } else if (handleDirection === 'right' && deltaX < -RESIZE_THRESHOLD) {
        // 向左拖动，减少通知卡片宽度
        noticeCardSize.value = 'md:col-span-1 lg:col-span-2';
        instanceCardSize.value = 'md:col-span-3 lg:col-span-4';
        startX = e.clientX;
      }
      break;
    case 'instance':
      if (handleDirection === 'left' && deltaX < -RESIZE_THRESHOLD) {
        // 向左拖动左侧手柄，增加实例卡片宽度
        noticeCardSize.value = 'md:col-span-1 lg:col-span-2';
        instanceCardSize.value = 'md:col-span-3 lg:col-span-4';
        startX = e.clientX;
      } else if (handleDirection === 'left' && deltaX > RESIZE_THRESHOLD) {
        // 向右拖动左侧手柄，减少实例卡片宽度
        noticeCardSize.value = 'md:col-span-3 lg:col-span-4';
        instanceCardSize.value = 'md:col-span-1 lg:col-span-2';
        startX = e.clientX;
      }
      break;
  }

  // 更新后重新绘制图表
  nextTick(() => {
    messageChart.value?.resize();
  });
};

// 停止调整大小
const stopResize = () => {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.classList.remove('select-none');
  document.body.classList.remove('resizing'); // 移除正在调整的类

  // 移除卡片上的调整标记
  chartCard.value?.classList.remove('resizing-card');
  statusCard.value?.classList.remove('resizing-card');
  noticeCard.value?.classList.remove('resizing-card');
  instanceCard.value?.classList.remove('resizing-card');

  currentCard = '';
  handleDirection = ''; // 清除方向

  console.log('调整完成，布局已更新');
};

// 添加变量存储手柄方向
let handleDirection = '';

// 初始化
onMounted(() => {
  initCharts();

  window.addEventListener('resize', handleWindowResize);

  // 强行同步布局状态，以防止可能的状态不一致
  msgChartSize.value = 'md:col-span-3 lg:col-span-4';
  statusCardSize.value = 'md:col-span-1 lg:col-span-2';
  noticeCardSize.value = 'md:col-span-2 lg:col-span-3';
  instanceCardSize.value = 'md:col-span-2 lg:col-span-3';

  // 然后尝试加载保存的布局
  try {
    const savedLayout = localStorage.getItem('dashboard-layout');
    if (savedLayout) {
      const layout = JSON.parse(savedLayout);
      msgChartSize.value = layout.msgChartSize || msgChartSize.value;
      statusCardSize.value = layout.statusCardSize || statusCardSize.value;
      noticeCardSize.value = layout.noticeCardSize || noticeCardSize.value;
      instanceCardSize.value = layout.instanceCardSize || instanceCardSize.value;
    }
  } catch (e) {
    console.error('无法加载保存的布局', e);
  }

  // 优化：使用统一的数据加载
  loadData();

  // 启动自动刷新
  startAutoRefresh();
});

// 清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  messageChart.value?.dispose();
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', stopResize);

  // 停止自动刷新
  stopAutoRefresh();
});
</script>

<style scoped lang="postcss">
/* 添加编辑按钮样式 */
.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: var(--el-color-primary);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  outline: none;
  position: relative;
}

.edit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.exit-btn {
  background-color: var(--el-color-danger);
}

.save-btn {
  /* 更改为无填充按钮 */
  background-color: transparent;
  border: 1px solid var(--el-color-success);
  color: var(--el-color-success);
}

.save-btn:hover {
  background-color: rgba(var(--el-color-success-rgb), 0.1);
}

/* 确保图标在按钮中居中显示 */
.edit-btn .simple-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

/* 编辑模式下的布局样式 */
.edit-layout-mode .card {
  position: relative;
  transition: all 0.5s ease;
  /* 增加过渡动画时间和平滑度 */
  border: 2px dashed transparent;
}

/* 修复卡片大小变化的动画 */
.card {
  transition: all 0.5s ease !important;
  /* 强制应用过渡动画 */
}

.edit-layout-mode .card:hover {
  border-color: var(--el-color-primary);
}

/* 拖拽手柄样式增强 - 提高可见性 */
.resize-handle {
  position: absolute;
  top: 0;
  width: 12px;
  /* 加宽手柄 */
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  /* 提高z-index确保能够点击 */
  background-color: transparent;
  transition: background-color 0.3s;
}

.resize-handle:hover,
.resize-handle:active {
  background-color: rgba(var(--el-color-primary-rgb), 0.3);
  /* 增强悬停时的视觉效果 */
}

.resize-handle.right {
  right: -6px;
  /* 向外延伸以便更容易抓取 */
}

.resize-handle.left {
  left: -6px;
  /* 向外延伸以便更容易抓取 */
}

/* 正在调整大小时的视觉反馈 */
.resizing-card {
  box-shadow: 0 0 0 2px var(--el-color-primary) !important;
  /* 高亮正在调整大小的卡片 */
  z-index: 10;
}

/* 正在调整大小时的动画效果 */
body.resizing .card {
  transition: none !important;
  /* 拖动时禁用过渡效果，使拖动更流畅 */
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 确保所有卡片在编辑模式下都有可见的边界 */
.edit-layout-mode .card {
  border: 2px dashed rgba(var(--el-color-primary-rgb), 0.3);
  animation: pulse-border 2s infinite;
  /* 添加边框脉冲动画 */
}

/* 添加边框脉冲动画 */
@keyframes pulse-border {

  0%,
  100% {
    border-color: rgba(var(--el-color-primary-rgb), 0.3);
  }

  50% {
    border-color: rgba(var(--el-color-primary-rgb), 0.8);
  }
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
</style>

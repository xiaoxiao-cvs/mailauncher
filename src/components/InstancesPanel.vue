<template>
  <div class="instances-tab" :data-theme="currentTheme" :class="themeClasses">
    <!-- 加载状态指示器，减少空白屏幕时间 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">正在加载实例管理页面...</p>
    </div>

    <!-- 过渡容器 - 当showInstanceDetail为true时显示实例详情，为false时显示实例列表 -->
    <transition v-else :name="transitionName" mode="out-in" appear>
      <InstanceDetailView v-if="showInstanceDetail" :instance="currentInstance" @back="closeInstanceDetail" key="detail"
        class="transition-view" />

      <!-- 实例列表组件 - 当showInstanceDetail为false时显示 -->
      <InstancesList v-else :instances="instancesData" @refresh-instances="loadInstances"
        @toggle-instance="handleToggleInstance" @view-instance="openInstanceDetail" key="list"
        class="transition-view" />
    </transition>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onBeforeUnmount, computed, provide } from 'vue';
import InstancesList from './instances/InstancesList.vue';
import InstanceDetailView from './instances/InstanceDetailView.vue';
import toastService from '@/services/toastService';

// 引入API服务
import { instancesApi } from '@/services/api';

// 注入全局事件总线
const emitter = inject('emitter', null);

// 实例状态
const instancesData = ref([]);
const showInstanceDetail = ref(false);
const isLoading = ref(true); // 添加加载状态
const transitionName = ref('slide-to-detail'); // 动态过渡名称
const currentInstance = ref({
  name: '',
  path: '',
  status: 'stopped'
});
const initialSettingsTab = ref('basic'); // 新增：用于记录实例设置的初始标签页

// 提供showInstanceDetail状态给子组件
provide('showInstanceDetail', showInstanceDetail);

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

// 加载实例列表方法 - 使用适配器处理实例数据
const loadInstances = async () => {
  try {
    isLoading.value = true; // 开始加载

    // 引入实例API适配器
    const { adaptInstancesList } = await import('@/utils/apiAdapters');

    // 检查是否使用模拟数据
    const useMockData = localStorage.getItem('useMockData') === 'true';

    if (useMockData) {
      // 模拟加载延迟，提供更好的用户体验
      await new Promise(resolve => setTimeout(resolve, 300));
      // 使用模拟数据
      instancesData.value = getMockInstances();
    } else {
      // 使用API获取实例列表，通过适配器处理数据
      const response = await instancesApi.getInstances();
      instancesData.value = adaptInstancesList(response);
      console.log('获取到' + instancesData.value.length + '个实例');
    }
  } catch (error) {
    console.error('获取实例列表失败:', error);

    // 先尝试使用实例API的模拟数据功能
    try {
      const { adaptInstancesList } = await import('@/utils/apiAdapters');
      const mockResponse = await instancesApi.getMockInstances();
      instancesData.value = adaptInstancesList(mockResponse);
      console.log('使用API模拟数据');
    } catch (mockError) {
      // 如果模拟API也失败，才使用本地模拟数据
      instancesData.value = getMockInstances();
      console.log('使用本地模拟数据');
    }

    toastService.error('获取实例列表失败');
  } finally {
    // 确保最小加载时间，避免闪烁
    setTimeout(() => {
      isLoading.value = false;
    }, 200);
  }
};

// 获取模拟实例数据
const getMockInstances = () => {
  return [
    {
      id: 'inst1',
      name: '测试实例1',
      status: 'running',
      createdAt: '2023-05-18 10:30:00',
      totalRunningTime: '48小时30分钟',
      path: 'D:\\MaiBot\\测试实例1'
    },
    {
      id: 'inst2',
      name: '测试实例2',
      status: 'stopped',
      createdAt: '2023-05-17 14:15:00',
      totalRunningTime: '12小时45分钟',
      path: 'D:\\MaiBot\\测试实例2'
    },
    {
      id: 'inst3',
      name: '开发测试3',
      status: 'maintenance',
      createdAt: '2023-05-15 09:20:00',
      totalRunningTime: '24小时10分钟',
      path: 'D:\\MaiBot\\开发测试3'
    }
  ];
};

// 打开实例详情
const openInstanceDetail = (instance) => {
  // 设置进入详情页的动画方向（从右向左滑入）
  transitionName.value = 'slide-to-detail';

  // 直接切换，使用过渡动画提供平滑效果
  currentInstance.value = instance;
  showInstanceDetail.value = true;
};

// 关闭实例详情
const closeInstanceDetail = () => {
  // 设置退出详情页的动画方向（从左向右滑出）
  transitionName.value = 'slide-to-list';

  showInstanceDetail.value = false;
  // 保持WebSocket连接活跃，不清理连接
  console.log('关闭实例详情页面，保持WebSocket连接');
};

// 处理实例启停
const handleToggleInstance = (instance) => {
  const index = instancesData.value.findIndex(item => item.id === instance.id || item.name === instance.name);
  if (index !== -1) {
    const newStatus = instance.status === 'running' ? 'stopped' : 'running';
    instancesData.value[index].status = newStatus === 'running' ? 'starting' : 'stopping';

    // 模拟API操作延迟
    setTimeout(() => {
      instancesData.value[index].status = newStatus;
      toastService.success(`实例 ${instance.name} 已${newStatus === 'running' ? '启动' : '停止'}`);
    }, 1500);
  }
};

// 组件挂载时设置事件监听
onMounted(() => {
  // 初次加载实例列表
  loadInstances();

  // 当前主题
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = currentTheme === 'dark';

  // 立即应用当前主题
  const instancesPanel = document.querySelector('.instances-tab');
  if (instancesPanel) {
    instancesPanel.setAttribute('data-theme', currentTheme);
    if (isDark) {
      instancesPanel.classList.add('dark-mode', 'theme-dark');
      instancesPanel.classList.remove('theme-light');
    } else {
      instancesPanel.classList.remove('dark-mode', 'theme-dark');
      instancesPanel.classList.add('theme-light');
    }
  }

  // 添加主题变更事件监听
  const handleThemeChanged = (event) => {
    const newTheme = event.detail?.theme || localStorage.getItem('theme') || 'light';
    const isDark = newTheme === 'dark';

    // 获取组件根元素
    const instancesPanelElement = document.querySelector('.instances-tab');
    if (instancesPanelElement) {
      // 设置数据主题
      instancesPanelElement.setAttribute('data-theme', newTheme);

      // 添加或移除暗色模式类
      if (isDark) {
        instancesPanelElement.classList.add('dark-mode', 'theme-dark');
        instancesPanelElement.classList.remove('theme-light');
      } else {
        instancesPanelElement.classList.remove('dark-mode', 'theme-dark');
        instancesPanelElement.classList.add('theme-light');
      }
    }
  };

  window.addEventListener('theme-changed', handleThemeChanged);
  window.addEventListener('theme-changed-after', handleThemeChanged);

  // 组件卸载时移除事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('theme-changed', handleThemeChanged);
    window.removeEventListener('theme-changed-after', handleThemeChanged);
  });
});

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  // 移除事件监听 - 由于已删除相关功能，这里也需要清理
});
</script>

<style scoped>
.instances-tab {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}

/* 过渡视图基础样式 */
.transition-view {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 进入详情页的动画（从右向左滑入） */
.slide-to-detail-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-to-detail-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-to-detail-enter-from {
  opacity: 0;
  transform: translateX(100px) scale(0.96);
  filter: blur(1px);
}

.slide-to-detail-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: blur(0);
}

.slide-to-detail-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: blur(0);
}

.slide-to-detail-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.98);
  filter: blur(1px);
}

/* 退出详情页的动画（从左向右滑出） */
.slide-to-list-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-to-list-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-to-list-enter-from {
  opacity: 0;
  transform: translateX(-100px) scale(0.96);
  filter: blur(1px);
}

.slide-to-list-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: blur(0);
}

.slide-to-list-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: blur(0);
}

.slide-to-list-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.98);
  filter: blur(1px);
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 50vh;
}

/* 为过渡添加硬件加速，提升性能 */
.slide-to-detail-enter-active,
.slide-to-detail-leave-active,
.slide-to-list-enter-active,
.slide-to-list-leave-active {
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* 确保过渡动画在移动设备上的性能 */
@media (max-width: 768px) {

  .slide-to-detail-enter-from,
  .slide-to-list-enter-from {
    transform: translateX(50px) scale(0.98);
  }

  .slide-to-detail-leave-to {
    transform: translateX(-30px) scale(0.99);
  }

  .slide-to-list-leave-to {
    transform: translateX(50px) scale(0.99);
  }
}
</style>

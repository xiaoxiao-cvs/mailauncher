<template>
  <div class="instances-tab">
    <!-- 实例详情视图 - 当showInstanceDetail为true时显示 -->
    <transition name="instance-detail-transition" mode="out-in">
      <InstanceDetailView v-if="showInstanceDetail" :instance="currentInstance" @back="closeInstanceDetail" />

      <!-- 实例列表组件 - 当showInstanceDetail为false时显示 -->
      <InstancesList v-else :instances="instancesData" @refresh-instances="loadInstances"
        @toggle-instance="handleToggleInstance" @view-instance="openInstanceDetail" />
    </transition>

    <!-- 实例配置抽屉组件 -->
    <InstanceSettingsDrawer :is-open="isSettingsOpen" :instance-name="currentInstance.name"
      :instance-path="currentInstance.path" @close="closeInstanceSettings" @save="handleInstanceSettingsSave" />

    <!-- 模型设置抽屉 -->
    <ModelSettingsDrawer :is-open="isModelSettingsOpen" :instance-name="currentInstance?.name || ''"
      @close="closeModelSettings" @save="handleModelSettingsSave" />
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue';
import InstancesList from './instances/InstancesList.vue';
import InstanceSettingsDrawer from './settings/InstanceSettingsDrawer.vue';
import InstanceDetailView from './instances/InstanceDetailView.vue';
import ModelSettingsDrawer from './settings/ModelSettingsDrawer.vue';
import toastService from '@/services/toastService';

// 引入API服务
import { instancesApi } from '@/services/api';

// 注入全局事件总线
const emitter = inject('emitter', null);

// 实例状态
const instancesData = ref([]);
const isSettingsOpen = ref(false);
const showInstanceDetail = ref(false);
const isModelSettingsOpen = ref(false);
const currentInstance = ref({
  name: '',
  path: '',
  status: 'stopped'
});
const initialSettingsTab = ref('basic'); // 新增：用于记录实例设置的初始标签页

// 加载实例列表方法 - 使用适配器处理实例数据
const loadInstances = async () => {
  try {
    // 引入实例API适配器
    const { adaptInstancesList } = await import('@/utils/apiAdapters');

    // 检查是否使用模拟数据
    const useMockData = localStorage.getItem('useMockData') === 'true';

    if (useMockData) {
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
  // 添加一个小延迟，让动画效果更明显
  setTimeout(() => {
    currentInstance.value = instance;
    showInstanceDetail.value = true;
  }, 50);
};

// 关闭实例详情
const closeInstanceDetail = () => {
  showInstanceDetail.value = false;
};

// 打开实例设置
const openInstanceSettings = (instance, options = {}) => {
  console.log('打开实例设置:', instance, options);
  currentInstance.value = instance;

  // 如果指定了特定的tab，且是从实例详情页面打开的
  if (options.tab === 'bot' && options.fromDetailView) {
    // 直接打开Bot配置
    openModelSettings(instance);
  } else {
    // 其他情况只打开实例设置抽屉
    isSettingsOpen.value = true;
  }
};

// 打开模型设置
const openModelSettings = (instance) => {
  currentInstance.value = instance;
  isModelSettingsOpen.value = true;
};

// 关闭模型设置
const closeModelSettings = () => {
  isModelSettingsOpen.value = false;
};

// 处理模型设置保存
const handleModelSettingsSave = (modelConfig) => {
  console.log('模型配置已保存:', modelConfig);
  toastService.success('模型配置已保存');
};

// 关闭实例设置
const closeInstanceSettings = () => {
  isSettingsOpen.value = false;
};

// 处理实例设置保存
const handleInstanceSettingsSave = (settings) => {
  console.log('保存实例设置:', settings);
  toastService.success(`已保存 ${currentInstance.value.name} 的设置`);
  closeInstanceSettings();
  // 刷新实例列表
  loadInstances();
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

  // 监听打开实例设置事件
  if (emitter) {
    emitter.on('open-instance-settings', (data) => {
      // 查找对应的实例
      let targetInstance = null;

      // 通过路径或名称查找实例
      if (data.path) {
        targetInstance = instancesData.value.find(inst => inst.path === data.path);
      }

      if (!targetInstance && data.name) {
        targetInstance = instancesData.value.find(inst => inst.name === data.name);
      }

      // 如果找不到实例，创建一个临时实例对象
      if (!targetInstance) {
        targetInstance = {
          name: data.name || '未知实例',
          path: data.path || '',
          status: 'unknown'
        };
      }

      // 打开设置并传递标签页信息和来源信息
      openInstanceSettings(targetInstance, {
        tab: data.tab,
        fromDetailView: data.fromDetailView
      });
    });

    // 添加监听Bot配置事件
    emitter.on('instance-panel-open-bot-config', (instance) => {
      console.log('实例面板收到打开Bot配置事件:', instance);
      // 直接打开模型设置
      openModelSettings(instance);
    });
  }
});

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  // 移除事件监听
  if (emitter) {
    emitter.off('open-instance-settings');
    emitter.off('instance-panel-open-bot-config');
  }
});
</script>

<style scoped>
.instances-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 添加实例详情视图过渡效果 */
.instance-detail-transition-enter-active {
  animation: slideInFromRight 0.2s ease-out;
}

.instance-detail-transition-leave-active {
  animation: slideOutToRight 0.15s ease-in;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutToRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }

  to {
    opacity: 0;
    transform: translateX(40px);
  }
}
</style>

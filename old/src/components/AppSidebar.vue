<template>
  <div class="sidebar fixed top-0 left-0 h-screen z-50" :class="{ 'sidebar-expanded': isExpanded }">
    <!-- Logo区域 -->
    <div class="sidebar-header pt-4 pb-2 px-4">
      <div class="flex items-center gap-3">
        <img src="/assets/icon.ico" alt="MaiLauncher" class="w-6 h-6" />
        <div class="sidebar-title font-bold text-lg transition-opacity duration-300"
          :class="{ 'opacity-0': !isExpanded }">
          MaiLauncher
        </div>
      </div>
    </div>    <!-- 导航菜单 - 主要菜单项 -->
    <ul class="menu menu-md menu-vertical py-2 px-2 gap-1">
      <li v-for="(item, key) in filteredMenuItems" :key="key">
        <a href="#" @click.prevent="selectTab(key)" :class="{ 'active': activeTab === key }">
          <Icon :icon="getIconName(key)" width="20" height="20" />
          <span class="sidebar-text">{{ item.title }}</span>
        </a>
      </li>
    </ul>

    <div class="flex-grow"></div>    <!-- 设置菜单项 - 确保在收起按钮上方 -->
    <div class="sidebar-footer-section px-2 pb-2">
      <ul class="menu menu-md menu-vertical"> <!-- 设置项 -->
        <li>
          <a href="#" @click.prevent="selectTab('settings')" :class="{ 'active': isSettingsOpen }">
            <Icon icon="ri:settings-3-line" width="20" height="20" />
            <span class="sidebar-text">{{ menuItems.settings?.title }}</span>
          </a>
        </li>
      </ul>
    </div><!-- 底部收起按钮 -->
    <div class="sidebar-footer p-3">
      <button class="btn btn-sm btn-ghost w-full" @click="toggleSidebar">
        <Icon :icon="isExpanded ? 'ri:arrow-left-s-line' : 'ri:arrow-right-s-line'" width="20" height="20" />
        <span class="sidebar-text">{{ isExpanded ? '收起' : '' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';

// 接收是否展开的属性
const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  },
  isSettingsOpen: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits(['toggle']);

// 获取菜单项和当前激活的选项卡
const menuItems = inject('menuItems', {});
const activeTab = inject('activeTab', ref('home'));
// 获取事件总线
const emitter = inject('emitter', null);

// 记录上一个激活的选项卡，用于判断切换方向
const previousTab = ref('home');

// 过滤掉settings菜单项，因为我们单独处理它
const filteredMenuItems = computed(() => {
  const filtered = { ...menuItems };
  delete filtered.settings;
  return filtered;
});

// 根据菜单项key获取对应图标名称
const getIconName = (key) => {
  // 使用Iconify图标
  const iconMap = {
    home: 'mdi:home',
    instances: 'mdi:apps',
    downloads: 'mdi:download',
    plugins: 'mdi:puzzle',
    settings: 'mdi:cog',
    chat: 'mdi:chat', // 新增聊天室图标
  };

  return iconMap[key] || 'mdi:circle';
};

// 获取菜单项的索引位置
const getMenuIndex = (tab) => {
  const menuKeys = Object.keys(filteredMenuItems.value);
  return menuKeys.indexOf(tab);
};

// 添加动画方向类
const addDirectionClass = (currentTab, prevTab) => {
  const currentIndex = getMenuIndex(currentTab);
  const prevIndex = getMenuIndex(prevTab);
  
  // 清除所有方向类
  document.querySelectorAll('.sidebar .menu li a').forEach(link => {
    link.classList.remove('slide-up', 'slide-down');
  });
  
  // 等一帧再添加新的方向类，确保动画重新触发
  requestAnimationFrame(() => {
    const activeLink = document.querySelector('.sidebar .menu li a.active');
    if (activeLink) {
      if (currentIndex > prevIndex) {
        // 向下切换
        activeLink.classList.add('slide-down');
      } else if (currentIndex < prevIndex) {
        // 向上切换
        activeLink.classList.add('slide-up');
      }
    }
  });
};

// 切换侧边栏的方法
const toggleSidebar = () => {
  // 添加动画状态类
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) {
    sidebarEl.classList.add('sidebar-transitioning');
    
    // 400ms后移除动画状态类（与CSS动画时间匹配）
    setTimeout(() => {
      sidebarEl.classList.remove('sidebar-transitioning');
    }, 400);
  }
  
  emit('toggle');
};

// 选择选项卡方法 - 添加方向检测
const selectTab = (tab) => {
  console.log(`尝试导航到: ${tab}`);

  // 记录切换方向
  const prevTab = activeTab.value;
  
  // 使用全局强制导航事件
  window.dispatchEvent(new CustomEvent('force-navigate', {
    detail: { tab: tab }
  }));

  // 同时尝试使用emitter
  if (emitter) {
    const timestamp = new Date().getTime();
    emitter.emit('navigate-to-tab', tab, timestamp);
    console.log(`已发送导航事件: navigate-to-tab ${tab} (${timestamp})`);
  }
  
  // 添加方向动画类
  setTimeout(() => {
    addDirectionClass(tab, prevTab);
  }, 50);
};

// 组件挂载时检查事件总线
onMounted(() => {
  if (!emitter) {
    console.warn('警告: 事件总线(emitter)未注入，导航功能可能无法正常工作');
  }
});
</script>

<style>
@import '../assets/css/appSidebar.css';
</style>

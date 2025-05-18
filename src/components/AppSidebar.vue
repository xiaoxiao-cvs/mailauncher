<template>
  <div class="sidebar fixed top-0 left-0 h-screen z-50" :class="{ 'sidebar-expanded': isExpanded }">
    <!-- Logo区域 -->
    <div class="sidebar-header pt-4 pb-2 px-4">
      <div class="flex items-center gap-3">
        <img src="/assets/icon.ico" alt="MaiLauncher" class="w-8 h-8" />
        <div class="sidebar-title font-bold text-lg transition-opacity duration-300"
          :class="{ 'opacity-0': !isExpanded }">
          MaiLauncher
        </div>
      </div>
    </div>

    <!-- 导航菜单 - 主要菜单项 -->
    <ul class="menu menu-md menu-vertical py-2 px-2 gap-1">
      <li v-for="(item, key) in filteredMenuItems" :key="key">
        <a href="#" @click.prevent="selectTab(key)" :class="{ 'active': activeTab === key }">
          <Icon :icon="getIconName(key)" width="20" height="20" />
          <span class="sidebar-text">{{ item.title }}</span>
        </a>
      </li>
    </ul>

    <div class="flex-grow"></div>

    <!-- 设置菜单项 - 移至底部，在展开按钮上方 -->
    <ul class="menu menu-md menu-vertical py-2 px-2">
      <!-- 设置项 -->
      <li>
        <a href="#" @click.prevent="selectTab('settings')" :class="{ 'active': activeTab === 'settings' }">
          <Icon icon="mdi:cog" width="20" height="20" />
          <span class="sidebar-text">{{ menuItems.settings?.title }}</span>
        </a>
      </li>
    </ul>

    <!-- 底部收起按钮 -->
    <div class="sidebar-footer p-3">
      <button class="btn btn-sm btn-ghost w-full" @click="toggleSidebar">
        <Icon :icon="isExpanded ? 'mdi:chevron-left' : 'mdi:chevron-right'" width="20" height="20" />
        <span class="sidebar-text ml-2">{{ isExpanded ? '收起' : '' }}</span>
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
  }
});

// 定义事件
const emit = defineEmits(['toggle']);

// 获取菜单项和当前激活的选项卡
const menuItems = inject('menuItems', {});
const activeTab = inject('activeTab', ref('home'));
// 获取事件总线
const emitter = inject('emitter', null);

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
    settings: 'mdi:cog'
  };

  return iconMap[key] || 'mdi:circle';
};

// 切换侧边栏的方法
const toggleSidebar = () => {
  emit('toggle');
};

// 选择选项卡方法 - 修复导航功能
const selectTab = (tab) => {
  console.log(`尝试导航到: ${tab}`);
  if (emitter) {
    // 确保总是发送导航事件，不再检查是否与当前标签相同
    emitter.emit('navigate-to-tab', tab);
    console.log(`已发送导航事件: navigate-to-tab ${tab}`);
  } else {
    console.error('找不到事件总线 emitter');
  }
};

// 组件挂载时检查事件总线
onMounted(() => {
  if (!emitter) {
    console.warn('警告: 事件总线(emitter)未注入，导航功能可能无法正常工作');
  }
});
</script>

<style>
/* 侧边栏基础样式 */
.sidebar {
  width: 64px;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--b1) / var(--tw-bg-opacity, 0.8));
  backdrop-filter: blur(10px);
  box-shadow: var(--sidebar-shadow, 0 2px 10px rgba(0, 0, 0, 0.1));
  border-right: 1px solid hsl(var(--b3) / 0.2);
  overflow-x: hidden;
  z-index: 100;
}

/* 展开状态 */
.sidebar-expanded {
  width: 220px;
}

/* 菜单项样式 */
.menu a {
  border-radius: var(--rounded-btn, 0.5rem);
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: hsl(var(--bc) / 0.8);
  transition: all 0.2s ease;
}

.menu a:hover {
  background-color: hsl(var(--p) / 0.1);
  color: hsl(var(--pc));
}

.menu a.active {
  background-color: hsl(var(--p) / 0.2);
  color: hsl(var(--pc));
  font-weight: 500;
}

/* 导航文本，在收起状态下隐藏 */
.sidebar-text {
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  display: none;
}

.sidebar-expanded .sidebar-text {
  opacity: 1;
  margin-left: 0.75rem;
  display: inline;
}

/* 标题文本，在收起状态下隐藏 */
.sidebar-title {
  white-space: nowrap;
}

/* 在小屏幕上始终显示紧凑版本 */
@media (max-width: 768px) {
  .sidebar {
    width: 64px !important;
  }

  .sidebar-expanded {
    width: 64px !important;
  }

  .sidebar-text,
  .sidebar-title {
    display: none !important;
  }
}

/* 确保按钮内容正确展示 */
.sidebar-footer .btn {
  justify-content: center;
}

.sidebar-expanded .sidebar-footer .btn {
  justify-content: flex-start;
}

/* 分割线样式 */
.divider {
  opacity: 0.4;
}
</style>

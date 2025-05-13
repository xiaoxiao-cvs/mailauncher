<template>
  <div class="side-nav" :class="{ 'expanded': isExpanded }">
    <!-- Logo区域 - 替换图标为icon -->
    <div class="nav-logo">
      <img src="/assets/icon.ico" alt="X² Launcher" class="logo-icon" />
      <span class="nav-text">X² Launcher</span>
    </div>

    <!-- 导航项目列表 - 包含设置按钮 -->
    <div class="nav-items">
      <!-- 常规导航项 -->
      <div v-for="(item, key) in filteredMenuItems" :key="key" class="nav-item" :class="{ 'active': activeTab === key }"
        @click="selectTab(key)">
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <span class="nav-text">{{ item.title }}</span>
      </div>

      <!-- 设置按钮 - 作为导航项的一部分 -->
      <div class="nav-item settings-item" :class="{ 'active': activeTab === 'settings' }"
        @click="selectTab('settings')">
        <el-icon>
          <component :is="menuItems.settings.icon" />
        </el-icon>
        <span class="nav-text">{{ menuItems.settings.title }}</span>
      </div>
    </div>

    <!-- 分隔线 - 移至设置按钮和收起按钮之间 -->
    <div class="nav-divider"></div>

    <!-- 底部收起按钮 -->
    <div class="nav-bottom" @click="toggleSidebar">
      <el-icon>
        <ArrowLeft v-if="isExpanded" />
        <ArrowRight v-else />
      </el-icon>
      <span class="nav-text">收起</span>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue';
import { Platform, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';

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
// 在setup阶段就获取emitter，而不是在方法内部
const emitter = inject('emitter', null);

// 过滤掉settings菜单项
const filteredMenuItems = computed(() => {
  const filtered = { ...menuItems };
  delete filtered.settings;
  return filtered;
});

// 切换侧边栏的方法
const toggleSidebar = () => {
  console.log('侧边栏按钮被点击');
  emit('toggle');
};

// 选择选项卡方法 - 修复点击事件处理
const selectTab = (tab) => {
  if (activeTab.value !== tab) {
    // 使用已经注入的emitter，而不是在函数内重新注入
    if (emitter) {
      emitter.emit('navigate-to-tab', tab);
    }
  }
};
</script>

<style>
@import '../assets/css/appSidebar.css';

/* 添加logo图标样式 */
.logo-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* 添加分隔线样式 */
.nav-divider {
  width: 80%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 10px auto;
  opacity: 0.6;
}

/* 浅色模式下的分隔线 */
html:not(.dark-mode) .nav-divider {
  background-color: rgba(0, 0, 0, 0.1);
}

/* 确保导航项的容器能够灵活伸展，但不显示滚动条 */
.nav-items {
  flex-grow: 1;
  /* 移除 overflow-y: auto; 以禁用滚动条 */
  display: flex;
  flex-direction: column;
}

/* 设置按钮推到nav-items底部 */
.settings-item {
  margin-top: auto;
}
</style>

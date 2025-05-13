<template>
  <div 
    class="side-nav" 
    :class="{ 'expanded': isExpanded }"
  >
    <!-- Logo区域 - 替换图标为icon -->
    <div class="nav-logo">
      <img src="/assets/icon.ico" alt="X² Launcher" class="logo-icon" />
      <span class="nav-text">X² Launcher</span>
    </div>

    <!-- 导航项目列表 - 直接渲染在side-nav容器内，减少嵌套 -->
    <div class="nav-items">
      <div 
        v-for="(item, key) in menuItems" 
        :key="key"
        class="nav-item"
        :class="{ 'active': activeTab === key }"
        @click="selectTab(key)"
      >
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <span class="nav-text">{{ item.title }}</span>
      </div>
    </div>

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
import { ref, inject } from 'vue';
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
</style>

<template>
  <div class="theme-switcher">
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
        <IconifyIcon :icon="currentThemeIcon" size="lg" />
      </div>
      <ul tabindex="0" class="dropdown-content z-[999] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-[70vh] overflow-y-auto">
        <li class="menu-title">
          <span>选择主题</span>
        </li>
        <li v-for="theme in themes" :key="theme.name">
          <a @click="selectTheme(theme.name)" :class="{ 'active': theme.name === currentTheme }">
            <span class="theme-color-preview" :style="{backgroundColor: theme.primaryColor}"></span>
            {{ theme.label }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useEventBus } from '@/composables/useEventBus';
import IconifyIcon from './IconifyIcon.vue';

const currentTheme = ref(localStorage.getItem('theme') || 'light');
const emitter = useEventBus();

// 预定义的主题列表
const themes = ref([
  { name: 'light', label: '明亮', primaryColor: '#e5e7eb', icon: 'mdi:weather-sunny' },
  { name: 'dark', label: '暗黑', primaryColor: '#2a303c', icon: 'mdi:weather-night' },
  { name: 'cupcake', label: '蛋糕', primaryColor: '#65c3c8', icon: 'mdi:cake' },
  { name: 'bumblebee', label: '大黄蜂', primaryColor: '#e0a82e', icon: 'mdi:bee' },
  { name: 'emerald', label: '翡翠', primaryColor: '#66cc8a', icon: 'mdi:diamond' },
  { name: 'corporate', label: '企业', primaryColor: '#4b6bfb', icon: 'mdi:office-building' },
  { name: 'synthwave', label: '合成波', primaryColor: '#e779c1', icon: 'mdi:synthesizer' },
  { name: 'retro', label: '复古', primaryColor: '#ef9995', icon: 'mdi:alarm' },
  { name: 'cyberpunk', label: '赛博朋克', primaryColor: '#ff7598', icon: 'mdi:robot' },
  { name: 'valentine', label: '情人节', primaryColor: '#e96d7b', icon: 'mdi:heart' },
  { name: 'halloween', label: '万圣节', primaryColor: '#f28c18', icon: 'mdi:pumpkin' },
  { name: 'garden', label: '花园', primaryColor: '#5c7f67', icon: 'mdi:flower' },
  { name: 'forest', label: '森林', primaryColor: '#1eb854', icon: 'mdi:pine-tree' },
  { name: 'aqua', label: '水色', primaryColor: '#09ecf3', icon: 'mdi:water' },
  { name: 'lofi', label: '低保真', primaryColor: '#808080', icon: 'mdi:music-note' },
  { name: 'pastel', label: '粉彩', primaryColor: '#d1c1d7', icon: 'mdi:palette-swatch' },
  { name: 'fantasy', label: '幻想', primaryColor: '#6e0b75', icon: 'mdi:castle' },
  { name: 'wireframe', label: '线框', primaryColor: '#b8b8b8', icon: 'mdi:vector-square' },
  { name: 'black', label: '纯黑', primaryColor: '#333333', icon: 'mdi:circle' },
  { name: 'luxury', label: '奢华', primaryColor: '#ffffff', icon: 'mdi:crown' },
  { name: 'dracula', label: '德古拉', primaryColor: '#ff79c6', icon: 'mdi:vampire' },
  { name: 'cmyk', label: '印刷', primaryColor: '#45aeee', icon: 'mdi:printer' },
  { name: 'autumn', label: '秋天', primaryColor: '#8C0327', icon: 'mdi:leaf-maple' },
  { name: 'business', label: '商务', primaryColor: '#1C4E80', icon: 'mdi:briefcase' },
  { name: 'acid', label: '酸性', primaryColor: '#FF00F4', icon: 'mdi:flask' },
  { name: 'lemonade', label: '柠檬水', primaryColor: '#FFFF00', icon: 'mdi:fruit-citrus' },
  { name: 'night', label: '夜晚', primaryColor: '#38bdf8', icon: 'mdi:moon-waning-crescent' },
  { name: 'coffee', label: '咖啡', primaryColor: '#DB924B', icon: 'mdi:coffee' },
  { name: 'winter', label: '冬季', primaryColor: '#0EA5E9', icon: 'mdi:snowflake' }
]);

// 当前主题的图标
const currentThemeIcon = computed(() => {
  const theme = themes.value.find(t => t.name === currentTheme.value);
  return theme ? theme.icon : 'mdi:theme-light-dark';
});

// 选择主题
const selectTheme = (themeName) => {
  currentTheme.value = themeName;
  localStorage.setItem('theme', themeName);
  document.documentElement.setAttribute('data-theme', themeName);
  
  // 发送主题变更事件
  if (emitter) {
    emitter.emit('theme-changed', themeName);
  }
};

// 监听主题变更事件
onMounted(() => {
  // 初始化时应用当前主题
  document.documentElement.setAttribute('data-theme', currentTheme.value);
  
  // 监听来自其他组件的主题切换事件
  if (emitter) {
    emitter.on('change-theme', selectTheme);
  }
});

// 清除事件监听
onBeforeUnmount(() => {
  if (emitter) {
    emitter.off('change-theme', selectTheme);
  }
});
</script>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-color-preview {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dropdown-content {
  max-height: 70vh;
}
</style>

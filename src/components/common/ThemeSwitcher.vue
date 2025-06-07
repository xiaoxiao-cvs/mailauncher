<template>
  <div class="theme-switcher">
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
        <IconifyIcon :icon="currentThemeIcon" size="lg" />
      </div>
      <ul tabindex="0"
        class="dropdown-content z-[999] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-[70vh] overflow-y-auto">
        <li class="menu-title">
          <span>选择主题</span>
        </li>
        <li v-for="theme in themes" :key="theme.name">
          <a @click="selectTheme(theme.name)" :class="{ 'active': theme.name === currentTheme }">
            <span class="theme-color-preview" :style="{ backgroundColor: theme.color }"></span>
            {{ theme.label }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useTheme } from '../../services/theme';
import IconifyIcon from './IconifyIcon.vue';

// 使用主题服务
const { currentTheme, availableThemes, setTheme } = useTheme();

// 主题映射到图标 - 只保留使用的主题
const themeIcons = {
  light: 'mdi:weather-sunny',
  dark: 'mdi:weather-night',
};

// 转换availableThemes，添加图标
const themes = computed(() => {
  return availableThemes.value.map(theme => ({
    ...theme,
    icon: themeIcons[theme.name] || 'mdi:theme-light-dark'
  }));
});

// 当前主题的图标
const currentThemeIcon = computed(() => {
  const theme = themes.value.find(t => t.name === currentTheme.value);
  return theme ? theme.icon : 'mdi:theme-light-dark';
});

// 选择主题
const selectTheme = (themeName) => {
  setTheme(themeName);

  // 手动关闭下拉菜单 - 移除焦点
  const dropdownButton = document.querySelector('.theme-switcher .dropdown [tabindex="0"][role="button"]');
  if (dropdownButton) {
    dropdownButton.blur();
  }

  // 发送自定义事件用于应用全局
  window.dispatchEvent(new CustomEvent('theme-changed', {
    detail: { name: themeName }
  }));
};

// 监听主题重置事件
const handleThemeReset = () => {
  // 重置后刷新当前主题状态
  currentTheme.value = localStorage.getItem('theme') || 'light';
};

onMounted(() => {
  window.addEventListener('theme-reset', handleThemeReset);
});

onBeforeUnmount(() => {
  window.removeEventListener('theme-reset', handleThemeReset);
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

.dropdown-content .active {
  background-color: hsl(var(--p) / 0.2) !important;
}
</style>

<template>
  <label class="swap swap-rotate">
    <!-- 隐藏的 checkbox 控制主题切换 -->
    <input type="checkbox" :checked="theme === 'dark'" @change="handleToggle" />
    
    <!-- 太阳图标 (亮色主题) -->
    <Icon icon="mdi:white-balance-sunny" class="swap-on fill-current w-6 h-6" />
    
    <!-- 月亮图标 (暗色主题) -->
    <Icon icon="mdi:moon-waning-crescent" class="swap-off fill-current w-6 h-6" />
  </label>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useTheme } from '../composables/useTheme'

const { theme, toggleTheme } = useTheme()

const handleToggle = () => {
  toggleTheme()
}
</script>

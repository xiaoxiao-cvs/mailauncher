<template>
  <div class="app-header">
    <!-- ...existing code... -->
    
    <div class="header-right">
      <!-- 添加主题切换器 -->
      <ThemeSwitcher />
      
      <!-- ...existing code... -->
    </div>
  </div>
</template>

<script setup>
// ...existing code...
import ThemeSwitcher from './common/ThemeSwitcher.vue';
// ...existing code...
</script>
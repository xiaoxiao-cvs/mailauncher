<template>
  <div class="setting-group">
    <div v-if="title || $slots.header" class="group-header">
      <slot name="header">
        <div class="flex items-center gap-3 mb-4">
          <div v-if="icon" class="group-icon">
            <IconifyIcon :icon="icon" class="w-5 h-5" :class="iconClass" />
          </div>
          <div class="flex flex-col justify-center">
            <h4 class="group-title">{{ title }}</h4>
            <p v-if="subtitle" class="group-subtitle">{{ subtitle }}</p>
          </div>
        </div>
      </slot>
    </div>
    
    <div class="group-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 设置组容器组件
 * 用于组织相关的设置项
 */
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  iconClass: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.setting-group {
  margin-bottom: 2.5rem;
  background: hsl(var(--b2) / 0.3);
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid hsl(var(--b3) / 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.group-header {
  margin-bottom: 1.5rem;
}

.group-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--p) / 0.1);
  flex-shrink: 0;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: hsl(var(--bc) / 0.9);
  margin: 0;
}

.group-subtitle {
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.7);
  margin: 0;
  margin-top: 0.25rem;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.group-content > * {
  border-bottom: 1px solid hsl(var(--b3) / 0.1);
}

.group-content > *:last-child {
  border-bottom: none;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .setting-group {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  
  .group-title {
    font-size: 1rem;
  }
}
</style>

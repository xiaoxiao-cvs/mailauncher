<template>
  <div class="setting-group">
    <div v-if="title || $slots.header" class="group-header">
      <slot name="header">
        <div class="flex items-center gap-2 mb-2">
          <div v-if="icon" class="group-icon">
            <IconifyIcon :icon="icon" class="w-4 h-4" :class="iconClass" />
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
  margin-bottom: 1.25rem;
  background: hsl(var(--b2) / 0.3);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid hsl(var(--b3) / 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.group-header {
  margin-bottom: 0.75rem;
}

.group-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--p) / 0.1);
  flex-shrink: 0;
}

.group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: hsl(var(--bc) / 0.9);
  margin: 0;
}

.group-subtitle {
  font-size: 0.8rem;
  color: hsl(var(--bc) / 0.7);
  margin: 0;
  margin-top: 0.125rem;
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
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .group-title {
    font-size: 0.8rem;
  }
}
</style>

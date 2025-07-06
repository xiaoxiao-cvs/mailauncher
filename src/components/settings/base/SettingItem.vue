<template>
  <div class="setting-item">
    <div class="setting-info">
      <label class="setting-label">{{ label }}</label>
      <p v-if="description" class="setting-desc">{{ description }}</p>
    </div>
    <div class="setting-control">
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * 基础设置项组件
 * 提供统一的设置项布局结构
 */
defineProps({
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid hsl(var(--b3) / 0.1);
  gap: 1rem;
  min-height: 2rem;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: center;
}

.setting-label {
  font-weight: 600;
  color: hsl(var(--bc) / 0.9);
  margin-bottom: 0;
  font-size: 0.8rem;
}

.setting-desc {
  font-size: 0.7rem;
  color: hsl(var(--bc) / 0.6);
  line-height: 1.4;
  margin: 0;
}

.setting-control {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.5rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .setting-control {
    width: 100%;
    justify-content: flex-start;
  }
  
  .setting-info {
    justify-content: flex-start;
  }
}
</style>

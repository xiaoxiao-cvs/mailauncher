<template>
  <div class="hyperos2-setting-group" :class="{ 'hyperos2-gradient-border': gradientBorder }">
    <div v-if="title || $slots.header" class="hyperos2-group-header">
      <slot name="header">
        <div class="hyperos2-group-icon" v-if="icon">
          <IconifyIcon :icon="icon" size="20" :class="iconClass" />
        </div>
        <div class="hyperos2-group-info">
          <h4 class="hyperos2-group-title">{{ title }}</h4>
          <p v-if="subtitle" class="hyperos2-group-subtitle">{{ subtitle }}</p>
        </div>
      </slot>
    </div>
    
    <div class="hyperos2-group-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * HyperOS 2 风格设置组容器组件
 * 用于组织相关的设置项，采用现代化的毛玻璃效果和渐变边框
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
  },
  gradientBorder: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.hyperos2-setting-group {
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 -1px 0 rgba(0, 0, 0, 0.1) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.hyperos2-setting-group::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.6) 20%, 
    rgba(255, 255, 255, 0.6) 80%, 
    transparent 100%);
  z-index: 1;
}

.hyperos2-setting-group:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.15),
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 -1px 0 rgba(0, 0, 0, 0.1) inset;
  border-color: rgba(255, 255, 255, 0.3);
}

.hyperos2-gradient-border {
  position: relative;
  background: rgba(255, 255, 255, 0.7);
}

.hyperos2-gradient-border::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.5) 0%,
    rgba(147, 51, 234, 0.5) 25%,
    rgba(236, 72, 153, 0.5) 50%,
    rgba(59, 130, 246, 0.5) 75%,
    rgba(34, 197, 94, 0.5) 100%
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: xor;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  z-index: -1;
}

.hyperos2-group-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.hyperos2-group-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    rgba(147, 51, 234, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.hyperos2-group-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.2) 0%, 
    transparent 50%, 
    rgba(255, 255, 255, 0.1) 100%);
  border-radius: 12px;
}

.hyperos2-group-icon :deep(svg) {
  position: relative;
  z-index: 1;
}

.hyperos2-group-info {
  flex: 1;
  min-width: 0;
}

.hyperos2-group-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.hyperos2-group-subtitle {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  line-height: 1.4;
}

.hyperos2-group-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hyperos2-group-content > :deep(*:not(:last-child)) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 0.75rem;
}

/* 深色模式适配 */
:root[data-theme="dark"] .hyperos2-setting-group {
  background: rgba(15, 15, 15, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.1) inset,
    0 -1px 0 rgba(0, 0, 0, 0.2) inset;
}

:root[data-theme="dark"] .hyperos2-setting-group::before {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.2) 20%, 
    rgba(255, 255, 255, 0.2) 80%, 
    transparent 100%);
}

:root[data-theme="dark"] .hyperos2-setting-group:hover {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.15) inset,
    0 -1px 0 rgba(0, 0, 0, 0.3) inset;
  border-color: rgba(255, 255, 255, 0.15);
}

:root[data-theme="dark"] .hyperos2-gradient-border {
  background: rgba(15, 15, 15, 0.9);
}

:root[data-theme="dark"] .hyperos2-group-icon {
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.15) 0%, 
    rgba(147, 51, 234, 0.15) 100%);
  border-color: rgba(59, 130, 246, 0.3);
}

:root[data-theme="dark"] .hyperos2-group-title {
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .hyperos2-group-subtitle {
  color: rgba(255, 255, 255, 0.6);
}

:root[data-theme="dark"] .hyperos2-group-content > :deep(*:not(:last-child)) {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .hyperos2-setting-group {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 12px;
  }
  
  .hyperos2-group-header {
    gap: 0.5rem;
  }
  
  .hyperos2-group-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 10px;
  }
  
  .hyperos2-group-title {
    font-size: 0.9rem;
  }
  
  .hyperos2-group-subtitle {
    font-size: 0.8rem;
  }
}

/* 动画效果 */
@keyframes hyperos2-fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hyperos2-setting-group {
  animation: hyperos2-fadeIn 0.3s ease-out;
}

/* 特殊状态样式 */
.hyperos2-setting-group.search-matched-section {
  border-left: 3px solid #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

:root[data-theme="dark"] .hyperos2-setting-group.search-matched-section {
  border-left-color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

/* 渐变边框动画 */
.hyperos2-gradient-border::after {
  background-size: 200% 200%;
  animation: hyperos2-gradient 4s ease infinite;
}

@keyframes hyperos2-gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>

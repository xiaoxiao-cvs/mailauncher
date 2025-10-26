<!-- HyperOS 2 风格设置组容器组件 -->
<template>
  <div 
    :class="[
      'hyperos2-setting-group',
      {
        'hyperos2-gradient-border': gradientBorder,
        'hyperos2-elevated': elevated,
        'hyperos2-compact': compact
      }
    ]"
  >
    <!-- 组头部 -->
    <div v-if="title || subtitle || $slots.header" class="hyperos2-group-header">
      <slot name="header">
        <div class="hyperos2-group-title-area">
          <!-- 图标 -->
          <div v-if="icon" class="hyperos2-group-icon">
            <IconifyIcon :icon="icon" :size="iconSize" :class="iconClass" />
          </div>
          
          <!-- 标题和副标题 -->
          <div class="hyperos2-group-text">
            <h3 v-if="title" class="hyperos2-group-title">{{ title }}</h3>
            <p v-if="subtitle" class="hyperos2-group-subtitle">{{ subtitle }}</p>
          </div>
        </div>
        
        <!-- 头部操作区 -->
        <div v-if="$slots.actions" class="hyperos2-group-actions">
          <slot name="actions" />
        </div>
      </slot>
    </div>
    
    <!-- 组内容 -->
    <div class="hyperos2-group-content">
      <slot />
    </div>
    
    <!-- 组底部 -->
    <div v-if="$slots.footer" class="hyperos2-group-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * HyperOS 2 风格设置组容器组件
 * 用于组织相关的设置项，提供视觉分组
 */
const props = defineProps({
  // 组标题
  title: {
    type: String,
    default: ''
  },
  
  // 组副标题/描述
  subtitle: {
    type: String,
    default: ''
  },
  
  // 图标名称（Iconify）
  icon: {
    type: String,
    default: ''
  },
  
  // 图标大小
  iconSize: {
    type: [String, Number],
    default: '20'
  },
  
  // 图标样式类
  iconClass: {
    type: String,
    default: ''
  },
  
  // 渐变边框
  gradientBorder: {
    type: Boolean,
    default: true
  },
  
  // 悬浮效果
  elevated: {
    type: Boolean,
    default: false
  },
  
  // 紧凑模式
  compact: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.hyperos2-setting-group {
  background: var(--hyperos-bg-card);
  backdrop-filter: blur(var(--hyperos-blur-lg));
  -webkit-backdrop-filter: blur(var(--hyperos-blur-lg));
  border-radius: var(--hyperos-radius-xl);
  border: 1px solid var(--hyperos-border-secondary);
  overflow: hidden;
  margin-bottom: var(--hyperos-space-xl);
  transition: all var(--hyperos-transition-base);
  position: relative;
}

.hyperos2-setting-group:hover {
  border-color: var(--hyperos-border-hover);
  box-shadow: var(--hyperos-shadow-md);
}

.hyperos2-setting-group.hyperos2-gradient-border {
  position: relative;
}

.hyperos2-setting-group.hyperos2-gradient-border::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--hyperos-radius-xl);
  padding: 1px;
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-secondary));
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: xor;
  -webkit-mask-composite: xor;
  pointer-events: none;
  opacity: 0.6;
  transition: opacity var(--hyperos-transition-base);
}

.hyperos2-setting-group.hyperos2-gradient-border:hover::before {
  opacity: 1;
}

.hyperos2-setting-group.hyperos2-elevated {
  box-shadow: var(--hyperos-shadow-lg);
  transform: translateY(-2px);
}

.hyperos2-setting-group.hyperos2-compact {
  margin-bottom: var(--hyperos-space-md);
}

.hyperos2-setting-group.hyperos2-compact .hyperos2-group-header {
  padding: var(--hyperos-space-md) var(--hyperos-space-lg);
}

.hyperos2-setting-group.hyperos2-compact .hyperos2-group-content {
  padding: 0 var(--hyperos-space-lg) var(--hyperos-space-md);
}

/* 组头部 */
.hyperos2-group-header {
  padding: var(--hyperos-space-xl) var(--hyperos-space-xl) var(--hyperos-space-lg);
  border-bottom: 1px solid var(--hyperos-divider);
  background: linear-gradient(135deg, var(--hyperos-bg-tertiary), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hyperos2-group-title-area {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-md);
  flex: 1;
}

.hyperos2-group-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--hyperos-radius-lg);
  background: linear-gradient(135deg, var(--hyperos-primary-light), var(--hyperos-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--hyperos-shadow-sm);
  flex-shrink: 0;
}

.hyperos2-group-text {
  flex: 1;
}

.hyperos2-group-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hyperos-text-primary);
  margin: 0 0 var(--hyperos-space-xs) 0;
  line-height: 1.4;
}

.hyperos2-group-subtitle {
  font-size: 0.875rem;
  color: var(--hyperos-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.hyperos2-group-actions {
  display: flex;
  gap: var(--hyperos-space-sm);
  align-items: center;
}

/* 组内容 */
.hyperos2-group-content {
  padding: var(--hyperos-space-lg) var(--hyperos-space-xl) var(--hyperos-space-xl);
}

.hyperos2-group-content > :deep(*:not(:last-child)) {
  margin-bottom: var(--hyperos-space-lg);
}

/* 确保 HyperOS2 组件在组内的间距 */
.hyperos2-group-content > :deep(.hyperos2-switch-container),
.hyperos2-group-content > :deep(.hyperos2-input-container),
.hyperos2-group-content > :deep(.hyperos2-select-container),
.hyperos2-group-content > :deep(.hyperos2-slider-container) {
  margin-bottom: var(--hyperos-space-lg);
}

.hyperos2-group-content > :deep(.hyperos2-switch-container:last-child),
.hyperos2-group-content > :deep(.hyperos2-input-container:last-child),
.hyperos2-group-content > :deep(.hyperos2-select-container:last-child),
.hyperos2-group-content > :deep(.hyperos2-slider-container:last-child) {
  margin-bottom: 0;
}

/* 组底部 */
.hyperos2-group-footer {
  padding: var(--hyperos-space-lg) var(--hyperos-space-xl);
  border-top: 1px solid var(--hyperos-divider);
  background: var(--hyperos-bg-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hyperos2-setting-group {
    margin-bottom: var(--hyperos-space-lg);
  }
  
  .hyperos2-group-header {
    padding: var(--hyperos-space-lg);
    flex-direction: column;
    align-items: flex-start;
    gap: var(--hyperos-space-md);
  }
  
  .hyperos2-group-title-area {
    width: 100%;
  }
  
  .hyperos2-group-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .hyperos2-group-content {
    padding: var(--hyperos-space-md) var(--hyperos-space-lg) var(--hyperos-space-lg);
  }
  
  .hyperos2-group-footer {
    padding: var(--hyperos-space-md) var(--hyperos-space-lg);
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .hyperos2-setting-group {
    border-color: var(--hyperos-border-dark);
  }
  
  .hyperos2-setting-group:hover {
    border-color: var(--hyperos-border-dark-hover);
  }
}
</style>

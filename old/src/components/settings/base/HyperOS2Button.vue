<!-- HyperOS 2 风格按钮组件 -->
<template>
  <button
    :class="[
      'hyperos2-button',
      `hyperos2-button--${variant}`,
      `hyperos2-button--${size}`,
      {
        'hyperos2-button--loading': loading,
        'hyperos2-button--disabled': disabled,
        'hyperos2-button--block': block,
        'hyperos2-button--round': round,
        'hyperos2-button--gradient': gradient
      }
    ]"
    :type="nativeType"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="button-loading">
      <div class="loading-spinner"></div>
    </div>
    
    <!-- 按钮内容 -->
    <div class="button-content" :class="{ 'loading-hidden': loading }">
      <!-- 前缀图标 -->
      <div v-if="prefixIcon && !loading" class="button-icon button-icon--prefix">
        <IconifyIcon :icon="prefixIcon" :size="iconSize" />
      </div>
      
      <!-- 文本内容 -->
      <span v-if="$slots.default || text" class="button-text">
        <slot>{{ text }}</slot>
      </span>
      
      <!-- 后缀图标 -->
      <div v-if="suffixIcon && !loading" class="button-icon button-icon--suffix">
        <IconifyIcon :icon="suffixIcon" :size="iconSize" />
      </div>
    </div>
    
    <!-- 渐变背景（用于动画效果） -->
    <div v-if="variant === 'primary' || gradient" class="button-gradient-bg"></div>
    
    <!-- 波纹效果 -->
    <div class="button-ripple" ref="rippleRef"></div>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

// Props
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'error', 'ghost', 'text'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  text: {
    type: String,
    default: ''
  },
  prefixIcon: {
    type: String,
    default: ''
  },
  suffixIcon: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  round: {
    type: Boolean,
    default: false
  },
  gradient: {
    type: Boolean,
    default: false
  },
  nativeType: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  }
})

// Emits
const emit = defineEmits(['click'])

// Refs
const rippleRef = ref(null)

// Computed
const iconSize = computed(() => {
  const sizeMap = {
    small: '14',
    medium: '16',
    large: '18'
  }
  return sizeMap[props.size]
})

// Methods
const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    createRipple(event)
    emit('click', event)
  }
}

const createRipple = (event) => {
  if (!rippleRef.value) return
  
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  const ripple = document.createElement('div')
  ripple.className = 'ripple-effect'
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  
  rippleRef.value.appendChild(ripple)
  
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}
</script>

<style scoped>
.hyperos2-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  text-decoration: none;
  user-select: none;
  outline: none;
  overflow: hidden;
  transition: all var(--hyperos-transition-fast);
  white-space: nowrap;
}

/* 尺寸变体 */
.hyperos2-button--small {
  height: 32px;
  padding: 0 var(--hyperos-space-md);
  font-size: 0.8rem;
  border-radius: var(--hyperos-radius-sm);
}

.hyperos2-button--medium {
  height: 40px;
  padding: 0 var(--hyperos-space-lg);
  font-size: 0.9rem;
  border-radius: var(--hyperos-radius-md);
}

.hyperos2-button--large {
  height: 48px;
  padding: 0 var(--hyperos-space-xl);
  font-size: 1rem;
  border-radius: var(--hyperos-radius-lg);
}

/* 颜色变体 */
.hyperos2-button--primary {
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-primary-light));
  color: white;
  box-shadow: var(--hyperos-shadow-sm);
}

.hyperos2-button--primary:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  transform: translateY(-1px);
  box-shadow: var(--hyperos-shadow-md);
}

.hyperos2-button--secondary {
  background: var(--hyperos-bg-tertiary);
  color: var(--hyperos-text-primary);
  border: 1px solid var(--hyperos-border-primary);
}

.hyperos2-button--secondary:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  background: var(--hyperos-gray-200);
  transform: translateY(-1px);
}

.hyperos2-button--success {
  background: linear-gradient(135deg, var(--hyperos-success), #28a745);
  color: white;
  box-shadow: var(--hyperos-shadow-sm);
}

.hyperos2-button--warning {
  background: linear-gradient(135deg, var(--hyperos-warning), #fd7e14);
  color: white;
  box-shadow: var(--hyperos-shadow-sm);
}

.hyperos2-button--error {
  background: linear-gradient(135deg, var(--hyperos-error), #dc3545);
  color: white;
  box-shadow: var(--hyperos-shadow-sm);
}

.hyperos2-button--ghost {
  background: transparent;
  color: var(--hyperos-primary);
  border: none; /* 移除边框 */
}

.hyperos2-button--ghost:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  background: none; /* 移除悬停背景 */
  transform: scale(1.05); /* 轻微放大效果 */
}

/* Ghost 按钮中的图标加粗 */
.hyperos2-button--ghost .button-icon {
  font-weight: 700;
}

/* Ghost 按钮中的文本也稍微加粗 */
.hyperos2-button--ghost .button-text {
  font-weight: 600;
}

.hyperos2-button--text {
  background: transparent;
  color: var(--hyperos-primary);
  padding: 0 var(--hyperos-space-sm);
}

.hyperos2-button--text:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  background: rgba(0, 122, 255, 0.1);
}

/* 特殊样式 */
.hyperos2-button--block {
  width: 100%;
}

.hyperos2-button--round {
  border-radius: var(--hyperos-radius-full);
}

.hyperos2-button--gradient .button-gradient-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-secondary));
  opacity: 0;
  transition: opacity var(--hyperos-transition-fast);
}

.hyperos2-button--gradient:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) .button-gradient-bg {
  opacity: 1;
}

/* 状态样式 */
.hyperos2-button--loading {
  cursor: default;
}

.hyperos2-button--disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none !important;
  box-shadow: none !important;
}

/* 按钮内容 */
.button-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-xs);
  transition: opacity var(--hyperos-transition-fast);
}

.button-content.loading-hidden {
  opacity: 0;
}

.button-text {
  line-height: 1;
}

.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加载状态 */
.button-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 波纹效果 */
.button-ripple {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.ripple-effect {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  pointer-events: none;
  transform: scale(0);
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* 深色主题适配 */
[data-theme="dark"] .hyperos2-button--secondary {
  background: var(--hyperos-gray-700);
  border-color: var(--hyperos-gray-600);
}

[data-theme="dark"] .hyperos2-button--secondary:hover:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  background: var(--hyperos-gray-600);
}

[data-theme="dark"] .loading-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
}

[data-theme="dark"] .ripple-effect {
  background: rgba(255, 255, 255, 0.3);
}

/* 焦点样式 */
.hyperos2-button:focus-visible {
  outline: 2px solid var(--hyperos-primary);
  outline-offset: 2px;
}

/* 活动状态 */
.hyperos2-button:active:not(.hyperos2-button--disabled):not(.hyperos2-button--loading) {
  transform: scale(0.98);
}
</style>

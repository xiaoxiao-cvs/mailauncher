<!-- HyperOS 2 风格滑块组件 -->
<template>
  <div 
    :class="[
      'hyperos2-slider-container',
      {
        'hyperos2-slider--disabled': disabled,
        'hyperos2-slider--vertical': vertical
      }
    ]"
  >
    <!-- 标签区域 -->
    <div v-if="label || description" class="hyperos2-slider-header">
      <div class="hyperos2-slider-label-area">
        <label v-if="label" class="hyperos2-slider-label">{{ label }}</label>
        <p v-if="description" class="hyperos2-slider-description">{{ description }}</p>
      </div>
      
      <!-- 数值显示 -->
      <div class="hyperos2-slider-value-display">
        <span class="hyperos2-slider-value">
          {{ prefix }}{{ displayValue }}{{ suffix }}
        </span>
      </div>
    </div>
    
    <!-- 滑块主体 -->
    <div class="hyperos2-slider-wrapper">
      <!-- 滑块轨道 -->
      <div 
        ref="trackRef" 
        class="hyperos2-slider-track"
        @click="handleTrackClick"
        @mousedown="handleTrackMouseDown"
      >
        <!-- 已填充进度 -->
        <div 
          class="hyperos2-slider-fill"
          :style="{ 
            [vertical ? 'height' : 'width']: `${percentage}%`,
            [vertical ? 'bottom' : 'left']: '0'
          }"
        ></div>
        
        <!-- 滑块滑块 -->
        <div 
          ref="thumbRef"
          class="hyperos2-slider-thumb"
          :style="{ 
            [vertical ? 'bottom' : 'left']: `${percentage}%`,
            [vertical ? 'left' : 'top']: '50%'
          }"
          @mousedown="handleThumbMouseDown"
          @touchstart="handleThumbTouchStart"
          tabindex="0"
          role="slider"
          :aria-valuemin="min"
          :aria-valuemax="max"
          :aria-valuenow="currentValue"
          :aria-disabled="disabled"
          @keydown="handleKeyDown"
        >
          <!-- 滑块内部指示器 -->
          <div class="hyperos2-slider-thumb-inner"></div>
          
          <!-- 悬浮提示 -->
          <div v-if="showTooltip && isDragging" class="hyperos2-slider-tooltip">
            {{ prefix }}{{ displayValue }}{{ suffix }}
          </div>
        </div>
        
        <!-- 刻度标记 -->
        <div v-if="showMarks && marks.length" class="hyperos2-slider-marks">
          <div 
            v-for="mark in marks" 
            :key="mark.value"
            class="hyperos2-slider-mark"
            :style="{ 
              [vertical ? 'bottom' : 'left']: `${((mark.value - min) / (max - min)) * 100}%`
            }"
          >
            <div class="hyperos2-slider-mark-dot"></div>
            <div v-if="mark.label" class="hyperos2-slider-mark-label">{{ mark.label }}</div>
          </div>
        </div>
      </div>
      
      <!-- 数值输入框（可选） -->
      <div v-if="showInput" class="hyperos2-slider-input">
        <input
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :value="currentValue"
          @input="handleInputChange"
          @blur="handleInputBlur"
          class="hyperos2-slider-number-input"
        />
      </div>
    </div>
    
    <!-- 范围标签 -->
    <div v-if="showRange" class="hyperos2-slider-range">
      <span class="hyperos2-slider-range-min">{{ prefix }}{{ min }}{{ suffix }}</span>
      <span class="hyperos2-slider-range-max">{{ prefix }}{{ max }}{{ suffix }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

/**
 * HyperOS 2 风格滑块组件
 * 支持数值范围选择，具有现代化的视觉效果和交互体验
 */
const props = defineProps({
  // 绑定值
  modelValue: {
    type: [Number, String],
    default: 0
  },
  
  // 标签
  label: {
    type: String,
    default: ''
  },
  
  // 描述
  description: {
    type: String,
    default: ''
  },
  
  // 最小值
  min: {
    type: Number,
    default: 0
  },
  
  // 最大值
  max: {
    type: Number,
    default: 100
  },
  
  // 步进值
  step: {
    type: Number,
    default: 1
  },
  
  // 前缀
  prefix: {
    type: String,
    default: ''
  },
  
  // 后缀
  suffix: {
    type: String,
    default: ''
  },
  
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  
  // 垂直模式
  vertical: {
    type: Boolean,
    default: false
  },
  
  // 显示数值输入框
  showInput: {
    type: Boolean,
    default: false
  },
  
  // 显示范围标签
  showRange: {
    type: Boolean,
    default: false
  },
  
  // 显示悬浮提示
  showTooltip: {
    type: Boolean,
    default: true
  },
  
  // 显示刻度标记
  showMarks: {
    type: Boolean,
    default: false
  },
  
  // 刻度标记
  marks: {
    type: Array,
    default: () => []
  },
  
  // 格式化函数
  formatter: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'input'])

// 组件引用
const trackRef = ref(null)
const thumbRef = ref(null)

// 组件状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartValue = ref(0)

// 当前值
const currentValue = computed({
  get: () => Number(props.modelValue),
  set: (value) => {
    const clampedValue = Math.max(props.min, Math.min(props.max, value))
    const steppedValue = Math.round(clampedValue / props.step) * props.step
    emit('update:modelValue', steppedValue)
    emit('change', steppedValue)
  }
})

// 显示值（经过格式化）
const displayValue = computed(() => {
  if (props.formatter) {
    return props.formatter(currentValue.value)
  }
  return currentValue.value
})

// 百分比位置
const percentage = computed(() => {
  return ((currentValue.value - props.min) / (props.max - props.min)) * 100
})

// 事件处理
const handleTrackClick = (event) => {
  if (props.disabled) return
  
  const rect = trackRef.value.getBoundingClientRect()
  const { clientX, clientY } = event
  
  let percentage
  if (props.vertical) {
    percentage = ((rect.bottom - clientY) / rect.height) * 100
  } else {
    percentage = ((clientX - rect.left) / rect.width) * 100
  }
  
  const newValue = props.min + (percentage / 100) * (props.max - props.min)
  currentValue.value = newValue
}

const handleThumbMouseDown = (event) => {
  if (props.disabled) return
  
  event.preventDefault()
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragStartValue.value = currentValue.value
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleThumbTouchStart = (event) => {
  if (props.disabled) return
  
  event.preventDefault()
  isDragging.value = true
  const touch = event.touches[0]
  dragStartX.value = touch.clientX
  dragStartY.value = touch.clientY
  dragStartValue.value = currentValue.value
  
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

const handleMouseMove = (event) => {
  if (!isDragging.value) return
  
  const rect = trackRef.value.getBoundingClientRect()
  let delta
  
  if (props.vertical) {
    delta = (dragStartY.value - event.clientY) / rect.height
  } else {
    delta = (event.clientX - dragStartX.value) / rect.width
  }
  
  const newValue = dragStartValue.value + delta * (props.max - props.min)
  currentValue.value = newValue
}

const handleTouchMove = (event) => {
  if (!isDragging.value) return
  
  const touch = event.touches[0]
  const rect = trackRef.value.getBoundingClientRect()
  let delta
  
  if (props.vertical) {
    delta = (dragStartY.value - touch.clientY) / rect.height
  } else {
    delta = (touch.clientX - dragStartX.value) / rect.width
  }
  
  const newValue = dragStartValue.value + delta * (props.max - props.min)
  currentValue.value = newValue
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const handleTouchEnd = () => {
  isDragging.value = false
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
}

const handleKeyDown = (event) => {
  if (props.disabled) return
  
  let newValue = currentValue.value
  
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      newValue = Math.max(props.min, currentValue.value - props.step)
      break
    case 'ArrowRight':
    case 'ArrowUp':
      newValue = Math.min(props.max, currentValue.value + props.step)
      break
    case 'Home':
      newValue = props.min
      break
    case 'End':
      newValue = props.max
      break
    default:
      return
  }
  
  event.preventDefault()
  currentValue.value = newValue
}

const handleInputChange = (event) => {
  const value = Number(event.target.value)
  if (!isNaN(value)) {
    currentValue.value = value
  }
}

const handleInputBlur = (event) => {
  const value = Number(event.target.value)
  if (isNaN(value)) {
    event.target.value = currentValue.value
  }
}

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
})
</script>

<style scoped>
.hyperos2-slider-container {
  --slider-height: 6px;
  --thumb-size: 20px;
  --track-color: var(--hyperos-bg-tertiary);
  --fill-color: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-secondary));
  --thumb-color: #ffffff;
  --thumb-shadow: var(--hyperos-shadow-md);
}

.hyperos2-slider-container {
  width: 100%;
  user-select: none;
}

.hyperos2-slider-container.hyperos2-slider--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.hyperos2-slider-container.hyperos2-slider--vertical {
  height: 200px;
  width: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
}

/* 标签区域 */
.hyperos2-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--hyperos-space-md);
}

.hyperos2-slider-label-area {
  flex: 1;
}

.hyperos2-slider-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--hyperos-text-primary);
  margin: 0 0 var(--hyperos-space-xs) 0;
  display: block;
}

.hyperos2-slider-description {
  font-size: 0.75rem;
  color: var(--hyperos-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.hyperos2-slider-value-display {
  margin-left: var(--hyperos-space-md);
}

.hyperos2-slider-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--hyperos-primary);
  background: var(--hyperos-bg-secondary);
  padding: var(--hyperos-space-xs) var(--hyperos-space-sm);
  border-radius: var(--hyperos-radius-md);
  border: 1px solid var(--hyperos-border-secondary);
}

/* 滑块主体 */
.hyperos2-slider-wrapper {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-md);
  position: relative;
}

.hyperos2-slider-track {
  position: relative;
  height: var(--slider-height);
  background: var(--track-color);
  border-radius: calc(var(--slider-height) / 2);
  cursor: pointer;
  flex: 1;
  overflow: visible;
}

.hyperos2-slider--vertical .hyperos2-slider-track {
  width: var(--slider-height);
  height: 100%;
  flex: none;
}

.hyperos2-slider-fill {
  position: absolute;
  background: var(--fill-color);
  border-radius: calc(var(--slider-height) / 2);
  height: 100%;
  transition: all var(--hyperos-transition-fast);
}

.hyperos2-slider--vertical .hyperos2-slider-fill {
  width: 100%;
  height: auto;
}

.hyperos2-slider-thumb {
  position: absolute;
  width: var(--thumb-size);
  height: var(--thumb-size);
  background: var(--thumb-color);
  border-radius: 50%;
  cursor: grab;
  box-shadow: var(--thumb-shadow);
  transform: translate(-50%, -50%);
  transition: all var(--hyperos-transition-fast);
  z-index: 2;
}

.hyperos2-slider-thumb:hover,
.hyperos2-slider-thumb:focus {
  box-shadow: 0 0 0 8px rgba(var(--hyperos-primary-rgb), 0.1), var(--thumb-shadow);
  outline: none;
}

.hyperos2-slider-thumb:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.1);
}

.hyperos2-slider-thumb-inner {
  width: 8px;
  height: 8px;
  background: var(--fill-color);
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 悬浮提示 */
.hyperos2-slider-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--hyperos-bg-tooltip);
  color: var(--hyperos-text-tooltip);
  padding: var(--hyperos-space-xs) var(--hyperos-space-sm);
  border-radius: var(--hyperos-radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: var(--hyperos-shadow-lg);
  pointer-events: none;
  z-index: 1000;
}

.hyperos2-slider-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--hyperos-bg-tooltip);
}

/* 刻度标记 */
.hyperos2-slider-marks {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.hyperos2-slider-mark {
  position: absolute;
  transform: translateX(-50%);
}

.hyperos2-slider--vertical .hyperos2-slider-mark {
  transform: translateY(50%);
}

.hyperos2-slider-mark-dot {
  width: 4px;
  height: 4px;
  background: var(--hyperos-border-primary);
  border-radius: 50%;
  margin: 0 auto;
}

.hyperos2-slider-mark-label {
  font-size: 0.75rem;
  color: var(--hyperos-text-tertiary);
  text-align: center;
  margin-top: var(--hyperos-space-xs);
  white-space: nowrap;
}

/* 数值输入框 */
.hyperos2-slider-input {
  flex-shrink: 0;
}

.hyperos2-slider-number-input {
  width: 60px;
  padding: var(--hyperos-space-xs) var(--hyperos-space-sm);
  border: 1px solid var(--hyperos-border-secondary);
  border-radius: var(--hyperos-radius-md);
  background: var(--hyperos-bg-primary);
  color: var(--hyperos-text-primary);
  font-size: 0.875rem;
  text-align: center;
  transition: all var(--hyperos-transition-fast);
}

.hyperos2-slider-number-input:focus {
  outline: none;
  border-color: var(--hyperos-primary);
  box-shadow: 0 0 0 3px rgba(var(--hyperos-primary-rgb), 0.1);
}

/* 范围标签 */
.hyperos2-slider-range {
  display: flex;
  justify-content: space-between;
  margin-top: var(--hyperos-space-sm);
  font-size: 0.75rem;
  color: var(--hyperos-text-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hyperos2-slider-header {
    flex-direction: column;
    gap: var(--hyperos-space-sm);
  }
  
  .hyperos2-slider-value-display {
    margin-left: 0;
    align-self: flex-end;
  }
  
  .hyperos2-slider-wrapper {
    flex-direction: column;
    gap: var(--hyperos-space-sm);
  }
  
  .hyperos2-slider-input {
    width: 100%;
  }
  
  .hyperos2-slider-number-input {
    width: 100%;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .hyperos2-slider-container {
    --track-color: var(--hyperos-bg-tertiary-dark);
    --thumb-color: var(--hyperos-bg-primary-dark);
  }
}
</style>

<template>
  <SettingItem :label="label" :description="description">
    <div class="slider-control">
      <input 
        type="range" 
        :min="min" 
        :max="max" 
        :step="step"
        :value="modelValue"
        @input="handleInput"
        class="slider"
        :disabled="disabled"
      />
      <span class="slider-value">{{ displayValue }}</span>
    </div>
  </SettingItem>
</template>

<script setup>
import { computed } from 'vue'
import SettingItem from './SettingItem.vue'

/**
 * 滑块设置组件
 * 提供数值范围选择的设置项
 */
const props = defineProps({
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [Number, String],
    default: 0
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  suffix: {
    type: String,
    default: ''
  },
  prefix: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const displayValue = computed(() => {
  return `${props.prefix}${props.modelValue}${props.suffix}`
})

const handleInput = (event) => {
  const value = Number(event.target.value)
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.slider-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
}

.slider {
  flex: 1;
  height: 6px;
  background: hsl(var(--b3));
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: hsl(var(--p));
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: hsl(var(--p));
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--bc));
  min-width: 50px;
  text-align: right;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Firefox 特殊处理 */
.slider::-moz-range-track {
  height: 6px;
  background: hsl(var(--b3));
  border-radius: 3px;
  border: none;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .slider-control {
    min-width: 150px;
    gap: 0.75rem;
  }
  
  .slider-value {
    min-width: 40px;
    font-size: 0.8rem;
  }
}
</style>

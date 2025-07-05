<template>
  <SettingItem :label="label" :description="description">
    <div class="radio-group" :class="{ 'radio-group-vertical': vertical }">
      <label 
        v-for="option in options" 
        :key="option.value" 
        class="radio-option"
        :class="{ 'radio-option-selected': modelValue === option.value }"
      >
        <input 
          type="radio" 
          :name="name || `radio-${Math.random()}`"
          :value="option.value"
          :checked="modelValue === option.value"
          @change="handleChange"
          class="radio-input"
          :disabled="disabled || option.disabled"
        />
        <span class="radio-label">
          <IconifyIcon 
            v-if="option.icon" 
            :icon="option.icon" 
            class="radio-icon" 
          />
          {{ option.label }}
        </span>
      </label>
    </div>
  </SettingItem>
</template>

<script setup>
import SettingItem from './SettingItem.vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 单选组设置组件
 * 提供单选选择类型的设置项
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
    type: [String, Number, Boolean],
    default: null
  },
  options: {
    type: Array,
    required: true,
    validator: (options) => {
      return options.every(option => 
        typeof option === 'object' && 
        'value' in option && 
        'label' in option
      )
    }
  },
  name: {
    type: String,
    default: ''
  },
  vertical: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const handleChange = (event) => {
  let value = event.target.value
  
  // 尝试转换为原始类型
  const option = props.options.find(opt => String(opt.value) === value)
  if (option) {
    value = option.value
  }
  
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.radio-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  min-width: 200px;
}

.radio-group-vertical {
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0.75rem 1rem;
  border: 2px solid hsl(var(--b3));
  border-radius: 0.75rem;
  background: hsl(var(--b1));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 3rem;
}

.radio-option:hover:not(:has(.radio-input:disabled)) {
  border-color: hsl(var(--p) / 0.4);
  background: hsl(var(--p) / 0.05);
  transform: translateY(-1px);
}

.radio-option-selected {
  background: linear-gradient(135deg, hsl(var(--p) / 0.08) 0%, hsl(var(--p) / 0.12) 100%);
  border-color: hsl(var(--p));
  box-shadow: 0 0 0 1px hsl(var(--p) / 0.3), 0 4px 12px hsl(var(--p) / 0.2);
  transform: translateY(-1px);
}

.radio-option:has(.radio-input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
  background: hsl(var(--b2));
}

.radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--bc) / 0.8);
  transition: all 0.3s ease;
  flex: 1;
  white-space: nowrap;
}

.radio-option-selected .radio-label {
  color: hsl(var(--p));
  font-weight: 700;
}

.radio-icon {
  font-size: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.radio-option-selected .radio-icon {
  transform: scale(1.1);
  color: hsl(var(--p));
}

/* 添加选中状态的视觉指示器 */
.radio-option::before {
  content: "";
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 16px;
  height: 16px;
  border: 2px solid hsl(var(--bc) / 0.2);
  border-radius: 50%;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.6;
  transform: scale(0.8);
}

.radio-option:hover::before {
  opacity: 0.8;
  transform: scale(0.9);
  border-color: hsl(var(--p) / 0.4);
}

.radio-option-selected::before {
  opacity: 1;
  background: hsl(var(--p));
  border-color: hsl(var(--p));
  transform: scale(1);
  box-shadow: 0 0 0 2px hsl(var(--b1)), 0 0 0 4px hsl(var(--p) / 0.3);
}

/* 添加勾选标记 */
.radio-option-selected::after {
  content: "✓";
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: bold;
  z-index: 1;
  animation: checkmarkPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes checkmarkPop {
  0% {
    transform: scale(0) rotate(-90deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.3) rotate(0deg);
    opacity: 0.8;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .radio-group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    min-width: 150px;
  }
  
  .radio-option {
    padding: 0.625rem 0.875rem;
    min-height: 2.5rem;
  }
  
  .radio-label {
    font-size: 0.8rem;
    gap: 0.5rem;
  }
  
  .radio-icon {
    font-size: 1.125rem;
  }
}
</style>

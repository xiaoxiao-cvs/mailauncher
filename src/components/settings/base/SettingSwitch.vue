<template>
  <SettingItem :label="label" :description="description">
    <label class="toggle-switch">
      <input 
        type="checkbox" 
        :checked="modelValue" 
        @change="handleChange"
        class="toggle-input"
        :disabled="disabled"
      />
      <span class="toggle-slider"></span>
    </label>
  </SettingItem>
</template>

<script setup>
import SettingItem from './SettingItem.vue'

/**
 * 开关设置组件
 * 提供开关类型的设置项
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
  const value = event.target.checked
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
/* 开关切换样式 */
.toggle-switch {
  position: relative;
  display: block;
  width: 2.75rem;
  height: 1.5rem;
  cursor: pointer;
  transform: translateY(-0.1rem); /* 微调对齐到文本中心 */
}

.toggle-switch:has(.toggle-input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: hsl(var(--b3));
  border-radius: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid hsl(var(--b3));
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 0.875rem;
  width: 0.875rem;
  left: 0.125rem;
  top: 50%;
  transform: translateY(-50%);
  background-color: #ffffff;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-slider {
  background-color: hsl(var(--p));
  border-color: hsl(var(--p));
  box-shadow: inset 0 1px 3px hsl(var(--p) / 0.3), 0 0 0 1px hsl(var(--p) / 0.2);
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(1.25rem) translateY(-50%);
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 开关悬停效果 */
.toggle-switch:hover .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.toggle-switch:hover .toggle-input:checked + .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 2px 4px hsl(var(--p) / 0.4), 0 0 0 2px hsl(var(--p) / 0.3);
}

/* 禁用状态 */
.toggle-input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>

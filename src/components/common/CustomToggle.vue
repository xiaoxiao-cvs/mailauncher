<template>
  <label class="custom-toggle">
    <input 
      type="checkbox" 
      :checked="modelValue" 
      @change="handleChange"
      class="toggle-input"
      :disabled="disabled"
    />
    <span class="toggle-slider"></span>
  </label>
</template>

<script setup>
/**
 * 通用开关组件
 * 提供现代化设计的开关控件，支持浅色和深色模式
 */
const props = defineProps({
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
/* 现代化开关切换样式 - 基于设计图 */
.custom-toggle {
  position: relative;
  display: inline-block;
  width: 3.25rem; /* 52px */
  height: 1.875rem; /* 30px */
  cursor: pointer;
}

.custom-toggle:has(.toggle-input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 1.875rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* 浅色模式样式 */
  background-color: #e5e7eb; /* 灰色关闭状态 */
  border: none;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 深色模式样式 */
[data-theme="dark"] .toggle-slider {
  background-color: #374151; /* 更深的灰色关闭状态 */
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.375rem; /* 22px */
  width: 1.375rem; /* 22px */
  left: 0.25rem; /* 4px */
  top: 50%;
  transform: translateY(-50%);
  background-color: #ffffff;
  border-radius: 50%;
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 开启状态样式 */
.toggle-input:checked + .toggle-slider {
  /* 浅色模式 - 蓝色开启状态 */
  background-color: #3b82f6; /* 蓝色 */
  box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 深色模式开启状态 */
[data-theme="dark"] .toggle-input:checked + .toggle-slider {
  background-color: #3b82f6; /* 保持相同的蓝色 */
  box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(1.375rem) translateY(-50%); /* 移动距离 22px */
  background-color: #ffffff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 悬停效果 */
.custom-toggle:hover .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.custom-toggle:hover .toggle-input:checked + .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.4), 0 0 0 2px rgba(59, 130, 246, 0.3);
}

[data-theme="dark"] .custom-toggle:hover .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .custom-toggle:hover .toggle-input:checked + .toggle-slider:not(:has(.toggle-input:disabled)) {
  box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(59, 130, 246, 0.4);
}

/* 禁用状态 */
.toggle-input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 焦点状态 */
.toggle-input:focus + .toggle-slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* 活跃状态 - 按下时的弹性反馈 */
.custom-toggle:active .toggle-slider:before {
  width: 1.6rem; /* 更大的拉伸 */
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.custom-toggle:active .toggle-input:checked + .toggle-slider:before {
  width: 1.6rem;
  transform: translateX(1.15rem) translateY(-50%); /* 调整位置补偿拉伸 */
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 释放后的弹性回弹效果 */
.toggle-slider:before {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 小尺寸变体 */
.custom-toggle.toggle-sm {
  width: 2.5rem; /* 40px */
  height: 1.5rem; /* 24px */
}

.custom-toggle.toggle-sm .toggle-slider {
  border-radius: 1.5rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.custom-toggle.toggle-sm .toggle-slider:before {
  height: 1.125rem; /* 18px */
  width: 1.125rem; /* 18px */
  left: 0.1875rem; /* 3px */
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.custom-toggle.toggle-sm .toggle-input:checked + .toggle-slider:before {
  transform: translateX(1rem) translateY(-50%); /* 移动距离 16px */
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.custom-toggle.toggle-sm:active .toggle-slider:before {
  width: 1.3rem; /* 小尺寸的弹性拉伸 */
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.custom-toggle.toggle-sm:active .toggle-input:checked + .toggle-slider:before {
  width: 1.3rem;
  transform: translateX(0.8rem) translateY(-50%);
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
</style>

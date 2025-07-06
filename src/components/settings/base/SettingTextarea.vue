<template>
  <SettingItem :label="label" :description="description">
    <div class="textarea-control">
      <textarea 
        :value="modelValue"
        @input="handleInput"
        @change="handleChange"
        @blur="handleBlur"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :maxlength="maxlength"
        class="textarea textarea-bordered enhanced-textarea"
        :class="{ 'textarea-error': error }"
      ></textarea>
      <button 
        v-if="showResetButton && modelValue !== defaultValue"
        @click="resetToDefault"
        class="btn btn-ghost btn-sm btn-square"
        title="重置为默认值"
      >
        <IconifyIcon icon="mdi:refresh" class="w-4 h-4" />
      </button>
    </div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="hint" class="hint-message">{{ hint }}</div>
  </SettingItem>
</template>

<script setup>
import SettingItem from './SettingItem.vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 文本区域设置组件
 * 提供多行文本输入的设置项
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
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 3
  },
  maxlength: {
    type: Number,
    default: undefined
  },
  showResetButton: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'reset'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleChange = (event) => {
  emit('change', event.target.value)
}

const handleBlur = (event) => {
  emit('blur', event.target.value)
}

const resetToDefault = () => {
  emit('update:modelValue', props.defaultValue)
  emit('reset', props.defaultValue)
}
</script>

<style scoped>
.textarea-control {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  min-width: 120px;
}

.textarea {
  flex: 1;
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  color: hsl(var(--bc));
  transition: all 0.2s ease;
  resize: vertical;
  min-height: 3rem;
  font-size: 0.8rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  line-height: 1.4;
}

/* 增强文本框样式 */
.enhanced-textarea {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.enhanced-textarea:focus {
  border-color: hsl(var(--p));
  outline: none;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1), 
              0 0 0 2px hsl(var(--p) / 0.2);
  transform: translateY(-1px);
}

.enhanced-textarea:hover:not(:focus):not(:disabled) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 深色主题 */
:root[data-theme="dark"] .enhanced-textarea {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .enhanced-textarea:focus {
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2), 
              0 0 0 2px hsl(var(--p) / 0.3);
}

:root[data-theme="dark"] .enhanced-textarea:hover:not(:focus):not(:disabled) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.textarea:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: hsl(var(--b2));
  resize: none;
}

.textarea:read-only {
  background: hsl(var(--b2));
  cursor: default;
  resize: none;
}

.textarea-error {
  border-color: hsl(var(--er));
}

.textarea-error:focus {
  border-color: hsl(var(--er));
  box-shadow: 0 0 0 2px hsl(var(--er) / 0.2);
}

.error-message {
  color: hsl(var(--er));
  font-size: 0.65rem;
  margin-top: 0.125rem;
}

.hint-message {
  color: hsl(var(--bc) / 0.6);
  font-size: 0.65rem;
  margin-top: 0.125rem;
}

.btn-square {
  width: 1.75rem;
  height: 1.75rem;
  min-height: 1.75rem;
  padding: 0;
  margin-top: 0.125rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .textarea-control {
    min-width: 100px;
  }
  
  .textarea {
    font-size: 0.7rem;
  }
}
</style>

<template>
  <SettingItem :label="label" :description="description">
    <div class="input-control">
      <input 
        :type="type"
        :value="modelValue"
        @input="handleInput"
        @change="handleChange"
        @blur="handleBlur"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :maxlength="maxlength"
        class="input input-bordered input-sm"
        :class="{ 'input-error': error }"
      />
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
 * 输入框设置组件
 * 提供各种类型的输入框设置项
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
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'number', 'email', 'url', 'password', 'tel'].includes(value)
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
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: undefined
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
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'reset'])

const handleInput = (event) => {
  let value = event.target.value
  if (props.type === 'number') {
    value = value === '' ? '' : Number(value)
  }
  emit('update:modelValue', value)
}

const handleChange = (event) => {
  let value = event.target.value
  if (props.type === 'number') {
    value = value === '' ? '' : Number(value)
  }
  emit('change', value)
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
.input-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 200px;
}

.input {
  flex: 1;
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  color: hsl(var(--bc));
  transition: all 0.2s ease;
}

.input:focus {
  border-color: hsl(var(--p));
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: hsl(var(--b2));
}

.input:read-only {
  background: hsl(var(--b2));
  cursor: default;
}

.input-error {
  border-color: hsl(var(--er));
}

.input-error:focus {
  border-color: hsl(var(--er));
  box-shadow: 0 0 0 2px hsl(var(--er) / 0.2);
}

.error-message {
  color: hsl(var(--er));
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.hint-message {
  color: hsl(var(--bc) / 0.6);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.btn-square {
  width: 2rem;
  height: 2rem;
  min-height: 2rem;
  padding: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .input-control {
    min-width: 150px;
  }
  
  .input {
    font-size: 0.875rem;
  }
}
</style>

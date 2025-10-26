<!-- HyperOS 2 风格输入框组件 -->
<template>
  <div class="hyperos2-input-wrapper" :class="{ focused: isFocused, error: hasError }">
    <div v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </div>
    
    <div class="input-container">
      <div v-if="prefixIcon" class="input-prefix">
        <IconifyIcon :icon="prefixIcon" size="16" />
      </div>
      
      <input
        ref="inputRef"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'hyperos2-input-field',
          {
            'has-prefix': prefixIcon,
            'has-suffix': suffixIcon || clearable
          }
        ]"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keyup.enter="handleEnter"
      />
      
      <div v-if="clearable && inputValue && !disabled && !readonly" class="input-suffix">
        <button class="clear-btn" @click="clearInput">
          <IconifyIcon icon="mdi:close-circle" size="16" />
        </button>
      </div>
      
      <div v-else-if="suffixIcon" class="input-suffix">
        <IconifyIcon :icon="suffixIcon" size="16" />
      </div>
    </div>
    
    <div v-if="description" class="input-description">
      {{ description }}
    </div>
    
    <div v-if="hasError && errorMessage" class="input-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  errorMessage: {
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
  clearable: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'input', 'enter', 'clear'])

// Refs
const inputRef = ref(null)
const isFocused = ref(false)

// Computed
const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasError = computed(() => {
  return !!props.errorMessage
})

// Methods
const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event) => {
  isFocused.value = false
  emit('blur', event)
}

const handleInput = (event) => {
  emit('input', event)
}

const handleEnter = (event) => {
  emit('enter', event)
}

const clearInput = () => {
  inputValue.value = ''
  emit('clear')
  inputRef.value?.focus()
}

// 提供给父组件的方法
const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

defineExpose({
  focus,
  blur
})
</script>

<style scoped>
.hyperos2-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-xs);
}

.input-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--hyperos-text-primary);
  display: flex;
  align-items: center;
  gap: 2px;
}

.required-mark {
  color: var(--hyperos-error);
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.hyperos2-input-field {
  width: 100%;
  height: 44px;
  padding: 0 var(--hyperos-space-md);
  border: 1.5px solid var(--hyperos-border-primary);
  border-radius: var(--hyperos-radius-md);
  background: var(--hyperos-bg-primary);
  color: var(--hyperos-text-primary);
  font-size: 0.9rem;
  transition: all var(--hyperos-transition-fast);
  outline: none;
  font-family: inherit;
}

.hyperos2-input-field.has-prefix {
  padding-left: 40px;
}

.hyperos2-input-field.has-suffix {
  padding-right: 40px;
}

.hyperos2-input-field::placeholder {
  color: var(--hyperos-text-tertiary);
}

.hyperos2-input-field:hover:not(:disabled):not(:readonly) {
  border-color: var(--hyperos-primary);
  background: var(--hyperos-bg-card);
}

.hyperos2-input-wrapper.focused .hyperos2-input-field {
  border-color: var(--hyperos-primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  background: var(--hyperos-bg-card);
}

.hyperos2-input-wrapper.error .hyperos2-input-field {
  border-color: var(--hyperos-error);
}

.hyperos2-input-wrapper.error.focused .hyperos2-input-field {
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.hyperos2-input-field:disabled {
  background: var(--hyperos-gray-100);
  color: var(--hyperos-text-tertiary);
  cursor: not-allowed;
  border-color: var(--hyperos-border-secondary);
}

.hyperos2-input-field:readonly {
  background: var(--hyperos-bg-secondary);
  cursor: default;
}

.input-prefix,
.input-suffix {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--hyperos-text-secondary);
  pointer-events: none;
}

.input-prefix {
  left: var(--hyperos-space-md);
}

.input-suffix {
  right: var(--hyperos-space-md);
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--hyperos-text-secondary);
  pointer-events: auto;
  transition: color var(--hyperos-transition-fast);
}

.clear-btn:hover {
  color: var(--hyperos-text-primary);
}

.input-description {
  font-size: 0.75rem;
  color: var(--hyperos-text-secondary);
  line-height: 1.4;
}

.input-error {
  font-size: 0.75rem;
  color: var(--hyperos-error);
  line-height: 1.4;
}

[data-theme="dark"] .hyperos2-input-field:disabled {
  background: var(--hyperos-gray-800);
  border-color: var(--hyperos-gray-700);
}

[data-theme="dark"] .hyperos2-input-field:readonly {
  background: var(--hyperos-bg-tertiary);
}
</style>

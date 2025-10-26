<!-- HyperOS 2 风格选择框组件 -->
<template>
  <div class="hyperos2-select-wrapper" :class="{ focused: isFocused, error: hasError }">
    <div v-if="label" class="select-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </div>
    
    <div class="select-container">
      <select
        ref="selectRef"
        v-model="selectValue"
        :disabled="disabled"
        :class="['hyperos2-select-field']"
        @focus="handleFocus"
        @blur="handleBlur"
        @change="handleChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option 
          v-for="option in options" 
          :key="option.value" 
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      
      <div class="select-arrow">
        <IconifyIcon icon="mdi:chevron-down" size="16" />
      </div>
    </div>
    
    <div v-if="description" class="select-description">
      {{ description }}
    </div>
    
    <div v-if="hasError && errorMessage" class="select-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择...'
  },
  description: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
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
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'change'])

// Refs
const selectRef = ref(null)
const isFocused = ref(false)

// Computed
const selectValue = computed({
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

const handleChange = (event) => {
  emit('change', event)
}

// 提供给父组件的方法
const focus = () => {
  selectRef.value?.focus()
}

const blur = () => {
  selectRef.value?.blur()
}

defineExpose({
  focus,
  blur
})
</script>

<style scoped>
.hyperos2-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-xs);
}

.select-label {
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

.select-container {
  position: relative;
  display: flex;
  align-items: center;
}

.hyperos2-select-field {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 var(--hyperos-space-md);
  border: 1.5px solid var(--hyperos-border-primary);
  border-radius: var(--hyperos-radius-md);
  background: var(--hyperos-bg-primary);
  color: var(--hyperos-text-primary);
  font-size: 0.9rem;
  transition: all var(--hyperos-transition-fast);
  outline: none;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.hyperos2-select-field:hover:not(:disabled) {
  border-color: var(--hyperos-primary);
  background: var(--hyperos-bg-card);
}

.hyperos2-select-wrapper.focused .hyperos2-select-field {
  border-color: var(--hyperos-primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  background: var(--hyperos-bg-card);
}

.hyperos2-select-wrapper.error .hyperos2-select-field {
  border-color: var(--hyperos-error);
}

.hyperos2-select-wrapper.error.focused .hyperos2-select-field {
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.hyperos2-select-field:disabled {
  background: var(--hyperos-gray-100);
  color: var(--hyperos-text-tertiary);
  cursor: not-allowed;
  border-color: var(--hyperos-border-secondary);
}

.hyperos2-select-field option {
  background: var(--hyperos-bg-primary);
  color: var(--hyperos-text-primary);
  padding: var(--hyperos-space-sm);
}

.hyperos2-select-field option:disabled {
  color: var(--hyperos-text-tertiary);
}

.select-arrow {
  position: absolute;
  right: var(--hyperos-space-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--hyperos-text-secondary);
  pointer-events: none;
  transition: all var(--hyperos-transition-fast);
}

.hyperos2-select-wrapper.focused .select-arrow {
  transform: translateY(-50%) rotate(180deg);
  color: var(--hyperos-primary);
}

.select-description {
  font-size: 0.75rem;
  color: var(--hyperos-text-secondary);
  line-height: 1.4;
}

.select-error {
  font-size: 0.75rem;
  color: var(--hyperos-error);
  line-height: 1.4;
}

[data-theme="dark"] .hyperos2-select-field:disabled {
  background: var(--hyperos-gray-800);
  border-color: var(--hyperos-gray-700);
}

[data-theme="dark"] .hyperos2-select-field option {
  background: var(--hyperos-bg-primary);
}
</style>

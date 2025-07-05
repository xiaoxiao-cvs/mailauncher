<template>
  <SettingItem :label="label" :description="description">
    <select 
      :value="modelValue"
      @change="handleChange"
      class="select select-bordered select-sm"
      :disabled="disabled"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option 
        v-for="option in options" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </SettingItem>
</template>

<script setup>
import SettingItem from './SettingItem.vue'

/**
 * 下拉选择设置组件
 * 提供下拉选择类型的设置项
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
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const handleChange = (event) => {
  const value = event.target.value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.select {
  min-width: 150px;
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  color: hsl(var(--bc));
  transition: all 0.2s ease;
}

.select:focus {
  border-color: hsl(var(--p));
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: hsl(var(--b2));
}

/* 响应式调整 */
@media (max-width: 768px) {
  .select {
    min-width: 120px;
    font-size: 0.875rem;
  }
}
</style>

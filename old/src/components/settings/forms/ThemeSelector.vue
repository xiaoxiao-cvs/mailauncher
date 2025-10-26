<template>
  <HyperOS2Select
    label="主题模式"
    description="切换系统界面的明暗主题，支持跟随系统设置"
    :options="themeOptions"
    :model-value="modelValue"
    @update:model-value="handleChange"
  />
</template>

<script setup>
import HyperOS2Select from '../base/HyperOS2Select.vue'

/**
 * 主题选择器组件
 * 专用于主题模式选择的设置组件
 */
defineProps({
  modelValue: {
    type: String,
    default: 'system'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const themeOptions = [
  { 
    value: 'system', 
    label: '跟随系统', 
    icon: 'mdi:theme-light-dark'
  },
  { 
    value: 'light', 
    label: '亮色模式', 
    icon: 'mdi:weather-sunny'
  },
  { 
    value: 'dark', 
    label: '暗色模式', 
    icon: 'mdi:weather-night'
  }
]

const handleChange = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

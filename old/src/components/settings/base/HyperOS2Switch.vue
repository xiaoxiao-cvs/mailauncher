<!-- HyperOS 2 风格开关组件 -->
<template>
  <button 
    :class="['hyperos2-switch-component', { checked: modelValue, disabled }]"
    @click="toggle"
    :disabled="disabled"
  >
    <div class="hyperos2-switch-track">
      <div class="hyperos2-switch-thumb">
        <div v-if="modelValue" class="switch-icon">
          <IconifyIcon icon="mdi:check" size="12" />
        </div>
      </div>
    </div>
  </button>
</template>

<script setup>
import IconifyIcon from '@/components/common/IconifyIcon.vue'

// Props
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

// Emits
const emit = defineEmits(['update:modelValue'])

// Methods
const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<style scoped>
.hyperos2-switch-component {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  padding: 0;
}

.hyperos2-switch-component.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hyperos2-switch-track {
  position: relative;
  width: 52px;
  height: 32px;
  background: var(--hyperos-gray-300);
  border-radius: var(--hyperos-radius-full);
  transition: all var(--hyperos-transition-normal);
}

.hyperos2-switch-component.checked .hyperos2-switch-track {
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-primary-light));
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.hyperos2-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 28px;
  height: 28px;
  background: white;
  border-radius: var(--hyperos-radius-full);
  transition: all var(--hyperos-transition-normal);
  box-shadow: var(--hyperos-shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hyperos2-switch-component.checked .hyperos2-switch-thumb {
  transform: translateX(20px);
}

.switch-icon {
  color: var(--hyperos-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hyperos2-switch-component:hover:not(.disabled) .hyperos2-switch-track {
  transform: scale(1.02);
}

.hyperos2-switch-component:active:not(.disabled) .hyperos2-switch-track {
  transform: scale(0.98);
}

[data-theme="dark"] .hyperos2-switch-thumb {
  background: #f3f4f6;
}
</style>

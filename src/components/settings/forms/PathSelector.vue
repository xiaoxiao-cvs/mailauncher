<template>
  <HyperOS2Input
    :label="label"
    :description="description"
    :model-value="modelValue"
    @update:model-value="handleInput"
    :placeholder="placeholder"
    :readonly="readonly"
    :disabled="disabled"
  >
    <template #suffix>
      <button 
        @click="selectPath"
        class="btn btn-outline btn-sm"
        :disabled="disabled || isSelecting"
      >
        <span v-if="isSelecting" class="loading loading-spinner loading-xs"></span>
        {{ isSelecting ? '选择中...' : '浏览' }}
      </button>
      <button 
        v-if="showResetButton"
        @click="resetToDefault"
        class="btn btn-ghost btn-sm"
        title="重置为默认值"
      >
        <IconifyIcon icon="mdi:refresh" class="w-4 h-4" />
      </button>
    </template>
    <template #below v-if="currentPath">
      <div class="path-info flex items-center gap-2 mt-2 text-sm text-base-content/70">
        <IconifyIcon icon="mdi:information" class="w-4 h-4 text-info" />
        <span>当前路径: {{ currentPath }}</span>
      </div>
    </template>
  </HyperOS2Input>
</template>

<script setup>
import { ref, computed } from 'vue'
import HyperOS2Input from '../base/HyperOS2Input.vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 路径选择器组件
 * 提供文件夹路径选择功能的设置项
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
    default: '请选择路径'
  },
  dialogTitle: {
    type: String,
    default: '选择文件夹'
  },
  defaultPath: {
    type: String,
    default: ''
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showResetButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'select', 'reset'])

const isSelecting = ref(false)

const currentPath = computed(() => {
  return props.modelValue || '未设置'
})

const handleInput = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}

const selectPath = async () => {
  if (isSelecting.value || props.disabled) return

  isSelecting.value = true
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window === 'undefined' || (!window.__TAURI__ && !window.isTauriApp)) {
      const { default: toastService } = await import('@/services/toastService')
      toastService.error('文件夹选择功能仅在桌面应用中可用，请手动输入路径')
      return
    }

    // 动态导入 folderSelector
    const { selectFolder } = await import('@/utils/folderSelector')

    const selectedPath = await selectFolder({
      title: props.dialogTitle,
      defaultPath: props.modelValue || props.defaultPath
    })

    if (selectedPath) {
      emit('update:modelValue', selectedPath)
      emit('change', selectedPath)
      emit('select', selectedPath)

      const { default: toastService } = await import('@/services/toastService')
      toastService.success(`路径已设置为: ${selectedPath}`)
    }
  } catch (error) {
    console.error('选择文件夹失败:', error)
    const { default: toastService } = await import('@/services/toastService')
    
    // 提供更具体的错误信息
    if (error.message && error.message.includes('invoke')) {
      toastService.error('Tauri API 未正确初始化，请重启应用后重试')
    } else if (error.message && error.message.includes('dialog')) {
      toastService.error('文件对话框插件未正确加载，请检查应用配置')
    } else {
      toastService.error('选择文件夹失败，请重试或手动输入路径')
    }
  } finally {
    isSelecting.value = false
  }
}

const resetToDefault = () => {
  emit('update:modelValue', props.defaultPath)
  emit('change', props.defaultPath)
  emit('reset', props.defaultPath)
}
</script>

<style scoped>
.path-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 300px;
}

.path-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.path-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.6);
}

.current-path {
  word-break: break-all;
  max-width: 100%;
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

.btn {
  white-space: nowrap;
  flex-shrink: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .path-control {
    min-width: 250px;
  }
  
  .path-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    width: 100%;
  }
  
  .current-path {
    font-size: 0.7rem;
  }
}
</style>

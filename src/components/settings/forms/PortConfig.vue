<template>
  <SettingItem :label="label" :description="description">
    <div class="port-control">
      <div class="port-input-group">
        <input 
          type="number"
          :value="modelValue"
          @input="handleInput"
          @blur="handleBlur"
          :min="minPort"
          :max="maxPort"
          :placeholder="placeholder"
          class="input input-bordered input-sm"
          :class="{ 'input-error': hasError }"
          :disabled="disabled"
        />
        <button 
          v-if="showTestButton"
          @click="testConnection"
          class="btn btn-outline btn-sm"
          :disabled="disabled || isTesting || hasError"
          :class="{ 'loading': isTesting }"
        >
          {{ isTesting ? '测试中...' : '测试' }}
        </button>
        <button 
          v-if="showResetButton"
          @click="resetToDefault"
          class="btn btn-ghost btn-sm"
          title="重置为默认端口"
        >
          <IconifyIcon icon="mdi:refresh" class="w-4 h-4" />
        </button>
      </div>
      
      <!-- 端口状态指示 -->
      <div v-if="showStatus" class="port-status">
        <div class="status-indicator" :class="statusClass">
          <IconifyIcon :icon="statusIcon" class="w-4 h-4" />
          <span>{{ statusText }}</span>
        </div>
        <div v-if="accessUrls.length > 0" class="access-urls">
          <div v-for="url in accessUrls" :key="url.label" class="url-item">
            <span class="url-label">{{ url.label }}:</span>
            <code class="url-value">{{ url.url }}</code>
          </div>
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-if="error" class="error-message">
        <IconifyIcon icon="mdi:alert-circle" class="w-4 h-4" />
        {{ error }}
      </div>
      
      <!-- 提示信息 -->
      <div v-if="hint" class="hint-message">
        <IconifyIcon icon="mdi:information" class="w-4 h-4" />
        {{ hint }}
      </div>
    </div>
  </SettingItem>
</template>

<script setup>
import { ref, computed } from 'vue'
import SettingItem from '../base/SettingItem.vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 端口配置组件
 * 提供端口号配置和连接测试功能
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
    type: [Number, String],
    default: 8080
  },
  placeholder: {
    type: String,
    default: '请输入端口号'
  },
  minPort: {
    type: Number,
    default: 1
  },
  maxPort: {
    type: Number,
    default: 65535
  },
  defaultPort: {
    type: Number,
    default: 8080
  },
  showTestButton: {
    type: Boolean,
    default: false
  },
  showResetButton: {
    type: Boolean,
    default: true
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  testUrl: {
    type: String,
    default: ''
  },
  accessUrls: {
    type: Array,
    default: () => []
  },
  hint: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'test', 'reset'])

const isTesting = ref(false)
const error = ref('')
const testResult = ref(null)

const hasError = computed(() => {
  const port = Number(props.modelValue)
  return isNaN(port) || port < props.minPort || port > props.maxPort || !!error.value
})

const statusClass = computed(() => {
  if (isTesting.value) return 'status-testing'
  if (testResult.value === null) return 'status-unknown'
  return testResult.value ? 'status-success' : 'status-error'
})

const statusIcon = computed(() => {
  if (isTesting.value) return 'mdi:loading'
  if (testResult.value === null) return 'mdi:help-circle'
  return testResult.value ? 'mdi:check-circle' : 'mdi:alert-circle'
})

const statusText = computed(() => {
  if (isTesting.value) return '测试中...'
  if (testResult.value === null) return '未测试'
  return testResult.value ? '连接成功' : '连接失败'
})

const handleInput = (event) => {
  const value = event.target.value
  const numValue = value === '' ? '' : Number(value)
  
  // 清除之前的错误
  error.value = ''
  testResult.value = null
  
  // 验证端口范围
  if (value !== '' && (isNaN(numValue) || numValue < props.minPort || numValue > props.maxPort)) {
    error.value = `端口号必须在 ${props.minPort} - ${props.maxPort} 之间`
  }
  
  emit('update:modelValue', numValue)
}

const handleBlur = () => {
  emit('change', props.modelValue)
}

const testConnection = async () => {
  if (isTesting.value || hasError.value) return
  
  isTesting.value = true
  error.value = ''
  
  try {
    emit('test', props.modelValue)
    
    // 模拟测试过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 这里应该实现实际的连接测试逻辑
    // 现在只是随机返回结果作为示例
    testResult.value = Math.random() > 0.3
    
  } catch (err) {
    error.value = '测试连接时发生错误'
    testResult.value = false
  } finally {
    isTesting.value = false
  }
}

const resetToDefault = () => {
  error.value = ''
  testResult.value = null
  emit('update:modelValue', props.defaultPort)
  emit('change', props.defaultPort)
  emit('reset', props.defaultPort)
}
</script>

<style scoped>
.port-control {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 250px;
}

.port-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input {
  width: 120px;
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  color: hsl(var(--bc));
  transition: all 0.2s ease;
  text-align: center;
}

.input:focus {
  border-color: hsl(var(--p));
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--p) / 0.2);
}

.input-error {
  border-color: hsl(var(--er));
}

.input-error:focus {
  border-color: hsl(var(--er));
  box-shadow: 0 0 0 2px hsl(var(--er) / 0.2);
}

.port-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
}

.status-unknown {
  background: hsl(var(--b2));
  color: hsl(var(--bc) / 0.7);
}

.status-testing {
  background: hsl(var(--in) / 0.1);
  color: hsl(var(--inc));
}

.status-success {
  background: hsl(var(--su) / 0.1);
  color: hsl(var(--suc));
}

.status-error {
  background: hsl(var(--er) / 0.1);
  color: hsl(var(--erc));
}

.access-urls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 1.5rem;
}

.url-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.url-label {
  color: hsl(var(--bc) / 0.7);
  min-width: 60px;
}

.url-value {
  color: hsl(var(--p));
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  background: hsl(var(--p) / 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--er));
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: hsl(var(--er) / 0.1);
  border-radius: 0.5rem;
}

.hint-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--bc) / 0.6);
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: hsl(var(--in) / 0.1);
  border-radius: 0.5rem;
}

.btn {
  white-space: nowrap;
  flex-shrink: 0;
}

/* 动画效果 */
.status-testing .iconify {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .port-control {
    min-width: 200px;
  }
  
  .port-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input {
    width: 100%;
  }
  
  .btn {
    width: 100%;
  }
  
  .access-urls {
    margin-left: 0;
  }
  
  .url-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>

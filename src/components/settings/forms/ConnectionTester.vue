<template>
  <SettingGroup 
    title="连接测试" 
    subtitle="测试后端服务器连接状态"
    icon="mdi:network-outline"
    :iconClass="'text-blue-500'"
    :gradient-border="true"
  >
    <SettingItem 
      label="后端连接状态" 
      description="手动检查后端服务器连接状态，支持自动重连"
    >
      <div class="connection-controls">
        <div class="connection-status">
          <div class="status-badge" :class="statusClass">
            <IconifyIcon :icon="statusIcon" />
            {{ statusText }}
          </div>
        </div>
        <div class="connection-buttons">
          <button 
            class="btn btn-outline btn-sm"
            @click="testConnection"
            :disabled="isTesting"
            :class="{ 'loading': isTesting }"
          >
            {{ isTesting ? '测试中...' : '重新测试' }}
          </button>
          <button 
            v-if="canReconnect"
            class="btn btn-primary btn-sm"
            @click="reconnect"
            :disabled="isReconnecting"
            :class="{ 'loading': isReconnecting }"
          >
            {{ isReconnecting ? '重连中...' : '重新连接' }}
          </button>
        </div>
      </div>
    </SettingItem>
    
    <!-- 连接详情 -->
    <div v-if="connectionDetails" class="connection-details">
      <div class="detail-item">
        <span class="detail-label">服务器地址:</span>
        <code class="detail-value">{{ connectionDetails.url }}</code>
      </div>
      <div class="detail-item">
        <span class="detail-label">响应时间:</span>
        <span class="detail-value">{{ connectionDetails.responseTime || 'N/A' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">最后测试:</span>
        <span class="detail-value">{{ lastTestTime || '从未测试' }}</span>
      </div>
      <div v-if="connectionDetails.version" class="detail-item">
        <span class="detail-label">服务版本:</span>
        <span class="detail-value">{{ connectionDetails.version }}</span>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="error" class="error-details">
      <div class="error-header">
        <IconifyIcon icon="mdi:alert-circle" class="w-4 h-4" />
        <span>连接错误</span>
      </div>
      <div class="error-message">{{ error }}</div>
      <div v-if="errorCode" class="error-code">错误代码: {{ errorCode }}</div>
    </div>
  </SettingGroup>
</template>

<script setup>
import { ref, computed } from 'vue'
import SettingGroup from '../base/HyperOS2SettingGroup.vue'
import SettingItem from '../base/SettingItem.vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 连接测试组件
 * 提供后端服务连接测试和状态显示功能
 */
const props = defineProps({
  url: {
    type: String,
    required: true
  },
  autoTest: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['test', 'reconnect', 'statusChange'])

const isTesting = ref(false)
const isReconnecting = ref(false)
const connectionStatus = ref('unknown') // unknown, connected, error, testing
const error = ref('')
const errorCode = ref('')
const connectionDetails = ref(null)
const lastTestTime = ref('')

const statusClass = computed(() => {
  return `status-${connectionStatus.value}`
})

const statusIcon = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'mdi:check-circle'
    case 'error':
      return 'mdi:alert-circle'
    case 'testing':
      return 'mdi:loading'
    default:
      return 'mdi:help-circle'
  }
})

const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '连接正常'
    case 'error':
      return '连接失败'
    case 'testing':
      return '测试中...'
    default:
      return '未知状态'
  }
})

const canReconnect = computed(() => {
  return connectionStatus.value === 'error'
})

const testConnection = async () => {
  if (isTesting.value) return
  
  isTesting.value = true
  connectionStatus.value = 'testing'
  error.value = ''
  errorCode.value = ''
  
  const startTime = Date.now()
  
  try {
    emit('test', props.url)
    
    // 模拟API调用
    const response = await simulateConnectionTest(props.url)
    const endTime = Date.now()
    const responseTime = `${endTime - startTime}ms`
    
    if (response.success) {
      connectionStatus.value = 'connected'
      connectionDetails.value = {
        url: props.url,
        responseTime,
        version: response.version || 'Unknown'
      }
    } else {
      connectionStatus.value = 'error'
      error.value = response.error || '连接失败'
      errorCode.value = response.errorCode || ''
    }
    
  } catch (err) {
    connectionStatus.value = 'error'
    error.value = '网络错误或服务不可用'
    errorCode.value = 'NETWORK_ERROR'
  } finally {
    isTesting.value = false
    lastTestTime.value = new Date().toLocaleString()
    emit('statusChange', {
      status: connectionStatus.value,
      error: error.value,
      details: connectionDetails.value
    })
  }
}

const reconnect = async () => {
  if (isReconnecting.value) return
  
  isReconnecting.value = true
  
  try {
    emit('reconnect', props.url)
    
    // 等待一段时间后重新测试
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testConnection()
    
  } catch (err) {
    error.value = '重连失败'
  } finally {
    isReconnecting.value = false
  }
}

// 模拟连接测试
const simulateConnectionTest = async (url) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
  
  // 模拟成功/失败结果
  const isSuccess = Math.random() > 0.2 // 80% 成功率
  
  if (isSuccess) {
    return {
      success: true,
      version: '1.0.0'
    }
  } else {
    const errors = [
      { error: '连接超时', errorCode: 'TIMEOUT' },
      { error: '服务不可用', errorCode: 'SERVICE_UNAVAILABLE' },
      { error: '认证失败', errorCode: 'AUTH_FAILED' },
      { error: '网络错误', errorCode: 'NETWORK_ERROR' }
    ]
    return {
      success: false,
      ...errors[Math.floor(Math.random() * errors.length)]
    }
  }
}

// 自动测试
if (props.autoTest) {
  testConnection()
}
</script>

<style scoped>
.connection-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.connection-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.status-connected {
  background: hsl(var(--su) / 0.2);
  color: hsl(var(--suc));
  border: 1px solid hsl(var(--su) / 0.3);
}

.status-error {
  background: hsl(var(--er) / 0.2);
  color: hsl(var(--erc));
  border: 1px solid hsl(var(--er) / 0.3);
}

.status-testing {
  background: hsl(var(--in) / 0.2);
  color: hsl(var(--inc));
  border: 1px solid hsl(var(--in) / 0.3);
}

.status-unknown {
  background: hsl(var(--b3));
  color: hsl(var(--bc) / 0.7);
  border: 1px solid hsl(var(--b3));
}

.connection-details {
  margin-top: 1rem;
  padding: 1rem;
  background: hsl(var(--b2) / 0.5);
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--b3) / 0.3);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid hsl(var(--b3) / 0.2);
}

.detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  font-weight: 500;
  color: hsl(var(--bc) / 0.7);
  min-width: 80px;
}

.detail-value {
  color: hsl(var(--bc));
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
}

.error-details {
  margin-top: 1rem;
  padding: 1rem;
  background: hsl(var(--er) / 0.1);
  border-radius: 0.75rem;
  border: 1px solid hsl(var(--er) / 0.3);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--erc));
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-message {
  color: hsl(var(--erc));
  margin-bottom: 0.5rem;
}

.error-code {
  color: hsl(var(--er) / 0.8);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
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
  .connection-buttons {
    flex-direction: column;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .detail-label {
    min-width: auto;
  }
}
</style>

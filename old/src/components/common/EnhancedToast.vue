<template>  <div 
    class="enhanced-toast" 
    :class="[`toast-${finalType}`, `toast-${size}`, { 'toast-expanded': isExpanded }]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 关闭按钮 -->
    <button 
      v-if="closable" 
      class="toast-close-btn" 
      @click="handleClose"
      aria-label="关闭"
    >
      ×
    </button>    <!-- Toast内容区 -->
    <div class="toast-content">      <!-- 主要消息 -->
      <div class="toast-main-message">
        <span v-if="localDeploymentData && progressMode === 'deployment'">
          正在安装实例 "{{ localDeploymentData.instanceName }}"... ({{ Math.round(progressPercent) }}%)
        </span>        <span v-else>
          {{ finalMessage }}
        </span>
      </div>      <!-- 错误详情（仅在错误类型且有详细信息时显示） -->
      <div v-if="finalType === 'error' && errorDetails" class="toast-error-details">
        <div class="error-summary">
          <strong>错误详情:</strong>
        </div>
        <div class="error-content">
          <div v-if="errorDetails.stack" class="error-stack">
            <details class="error-stack-details">
              <summary class="error-stack-summary">点击查看调用栈</summary>
              <pre class="error-stack-content">{{ errorDetails.stack }}</pre>
            </details>
          </div>
          <div v-if="errorDetails.context" class="error-context">
            <strong>上下文:</strong>
            <div class="context-details">
              <div v-for="(value, key) in errorDetails.context" :key="key" class="context-item">
                <span class="context-key">{{ key }}:</span>
                <span class="context-value">{{ value }}</span>
              </div>
            </div>
          </div>
          <div v-if="errorDetails.suggestions" class="error-suggestions">
            <strong>建议解决方案:</strong>
            <ul class="suggestions-list">
              <li v-for="suggestion in errorDetails.suggestions" :key="suggestion" class="suggestion-item">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>      <!-- 部署状态信息（仅中尺寸以上显示） -->
      <div v-if="localDeploymentData && (size === 'medium' || size === 'large')" class="toast-deployment-info">
        <div v-if="localDeploymentData.status" class="deployment-status">
          {{ localDeploymentData.status }}
        </div>
        <div v-if="localDeploymentData.lastUpdate" class="deployment-time">
          最后更新: {{ localDeploymentData.lastUpdate }}
        </div>
      </div>

      <!-- 展开区域（仅大尺寸或手动展开时显示） -->
      <div v-if="isExpanded && localDeploymentData" class="toast-expanded-content">
        <div class="deployment-details">
          <div v-if="localDeploymentData.instanceName" class="detail-item">
            <span class="detail-label">实例名称:</span>
            <span class="detail-value">{{ localDeploymentData.instanceName }}</span>
          </div>
          <div v-if="localDeploymentData.port" class="detail-item">
            <span class="detail-label">端口:</span>
            <span class="detail-value">{{ localDeploymentData.port }}</span>
          </div>
          <div v-if="localDeploymentData.image" class="detail-item">
            <span class="detail-label">镜像:</span>
            <span class="detail-value">{{ localDeploymentData.image }}</span>
          </div>
          <div v-if="localDeploymentData.servicesProgress && localDeploymentData.servicesProgress.length > 0" class="services-progress">
            <div class="services-title">服务状态:</div>
            <div v-for="service in localDeploymentData.servicesProgress" :key="service.name" class="service-item">
              <span class="service-name">{{ service.name }}</span>
              <span class="service-status" :class="`status-${service.status}`">{{ service.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 展开/折叠按钮（仅中尺寸且可展开时显示） -->
      <button 
        v-if="expandable && size === 'medium'" 
        class="toast-expand-btn"
        @click="toggleExpand"
        aria-label="展开详情"
      >
        <span class="expand-text">{{ isExpanded ? '收起详情' : '展开详情' }}</span>
        <span class="expand-icon" :class="{ 'rotated': isExpanded }">▼</span>
      </button>
    </div>

    <!-- 进度条 -->
    <div class="toast-progress-container">
      <div 
        class="toast-progress-bar" 
        :style="{ 
          width: `${progressPercent}%`,
          backgroundColor: progressColor 
        }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'small',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  },
  closable: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Boolean,
    default: true
  },
  deploymentData: {
    type: Object,
    default: null
  },
  errorDetails: {
    type: Object,
    default: null,
    validator: (value) => {
      if (!value) return true
      // 验证 errorDetails 对象的结构
      return typeof value === 'object' && 
        (!value.stack || typeof value.stack === 'string') &&
        (!value.context || typeof value.context === 'object') &&
        (!value.suggestions || Array.isArray(value.suggestions))
    }
  },
  expandable: {
    type: Boolean,
    default: false
  },
  onClose: {
    type: Function,
    default: null
  },
  onExpand: {
    type: Function,
    default: null
  },
  onProgressUpdate: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['close', 'expand'])

// 内部状态
const isExpanded = ref(props.size === 'large') // 大尺寸默认展开
const progressPercent = ref(100)
const isMouseOver = ref(false)
const progressMode = ref('countdown') // 'countdown' | 'deployment'
const deploymentProgress = ref(0)

// 本地响应式的部署数据，确保更新能正确触发重渲染
const localDeploymentData = ref(props.deploymentData ? { ...props.deploymentData } : null)

let countdownTimer = null
let remainingTime = ref(props.duration)

// 计算属性
const finalType = ref(props.type)
const finalMessage = ref(props.message)

const progressColor = computed(() => {
  const colors = {
    success: '#10b981',
    error: '#ef4444', 
    warning: '#f59e0b',
    info: '#3b82f6'
  }
  return colors[finalType.value] || colors.info
})

// 方法
const handleClose = () => {
  if (props.onClose) {
    props.onClose(props.id)
  }
  emit('close', props.id)
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  if (props.onExpand) {
    props.onExpand(props.id, isExpanded.value)
  }
  emit('expand', props.id, isExpanded.value)
}

const handleMouseEnter = () => {
  isMouseOver.value = true
  if (progressMode.value === 'countdown') {
    pauseCountdown()
  }
}

const handleMouseLeave = () => {
  isMouseOver.value = false
  if (progressMode.value === 'countdown') {
    resumeCountdown()
  }
}

const startCountdown = () => {
  if (!props.autoClose || props.duration <= 0) return

  remainingTime.value = props.duration
  progressPercent.value = 100

  const updateInterval = 50 // 50ms更新一次，更流畅
  
  countdownTimer = setInterval(() => {
    if (isMouseOver.value) return // 鼠标悬停时暂停
    
    remainingTime.value -= updateInterval
    progressPercent.value = Math.max(0, (remainingTime.value / props.duration) * 100)
    
    if (remainingTime.value <= 0) {
      clearInterval(countdownTimer)
      handleClose()
    }
  }, updateInterval)
}

const pauseCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
}

const resumeCountdown = () => {
  if (progressMode.value === 'countdown' && remainingTime.value > 0) {
    startCountdown()
  }
}

const switchToDeploymentMode = () => {
  progressMode.value = 'deployment'
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  progressPercent.value = deploymentProgress.value
}

// 外部调用的方法
const updateProgress = (progress) => {
  console.log(`Toast ${props.id} 更新进度:`, { 
    from: deploymentProgress.value, 
    to: progress, 
    mode: progressMode.value 
  });
  
  deploymentProgress.value = progress
  
  if (progressMode.value === 'deployment') {
    progressPercent.value = progress
  } else {
    // 切换到部署模式
    switchToDeploymentMode()
  }
    // 强制触发响应式更新 - 移除可能导致递归的回调
  // if (props.onProgressUpdate) {
  //   props.onProgressUpdate(props.id, progress);
  // }
}

const updateDeploymentData = (data) => {
  console.log(`Toast ${props.id} 更新部署数据:`, data);
  
  // 更新本地响应式状态，确保触发响应式更新
  if (localDeploymentData.value) {
    // 使用响应式赋值，确保Vue能检测到变化
    localDeploymentData.value = { ...localDeploymentData.value, ...data };
  } else {
    localDeploymentData.value = { ...data };
  }
  
  // 如果包含进度信息，只更新本地进度，避免递归调用
  if (data.progress !== undefined) {
    deploymentProgress.value = data.progress;
    if (progressMode.value === 'deployment') {
      progressPercent.value = data.progress;
    } else {
      switchToDeploymentMode();
    }
  }
  
  console.log(`Toast ${props.id} 部署数据更新后:`, localDeploymentData.value);
}

const complete = (newType, newMessage) => {
  progressMode.value = 'deployment'
  progressPercent.value = 100
  
  // 更新本地状态而不是尝试修改props
  finalType.value = newType
  finalMessage.value = newMessage
}

// 暴露方法给父组件
defineExpose({
  updateProgress,
  updateDeploymentData,
  complete
})

// 生命周期
onMounted(() => {
  if (props.autoClose && progressMode.value === 'countdown') {
    startCountdown()
  }
  
  console.log(`Toast ${props.id} 挂载完成:`, { 
    deploymentData: localDeploymentData.value,
    progressMode: progressMode.value,
    progressPercent: progressPercent.value
  });
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  console.log(`Toast ${props.id} 即将卸载`);
})

// 监听进度变化
watch(progressPercent, (newValue, oldValue) => {
  console.log(`Toast ${props.id} 进度变化:`, { from: oldValue, to: newValue });
}, { immediate: true })

// 监听部署数据变化
watch(localDeploymentData, (newValue) => {
  console.log(`Toast ${props.id} 部署数据变化:`, newValue);
}, { deep: true })

// 监听props.deploymentData的变化，同步到本地状态
watch(() => props.deploymentData, (newData) => {
  if (newData) {
    console.log(`Toast ${props.id} props.deploymentData 更新:`, newData);
    localDeploymentData.value = { ...newData };
  }
}, { deep: true, immediate: true })
</script>

<style scoped>
.enhanced-toast {
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
}

/* 尺寸变体 */
.toast-small {
  min-width: 320px;
  max-width: 400px;
}

.toast-medium {
  min-width: 400px;
  max-width: 500px;
}

.toast-large {
  min-width: 500px;
  max-width: 600px;
}

.toast-expanded {
  max-width: 600px !important;
}

/* 类型颜色 */
.toast-success {
  background-color: #f0fdf4;
  border-left: 4px solid #10b981;
  color: #166534;
}

.toast-error {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

.toast-warning {
  background-color: #fffbeb;
  border-left: 4px solid #f59e0b;
  color: #92400e;
}

.toast-info {
  background-color: #eff6ff;
  border-left: 4px solid #3b82f6;
  color: #1e40af;
}

/* 暗色模式 */
[data-theme="dark"] .toast-success {
  background-color: #064e3b;
  color: #86efac;
}

[data-theme="dark"] .toast-error {
  background-color: #7f1d1d;
  color: #fca5a5;
}

[data-theme="dark"] .toast-warning {
  background-color: #78350f;
  color: #fcd34d;
}

[data-theme="dark"] .toast-info {
  background-color: #1e3a8a;
  color: #93c5fd;
}

/* 关闭按钮 */
.toast-close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.7;
  z-index: 10;
}

.toast-close-btn:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

[data-theme="dark"] .toast-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 内容区域 */
.toast-content {
  padding: 16px 40px 16px 16px;
}

.toast-main-message {
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.4;
}

.toast-deployment-info {
  margin-top: 8px;
  opacity: 0.8;
  font-size: 0.9em;
}

.deployment-status {
  margin-bottom: 4px;
}

.deployment-time {
  font-size: 0.85em;
  opacity: 0.7;
}

/* 错误详情样式 */
.toast-error-details {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.1));
  backdrop-filter: blur(10px);
}

.error-summary {
  font-weight: 600;
  margin-bottom: 8px;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-summary::before {
  content: "⚠️";
  font-size: 1.1em;
}

.error-content {
  font-size: 0.9em;
  line-height: 1.5;
  color: #374151;
}

.error-stack {
  margin-top: 10px;
}

.error-stack-details {
  cursor: pointer;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.error-stack-summary {
  font-weight: 500;
  color: #dc2626;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.05);
  margin: 0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.error-stack-summary:hover {
  background: rgba(239, 68, 68, 0.1);
}

.error-stack-content {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  background: rgba(0, 0, 0, 0.03);
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85em;
  border-top: 1px solid rgba(239, 68, 68, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.error-context {
  margin-top: 10px;
}

.context-details {
  margin-top: 6px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 8px;
}

.context-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 0.85em;
}

.context-item:last-child {
  margin-bottom: 0;
}

.context-key {
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
  margin-right: 8px;
}

.context-value {
  color: #374151;
  word-break: break-word;
}

.error-suggestions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(239, 68, 68, 0.1);
}

.suggestions-list {
  margin: 6px 0 0 0;
  padding-left: 0;
  list-style: none;
}

.suggestion-item {
  margin-bottom: 6px;
  padding: 6px 10px;
  background: rgba(16, 185, 129, 0.05);
  border-left: 3px solid #10b981;
  border-radius: 0 4px 4px 0;
  font-size: 0.9em;
  line-height: 1.4;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.suggestion-item::before {
  content: "💡";
  margin-right: 8px;
}

/* 展开内容 */
.toast-expanded-content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  animation: expandDown 0.3s ease-out;
}

[data-theme="dark"] .toast-expanded-content {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.deployment-details {
  font-size: 0.9em;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.detail-label {
  font-weight: 500;
  opacity: 0.8;
}

.detail-value {
  font-family: monospace;
  opacity: 0.9;
}

.services-progress {
  margin-top: 12px;
}

.services-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.85em;
}

.service-status {
  font-weight: 500;
}

.status-running {
  color: #10b981;
}

.status-pending {
  color: #f59e0b;
}

.status-error {
  color: #ef4444;
}

/* 展开按钮 */
.toast-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9em;
}

.toast-expand-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .toast-expand-btn {
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
}

[data-theme="dark"] .toast-expand-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.expand-icon {
  transition: transform 0.2s ease;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* 进度条 */
.toast-progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .toast-progress-container {
  background-color: rgba(255, 255, 255, 0.1);
}

.toast-progress-bar {
  height: 100%;
  transition: width 0.1s linear;
  border-radius: 0 0 8px 0;
}

/* 动画 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 200px;
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .enhanced-toast {
    min-width: 280px !important;
    max-width: calc(100vw - 40px) !important;
  }
  
  .toast-content {
    padding: 12px 32px 12px 12px;
  }
}
</style>

<template>
  <div class="section logs-display-section">
    <div class="section-header">
      <div class="section-title">安装日志</div>
      <div class="logs-actions">
        <button class="btn btn-sm btn-ghost" @click="clearLogs" title="清空日志">
          <i class="icon icon-trash-2"></i>
        </button>
        <button class="btn btn-sm btn-ghost" @click="scrollToBottom" title="滚动到底部">
          <i class="icon icon-chevrons-down"></i>
        </button>
        <button class="btn btn-sm btn-ghost" :class="{'text-primary': autoScroll}" @click="toggleAutoScroll" 
                :title="autoScroll ? '禁用自动滚动' : '启用自动滚动'">
          <i class="icon icon-scroll"></i>
        </button>
      </div>
    </div>

    <!-- 用于插入额外内容的插槽 -->
    <slot name="before-logs"></slot>

    <!-- 日志内容区域， -->
    <div class="logs-container mockup-code bg-base-200 text-base-content" ref="logsContainer">
      <div v-if="logs.length === 0" class="empty-logs">
        <p class="pl-4 opacity-50">等待日志输出...</p>
      </div>
      <div v-for="(log, index) in logs" :key="index" :class="['log-line', getLogLevelClass(log.level)]">
        <span class="log-time text-xs opacity-50">[{{ log.time || getCurrentTime() }}]</span>
        <span class="log-source" v-if="log.source">[{{ log.source }}]</span>
        <span class="log-message" v-html="formatLogMessage(log.message)"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated, watch } from 'vue';

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['clear-logs']);

const logsContainer = ref(null);
const autoScroll = ref(true);

// 获取当前时间
const getCurrentTime = () => {
  return new Date().toLocaleTimeString();
};

// 清空日志
const clearLogs = () => {
  emit('clear-logs');
};

// 滚动到底部
const scrollToBottom = () => {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
};

// 切换自动滚动
const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
  if (autoScroll.value) {
    scrollToBottom();
  }
};

// 获取日志级别对应的类名
const getLogLevelClass = (level) => {
  if (!level) return '';
  
  const lowerLevel = level.toLowerCase();
  switch (lowerLevel) {
    case 'error': return 'text-error';
    case 'warning': case 'warn': return 'text-warning';
    case 'success': return 'text-success';
    case 'command': return 'text-info font-bold';
    case 'info': return 'text-info';
    default: return '';
  }
};

// 格式化日志消息
const formatLogMessage = (message) => {
  if (!message) return '';
  
  // 转义HTML特殊字符防止XSS
  let safeMessage = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // 对命令行风格的消息进行高亮处理
  if (safeMessage.startsWith('$')) {
    safeMessage = `<span class="font-bold">${safeMessage}</span>`;
  }
  
  // 简单的关键字高亮
  safeMessage = safeMessage
    .replace(/(成功|完成)/g, '<span class="text-success">$1</span>')
    .replace(/(错误|失败)/g, '<span class="text-error">$1</span>')
    .replace(/(警告)/g, '<span class="text-warning">$1</span>');
  
  return safeMessage;
};

// 监听日志变化，自动滚动
watch(() => props.logs.length, () => {
  if (autoScroll.value) {
    // 使用nextTick确保DOM更新后滚动
    setTimeout(scrollToBottom, 0);
  }
});

// 组件挂载时初始化
onMounted(() => {
  scrollToBottom();
});

// 组件更新后，如果启用了自动滚动则滚动到底部
onUpdated(() => {
  if (autoScroll.value) {
    scrollToBottom();
  }
});
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.section-title {
  font-weight: bold;
  font-size: 1rem;
  color: var(--primary);
}

.logs-actions {
  display: flex;
  gap: 0.25rem;
}

.logs-container {
  height: 300px;
  overflow-y: auto;
  margin-top: 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0.5rem 0;
}

.log-line {
  padding: 0.1rem 1rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  margin-right: 0.5rem;
  user-select: none;
}

.log-source {
  margin-right: 0.5rem;
  font-weight: 500;
}

.empty-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-style: italic;
  color: var(--text-light);
}
</style>

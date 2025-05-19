<template>
  <dialog :open="visible" class="modal modal-bottom sm:modal-middle">
    <div class="modal-box w-11/12 max-w-5xl">
      <h3 class="font-bold text-lg">运行控制台 - {{ instanceName }}</h3>

      <div class="console-container">
        <div ref="consoleOutput" class="console-output">
          <div v-for="(log, index) in logs" :key="index" class="log-item">
            <div class="log-content" :class="getLogLevel(log)">{{ getLogMessage(log) }}</div>
          </div>
        </div>
      </div>

      <div class="console-input mt-4">
        <div class="join w-full">
          <input v-model="commandInput" type="text" placeholder="输入命令..." @keyup.enter="sendCommand"
            :disabled="!instanceId" class="input input-bordered join-item w-full" />
          <button @click="sendCommand" :disabled="!instanceId" class="btn join-item">发送</button>
        </div>
        <div class="commands-help mt-2">
          <span>常用命令: </span>
          <button class="btn btn-xs btn-link" @click="() => commandInput = 'exit'">退出</button>
          <button class="btn btn-xs btn-link" @click="() => commandInput = 'help'">帮助</button>
          <button class="btn btn-xs btn-link" @click="() => sendCommand('status')">状态</button>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="confirmClose">关闭</button>
        <button class="btn btn-error" @click="stopInstance">强制停止 (Ctrl+C)</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="confirmClose">关闭</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import axios from 'axios';

// ===================================
// 这些是Vue编译器宏，不需要导入
// 编辑器可能会报错，但Vue会正确超飞它们
// ===================================

/**
 * 组件属性
 */
const props = defineProps({
  visible: Boolean,
  instanceId: String,
  instanceName: String,
  logs: {
    type: Array,
    default: () => []
  },
  isRunning: Boolean
});

/**
 * 组件事件
 */
const emit = defineEmits(['update:visible', 'refresh', 'close', 'stop']);

const commandInput = ref('');
const consoleOutput = ref(null);

// 发送命令到实例
const sendCommand = async (cmd) => {
  if (!props.instanceId) return;

  const commandToSend = cmd || commandInput.value;
  if (!commandToSend.trim()) return;

  try {
    // 发送命令到后端
    await axios.post(`/api/instance/${props.instanceId}/command`, {
      command: commandToSend
    });

    // 清空输入框
    if (!cmd) {
      commandInput.value = '';
    }

    // 滚动到底部
    scrollToBottom();
  } catch (error) {
    console.error('发送命令失败:', error);
    showMessage('发送命令失败: ' + error.message, 'error');
  }
};

// 停止运行的实例
const stopInstance = async () => {
  if (!props.instanceId) return;

  try {
    // 发送Ctrl+C信号
    await sendCommand('\x03');  // Ctrl+C
    showMessage('已发送停止信号', 'info');

    // 通知父组件刷新实例状态
    emit('stop');
    emit('refresh');
  } catch (error) {
    console.error('停止实例失败:', error);
    showMessage('停止实例失败', 'error');
  }
};

// 确认关闭控制台
const confirmClose = () => {
  if (!props.isRunning) {
    emit('close');
    return;
  }

  showConfirmDialog('实例正在运行中，关闭控制台不会停止实例。是否继续？', '关闭控制台', (confirmed) => {
    if (confirmed) {
      emit('close');
    }
  });
};

// 获取日志级别
const getLogLevel = (log) => {
  if (!log) return '';
  if (typeof log === 'string') return '';

  if (!log.level) return '';

  const level = log.level.toLowerCase();
  if (level.includes('error')) return 'error';
  if (level.includes('warn')) return 'warning';
  if (level.includes('success')) return 'success';
  if (level === 'command') return 'command';
  return '';
};

// 获取日志消息内容
const getLogMessage = (log) => {
  if (!log) return '';
  return typeof log === 'string' ? log : (log.message || '');
};

// 将控制台滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (consoleOutput.value) {
      consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight;
    }
  });
};

// 观察visible属性，当打开对话框时滚动到底部
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      scrollToBottom();
    });
  }
});

// 观察日志变化，自动滚动到底部
watch(() => props.logs.length, () => {
  scrollToBottom();
});

// 替换 ElMessage 和 ElMessageBox 的函数
const showMessage = (message, type = 'info') => {
  // 创建一个用于显示消息的函数
  const toast = document.createElement('div');
  toast.className = `toast toast-end ${getToastClass(type)}`;

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${getAlertClass(type)}`;
  alertDiv.textContent = message;

  toast.appendChild(alertDiv);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
};

const showConfirmDialog = (message, title, callback) => {
  // 如果页面上没有确认对话框元素，创建一个
  let modalId = 'confirm-modal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-box">
        <h3 class="font-bold text-lg" id="modal-title"></h3>
        <p class="py-4" id="modal-message"></p>
        <div class="modal-action">
          <button id="modal-cancel" class="btn btn-outline">取消</button>
          <button id="modal-confirm" class="btn btn-primary">确认</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>关闭</button>
      </form>
    `;
    document.body.appendChild(modal);
  }

  const titleEl = document.getElementById('modal-title');
  const messageEl = document.getElementById('modal-message');
  const cancelBtn = document.getElementById('modal-cancel');
  const confirmBtn = document.getElementById('modal-confirm');

  titleEl.textContent = title || '确认';
  messageEl.textContent = message;

  // 移除旧的事件监听器
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);

  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  // 添加新的事件监听器
  newCancelBtn.addEventListener('click', () => {
    modal.classList.remove('modal-open');
    callback(false);
  });

  newConfirmBtn.addEventListener('click', () => {
    modal.classList.remove('modal-open');
    callback(true);
  });

  // 显示对话框
  modal.classList.add('modal-open');
};

// 辅助函数，根据消息类型返回相应的 DaisyUI 类
const getToastClass = (type) => {
  switch (type) {
    case 'success': return 'toast-success';
    case 'warning': return 'toast-warning';
    case 'error': return 'toast-error';
    default: return 'toast-info';
  }
};

const getAlertClass = (type) => {
  switch (type) {
    case 'success': return 'alert-success';
    case 'warning': return 'alert-warning';
    case 'error': return 'alert-error';
    default: return 'alert-info';
  }
};
</script>

<style>
@import '../../assets/css/downloads/consoleDialog.css';
</style>

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
import { ref, watch, nextTick, inject } from 'vue';
import axios from 'axios';
import toastService from '@/services/toastService';

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
    toastService.error('发送命令失败: ' + error.message);
  }
};

// 停止运行的实例
const stopInstance = async () => {
  if (!props.instanceId) return;

  try {
    // 发送Ctrl+C信号
    await sendCommand('\x03');  // Ctrl+C
    toastService.info('已发送停止信号');

    // 通知父组件刷新实例状态
    emit('stop');
    emit('refresh');
  } catch (error) {
    console.error('停止实例失败:', error);
    toastService.error('停止实例失败');
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

// 替换 showMessage 函数，使用 toastService
const showMessage = (message, type = 'info') => {
  toastService[type](message);
};

// 替换 showConfirmDialog 函数
const showConfirmDialog = (message, title, callback) => {
  if (confirm(message)) {
    callback(true);
  } else {
    callback(false);
  }
};
</script>

<style>
@import '../../assets/css/downloads/consoleDialog.css';
</style>

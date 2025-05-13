<template>
  <el-dialog :modelValue="visible" @update:modelValue="$emit('update:visible', $event)"
    :title="`运行控制台 - ${instanceName}`" width="80%" :before-close="confirmClose">
    <div class="console-container">
      <div ref="consoleOutput" class="console-output">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <div class="log-content" :class="getLogLevel(log)">{{ getLogMessage(log) }}</div>
        </div>
      </div>
    </div>
    <div class="console-input">
      <el-input v-model="commandInput" placeholder="输入命令..." @keyup.enter="sendCommand" :disabled="!instanceId">
        <template #append>
          <el-button @click="sendCommand" :disabled="!instanceId">发送</el-button>
        </template>
      </el-input>
      <div class="commands-help">
        <span>常用命令: </span>
        <el-button size="small" link @click="() => commandInput = 'exit'">退出</el-button>
        <el-button size="small" link @click="() => commandInput = 'help'">帮助</el-button>
        <el-button size="small" link @click="() => sendCommand('status')">状态</el-button>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="confirmClose">关闭</el-button>
        <el-button type="danger" @click="stopInstance">强制停止 (Ctrl+C)</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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
    ElMessage.error('发送命令失败: ' + error.message);
  }
};

// 停止运行的实例
const stopInstance = async () => {
  if (!props.instanceId) return;

  try {
    // 发送Ctrl+C信号
    await sendCommand('\x03');  // Ctrl+C
    ElMessage.info('已发送停止信号');

    // 通知父组件刷新实例状态
    emit('stop');
    emit('refresh');
  } catch (error) {
    console.error('停止实例失败:', error);
    ElMessage.error('停止实例失败');
  }
};

// 确认关闭控制台
const confirmClose = () => {
  if (!props.isRunning) {
    emit('close');
    return;
  }

  ElMessageBox.confirm(
    '实例正在运行中，关闭控制台不会停止实例。是否继续？',
    '关闭控制台',
    {
      confirmButtonText: '关闭控制台',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    emit('close');
  }).catch(() => { });
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
</script>

<style>
@import '../../assets/css/downloads/consoleDialog.css';
</style>

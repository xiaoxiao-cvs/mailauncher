<template>
  <div class="section">
    <div class="section-title">安装Bot实例</div>
    <div class="install-container">
      <select v-model="selectedVersion" class="select select-bordered select-lg w-full" :disabled="versionsLoading">
        <option disabled value="">选择版本</option>
        <option v-for="version in availableVersions" :key="version" :value="version">{{ version }}</option>
      </select> <button type="button" @click="installVersion"
        :disabled="!selectedVersion || !instanceName || installLoading" class="btn btn-primary btn-lg">
        <i class="icon icon-download mr-2"></i> 安装
      </button>
    </div>
    <p v-if="versionError" class="error-message">{{ versionError }}</p>
    <p v-if="availableVersions.length === 0 && !versionsLoading" class="repo-info">
      从 <a href="https://github.com/MaiM-with-u/MaiBot" target="_blank">MaiBot 仓库</a> 获取版本
    </p> <!-- 进度条 -->
    <div class="progress-container" v-if="installationProgress > 0 && installationProgress < 100">
      <progress class="progress progress-success w-full h-4" :value="installationProgress" max="100"></progress>
      <div class="text-center mt-3 text-base font-medium">{{ progressText }}</div>
    </div><!-- 添加日志输出区域 -->
    <div class="log-output" v-if="logs.length > 0">
      <div class="log-header">
        <div class="divider">安装日志</div>
        <div class="log-controls"> <button @click="toggleAutoScroll"
            :class="['btn', 'btn-md', 'btn-ghost', { 'text-primary': autoScroll }]"
            :title="autoScroll ? '禁用自动滚动' : '启用自动滚动'">
            <i class="icon icon-scroll"></i>
          </button>
          <button @click="scrollToBottom" class="btn btn-md btn-ghost" title="滚动到底部">
            <i class="icon icon-chevrons-down"></i>
          </button>
          <button @click="clearLogs" class="btn btn-md btn-ghost" title="清空日志">
            <i class="icon icon-trash-2"></i>
          </button>
        </div>
      </div>
      <div ref="logContainer" class="log-content">
        <div v-for="(log, index) in logs" :key="index" :class="['log-line', log.level.toLowerCase()]">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 实例配置选项 - 添加动画效果 -->
    <transition name="config-fade">
      <div class="bot-config" v-if="selectedVersion">
        <div class="divider">实例配置</div>

        <!-- 添加实例名称输入框 -->
        <div class="instance-name-input">
          <form class="form-control">
            <label class="label">
              <span class="label-text">实例名称</span>
              <span class="label-text-alt text-error">必填</span>
            </label> <input v-model="instanceName" type="text" placeholder="请输入实例名称"
              class="input input-bordered input-lg w-full" maxlength="50">
            <label class="label">
              <span class="label-text-alt input-tip">该名称将用于区分不同的Bot实例</span>
            </label>
          </form>
        </div>

        <!-- 调整复选框顺序: 先适配器，后NapCat -->
        <div class="config-options">
          <div class="option-item">
            <!-- 将 el-checkbox 替换为 DaisyUI checkbox -->
            <div class="form-control"> <label class="label cursor-pointer justify-start gap-3">
                <input type="checkbox" v-model="installAdapter" class="checkbox checkbox-primary checkbox-lg" checked
                  disabled />
                <div>
                  <div class="option-title">安装 Napcat-ada 适配器</div>
                  <div class="option-desc">安装 MaiBot 的 Napcat-ada 适配器</div>
                </div>
              </label>
            </div>
          </div>

          <div class="option-item">
            <!-- 将 el-checkbox 替换为 DaisyUI checkbox -->
            <div class="form-control"> <label class="label cursor-pointer justify-start gap-3">
                <input type="checkbox" v-model="installNapcat" class="checkbox checkbox-primary checkbox-lg" checked
                  disabled />
                <div>
                  <div class="option-title">安装 Napcat-ada</div>
                  <div class="option-desc">安装 Napcat-ada 服务</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- QQ号输入 -->
        <div class="qq-input" v-if="installNapcat || installAdapter">
          <div class="input-group">
            <span>QQ号</span>
            <input v-model="qqNumber" type="text" placeholder="请输入QQ号" class="input input-bordered input-lg w-full">
          </div>
          <p class="input-tip">用于配置机器人连接的QQ账号</p>
        </div>

        <!-- 端口配置：调整为MaiBot、适配器、NapCat的顺序 -->
        <div class="ports-config" v-if="installNapcat || installAdapter">
          <div class="divider">端口配置</div>
          <div class="ports-grid">
            <div class="port-item">
              <div class="input-group">
                <span>MaiBot端口</span>
                <input v-model="maibotPort" type="number" placeholder="MaiBot端口"
                  class="input input-bordered input-lg w-full">
              </div>
              <p class="port-desc">MaiBot主程序监听端口</p>
            </div>
            <div class="port-item">
              <div class="input-group">
                <span>适配器端口</span>
                <input v-model="adapterPort" type="number" placeholder="适配器端口"
                  class="input input-bordered input-lg w-full">
              </div>
              <p class="port-desc">Napcat-ada适配器监听端口</p>
            </div>

            <div class="port-item">
              <div class="input-group">
                <span>Napcat-ada端口</span> <input v-model="napcatPort" type="number" placeholder="Napcat-ada端口"
                  class="input input-bordered input-lg w-full">
              </div>
              <p class="port-desc">Napcat-ada的WebSocket服务器端口</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, nextTick, watch, onUnmounted } from 'vue';
import { deployApi } from '@/services/api';
import { useDeployStore } from '@/stores/deployStore';
import axios from 'axios';
import toastService from '@/services/toastService';

// 初始化 deployStore
const deployStore = useDeployStore();

/**
 * 组件属性
 */
const props = defineProps({
  logCallback: Function
});

/**
 * 组件事件
 */
const emit = defineEmits(['refresh-instances', 'add-log']);

// 实例安装状态变量
const selectedVersion = ref('');
const availableVersions = ref([]);
const versionsLoading = ref(false);
const installLoading = ref(false);
const versionError = ref('');
const installStatus = ref('idle');  // idle, installing, completed, failed

// 添加缺失的进度变量
const installationProgress = ref(0);
const progressText = ref('准备中...');
const logs = ref([]);

// 日志相关功能
const logContainer = ref(null);
const autoScroll = ref(true);

// 清空日志
const clearLogs = () => {
  logs.value = [];
};

// 滚动到底部
const scrollToBottom = () => {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
};

// 切换自动滚动
const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
  if (autoScroll.value) {
    scrollToBottom();
  }
};

// 添加表单对象用于输入验证
const form = ref({});

// 添加实例名称
const instanceName = ref('');

// Bot配置选项
const installNapcat = ref(true);
const installAdapter = ref(true);
const qqNumber = ref('');

// 端口配置 - 添加适配器端口
const napcatPort = ref('8095');     // NapCat默认端口
const adapterPort = ref('8095');    // Napcat-ada适配器默认端口
const maibotPort = ref('8000');     // MaiBot默认端口

// 是否可以安装Bot
const canConfigureBot = computed(() => {
  // 首先检查实例名称
  if (!instanceName.value || instanceName.value.trim() === '') {
    return false;
  }

  // 如果启用了适配器或NapCat，检查QQ号
  if (installNapcat.value || installAdapter.value) {
    return qqNumber.value.trim() !== '' && /^\d+$/.test(qqNumber.value);
  }

  // 检查端口有效性
  if (!isPortValid({ napcat: napcatPort.value, adapter: adapterPort.value, maibot: maibotPort.value })) {
    return false;
  }

  return true;
});

// 端口验证方法
const isPortValid = (ports = null) => {
  const portData = ports || {
    napcat: napcatPort.value,
    adapter: adapterPort.value,
    maibot: maibotPort.value
  };

  const checkPort = (port) => {
    if (!port) return false;
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum > 0 && portNum < 65536;
  };

  let valid = true;
  let errorMsg = '';

  if (installNapcat.value && !checkPort(portData.napcat)) {
    errorMsg = 'NapCat端口无效，请输入1-65535范围内的数字';
    valid = false;
  }

  if (installAdapter.value && !checkPort(portData.adapter)) {
    errorMsg = '适配器端口无效，请输入1-65535范围内的数字';
    valid = false;
  }

  if (!checkPort(portData.maibot)) {
    errorMsg = 'MaiBot端口无效，请输入1-65535范围内的数字';
    valid = false;
  }

  if (!valid) {
    toastService.error(errorMsg);
  }

  return valid;
};

// 获取可用版本列表 - 已弃用，现在使用 deployStore
// const fetchVersions = async () => {
//   // 此函数已被替换为使用 deployStore.fetchVersions()
//   // 以避免重复的 API 请求
// };

// 安装版本
const installVersion = async () => {
  if (!selectedVersion.value) {
    toastService.warning('请先选择版本');
    return;
  }

  // 检查实例名称
  if (!instanceName.value || instanceName.value.trim() === '') {
    toastService.error('请输入实例名称');
    return;
  }

  // 检查Bot配置 (QQ号)
  if ((installNapcat.value || installAdapter.value) && (!qqNumber.value || !/^\d+$/.test(qqNumber.value))) {
    toastService.warning('请输入有效的QQ号');
    return;
  }

  // 检查端口有效性
  if (!isPortValid()) {
    return;
  }

  installLoading.value = true;
  installStatus.value = 'installing';
  logs.value = []; // 清空之前的日志
  try {
    // 第一步：部署基础版本
    addLog({
      time: formatTime(new Date()),
      source: 'command',
      level: 'INFO',
      message: `开始部署基础版本 ${selectedVersion.value}，实例名称：${instanceName.value}...`
    });

    const version = selectedVersion.value;
    const instanceNameValue = instanceName.value;

    console.log('调用API部署基础版本:', version, instanceNameValue);

    // 使用 deployApi 发送基础部署请求
    const deployResult = await deployApi.deployVersion(version, instanceNameValue);

    if (!deployResult || !deployResult.success) {
      const errorMsg = deployResult?.message || '基础版本部署请求失败';
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'ERROR',
        message: `基础版本部署失败: ${errorMsg}`
      });
      toastService.error(`基础版本部署失败: ${errorMsg}`);
      installLoading.value = false;
      installStatus.value = 'failed';
      return;
    }

    addLog({
      time: formatTime(new Date()),
      source: 'command',
      level: 'SUCCESS',
      message: `${instanceName.value} (${selectedVersion.value}) 基础版本部署任务已提交。`
    });

    // 第二步：配置实例 (NapCat, 适配器, 端口等)
    if (installNapcat.value || installAdapter.value) {
      addLog({
        time: formatTime(new Date()),
        source: 'command',
        level: 'INFO',
        message: `开始配置实例 ${instanceName.value}...`
      });

      const configParams = {
        instance_name: instanceName.value,
        qq_number: qqNumber.value,
        install_napcat: installNapcat.value,
        install_adapter: installAdapter.value,
        ports: {
          napcat: parseInt(napcatPort.value),
          adapter: parseInt(adapterPort.value),
          maibot: parseInt(maibotPort.value)
        }
      };

      console.log('调用API配置实例:', configParams);
      const configResponse = await deployApi.configureBotSettings(configParams);

      if (configResponse && configResponse.success) {
        addLog({
          time: formatTime(new Date()),
          source: 'command',
          level: 'SUCCESS',
          message: `实例 ${instanceName.value} 配置任务已提交。请查看后续日志了解安装进度。`
        });
        toastService.success('实例配置任务已提交，后台将继续处理。');
      } else {
        const errorMsg = configResponse?.message || '实例配置请求失败';
        addLog({
          time: formatTime(new Date()),
          source: 'system',
          level: 'WARNING',
          message: `实例配置失败: ${errorMsg}`
        });
        toastService.warning(`实例配置提交失败: ${errorMsg} (基础部署可能已开始)`);
      }

      // 启动 GET 轮询检查安装状态
      startInstallStatusPolling();
    } else {
      // 如果没有额外配置，基础部署完成后即结束
      addLog({
        time: formatTime(new Date()),
        source: 'command',
        level: 'SUCCESS',
        message: `${instanceName.value} (${selectedVersion.value}) 基础安装完成，无额外配置。`
      });
      toastService.success('基础实例安装已提交。');
      installLoading.value = false;
      refreshInstances();
    }

    // 通知更新实例列表
    emit('refresh-instances');
    installStatus.value = 'completed';

  } catch (error) {
    console.error('安装过程中发生错误:', error);
    installStatus.value = 'failed';
    let errorMessage = error.message || '未知错误';
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    addLog({
      time: formatTime(new Date()),
      source: 'system',
      level: 'ERROR',
      message: `安装操作失败: ${errorMessage}`
    });
    toastService.error('安装操作失败: ' + errorMessage, 8000);
    installLoading.value = false;
  }
};

// 添加statusPollingInterval变量
let statusPollingInterval = null;

// 添加安装状态轮询 - 使用 GET 请求
const startInstallStatusPolling = () => {
  // 清除已有的轮询
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  // 检查是否在模拟数据模式
  const useMockData = window._useMockData || localStorage.getItem("useMockData") === "true";

  // 轮询间隔：模拟模式3秒，正常模式10秒
  const pollingInterval = useMockData ? 3000 : 10000;

  // 开始新的轮询
  let checkCount = 0;
  statusPollingInterval = setInterval(async () => {
    try {
      // 如果是模拟数据模式，模拟进度
      if (useMockData) {
        checkCount++;

        // 模拟安装进度
        if (checkCount < 3) {
          addLog({
            time: formatTime(new Date()),
            source: 'system',
            level: 'INFO',
            message: `正在安装依赖... (${checkCount}/3)`
          });
          installationProgress.value = checkCount * 25;
          progressText.value = `正在安装依赖... ${checkCount}/3`;
        } else if (checkCount === 3) {
          addLog({
            time: formatTime(new Date()),
            source: 'system',
            level: 'SUCCESS',
            message: `依赖安装成功！`
          });
          installationProgress.value = 75;
          progressText.value = '依赖安装完成';
        } else if (checkCount === 4) {
          addLog({
            time: formatTime(new Date()),
            source: 'system',
            level: 'INFO',
            message: `正在配置 Bot...`
          });
          installationProgress.value = 90;
          progressText.value = '正在配置 Bot...';
        } else {
          // 完成安装
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;

          // 恢复按钮状态
          installLoading.value = false;
          installationProgress.value = 100;
          progressText.value = '安装完成';

          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '模拟安装完成！'
          });

          // 刷新实例列表
          refreshInstances();

          toastService.success('模拟安装完成！');
          return;
        }
        return;
      }

      // 正常API检查代码 - 使用 GET 请求轮询
      const response = await deployApi.checkInstallStatus();
      const isStillInstalling = response.napcat_installing || response.nonebot_installing;

      checkCount++;

      // 更新进度信息
      if (response.progress !== undefined) {
        installationProgress.value = response.progress;
        progressText.value = response.status_message || `安装进度: ${response.progress}%`;
      }

      // 如果不再安装中或者检查次数超过120次(20分钟)，停止轮询
      if (!isStillInstalling || checkCount > 120) {
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;

        // 恢复按钮状态
        installLoading.value = false;

        // 刷新实例列表
        refreshInstances();

        // 添加日志提示安装结束
        if (checkCount > 120) {
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'WARNING',
            message: '安装状态检测超时，请手动确认安装是否完成。'
          });
          toastService.warning('安装状态检测超时，请检查实例列表和日志。');
        } else {
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '后台安装和配置过程已完成。'
          });
          toastService.success('后台安装和配置已完成！');
          installationProgress.value = 100;
          progressText.value = '安装完成';
        }
      } else {
        addLog({
          time: formatTime(new Date()),
          source: 'system',
          level: 'INFO',
          message: `等待后台安装中... (检查 ${checkCount}/120)`
        });
      }
    } catch (error) {
      console.error('检查安装状态失败:', error);

      // 如果是模拟数据模式，不停止轮询，继续模拟进度
      if (useMockData) return;

      // 真实模式下出错时停止轮询
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
      installLoading.value = false;
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'ERROR',
        message: `检查安装状态时出错: ${error.message}`
      });
    }
  }, pollingInterval);
};

// 刷新实例列表辅助方法
const refreshInstances = () => {
  emit('refresh-instances');
  if (emitter) {
    emitter.emit('refresh-instances');
  }
};

// 添加emitter依赖注入
const emitter = inject('emitter', null);

// 生命周期管理
onMounted(() => {
  // 使用 deployStore 获取版本，避免重复请求
  if (deployStore.availableVersions.length === 0) {
    deployStore.fetchVersions().then((versions) => {
      availableVersions.value = versions;
    }).catch((error) => {
      console.error('从 deployStore 获取版本失败:', error);
      // 在获取版本失败时提供静态版本选择
      availableVersions.value = ['latest', 'beta', 'stable', 'v0.6.3', 'v0.6.2'];
      versionError.value = '获取版本列表失败，已提供备选版本选择。';
    });
  } else {
    // 直接使用 deployStore 中已有的版本
    availableVersions.value = deployStore.availableVersions;
  }
});

onUnmounted(() => {
  // 清理 deployStore 连接
  if (deployStore.cleanup) {
    deployStore.cleanup();
  }
});

// 监听日志变化，自动滚动
watch(() => logs.value.length, () => {
  if (autoScroll.value) {
    // 使用nextTick确保DOM更新后滚动
    nextTick(() => {
      scrollToBottom();
    });
  }
});

// 添加日志的方法
const addLog = (log) => {
  logs.value.push(log);
  emit('add-log', log);
};

// 格式化时间展示
function formatTime(date) {
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 暴露方法，供父组件调用
defineExpose({
  fetchVersions,
  installVersion,
  addLog
});
</script>

<style>
@import '../../assets/css/downloads/installConfig.css';

/* 添加动画效果 */
.config-fade-enter-active,
.config-fade-leave-active {
  transition: all 0.5s ease;
  max-height: 2000px;
  opacity: 1;
  overflow: hidden;
}

.config-fade-enter-from,
.config-fade-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* 实例名称输入样式 */
.instance-name-input {
  margin-bottom: 20px;
}

/* 修复边距问题 */
.el-form-item {
  margin-bottom: 15px;
}

.el-form-item__label {
  padding-bottom: 6px;
  font-weight: 500;
}

/* 确保表单布局正确 */
.el-form {
  width: 100%;
}

/* 修复端口配置布局 */
.ports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .ports-grid {
    grid-template-columns: 1fr;
  }
}
</style>

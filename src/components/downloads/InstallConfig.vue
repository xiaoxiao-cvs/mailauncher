<template>
  <div class="section">
    <div class="section-title">安装Bot实例</div>
    <div class="install-container">
      <el-select v-model="selectedVersion" placeholder="选择版本" size="default" :loading="versionsLoading">
        <el-option v-for="version in availableVersions" :key="version" :label="version" :value="version" />
      </el-select>
      <el-button type="primary" @click="installVersion" :loading="installLoading"
        :disabled="!selectedVersion || !instanceName" size="default">
        <el-icon>
          <Download />
        </el-icon> 安装
      </el-button>
    </div>
    <p v-if="versionError" class="error-message">{{ versionError }}</p>
    <p v-if="availableVersions.length === 0 && !versionsLoading" class="repo-info">
      从 <a href="https://github.com/MaiM-with-u/MaiBot" target="_blank">MaiBot 仓库</a> 获取版本
    </p>

    <!-- 进度条 -->
    <div class="progress-container" v-if="installationProgress > 0 && installationProgress < 100">
      <el-progress :percentage="installationProgress" :status="installationProgress === 100 ? 'success' : ''"
        :show-text="true" text-inside stroke-width="24" color="linear-gradient(90deg, #4caf50, #81c784)">
        <span>{{ progressText }}</span>
      </el-progress>
    </div>

    <!-- 添加日志输出区域 -->
    <div class="log-output" v-if="logs.length > 0">
      <el-divider content-position="left">安装日志</el-divider>
      <div class="log-content">
        <div v-for="(log, index) in logs" :key="index" :class="['log-line', log.level.toLowerCase()]">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 实例配置选项 - 添加动画效果 -->
    <transition name="config-fade">
      <div class="bot-config" v-if="selectedVersion">
        <el-divider content-position="left">实例配置</el-divider>

        <!-- 添加实例名称输入框 -->
        <div class="instance-name-input">
          <el-form :model="form" label-position="top">
            <el-form-item label="实例名称" required>
              <el-input v-model="instanceName" placeholder="请输入实例名称" :maxlength="50" show-word-limit>
              </el-input>
              <p class="input-tip">该名称将用于区分不同的Bot实例</p>
            </el-form-item>
          </el-form>
        </div>

        <!-- 调整复选框顺序: 先适配器，后NapCat -->
        <div class="config-options">
          <div class="option-item">
            <el-checkbox v-model="installAdapter">
              <div class="option-title">安装 NapCat 适配器</div>
              <div class="option-desc">安装 MaiBot 的 NapCat 适配器</div>
            </el-checkbox>
          </div>

          <div class="option-item">
            <el-checkbox v-model="installNapcat">
              <div class="option-title">安装 NapCat</div>
              <div class="option-desc">安装 NapCat 作为机器人连接器</div>
            </el-checkbox>
          </div>
        </div>

        <!-- QQ号输入 -->
        <div class="qq-input" v-if="installNapcat || installAdapter">
          <el-input v-model="qqNumber" placeholder="请输入QQ号" :prefix-icon="User" clearable>
            <template #prepend>QQ号</template>
          </el-input>
          <p class="input-tip">用于配置机器人连接的QQ账号</p>
        </div>

        <!-- 端口配置：调整为MaiBot、适配器、NapCat的顺序 -->
        <div class="ports-config" v-if="installNapcat || installAdapter">
          <el-divider content-position="left">端口配置</el-divider>
          <div class="ports-grid">
            <div class="port-item">
              <el-input v-model="maibotPort" type="number" placeholder="MaiBot端口">
                <template #prepend>MaiBot端口</template>
              </el-input>
              <p class="port-desc">MaiBot主程序监听端口</p>
            </div>

            <div class="port-item">
              <el-input v-model="adapterPort" type="number" placeholder="适配器端口">
                <template #prepend>适配器端口</template>
              </el-input>
              <p class="port-desc">NapCat适配器监听端口</p>
            </div>

            <div class="port-item">
              <el-input v-model="napcatPort" type="number" placeholder="NapCat端口">
                <template #prepend>NapCat端口</template>
              </el-input>
              <p class="port-desc">NapCat的WebSocket服务器端口</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, nextTick, watch, onUnmounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { User, Download } from '@element-plus/icons-vue';
// 导入统一的API服务
import { deployApi } from '@/services/api';
import axios from 'axios'; // 添加axios导入，因为代码中使用了axios

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
const adapterPort = ref('18002');   // 适配器默认端口
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

// 添加缺失的端口验证方法
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
    ElMessage.error(errorMsg);
  }

  return valid;
};

// 版本安装方法
const fetchVersions = async () => {
  versionsLoading.value = true;
  versionError.value = '';
  try {
    // 添加重试和错误恢复机制
    let retryCount = 0;
    const maxRetries = 2;
    let success = false;

    while (!success && retryCount <= maxRetries) {
      try {
        // 使用统一的API服务获取版本
        const response = await deployApi.getVersions();

        if (response && response.versions &&
          response.versions.length > 0 &&
          !(response.versions.length === 1 && response.versions[0] === 'NaN')) {
          availableVersions.value = response.versions;
          success = true;
        } else {
          throw new Error('无效的版本数据');
        }
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }
        // 重试前等待
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('获取版本列表失败:', error);

    // 在获取版本失败时提供静态版本选择
    availableVersions.value = ['latest', 'beta', 'stable', 'v0.6.3', 'v0.6.2'];
    versionError.value = '获取版本列表失败，已提供备选版本选择。';

    addLog({
      time: formatTime(new Date()),
      source: 'system',
      level: 'ERROR',
      message: `版本获取失败: ${error.message || '未知错误'}`
    });
  } finally {
    versionsLoading.value = false;
  }
};

const installVersion = async () => {
  if (!selectedVersion.value) {
    ElMessage.warning('请先选择版本');
    return;
  }

  // 检查实例名称
  if (!instanceName.value || instanceName.value.trim() === '') {
    ElMessage.error('请输入实例名称');
    return;
  }

  // 检查Bot配置 (QQ号)
  if ((installNapcat.value || installAdapter.value) && (!qqNumber.value || !/^\d+$/.test(qqNumber.value))) {
    ElMessage.warning('请输入有效的QQ号');
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
      message: `$ 开始部署基础版本 ${selectedVersion.value}，实例名称：${instanceName.value}...`
    });

    const version = selectedVersion.value;
    const instanceNameValue = instanceName.value;

    console.log('调用API部署基础版本:', version, instanceNameValue);

    // 修复：确保deployApi.deployVersion方法存在并且使用正确参数
    // 从API导入的deployVersion函数
    const deployResult = await deployApi.fetchVersions()
      .then(() => {
        // 直接使用axios发送部署请求，避免可能的API方法兼容性问题
        return axios.post(`/api/deploy/${version}`, {
          instance_name: instanceNameValue
        });
      })
      .then(response => response.data)
      .catch(error => {
        // 如果失败，尝试备用路径
        if (error.response && error.response.status === 404) {
          console.log(`尝试备用路径: /deploy/${version}`);
          return axios.post(`/deploy/${version}`, {
            instance_name: instanceNameValue
          }).then(response => response.data);
        }
        throw error;
      });

    if (!deployResult || !deployResult.success) {
      const errorMsg = deployResult?.message || '基础版本部署请求失败';
      addLog({
        time: formatTime(new Date()),
        source: 'system',
        level: 'ERROR',
        message: `$ 基础版本部署失败: ${errorMsg}`
      });
      ElMessage.error(`基础版本部署失败: ${errorMsg}`);
      installLoading.value = false;
      installStatus.value = 'failed';
      return;
    }

    addLog({
      time: formatTime(new Date()),
      source: 'command',
      level: 'SUCCESS',
      message: `$ ${instanceName.value} (${selectedVersion.value}) 基础版本部署任务已提交。`
    });

    // 第二步：配置实例 (NapCat, 适配器, 端口等)
    if (installNapcat.value || installAdapter.value) {
      addLog({
        time: formatTime(new Date()),
        source: 'command',
        level: 'INFO',
        message: `$ 开始配置实例 ${instanceName.value}...`
      });

      const configParams = {
        instance_name: instanceName.value,
        qq_number: qqNumber.value,
        install_napcat: installNapcat.value,
        install_adapter: installAdapter.value, // 使用 installAdapter
        ports: {
          napcat: parseInt(napcatPort.value),
          adapter: parseInt(adapterPort.value),
          maibot: parseInt(maibotPort.value)
        },
        // model_type: "chatglm" // 如果需要，可以添加模型类型等其他配置
      };

      console.log('调用API配置实例:', configParams);
      const configResponse = await deployApi.configureBotSettings(configParams);

      if (configResponse && configResponse.success) {
        addLog({
          time: formatTime(new Date()),
          source: 'command',
          level: 'SUCCESS',
          message: `$ 实例 ${instanceName.value} 配置任务已提交。请查看后续日志了解安装进度。`
        });
        ElMessage.success('实例配置任务已提交，后台将继续处理。');
      } else {
        const errorMsg = configResponse?.message || '实例配置请求失败';
        addLog({
          time: formatTime(new Date()),
          source: 'system',
          level: 'WARNING', // 使用 WARNING 因为基础部署可能已开始
          message: `$ 实例配置失败: ${errorMsg}`
        });
        ElMessage.warning(`实例配置提交失败: ${errorMsg} (基础部署可能已开始)`);
      }
      // 启动轮询检查总体安装状态
      startInstallStatusPolling();
    } else {
      // 如果没有额外配置，基础部署完成后即结束
      addLog({
        time: formatTime(new Date()),
        source: 'command',
        level: 'SUCCESS',
        message: `$ ${instanceName.value} (${selectedVersion.value}) 基础安装完成，无额外配置。`
      });
      ElMessage.success('基础实例安装已提交。');
      installLoading.value = false; // 因为没有后续配置，直接结束loading
      refreshInstances();
    }

    // 通知更新实例列表
    emit('refresh-instances');
    installStatus.value = 'completed'; // 表示请求已成功发出

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
      message: `$ 安装操作失败: ${errorMessage}`
    });
    ElNotification({
      title: '安装操作失败',
      message: errorMessage,
      type: 'error',
      duration: 8000
    });
    installLoading.value = false;
  }
};

// 添加statusPollingInterval变量
let statusPollingInterval = null;

// 添加安装状态轮询 - 添加模拟数据支持
const startInstallStatusPolling = () => {
  // 清除已有的轮询
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  // 检查是否在模拟数据模式
  const useMockData = window._useMockData || localStorage.getItem("useMockData") === "true";

  // 如果是模拟数据模式，使用更短的轮询时间
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
            message: `$ 正在安装依赖... (${checkCount}/3)`
          });
        } else if (checkCount === 3) {
          addLog({
            time: formatTime(new Date()),
            source: 'system',
            level: 'SUCCESS',
            message: `$ 依赖安装成功！`
          });
        } else if (checkCount === 4) {
          addLog({
            time: formatTime(new Date()),
            source: 'system',
            level: 'INFO',
            message: `$ 正在配置 Bot...`
          });
        } else {
          // 完成安装
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;

          // 恢复按钮状态
          installLoading.value = false;

          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '$ 模拟安装完成！'
          });

          // 刷新实例列表
          refreshInstances();

          ElMessage.success('模拟安装完成！');
          return;
        }
        return;
      }

      // 正常API检查代码
      const response = await deployApi.checkInstallStatus();
      const isStillInstalling = response.napcat_installing || response.nonebot_installing;

      checkCount++;

      // 如果不再安装中或者检查次数超过60次(10分钟)，停止轮询
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
            message: '$ 安装状态检测超时，请手动确认安装是否完成。'
          });
          ElMessage.warning('安装状态检测超时，请检查实例列表和日志。');
        } else {
          addLog({
            time: formatTime(new Date()),
            source: 'command',
            level: 'SUCCESS',
            message: '$ 后台安装和配置过程已完成。'
          });
          ElMessage.success('后台安装和配置已完成！');
        }
      } else {
        addLog({
          time: formatTime(new Date()),
          source: 'system',
          level: 'INFO',
          message: `$ 等待后台安装中... (检查 ${checkCount}/120)`
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
        message: `$ 检查安装状态时出错: ${error.message}`
      });
    }
  }, pollingInterval); // 使用动态时间间隔
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

// 检查安装状态API查询接口
const checkInstallStatus = async () => {
  try {
    // 使用新API检查安装状态
    return await deployApi.checkInstallStatus();
  } catch (error) {
    console.error('获取安装状态失败:', error);
    return { napcat_installing: false, nonebot_installing: false };
  }
};

// 生命周期清理
onUnmounted(() => {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }
});

// 添加日志的方法
const addLog = (log) => {
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

// 初始加载版本
fetchVersions();

// 暴露方法，供父组件调用
defineExpose({
  fetchVersions
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

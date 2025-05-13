<template>
  <div class="instances-tab">
    <div class="header-section">
      <h3>Bot 实例管理</h3>
      <el-button type="primary" @click="fetchInstalledVersions" size="small">刷新</el-button>
    </div>

    <!-- 已安装实例管理 -->
    <div class="section">
      <div class="section-title">已安装实例</div>
      <el-empty v-if="installedVersions.length === 0" description="暂无已安装实例" />
      <div v-else class="instance-grid">
        <el-card v-for="instance in installedVersions" :key="instance.name" class="instance-card"
          :class="{ 'running': instance.status === 'running' }">
          <template #header>
            <div class="instance-header">
              <span class="instance-name">{{ instance.name }}</span>
              <el-tag :type="getStatusType(instance.status)" size="small">{{ getStatusText(instance.status) }}</el-tag>
            </div>
          </template>

          <div class="instance-info">
            <p><strong>路径:</strong> {{ instance.path }}</p>
            <p><strong>安装时间:</strong> {{ instance.installedAt }}</p>
          </div>

          <div class="instance-actions">
            <el-button v-if="instance.status !== 'running'" type="success" size="small"
              @click="startBot(instance.name)">
              启动MaiBot
            </el-button>
            <el-button v-else type="danger" size="small" @click="stopBot(instance.name)">
              停止
            </el-button>
            <el-dropdown trigger="click">
              <el-button type="info" size="small">
                更多 <el-icon>
                  <ArrowDown />
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="startNapcat(instance.name)">
                    <span style="color: #67c23a">启动NapCat</span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="startNonebot(instance.name)">
                    <span style="color: #409eff">启动NoneBot</span>
                  </el-dropdown-item>
                  <el-dropdown-item divider></el-dropdown-item>
                  <el-dropdown-item @click="showLogs(instance.name)">查看日志</el-dropdown-item>
                  <el-dropdown-item @click="updateInstance(instance.name)">更新</el-dropdown-item>
                  <el-dropdown-item @click="openFolder(instance.path)">打开文件夹</el-dropdown-item>
                  <el-dropdown-item divided @click="confirmDelete(instance.name)">
                    <span style="color: #f56c6c">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 启动状态指示器 -->
          <div class="service-status">
            <div class="service-item">
              <span class="service-name">NapCat:</span>
              <el-tag size="small" :type="getServiceType(instance.services?.napcat)">
                {{ getServiceText(instance.services?.napcat) }}
              </el-tag>
            </div>
            <div class="service-item">
              <span class="service-name">NoneBot:</span>
              <el-tag size="small" :type="getServiceType(instance.services?.nonebot)">
                {{ getServiceText(instance.services?.nonebot) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <div class="tip-section">
      <el-alert type="info" show-icon :closable="false">
        <template #title>
          <span>需要添加新的Bot实例？请前往<el-link @click="goToDownloads" type="primary">下载管理</el-link>页面</span>
        </template>
      </el-alert>
    </div>

    <!-- 启动顺序提示 -->
    <div class="starting-guide">
      <el-alert type="warning" show-icon :closable="false">
        <template #title>
          <span>正确的启动顺序</span>
        </template>
        <template #default>
          <p>请按以下顺序启动各组件：</p>
          <ol>
            <li>1. 启动 NapCat（WebSocket服务器）</li>
            <li>2. 启动 NoneBot 适配器</li>
            <li>3. 启动 MaiBot 主程序</li>
          </ol>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
// 导入统一的API服务
import { instancesApi } from '@/services/api';

// 事件总线，用于给log通信
const emitter = inject('emitter');

// 状态变量
const installedVersions = ref([]);

// 事件处理
const fetchInstalledVersions = async () => {
  try {
    const response = await instancesApi.getInstances();
    installedVersions.value = response.data.instances || [];
  } catch (error) {
    handleApiError(error, "获取已安装实例失败");
  }
};

// 添加通用错误处理函数
const handleApiError = (error, defaultMessage = "操作失败") => {
  console.error(defaultMessage + ":", error);

  if (error.isMock) {
    console.log("使用模拟数据，无需显示错误");
    return; // 如果是模拟数据模式，不显示错误提示
  }

  // 显示友好的错误提示
  ElMessage.error(defaultMessage);
};

const startBot = async (instanceName) => {
  try {
    const response = await instancesApi.startInstance(instanceName);
    if (response.data && response.data.success) {
      ElMessage.success('MaiBot已启动');
      fetchInstalledVersions();
    } else {
      ElMessage.error('启动失败');
    }
  } catch (error) {
    handleApiError(error, '启动失败');
  }
};

// 启动Napcat功能
const startNapcat = async (instanceName) => {
  try {
    const response = await instancesApi.startNapcat(instanceName);
    if (response.data && response.data.success) {
      ElMessage.success('NapCat已启动');
      fetchInstalledVersions();
    } else {
      ElMessage.error('NapCat启动失败: ' + (response.data.message || ''));
    }
  } catch (error) {
    handleApiError(error, 'NapCat启动失败');
  }
};

// 添加启动NoneBot功能（新版已抛弃nb，需要重构。已遗弃）
const startNonebot = async (instanceName) => {
  try {
    const response = await axios.post(`/api/start/${instanceName}/nonebot`);
    if (response.data.success) {
      ElMessage.success('NoneBot适配器已启动');
      fetchInstalledVersions();
    } else {
      ElMessage.error('NoneBot启动失败: ' + (response.data.message || ''));
    }
  } catch (error) {
    console.error('NoneBot启动失败:', error);
    ElMessage.error('NoneBot启动失败: ' + (error.response?.data?.detail || error.message));
  }
};

const stopBot = async (instanceName) => {
  try {
    const response = await instancesApi.stopInstance();
    if (response.data && response.data.success) {
      ElMessage.success('所有服务已停止');
      fetchInstalledVersions();
    } else {
      ElMessage.error('停止失败');
    }
  } catch (error) {
    handleApiError(error, '停止失败');
  }
};

const updateInstance = async (instanceName) => {
  try {
    const response = await axios.post(`/api/update/${instanceName}`);
    if (response.data.success) {
      ElMessage.success('更新成功');
      fetchInstalledVersions();
    } else {
      ElMessage.error('更新失败');
    }
  } catch (error) {
    console.error('更新失败:', error);
    ElMessage.error('更新失败');
  }
};

const showLogs = (instanceName) => {
  // 通过事件总线切换到日志面板并选择对应实例的日志
  if (emitter) {
    emitter.emit('show-instance-logs', instanceName);
  }
};

const openFolder = (path) => {
  // 通过后端API打开文件夹
  instancesApi.openFolder(path)
    .catch(error => {
      console.error('无法打开文件夹:', error);
      ElMessage.error('无法打开文件夹');
    });
};

const confirmDelete = (instanceName) => {
  ElMessageBox.confirm(
    `确定要删除实例 ${instanceName} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    deleteInstance(instanceName);
  }).catch(() => { });
};

const deleteInstance = async (instanceName) => {
  try {
    const response = await instancesApi.deleteInstance(instanceName);
    if (response.data.success) {
      ElMessage.success('删除成功');
      fetchInstalledVersions();
    } else {
      ElMessage.error('删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
};

// 辅助函数
const getStatusType = (status) => {
  switch (status) {
    case 'running': return 'success';
    case 'stopped': return 'info';
    default: return 'info';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'running': return '运行中';
    case 'stopped': return '已停止';
    default: return '未知';
  }
};

// 添加服务状态显示辅助函数
const getServiceType = (status) => {
  switch (status) {
    case 'running': return 'success';
    case 'stopped': return 'info';
    case 'error': return 'danger';
    default: return 'warning'; // unknown状态
  }
};

const getServiceText = (status) => {
  switch (status) {
    case 'running': return '运行中';
    case 'stopped': return '已停止';
    case 'error': return '错误';
    default: return '未启动';
  }
};

// 导航到下载页面
const goToDownloads = () => {
  if (emitter) {
    emitter.emit('navigate-to-tab', 'downloads');
  }
};

// 初始化
onMounted(() => {
  fetchInstalledVersions();

  // 监听刷新实例列表事件
  if (emitter) {
    emitter.on('refresh-instances', fetchInstalledVersions);
  }
});

// 移除事件监听器
onUnmounted(() => {
  if (emitter) {
    emitter.off('refresh-instances', fetchInstalledVersions);
  }
});
</script>

<style>
@import '../assets/css/instancesPanel.css';
</style>

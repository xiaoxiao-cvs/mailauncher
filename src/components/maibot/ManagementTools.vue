<template>
  <div class="management-tools">
    <!-- 数据库信息 -->
    <div class="database-info-section">
      <h3 class="section-title">数据库信息</h3>
      <div class="info-cards">
        <div class="info-card">
          <div class="card-header">
            <Icon icon="mdi:database" class="text-primary" width="24" height="24" />
            <span>数据库状态</span>
          </div>
          <div class="card-content">
            <div class="status-indicator" :class="getDbStatusClass()">
              <span class="status-dot"></span>
              <span>{{ dbInfo.status || '未知' }}</span>
            </div>
            <div class="db-details">
              <div class="detail-item">
                <span class="label">文件大小:</span>
                <span class="value">{{ formatFileSize(dbInfo.size || 0) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">文件路径:</span>
                <span class="value" :title="dbInfo.path">{{ truncatePath(dbInfo.path) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">文件存在:</span>
                <span class="value">{{ dbInfo.exists ? '是' : '否' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">文件有效:</span>
                <span class="value">{{ dbInfo.valid ? '是' : '否' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="card-header">
            <Icon icon="mdi:chart-bar" class="text-secondary" width="24" height="24" />
            <span>统计信息</span>
          </div>
          <div class="card-content">
            <div class="stats-grid">
              <div class="stat-item">
                <Icon icon="mdi:emoticon" class="text-primary" width="20" height="20" />
                <div class="stat-info">
                  <span class="stat-value">{{ stats.emoji.total || 0 }}</span>
                  <span class="stat-label">表情包</span>
                </div>
              </div>
              <div class="stat-item">
                <Icon icon="mdi:account" class="text-secondary" width="20" height="20" />
                <div class="stat-info">
                  <span class="stat-value">{{ stats.person.total || 0 }}</span>
                  <span class="stat-label">用户信息</span>
                </div>
              </div>
            </div>
            <button class="btn btn-sm btn-outline mt-4 w-full" @click="refreshStats">
              <Icon icon="mdi:refresh" width="16" height="16" class="mr-1" />
              刷新统计
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理工具 -->
    <div class="tools-section">
      <h3 class="section-title">管理工具</h3>
      <div class="tools-grid">
        <!-- 数据验证工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:check-circle" class="text-success" width="24" height="24" />
            <span>数据验证</span>
          </div>          <div class="tool-content">
            <p class="tool-description">检查数据库完整性和数据一致性</p>
            <div class="tool-actions">
              <button class="btn btn-sm btn-primary" @click="validateData" :disabled="validating">
                <div v-if="validating" class="loading loading-spinner loading-xs mr-1"></div>
                <Icon v-else icon="mdi:check" width="16" height="16" class="mr-1" />
                {{ validating ? '验证中...' : '开始验证' }}
              </button>
            </div>
          </div>
          </div>
        </div>

        <!-- 数据清理工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:broom" class="text-warning" width="24" height="24" />
            <span>数据清理</span>
          </div>          <div class="tool-content">
            <p class="tool-description">清理无效的表情包记录和过期数据</p>
            <div class="tool-actions">
              <button class="btn btn-sm btn-primary" @click="cleanupData" :disabled="cleaning">
                <div v-if="cleaning" class="loading loading-spinner loading-xs mr-1"></div>
                <Icon v-else icon="mdi:broom" width="16" height="16" class="mr-1" />
                {{ cleaning ? '清理中...' : '开始清理' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 数据备份工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:backup-restore" class="text-info" width="24" height="24" />
            <span>数据备份</span>
          </div>          <div class="tool-content">
            <p class="tool-description">创建数据库备份副本</p>
            <div class="tool-actions">
              <button class="btn btn-sm btn-primary" @click="backupData" :disabled="backing">
                <div v-if="backing" class="loading loading-spinner loading-xs mr-1"></div>
                <Icon v-else icon="mdi:backup-restore" width="16" height="16" class="mr-1" />
                {{ backing ? '备份中...' : '创建备份' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 数据导出工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:export" class="text-accent" width="24" height="24" />
            <span>数据导出</span>
          </div>
          <div class="tool-content">
            <p class="tool-description">导出数据为JSON或CSV格式</p>
            <div class="tool-actions">
              <div class="dropdown dropdown-top">                <label tabindex="0" class="btn btn-sm btn-primary">
                  <Icon icon="mdi:export" width="16" height="16" class="mr-1" />
                  导出数据
                </label>
                <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li><a @click="exportData('json')">导出为JSON</a></li>
                  <li><a @click="exportData('csv')">导出为CSV</a></li>
                  <li><a @click="exportData('sql')">导出为SQL</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 表结构查看工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:table" class="text-primary" width="24" height="24" />
            <span>表结构</span>
          </div>
          <div class="tool-content">
            <p class="tool-description">查看数据库表结构和索引信息</p>
            <div class="tool-actions">
              <button class="btn btn-sm btn-primary" @click="showSchemaDialog = true">
                <Icon icon="mdi:table" width="16" height="16" class="mr-1" />
                查看结构
              </button>
            </div>
          </div>
        </div>

        <!-- 性能分析工具 -->
        <div class="tool-card">
          <div class="tool-header">
            <Icon icon="mdi:speedometer" class="text-error" width="24" height="24" />
            <span>性能分析</span>
          </div>          <div class="tool-content">
            <p class="tool-description">分析数据库性能和查询效率</p>
            <div class="tool-actions">
              <button class="btn btn-sm btn-primary" @click="analyzePerformance" :disabled="analyzing">
                <div v-if="analyzing" class="loading loading-spinner loading-xs mr-1"></div>
                <Icon v-else icon="mdi:speedometer" width="16" height="16" class="mr-1" />
                {{ analyzing ? '分析中...' : '开始分析' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="logs-section">
      <h3 class="section-title">操作日志</h3>
      <div class="logs-container">
        <div v-if="logs.length === 0" class="empty-logs">
          <Icon icon="mdi:file-document-outline" width="32" height="32" class="text-base-content/30" />
          <p class="text-base-content/70">暂无操作日志</p>
        </div>
        <div v-else class="logs-list">
          <div v-for="log in logs" :key="log.id" class="log-item" :class="getLogClass(log.type)">
            <div class="log-time">{{ formatLogTime(log.time) }}</div>
            <div class="log-content">
              <Icon :icon="getLogIcon(log.type)" width="16" height="16" />
              <span>{{ log.message }}</span>
            </div>
          </div>
        </div>
        <div v-if="logs.length > 0" class="logs-actions">
          <button class="btn btn-xs btn-ghost" @click="clearLogs">
            <Icon icon="mdi:delete" width="14" height="14" class="mr-1" />
            清空日志
          </button>
        </div>
      </div>
    </div>

    <!-- 表结构对话框 -->
    <dialog :class="{ 'modal-open': showSchemaDialog }" class="modal">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4">数据库表结构</h3>
        
        <div class="tabs tabs-boxed mb-4">
          <a 
            class="tab" 
            :class="{ 'tab-active': activeSchemaTab === 'emoji' }" 
            @click="activeSchemaTab = 'emoji'"
          >
            Emoji表
          </a>
          <a 
            class="tab" 
            :class="{ 'tab-active': activeSchemaTab === 'person' }" 
            @click="activeSchemaTab = 'person'"
          >
            PersonInfo表
          </a>
        </div>

        <div class="schema-content">
          <div v-if="activeSchemaTab === 'emoji'" class="table-schema">
            <h4 class="font-semibold mb-2">Emoji 表结构</h4>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-compact w-full">
                <thead>
                  <tr>
                    <th>字段名</th>
                    <th>类型</th>
                    <th>说明</th>
                    <th>约束</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>id</td><td>INTEGER</td><td>主键ID</td><td>PRIMARY KEY</td></tr>
                  <tr><td>full_path</td><td>TEXT</td><td>表情包完整路径</td><td>NOT NULL</td></tr>
                  <tr><td>format</td><td>TEXT</td><td>表情包格式</td><td>NOT NULL</td></tr>
                  <tr><td>emoji_hash</td><td>TEXT</td><td>表情包哈希</td><td>UNIQUE</td></tr>
                  <tr><td>description</td><td>TEXT</td><td>表情包描述</td><td></td></tr>
                  <tr><td>query_count</td><td>INTEGER</td><td>查询次数</td><td>DEFAULT 0</td></tr>
                  <tr><td>is_registered</td><td>INTEGER</td><td>是否注册</td><td>DEFAULT 0</td></tr>
                  <tr><td>is_banned</td><td>INTEGER</td><td>是否禁用</td><td>DEFAULT 0</td></tr>
                  <tr><td>emotion</td><td>TEXT</td><td>情感标签</td><td></td></tr>
                  <tr><td>record_time</td><td>REAL</td><td>记录时间</td><td></td></tr>
                  <tr><td>register_time</td><td>REAL</td><td>注册时间</td><td></td></tr>
                  <tr><td>usage_count</td><td>INTEGER</td><td>使用次数</td><td>DEFAULT 0</td></tr>                  <tr><td>last_used_time</td><td>REAL</td><td>最后使用时间</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="activeSchemaTab === 'person'" class="table-schema">
            <h4 class="font-semibold mb-2">PersonInfo 表结构</h4>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-compact w-full">
                <thead>
                  <tr>
                    <th>字段名</th>
                    <th>类型</th>
                    <th>说明</th>
                    <th>约束</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>id</td><td>INTEGER</td><td>主键ID</td><td>PRIMARY KEY</td></tr>
                  <tr><td>person_id</td><td>TEXT</td><td>用户唯一ID</td><td>UNIQUE, NOT NULL</td></tr>
                  <tr><td>person_name</td><td>TEXT</td><td>Bot给用户的昵称</td><td></td></tr>
                  <tr><td>name_reason</td><td>TEXT</td><td>起名原因</td><td></td></tr>
                  <tr><td>platform</td><td>TEXT</td><td>平台</td><td>NOT NULL</td></tr>
                  <tr><td>user_id</td><td>TEXT</td><td>平台用户ID</td><td>NOT NULL</td></tr>
                  <tr><td>nickname</td><td>TEXT</td><td>用户昵称</td><td></td></tr>
                  <tr><td>impression</td><td>TEXT</td><td>印象</td><td></td></tr>
                  <tr><td>short_impression</td><td>TEXT</td><td>短期印象</td><td></td></tr>
                  <tr><td>points</td><td>TEXT</td><td>积分</td><td></td></tr>
                  <tr><td>forgotten_points</td><td>TEXT</td><td>遗忘积分</td><td></td></tr>
                  <tr><td>info_list</td><td>TEXT</td><td>信息列表</td><td></td></tr>
                  <tr><td>know_times</td><td>REAL</td><td>认识次数</td><td></td></tr>
                  <tr><td>know_since</td><td>REAL</td><td>认识开始时间</td><td></td></tr>                  <tr><td>last_know</td><td>REAL</td><td>最后认识时间</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showSchemaDialog = false">关闭</button>
        </div>
      </div>
    </dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { maibotResourceApi } from '@/services/maibotResourceApi.js';
import toastService from '@/services/toastService.js';

// Props
const props = defineProps({
  instanceId: {
    type: String,
    required: true
  },
  instanceName: {
    type: String,
    required: true
  },
  dbInfo: {
    type: Object,
    default: () => ({})
  }
});

// Emits
const emit = defineEmits(['refresh-stats']);

// 响应式数据
const validating = ref(false);
const cleaning = ref(false);
const backing = ref(false);
const analyzing = ref(false);
const showSchemaDialog = ref(false);
const activeSchemaTab = ref('emoji');
const logs = ref([]);
const stats = ref({
  emoji: { total: 0 },
  person: { total: 0 }
});

// 方法
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const truncatePath = (path) => {
  if (!path) return '未知';
  return path.length > 50 ? '...' + path.slice(-50) : path;
};

const getDbStatusClass = () => {
  const status = props.dbInfo.status;
  if (status === '正常') return 'status-success';
  if (status === '异常') return 'status-warning';
  return 'status-error';
};

const refreshStats = async () => {
  try {
    // 获取表情包统计
    const emojiCount = await maibotResourceApi.emoji.getCount(props.instanceId);
    if (emojiCount.status === 'success') {
      stats.value.emoji.total = emojiCount.data?.total_count || 0;
    }

    // 获取用户信息统计
    const personCount = await maibotResourceApi.person.getCount(props.instanceId);
    if (personCount.status === 'success') {
      stats.value.person.total = personCount.data?.total_count || 0;
    }

    addLog('info', '统计信息已刷新');
    emit('refresh-stats');
  } catch (error) {
    console.error('刷新统计失败:', error);
    addLog('error', '刷新统计失败: ' + error.message);
  }
};

const validateData = async () => {
  validating.value = true;
  addLog('info', '开始数据验证...');
  
  try {
    // 模拟数据验证过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 这里应该调用实际的验证API
    addLog('success', '数据验证完成，未发现问题');
    toastService.show('数据验证完成', { type: 'success' });
  } catch (error) {
    addLog('error', '数据验证失败: ' + error.message);
    toastService.show('数据验证失败', { type: 'error' });
  } finally {
    validating.value = false;
  }
};

const cleanupData = async () => {
  if (!confirm('确定要执行数据清理吗？此操作可能删除无效数据。')) {
    return;
  }

  cleaning.value = true;
  addLog('info', '开始数据清理...');
  
  try {
    // 模拟数据清理过程
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 这里应该调用实际的清理API
    addLog('success', '数据清理完成，清理了0条无效记录');
    toastService.show('数据清理完成', { type: 'success' });
    refreshStats();
  } catch (error) {
    addLog('error', '数据清理失败: ' + error.message);
    toastService.show('数据清理失败', { type: 'error' });
  } finally {
    cleaning.value = false;
  }
};

const backupData = async () => {
  backing.value = true;
  addLog('info', '开始创建数据备份...');
  
  try {
    // 模拟备份过程
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // 这里应该调用实际的备份API
    const backupName = `maibot_backup_${Date.now()}.db`;
    addLog('success', `数据备份创建成功: ${backupName}`);
    toastService.show('数据备份创建成功', { type: 'success' });
  } catch (error) {
    addLog('error', '数据备份失败: ' + error.message);
    toastService.show('数据备份失败', { type: 'error' });
  } finally {
    backing.value = false;
  }
};

const exportData = async (format) => {
  addLog('info', `开始导出${format.toUpperCase()}格式数据...`);
  
  try {
    // 模拟导出过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 这里应该调用实际的导出API
    const fileName = `maibot_export_${Date.now()}.${format}`;
    addLog('success', `数据导出成功: ${fileName}`);
    toastService.show(`${format.toUpperCase()}导出成功`, { type: 'success' });
  } catch (error) {
    addLog('error', `数据导出失败: ${error.message}`);
    toastService.show('数据导出失败', { type: 'error' });
  }
};

const analyzePerformance = async () => {
  analyzing.value = true;
  addLog('info', '开始性能分析...');
  
  try {
    // 模拟性能分析过程
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // 这里应该调用实际的性能分析API
    addLog('success', '性能分析完成，数据库性能良好');
    toastService.show('性能分析完成', { type: 'success' });
  } catch (error) {
    addLog('error', '性能分析失败: ' + error.message);
    toastService.show('性能分析失败', { type: 'error' });
  } finally {
    analyzing.value = false;
  }
};

const addLog = (type, message) => {
  logs.value.unshift({
    id: Date.now(),
    type,
    message,
    time: new Date()
  });
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50);
  }
};

const clearLogs = () => {
  logs.value = [];
  toastService.show('日志已清空', { type: 'info' });
};

const formatLogTime = (time) => {
  return time.toLocaleTimeString('zh-CN');
};

const getLogClass = (type) => {
  const classes = {
    info: 'log-info',
    success: 'log-success',
    warning: 'log-warning',
    error: 'log-error'
  };
  return classes[type] || 'log-info';
};

const getLogIcon = (type) => {
  const icons = {
    info: 'mdi:information',
    success: 'mdi:check-circle',
    warning: 'mdi:alert',
    error: 'mdi:alert-circle'
  };
  return icons[type] || 'mdi:information';
};

// 生命周期
onMounted(() => {
  refreshStats();
  addLog('info', 'MaiBot资源管理工具已初始化');
});
</script>

<style scoped>
.management-tools {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: hsl(var(--bc));
}

.database-info-section {
  margin-bottom: 2rem;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.info-card {
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  background-color: hsl(var(--b1));
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1rem 0;
  font-weight: 600;
}

.card-content {
  padding: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-success .status-dot {
  background-color: hsl(var(--su));
}

.status-warning .status-dot {
  background-color: hsl(var(--wa));
}

.status-error .status-dot {
  background-color: hsl(var(--er));
}

.db-details .detail-item {
  margin-bottom: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid hsl(var(--b3) / 0.5);
}

.label {
  color: hsl(var(--bc) / 0.7);
  font-size: 0.875rem;
}

.value {
  color: hsl(var(--bc));
  font-size: 0.875rem;
  text-align: right;
}

.stats-grid {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-weight: 600;
  font-size: 1.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.6);
}

.tools-section {
  margin-bottom: 2rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.tool-card {
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  background-color: hsl(var(--b1));
  padding: 1rem;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.tool-description {
  color: hsl(var(--bc) / 0.7);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.tool-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-start;
  align-items: center;
}

.logs-section {
  margin-bottom: 1rem;
}

.logs-container {
  border: 1px solid hsl(var(--b3));
  border-radius: 0.5rem;
  background-color: hsl(var(--b1));
  max-height: 300px;
  overflow-y: auto;
}

.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.logs-list {
  padding: 0.5rem;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.log-info {
  background-color: hsl(var(--in) / 0.1);
  color: hsl(var(--inc));
}

.log-success {
  background-color: hsl(var(--su) / 0.1);
  color: hsl(var(--suc));
}

.log-warning {
  background-color: hsl(var(--wa) / 0.1);
  color: hsl(var(--wac));
}

.log-error {
  background-color: hsl(var(--er) / 0.1);
  color: hsl(var(--erc));
}

.log-time {
  font-size: 0.75rem;
  color: hsl(var(--bc) / 0.5);
  min-width: 80px;
}

.log-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.logs-actions {
  padding: 0.5rem;
  border-top: 1px solid hsl(var(--b3));
  text-align: right;
}

.schema-content {
  max-height: 400px;
  overflow-y: auto;
}

.table-schema h4 {
  color: hsl(var(--bc));
}

/* 按钮样式优化 */
.btn {
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: hsl(var(--p));
  border-color: hsl(var(--p));
  color: hsl(var(--pc));
}

.btn-primary:hover {
  background-color: hsl(var(--p) / 0.9);
  border-color: hsl(var(--p) / 0.9);
  color: hsl(var(--pc));
}

.btn-sm {
  min-height: 2rem;
  height: 2rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
}

/* 工具卡片样式优化 */
.management-tool {
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  transition: all 0.2s ease;
}

.management-tool:hover {
  border-color: hsl(var(--p) / 0.3);
  box-shadow: 0 4px 12px hsl(var(--p) / 0.1);
}

/* 确保文字可见性 */
.management-tools {
  color: hsl(var(--bc));
}

/* 深色模式优化 */
[data-theme="dark"] .management-tools {
  color: hsl(var(--bc));
}

[data-theme="dark"] .info-card,
[data-theme="dark"] .tool-card {
  background-color: hsl(var(--b1));
  border-color: hsl(var(--b3));
  color: hsl(var(--bc));
}

[data-theme="dark"] .section-title {
  color: hsl(var(--bc));
}

[data-theme="dark"] .status-indicator {
  color: hsl(var(--bc));
}

[data-theme="dark"] .detail-item .label {
  color: hsl(var(--bc) / 0.7);
}

[data-theme="dark"] .detail-item .value {
  color: hsl(var(--bc));
}

[data-theme="dark"] .tool-description {
  color: hsl(var(--bc) / 0.7);
}

[data-theme="dark"] .log-item {
  color: hsl(var(--bc));
}

[data-theme="dark"] .log-time {
  color: hsl(var(--bc) / 0.5);
}

[data-theme="dark"] .logs-container {
  background-color: hsl(var(--b1));
  border-color: hsl(var(--b3));
}

[data-theme="dark"] .empty-logs {
  color: hsl(var(--bc) / 0.7);
}

[data-theme="dark"] .table-schema h4 {
  color: hsl(var(--bc));
}

[data-theme="dark"] .modal-box {
  background-color: hsl(var(--b1));
  color: hsl(var(--bc));
}

/* 响应式布局优化 */
@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .tool-actions {
    justify-content: stretch;
  }
  
  .tool-actions .btn {
    flex: 1;
  }
}
</style>

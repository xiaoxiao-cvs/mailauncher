<template>
  <div class="section logs-display-section">
    <div class="section-header">
      <div class="section-title">安装日志</div>
      <div class="logs-actions">        <!-- 日志设置下拉菜单 -->
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-sm btn-ghost" title="日志设置">
            <i class="icon icon-settings"></i>
          </label>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-72">
            <li class="menu-title">
              <span>日志设置</span>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <input type="checkbox" v-model="logSettings.enableDeduplication" @change="saveLogSettings" class="checkbox checkbox-sm" />
                <span class="label-text ml-2">去重重复日志</span>
                <span v-if="!logSettings.enableDeduplication" class="badge badge-warning badge-xs ml-2">已禁用</span>
              </label>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <input type="checkbox" v-model="logSettings.showTimestamp" @change="saveLogSettings" class="checkbox checkbox-sm" />
                <span class="label-text ml-2">显示时间戳</span>
              </label>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <input type="checkbox" v-model="logSettings.showSource" @change="saveLogSettings" class="checkbox checkbox-sm" />
                <span class="label-text ml-2">显示日志来源</span>
              </label>
            </li>            <li>
              <label class="label cursor-pointer justify-start">
                <input type="checkbox" v-model="logSettings.enableWordWrap" @change="saveLogSettings" class="checkbox checkbox-sm" />
                <span class="label-text ml-2">自动换行</span>
              </label>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <span class="label-text">日志级别:</span>
                <select v-model="logSettings.logLevel" @change="saveLogSettings" class="select select-bordered select-xs w-20 ml-2">
                  <option value="all">全部</option>
                  <option value="info">信息+</option>
                  <option value="warning">警告+</option>
                  <option value="error">错误</option>
                </select>
              </label>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <span class="label-text">最大日志条数:</span>
                <input type="number" v-model.number="logSettings.maxLogLines" @change="saveLogSettings" 
                       class="input input-bordered input-xs w-16 ml-2" min="100" max="10000" />
              </label>
            </li>
            <li>
              <label class="label cursor-pointer justify-start">
                <span class="label-text">去重时间窗口(秒):</span>
                <input type="number" v-model.number="logSettings.deduplicationWindow" @change="saveLogSettings" 
                       class="input input-bordered input-xs w-16 ml-2" min="1" max="60" />
              </label>
            </li>
            <li class="mt-2">
              <a @click="debugDeduplication" class="text-xs text-info">
                🐛 调试去重信息
              </a>
            </li>
          </ul>
        </div>
        
        <button class="btn btn-sm btn-ghost" @click="exportLogs" title="导出日志">
          <i class="icon icon-download"></i>
        </button>
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
    </div>    <!-- 日志统计信息 -->
    <div v-if="logSettings.enableDeduplication && (logStats.duplicatedCount > 0 || logStats.totalCount > 0)" class="mb-2">
      <div class="alert alert-info py-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-sm">
          已显示 {{ processedLogs.length }} 条日志
          <span v-if="logStats.duplicatedCount > 0">，去重了 {{ logStats.duplicatedCount }} 条重复日志</span>
          <span v-if="logStats.totalCount > processedLogs.length + logStats.duplicatedCount">
            ，过滤了 {{ logStats.totalCount - processedLogs.length - logStats.duplicatedCount }} 条日志
          </span>
        </span>
      </div>
    </div>

    <!-- 用于插入额外内容的插槽 -->
    <slot name="before-logs"></slot>

    <!-- 日志内容区域 -->
    <div class="logs-container mockup-code bg-base-200 text-base-content" 
         ref="logsContainer"
         :class="{ 'word-wrap': logSettings.enableWordWrap }">
      <div v-if="processedLogs.length === 0" class="empty-logs">
        <div class="flex flex-col items-center gap-2 py-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="opacity-50">等待日志输出...</p>
        </div>
      </div>      <div v-for="(log, index) in processedLogs" :key="log.id || index" 
           :class="['log-line', getLogLevelClass(log.level), { 'log-new': log.isNew }]">
        <span v-if="logSettings.showTimestamp" class="log-time text-xs opacity-50">
          [{{ log.time || getCurrentTime() }}]
        </span>
        <span v-if="logSettings.showSource && log.source" class="log-source">
          [{{ log.source }}]
        </span>
        <span v-if="log.count && log.count > 1" class="log-count badge badge-warning badge-xs">
          {{ log.count }}x
        </span>
        <span class="log-message" v-html="formatLogMessage(log.message)"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated, watch, computed, inject, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['clear-logs', 'deployment-log']);

const logsContainer = ref(null);
const autoScroll = ref(true);

// 注入事件总线
const emitter = inject('emitter', null);

// 下载页面安装状态
const isInstalling = ref(false);
const installProgress = ref(0);
const installStatus = ref('');
const currentDeploymentData = ref(null);

// 日志设置
const logSettings = ref({
  enableDeduplication: true, // 启用去重功能
  showTimestamp: true,
  showSource: true,
  enableWordWrap: true,
  maxLogLines: 1000,
  deduplicationWindow: 5, // 秒
  logLevel: 'all', // 日志级别过滤：error, warning, info, all
  enableAutoScroll: true, // 自动滚动
});

// 日志统计
const logStats = ref({
  totalCount: 0,
  duplicatedCount: 0,
});

// 去重缓存
const deduplicationCache = ref(new Map());

// 新日志跟踪
const lastLogCount = ref(0);
const newLogIds = ref(new Set());

// 加载日志设置
const loadLogSettings = () => {
  const keys = Object.keys(logSettings.value);
  keys.forEach(key => {
    const saved = localStorage.getItem(`logSettings.${key}`);
    if (saved !== null) {
      if (typeof logSettings.value[key] === 'boolean') {
        logSettings.value[key] = saved === 'true';
      } else if (typeof logSettings.value[key] === 'number') {
        logSettings.value[key] = parseInt(saved) || logSettings.value[key];
      } else {
        logSettings.value[key] = saved;
      }
    }
  });
  
  // 同步自动滚动设置
  autoScroll.value = logSettings.value.enableAutoScroll !== false;
};

// 保存日志设置
const saveLogSettings = () => {
  Object.keys(logSettings.value).forEach(key => {
    localStorage.setItem(`logSettings.${key}`, logSettings.value[key].toString());
  });
  
  // 同步自动滚动设置
  autoScroll.value = logSettings.value.enableAutoScroll !== false;
  
  // 通知其他组件设置已更新
  if (emitter) {
    emitter.emit('log-settings-updated', logSettings.value);
  }
};

// 监听全局日志设置更新
if (emitter) {
  emitter.on('log-settings-updated', (newSettings) => {
    console.log('LogsDisplay: 收到日志设置更新', newSettings);
    Object.assign(logSettings.value, newSettings);
    autoScroll.value = logSettings.value.enableAutoScroll !== false;
    // 重新保存本地设置，确保同步
    saveLogSettings();
  });
  
  emitter.on('log-settings-reset', (newSettings) => {
    console.log('LogsDisplay: 收到日志设置重置', newSettings);
    Object.assign(logSettings.value, newSettings);
    autoScroll.value = logSettings.value.enableAutoScroll !== false;
    // 清空去重缓存
    deduplicationCache.value.clear();
    // 重新保存本地设置，确保同步
    saveLogSettings();
  });
  
  emitter.on('test-log-deduplication', () => {
    console.log('LogsDisplay: 收到去重测试指令');
    debugDeduplication();
  });
}

// 处理后的日志（去重、限制数量等）
const processedLogs = computed(() => {
  try {
    let result = [...props.logs];
    
    // 重置统计信息（但不在computed中直接修改ref）
    const currentStats = {
      totalCount: result.length,
      duplicatedCount: 0
    };

    console.log('原始日志数量:', result.length);
    if (result.length > 0) {
      console.log('前5条原始日志内容:', result.slice(0, 5).map(log => ({
        message: log.message,
        level: log.level,
        source: log.source,
        time: log.time
      })));
    }    // 确保所有日志都有ID，但不要每次都重新生成
    result = result.map((log, index) => ({
      ...log,
      id: log.id || `log_${index}_${log.time}_${log.message?.substring(0, 10)}`,
      isNew: false // 默认不是新日志
    }));

    // 标记新日志
    if (result.length > lastLogCount.value) {
      const newLogs = result.slice(lastLogCount.value);
      newLogs.forEach(log => {
        log.isNew = true;
        newLogIds.value.add(log.id);
      });
      
      // 设置定时器移除新日志标记
      setTimeout(() => {
        newLogs.forEach(log => {
          newLogIds.value.delete(log.id);
        });
      }, 1000); // 1秒后移除新日志标记
      
      lastLogCount.value = result.length;
    }

    // 日志级别过滤
    if (logSettings.value.logLevel && logSettings.value.logLevel !== 'all') {
      result = filterByLogLevel(result);
      console.log('级别过滤后日志数量:', result.length);
    }
  if (logSettings.value.enableDeduplication) {
    console.log('开始去重处理...');
    const dedupResult = deduplicateLogsSync(result);
    result = dedupResult.logs;
    currentStats.duplicatedCount = dedupResult.duplicatedCount;
    console.log('去重后日志数量:', result.length);
    console.log('去重统计:', currentStats);
  } else {
    console.log('去重已禁用，直接显示所有日志');
  }
  // 限制日志条数
  if (result.length > logSettings.value.maxLogLines) {
    result = result.slice(-logSettings.value.maxLogLines);
    console.log('限制条数后日志数量:', result.length);
  }

  // 使用nextTick异步更新统计信息，避免在computed中直接修改
  nextTick(() => {
    logStats.value.totalCount = currentStats.totalCount;
    logStats.value.duplicatedCount = currentStats.duplicatedCount;
  });

  console.log('最终返回的日志数量:', result.length);
  return result;
  } catch (error) {
    console.error('处理日志时发生错误:', error);
    return [];
  }
});

// 按日志级别过滤
const filterByLogLevel = (logs) => {
  const levelMap = {
    'error': ['error'],
    'warning': ['error', 'warning', 'warn'],
    'info': ['error', 'warning', 'warn', 'info', 'success'],
    'all': null
  };
    const allowedLevels = levelMap[logSettings.value.logLevel];
  if (!allowedLevels) return logs;
  
  return logs.filter(log => {
    const level = (log.level || 'info').toLowerCase();
    return allowedLevels.includes(level);
  });
};

// 同步去重函数（不修改外部状态）
const deduplicateLogsSync = (logs) => {
  const deduped = [];
  const tempCache = new Map();
  const currentTime = Date.now();
  const windowMs = logSettings.value.deduplicationWindow * 1000;
  let duplicatedCount = 0;

  for (const log of logs) {
    const logKey = generateLogKey(log);
    console.log(`处理日志: "${log.message}" -> 键: "${logKey}"`);
    
    const cachedData = tempCache.get(logKey);
    
    if (cachedData && (currentTime - cachedData.lastSeen < windowMs)) {
      // 是重复日志，更新现有日志的计数
      cachedData.count++;
      cachedData.lastSeen = currentTime;
      
      // 更新已存在的日志项
      const existingLog = deduped.find(item => item.id === cachedData.log.id);
      if (existingLog) {
        existingLog.count = cachedData.count;
        // 更新最后出现的时间为最新的日志时间
        existingLog.time = log.time || existingLog.time;
      }
      
      duplicatedCount++;
      console.log(`发现重复日志，计数更新为: ${cachedData.count}`);
    } else {
      // 新日志，添加到结果中
      const newLog = { 
        ...log, 
        count: 1, 
        id: log.id || `log_${deduped.length}_${log.time}_${logKey.slice(-8)}` // 更稳定的ID生成
      };
      deduped.push(newLog);
      
      // 更新临时缓存
      tempCache.set(logKey, {
        log: newLog,
        count: 1,
        lastSeen: currentTime,
      });
      
      console.log(`添加新日志: "${log.message}"`);
    }
  }

  console.log(`去重完成: 原始${logs.length}条 -> 去重后${deduped.length}条，重复${duplicatedCount}条`);
  
  return {
    logs: deduped,
    duplicatedCount: duplicatedCount
  };
};

// 原来的去重函数（用于缓存管理）
const deduplicateLogs = (logs) => {
  const deduped = [];
  const currentTime = Date.now();
  const windowMs = logSettings.value.deduplicationWindow * 1000;
  
  // 清理过期的缓存
  for (const [key, data] of deduplicationCache.value.entries()) {
    if (currentTime - data.lastSeen > windowMs) {
      deduplicationCache.value.delete(key);
    }
  }

  for (const log of logs) {
    const logKey = generateLogKey(log);
    const cachedData = deduplicationCache.value.get(logKey);
    
    if (cachedData && (currentTime - cachedData.lastSeen < windowMs)) {
      // 是重复日志，更新计数和时间
      cachedData.count++;
      cachedData.lastSeen = currentTime;
      
      // 更新已存在的日志项的计数
      const existingLogIndex = deduped.findIndex(item => 
        item.id === cachedData.log.id
      );
      if (existingLogIndex !== -1) {
        deduped[existingLogIndex].count = cachedData.count;
      }
      
      logStats.value.duplicatedCount++;
    } else {
      // 新日志或超出时间窗口，添加到结果中
      const newLog = { 
        ...log, 
        count: 1, 
        id: Date.now() + Math.random() + deduped.length 
      };
      deduped.push(newLog);
      
      // 更新缓存
      deduplicationCache.value.set(logKey, {
        log: newLog,
        count: 1,
        lastSeen: currentTime,
      });
    }
  }

  return deduped;
};

// 生成日志唯一键
const generateLogKey = (log) => {
  if (!log || typeof log !== 'object') {
    console.warn('无效的日志对象:', log);
    return 'invalid_log';
  }

  let message = String(log.message || '').trim();
  const level = String(log.level || 'info').toLowerCase();
  const source = String(log.source || '').trim();
  
  console.log('生成键的原始数据:', { message, level, source });
  
  if (!message) {
    console.warn('日志消息为空');
    return `${level}|${source}|empty_message`;
  }
  
  // 深度清理消息内容，去除所有HTML标签和实体
  let cleanMessage = message;
  let previousLength;
  do {
    previousLength = cleanMessage.length;
    // 清理所有HTML标签
    cleanMessage = cleanMessage.replace(/<\/?[^>]*>/g, '');
    // 清理HTML实体
    cleanMessage = cleanMessage
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-zA-Z0-9#]+;/g, ''); // 清理其他HTML实体
  } while (cleanMessage.length !== previousLength);
  
  // 清理多余的空格
  cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
    // 非常保守的标准化，只处理明确的重复模式
  let normalizedMessage = cleanMessage;
  
  // 部署进度类消息统一化
  if (cleanMessage.includes('部署进度:') && cleanMessage.includes('%')) {
    normalizedMessage = cleanMessage.replace(/\d+(\.\d+)?%/g, 'X%');
  } else if (cleanMessage.includes('Installing') && cleanMessage.includes('%')) {
    normalizedMessage = cleanMessage.replace(/\d+%/g, 'X%');
  } else if (cleanMessage.includes('Downloaded') && cleanMessage.includes('files')) {
    normalizedMessage = cleanMessage.replace(/\d+ files/g, 'X files');
  } else if (cleanMessage.includes('Progress:') && cleanMessage.includes('%')) {
    normalizedMessage = cleanMessage.replace(/\d+(\.\d+)?%/g, 'X%');
  } else if (cleanMessage.includes('速度') && cleanMessage.match(/\d+(\.\d+)?\s*(KB|MB|GB)\/s/)) {
    normalizedMessage = cleanMessage.replace(/\d+(\.\d+)?\s*(KB|MB|GB)\/s/g, 'X $2/s');
  } else if (cleanMessage.includes('状态信息:') || cleanMessage.includes('安装状态:')) {
    // 状态信息类的重复日志合并
    normalizedMessage = cleanMessage.replace(/状态信息: .*/, '状态信息: [状态]');
  }
  
  const key = `${level}|${source}|${normalizedMessage}`;
  console.log(`生成的唯一键: "${key}"`);
  return key;
};

// 获取当前时间
const getCurrentTime = () => {
  return new Date().toLocaleTimeString();
};

// 清空日志
const clearLogs = () => {
  deduplicationCache.value.clear();
  logStats.value.duplicatedCount = 0;
  emit('clear-logs');
};

// 导出日志
const exportLogs = () => {
  if (!logSettings.value.enableLogExport) {
    console.warn('日志导出功能已被禁用');
    return;
  }
  
  const logText = processedLogs.value
    .map(log => {
      const parts = [];
      if (logSettings.value.showTimestamp) {
        parts.push(`[${log.time || getCurrentTime()}]`);
      }
      if (logSettings.value.showSource && log.source) {
        parts.push(`[${log.source}]`);
      }
      if (log.level) {
        parts.push(`[${log.level}]`);
      }
      if (log.count && log.count > 1) {
        parts.push(`(${log.count}x)`);
      }
      parts.push(log.message || '');
      return parts.join(' ');
    })
    .join('\n');

  const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date().toISOString().replace(/[:.]/g, '-');

  a.href = url;
  a.download = `install-logs-${now}.txt`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);  }, 100);
};

// 调试去重功能
const debugDeduplication = () => {
  console.group('🐛 日志去重调试信息');
  console.log('当前设置:', logSettings.value);
  console.log('统计信息:', logStats.value);
  
  // 打印原始日志的详细信息
  console.log('原始日志详情:');
  props.logs.forEach((log, index) => {
    console.log(`日志${index + 1}:`, {
      message: log.message,
      level: log.level,
      source: log.source,
      time: log.time,
      type: typeof log,
      keys: Object.keys(log)
    });
  });
  
  // 测试前几条日志的键生成
  if (props.logs.length > 0) {
    console.log('日志唯一键生成测试:');
    props.logs.slice(0, 5).forEach((log, index) => {
      try {
        const key = generateLogKey(log);
        console.log(`日志${index + 1}: "${log.message}" -> 销: "${key}"`);
      } catch (error) {
        console.error(`生成日志${index + 1}的键时出错:`, error, log);
      }
    });
  }
  
  // 测试去重函数
  if (props.logs.length > 0) {
    console.log('测试去重函数:');
    try {
      const testResult = deduplicateLogsSync(props.logs.slice(0, 5));
      console.log('测试去重结果:', testResult);
    } catch (error) {
      console.error('去重函数测试失败:', error);
    }
  }
  
  // 测试HTML标签清理功能
  console.log('HTML标签清理测试:');
  const testMessages = [
    '🚀 正在安装 <span class="text-info">测试实例</span>',
    '✅ 安装完成</span>',
    '📊 Progress: 50% </span> 完成',
    '<div>包含HTML的消息</div>',
    '&lt;script&gt;alert("test")&lt;/script&gt;',
    '正常消息 🎉 没有HTML标签'
  ];
  
  testMessages.forEach((message, index) => {
    const cleaned = formatLogMessage(message);
    console.log(`测试${index + 1}: "${message}" -> "${cleaned}"`);
  });
  
  console.groupEnd();
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
  logSettings.value.enableAutoScroll = autoScroll.value;
  saveLogSettings();
  
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
  
  // 首先对原始消息进行深度清理
  let safeMessage = String(message);
  
  // 多轮清理所有HTML标签（包括残留的闭合标签）
  let previousLength;
  do {
    previousLength = safeMessage.length;
    // 清理所有HTML标签（包括自闭合标签和残留的标签）
    safeMessage = safeMessage.replace(/<\/?[^>]*>/g, '');
    // 清理残留的HTML实体
    safeMessage = safeMessage
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-zA-Z0-9#]+;/g, ''); // 清理其他HTML实体
  } while (safeMessage.length !== previousLength); // 重复清理直到没有变化
  
  // 清理多余的空格和换行符
  safeMessage = safeMessage.replace(/\s+/g, ' ').trim();
  
  // 重新转义HTML特殊字符以防止XSS
  safeMessage = safeMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // 对JSON格式的消息进行特殊处理
  if (safeMessage.trim().startsWith('{') && safeMessage.trim().endsWith('}')) {
    try {
      // 尝试解析清理后的消息
      const cleanMessage = safeMessage.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const jsonObj = JSON.parse(cleanMessage);
      safeMessage = `<pre class="text-xs bg-base-300 p-2 rounded overflow-x-auto">${JSON.stringify(jsonObj, null, 2)}</pre>`;
      return safeMessage;
    } catch (e) {
      // 不是有效JSON，继续正常处理
    }
  }
  
  // 对命令行风格的消息进行高亮处理
  if (safeMessage.startsWith('$')) {
    safeMessage = `<span class="font-bold text-accent">${safeMessage}</span>`;
    return safeMessage;
  }
  
  // 高亮各种状态和关键词 - 使用更保守且安全的匹配策略
  // 首先处理表情符号，避免与文字高亮冲突
  const emojiMap = {
    '✅': '<span class="text-success">✅</span>',
    '🎉': '<span class="text-success">🎉</span>',
    '❌': '<span class="text-error">❌</span>',
    '💥': '<span class="text-error">💥</span>',
    '⚠️': '<span class="text-warning">⚠️</span>',
    '⏰': '<span class="text-warning">⏰</span>',
    '🚀': '<span class="text-info">🚀</span>',
    '🔄': '<span class="text-info">🔄</span>',
    '📊': '<span class="text-info">📊</span>',
    '📝': '<span class="text-info">📝</span>',
    '🔍': '<span class="text-info">🔍</span>',
    '�': '<span class="text-info">📄</span>',
    '�': '<span class="text-info">🔧</span>',
    '�': '<span class="text-info">📦</span>',
    '�': '<span class="text-info">📁</span>',
    '🌐': '<span class="text-info">🌐</span>',
    '�': '<span class="text-info">🔌</span>',
    '�': '<span class="text-info">📋</span>',
    '�': '<span class="text-info">📥</span>'
  };
  
  // 安全地替换表情符号（每个表情符号单独处理）
  Object.entries(emojiMap).forEach(([emoji, replacement]) => {
    if (safeMessage.includes(emoji)) {
      safeMessage = safeMessage.split(emoji).join(replacement);
    }
  });
  
  // 然后处理文字高亮（使用词边界确保精确匹配）
  safeMessage = safeMessage
    // 成功状态
    .replace(/\b(成功|完成|SUCCESS|COMPLETE)\b/gi, '<span class="text-success font-medium">$1</span>')
    // 错误状态
    .replace(/\b(错误|失败|ERROR|FAILED|FAIL)\b/gi, '<span class="text-error font-medium">$1</span>')
    // 警告状态
    .replace(/\b(警告|WARNING|WARN)\b/gi, '<span class="text-warning font-medium">$1</span>')
    // 信息状态
    .replace(/\b(开始|启动|START|BEGIN)\b/gi, '<span class="text-info font-medium">$1</span>')
    // 数值和百分比
    .replace(/\b(\d+(?:\.\d+)?%)\b/g, '<span class="text-accent font-mono font-bold">$1</span>')
    // 文件大小
    .replace(/\b(\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB))\b/gi, '<span class="text-secondary font-mono">$1</span>')
    // 端口号
    .replace(/(端口[:：]\s*)(\d+)/gi, '$1<span class="text-primary font-mono">$2</span>')
    // IP地址
    .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, '<span class="text-accent font-mono">$1</span>')
    // 路径（更保守的匹配）
    .replace(/\b((?:[a-zA-Z]:\\|\/)[^\s<>"]*)\b/g, '<span class="text-neutral font-mono">$1</span>')
    // HTTP状态码
    .replace(/(HTTP\s+)(\d{3})/gi, '$1<span class="text-warning font-mono">$2</span>')
    // 实例ID
    .replace(/(实例ID[:：]\s*)([a-f0-9]{32,})/gi, '$1<span class="text-primary font-mono text-xs">$2</span>');
  
  // 最后检查并清理任何可能的双重标签或格式问题
  safeMessage = safeMessage
    // 清理双重span标签
    .replace(/<span[^>]*>(<span[^>]*>.*?<\/span>)<\/span>/g, '$1')
    // 清理空的span标签
    .replace(/<span[^>]*><\/span>/g, '')
    // 清理格式问题导致的多余空格
    .replace(/\s+/g, ' ');
  
  return safeMessage;
};

// 处理下载页面部署启动事件
const handleDeploymentStarted = (event) => {
  console.log('LogsDisplay: 接收到部署启动事件', event.detail);
  
  const { deploymentData } = event.detail;
  currentDeploymentData.value = deploymentData;
  isInstalling.value = true;
  installProgress.value = 0;
  installStatus.value = '正在准备安装...';
  
  // 添加安装开始日志
  emit('deployment-log', {
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    level: 'info',
    source: 'installer',
    message: `🚀 开始安装实例: ${deploymentData.instanceName}`
  });
};

// 处理部署进度更新事件
const handleDeploymentProgress = (event) => {
  console.log('LogsDisplay: 接收到进度更新事件', event.detail);
  
  const { progress, status, deploymentData } = event.detail;
  installProgress.value = progress || 0;
  installStatus.value = status || '安装中...';
  
  // 添加进度日志
  if (status) {
    emit('deployment-log', {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      level: 'info',
      source: 'installer',
      message: `📋 ${status} (${progress}%)`
    });
  }
};

// 处理部署完成事件
const handleDeploymentCompleted = (event) => {
  console.log('LogsDisplay: 接收到部署完成事件', event.detail);
  
  const { success, message, deploymentData } = event.detail;
  isInstalling.value = false;
  installProgress.value = success ? 100 : 0;
  installStatus.value = success ? '安装完成' : '安装失败';
  
  // 添加完成日志
  emit('deployment-log', {
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    level: success ? 'success' : 'error',
    source: 'installer',
    message: success ? `✅ ${message || '安装完成'}` : `❌ ${message || '安装失败'}`
  });
  
  // 清理数据
  setTimeout(() => {
    currentDeploymentData.value = null;
    installProgress.value = 0;
    installStatus.value = '';
  }, 3000);
};

// 处理安装日志
const handleInstallLogs = (log) => {
  if (log.message.includes('Installing') || log.message.includes('下载中')) {
    isInstalling.value = true;
    installStatus.value = '安装中...';
    installProgress.value = 0;
  } else if (log.message.includes('Install completed') || log.message.includes('安装完成')) {
    isInstalling.value = false;
    installStatus.value = '安装完成';
    installProgress.value = 100;
  } else if (log.message.includes('Install failed') || log.message.includes('安装失败')) {
    isInstalling.value = false;
    installStatus.value = '安装失败';
    installProgress.value = 0;
  } else if (log.message.includes('Progress:')) {
    const progressMatch = log.message.match(/Progress:\s*(\d+)%/);
    if (progressMatch && progressMatch[1]) {
      installProgress.value = parseInt(progressMatch[1]);
    }
  }
};

// 监听安装日志
watch(() => props.logs, (newLogs) => {
  if (Array.isArray(newLogs)) {
    newLogs.forEach(log => {
      handleInstallLogs(log);
    });
  }
}, { immediate: true });

// 组件挂载时初始化
onMounted(() => {
  loadLogSettings();
  scrollToBottom();

  // 监听下载页面部署启动事件
  window.addEventListener('deployment-started-in-downloads', handleDeploymentStarted);
  
  // 监听部署进度更新事件
  window.addEventListener('deployment-progress-update', handleDeploymentProgress);
  
  // 监听部署完成事件
  window.addEventListener('deployment-completed', handleDeploymentCompleted);
});

// 组件更新后，如果启用了自动滚动则滚动到底部
onUpdated(() => {
  if (autoScroll.value) {
    scrollToBottom();
  }
});

// 组件卸载时清理
onUnmounted(() => {
  emitter.off('log-settings-updated');
  emitter.off('log-settings-reset');
  
  // 移除部署事件监听器
  window.removeEventListener('deployment-started-in-downloads', handleDeploymentStarted);
  window.removeEventListener('deployment-progress-update', handleDeploymentProgress);
  window.removeEventListener('deployment-completed', handleDeploymentCompleted);
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
  align-items: center;
}

.logs-container {
  height: 400px;
  overflow-y: auto;
  margin-top: 0.5rem;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0.5rem 0;
  border-radius: 0.5rem;
}

.logs-container.word-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.logs-container:not(.word-wrap) {
  white-space: nowrap;
  overflow-x: auto;
}

.log-line {
  padding: 0.15rem 1rem;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 新日志动画效果 */
.log-line.log-new {
  animation: logFadeIn 0.5s ease-out;
  background-color: rgba(59, 130, 246, 0.1);
  border-left-color: var(--primary);
}

@keyframes logFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px);
    background-color: rgba(59, 130, 246, 0.3);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    background-color: rgba(59, 130, 246, 0.1);
  }
}

.log-line:hover {
  background-color: var(--base-300);
  border-left-color: var(--primary);
}

.log-line.text-error {
  border-left-color: var(--error);
  background-color: rgba(239, 68, 68, 0.05);
}

.log-line.text-warning {
  border-left-color: var(--warning);
  background-color: rgba(245, 158, 11, 0.05);
}

.log-line.text-success {
  border-left-color: var(--success);
  background-color: rgba(34, 197, 94, 0.05);
}

.log-line.text-info {
  border-left-color: var(--info);
  background-color: rgba(59, 130, 246, 0.05);
}

.log-time {
  margin-right: 0.5rem;
  user-select: none;
  font-family: monospace;
  min-width: 80px;
  flex-shrink: 0;
}

.log-source {
  margin-right: 0.5rem;
  font-weight: 500;
  color: var(--info);
  background-color: var(--info-content);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.log-count {
  margin-right: 0.25rem;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  min-width: 0;
}

.empty-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-style: italic;
  color: var(--text-light);
}

/* 下拉菜单样式优化 */
.dropdown-content {
  border: 1px solid var(--base-300);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dropdown-content .menu-title {
  padding: 0.5rem 1rem;
  font-weight: 600;
  color: var(--base-content);
  border-bottom: 1px solid var(--base-300);
  margin-bottom: 0.5rem;
}

.dropdown-content .label {
  padding: 0.25rem 1rem;
  margin: 0;
}

.dropdown-content .label-text {
  font-size: 0.875rem;
}

.dropdown-content .input {
  height: 1.5rem;
  min-height: 1.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* 滚动条样式 */
.logs-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.logs-container::-webkit-scrollbar-track {
  background: var(--base-300);
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: var(--base-content);
  border-radius: 4px;
  opacity: 0.3;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  opacity: 0.5;
}

/* 日志级别图标 */
.log-line.text-error::before {
  content: '❌';
  margin-right: 0.25rem;
  font-size: 0.75rem;
}

.log-line.text-warning::before {
  content: '⚠️';
  margin-right: 0.25rem;
  font-size: 0.75rem;
}

.log-line.text-success::before {
  content: '✅';
  margin-right: 0.25rem;
  font-size: 0.75rem;
}

.log-line.text-info::before {
  content: 'ℹ️';
  margin-right: 0.25rem;
  font-size: 0.75rem;
}

/* 动画效果 */
.log-line {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logs-container {
    font-size: 0.75rem;
    height: 300px;
  }
  
  .log-time {
    min-width: 60px;
    font-size: 0.7rem;
  }
  
  .log-source {
    font-size: 0.7rem;
    padding: 0.05rem 0.2rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  
  .logs-actions {
    justify-content: center;
  }
}
</style>

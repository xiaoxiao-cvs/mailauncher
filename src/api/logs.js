import axios from 'axios';
import { formatTime } from '../utils/formatters';

/**
 * 获取系统日志
 * @returns {Promise<Array>} 日志列表
 */
export const fetchSystemLogs = async () => {
  try {
    const response = await axios.get('/api/logs/system');
    if (response.data && response.data.logs) {
      return response.data.logs;
    }
    return [];
  } catch (error) {
    console.error('获取系统日志失败:', error);
    throw new Error('获取系统日志失败');
  }
};

/**
 * 获取实例日志
 * @param {string} instanceName 实例名称
 * @returns {Promise<Array>} 日志列表
 */
export const fetchInstanceLogs = async (instanceName) => {
  try {
    const response = await axios.get(`/api/logs/instance/${instanceName}`);
    if (response.data && response.data.logs) {
      return response.data.logs;
    }
    return [];
  } catch (error) {
    console.error(`获取实例 ${instanceName} 日志失败:`, error);
    throw new Error(`获取实例 ${instanceName} 日志失败`);
  }
};

/**
 * 获取日志颜色
 * @param {string} type 日志类型
 * @returns {string} 颜色代码
 */
export const getLogColor = (type) => {
  switch((type || '').toUpperCase()) {
    case 'ERROR':
      return '#F56C6C';
    case 'WARNING':
      return '#E6A23C';
    case 'SUCCESS':
      return '#67C23A';
    case 'INFO':
      return '#67C23A';
    default:
      return '#909399';
  }
};

/**
 * 创建示例日志
 * @param {string} message 日志消息
 * @param {string} type 日志类型
 * @returns {Object} 日志对象
 */
export const createLog = (message, type = 'INFO') => {
  return {
    type,
    time: formatTime(new Date()),
    message
  };
};

/**
 * 导出日志为文本文件
 * @param {Array} logs 日志列表
 * @param {string} source 日志来源
 */
export const exportLogs = (logs, source = 'system') => {
  if (!logs || logs.length === 0) return;
  
  const logText = logs.map(log => `[${log.time || ''}][${log.type || 'INFO'}] ${log.message}`).join('\n');
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs-${source}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default {
  fetchSystemLogs,
  fetchInstanceLogs,
  getLogColor,
  createLog,
  exportLogs
};

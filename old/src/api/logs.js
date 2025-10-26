import axios from "axios";
import { formatTime } from "../utils/formatters";

/**
 * 获取系统日志
 * @returns {Promise<Array>} 日志数组
 */
export const fetchSystemLogs = async () => {
  try {
    const response = await axios.get("/api/logs/system");
    return response.data?.logs || [];
  } catch (error) {
    console.error("获取系统日志失败:", error);
    return [];
  }
};

/**
 * 获取实例日志
 * @param {string} instanceName 实例名称
 * @returns {Promise<Array>} 日志数组
 */
export const fetchInstanceLogs = async (instanceName) => {
  try {
    const response = await axios.get(`/api/logs/instance/${instanceName}`);
    return response.data?.logs || [];
  } catch (error) {
    console.error(`获取实例 ${instanceName} 日志失败:`, error);
    return [];
  }
};

/**
 * 获取日志颜色
 * @param {string} type 日志类型或级别
 * @returns {string} 颜色代码
 */
export const getLogColor = (type) => {
  if (!type) return "#909399"; // 默认颜色

  switch (type.toString().toUpperCase()) {
    case "ERROR":
      return "#F56C6C"; // 红色
    case "WARNING":
      return "#E6A23C"; // 橙色
    case "SUCCESS":
      return "#67C23A"; // 绿色
    case "INFO":
      return "#409EFF"; // 蓝色
    default:
      return "#909399"; // 灰色
  }
};

/**
 * 创建示例日志
 * @param {string} message 日志消息
 * @param {string} type 日志类型
 * @returns {Object} 日志对象
 */
export const createLog = (message, type = "INFO") => {
  return {
    type,
    time: formatTime(new Date()),
    message,
  };
};

/**
 * 导出日志为文件
 * @param {Array} logs 日志数组
 * @param {string} source 日志来源
 */
export const exportLogs = (logs, source) => {
  if (!logs || logs.length === 0) {
    console.warn("没有可导出的日志");
    return;
  }

  // 格式化日志内容
  const logText = logs
    .map(
      (log) =>
        `[${log.time || ""}] [${log.type || log.level || "INFO"}] ${
          log.message
        }`
    )
    .join("\n");

  // 创建并下载文件
  const blob = new Blob([logText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date().toISOString().replace(/[:.]/g, "-");

  a.href = url;
  a.download = `logs-${source}-${now}.txt`;
  document.body.appendChild(a);
  a.click();

  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

export default {
  fetchSystemLogs,
  fetchInstanceLogs,
  getLogColor,
  createLog,
  exportLogs,
};

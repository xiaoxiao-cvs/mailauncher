/**
 * 日志解析工具函数
 * 用于分析和处理安装过程中产生的各种日志
 */

/**
 * 判断是否是重要日志
 * @param {Object} log 日志对象
 * @returns {Boolean} 是否为重要日志
 */
export const isImportantLog = (log) => {
  if (!log) return false;

  // 如果是命令行日志，视为重要
  if (log.source === "command") return true;

  // 如果是错误类日志，视为重要
  if (log.level && log.level.toLowerCase() === "error") return true;

  // 如果是成功类日志，视为重要
  if (log.level && log.level.toLowerCase() === "success") return true;

  // 检查消息内容是否包含关键词
  if (log.message) {
    const msg = log.message.toLowerCase();
    const keywords = [
      "installed",
      "安装完成",
      "安装成功",
      "配置成功",
      "error",
      "错误",
      "失败",
      "exception",
      "complete",
      "完成",
      "部署完成",
    ];

    return keywords.some((keyword) => msg.includes(keyword));
  }

  return false;
};

/**
 * 获取格式化后的Shell日志
 * @param {Object} log 日志对象
 * @returns {Object} 格式化后的日志对象
 */
export const getShellFormattedLog = (log) => {
  if (!log) return log;

  // 克隆日志对象避免修改原始对象
  const formattedLog = { ...log };

  // 格式化消息内容
  if (formattedLog.message) {
    // 去除尾部多余空白
    formattedLog.message = formattedLog.message.replace(/\s+$/, "");

    // 处理特定类型的日志格式
    if (formattedLog.message.includes("Successfully installed")) {
      formattedLog.source = formattedLog.source || "pip";
      formattedLog.level = "success";
    } else if (formattedLog.message.includes("Requirement already satisfied")) {
      formattedLog.source = formattedLog.source || "pip";
    } else if (formattedLog.message.includes("ERROR:")) {
      formattedLog.source = formattedLog.source || "error";
      formattedLog.level = "error";
    }
  }

  return formattedLog;
};

/**
 * 判断日志是否表明安装完成
 * @param {Object} log 日志对象
 * @returns {Boolean} 是否为安装完成日志
 */
export const isInstallationComplete = (log) => {
  if (!log || !log.message) return false;

  const msg = log.message.toLowerCase();
  const completeKeywords = [
    "安装完成！请运行启动脚本",
    "installation completed",
    "部署成功",
    "安装已完成",
    "all installation steps completed",
    "bot配置完成",
    "nonebot适配器安装完成",
  ];

  return completeKeywords.some((keyword) =>
    msg.includes(keyword.toLowerCase())
  );
};

/**
 * 判断日志是否表明安装出错
 * @param {Object} log 日志对象
 * @returns {Boolean} 是否为安装错误日志
 */
export const isInstallationError = (log) => {
  if (!log) return false;

  // 检查日志级别
  if (log.level && log.level.toLowerCase() === "error") {
    // 排除一些常见的非致命错误
    const nonFatalErrors = ["warning", "警告", "retry", "重试"];
    const msg = log.message?.toLowerCase() || "";

    if (nonFatalErrors.some((term) => msg.includes(term))) {
      return false;
    }
    return true;
  }

  // 检查消息内容
  if (log.message) {
    const msg = log.message.toLowerCase();
    const errorKeywords = [
      "installation failed",
      "安装失败",
      "error occurred",
      "exception",
      "fatal error",
      "致命错误",
      "无法完成安装",
    ];

    return errorKeywords.some((keyword) => msg.includes(keyword.toLowerCase()));
  }

  return false;
};

/**
 * 解析日志字符串
 * @param {string} logString 日志字符串
 * @returns {Object} 解析后的日志对象
 */
export const parseLogString = (logString) => {
  if (!logString) return { message: "", level: "INFO" };

  // 匹配常见日志格式 [时间] [级别] 消息
  const timeMatch = logString.match(/\[(.*?)\]/);
  const levelMatch = logString.match(/\[(INFO|ERROR|WARNING|SUCCESS|DEBUG)\]/i);

  let time = timeMatch ? timeMatch[1] : "";
  let level = levelMatch ? levelMatch[1].toUpperCase() : "INFO";
  let message = logString;

  // 移除已解析的部分
  if (timeMatch) message = message.replace(timeMatch[0], "").trim();
  if (levelMatch) message = message.replace(levelMatch[0], "").trim();

  return { time, level, message };
};

export default {
  parseLogString,
  isImportantLog,
  isInstallationComplete,
  isInstallationError,
  getShellFormattedLog,
};

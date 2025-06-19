/**
 * 实例名称生成工具
 * 负责根据版本选择和现有实例列表生成唯一的实例名称
 */

import { instancesApi } from "@/services/api";

/**
 * 获取实例名称模式配置
 * @returns {string} - 实例名称模式
 */
const getInstanceNamePattern = () => {
  // 从localStorage获取用户自定义的实例名称模式
  const savedPattern = localStorage.getItem("instanceNamePattern");

  // 默认模式：MaiBot-{version}
  const defaultPattern = "MaiBot-{version}";

  return savedPattern || defaultPattern;
};

/**
 * 设置实例名称模式
 * @param {string} pattern - 实例名称模式
 */
export const setInstanceNamePattern = (pattern) => {
  if (!pattern || typeof pattern !== "string") {
    pattern = "MaiBot-{version}";
  }

  localStorage.setItem("instanceNamePattern", pattern);

  // 触发实例名称模式变更事件
  window.dispatchEvent(
    new CustomEvent("instance-name-pattern-changed", {
      detail: { pattern },
    })
  );
};

/**
 * 根据模式和变量生成实例名称
 * @param {string} pattern - 名称模式
 * @param {Object} variables - 变量对象
 * @returns {string} - 生成的实例名称
 */
const applyNamePattern = (pattern, variables) => {
  let result = pattern;

  // 替换变量占位符
  Object.keys(variables).forEach((key) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, "g"), variables[key] || "");
  });

  // 清理多余的分隔符
  result = result.replace(/[-_]+/g, "-").replace(/^[-_]+|[-_]+$/g, "");

  return result;
};

/**
 * 格式化版本名称为实例名称的一部分
 * @param {string} version - 版本名称
 * @returns {string} - 格式化后的版本名称
 */
export const formatVersionForInstanceName = (version) => {
  if (!version) return "Unknown";

  // 将版本名称转换为适合实例名称的格式
  switch (version.toLowerCase()) {
    case "main":
      return "Main";
    case "dev":
    case "develop":
      return "Dev";
    case "latest":
      return "Latest";
    case "stable":
      return "Stable";
    case "beta":
      return "Beta";
    default:
      // 对于版本号，需要替换特殊字符以符合实例名称规则
      let formattedVersion = version;

      // 替换点号为横线
      formattedVersion = formattedVersion.replace(/\./g, "-");

      // 替换其他不允许的字符为横线
      formattedVersion = formattedVersion.replace(
        /[^a-zA-Z0-9\-_\u4e00-\u9fa5]/g,
        "-"
      );

      // 移除连续的横线
      formattedVersion = formattedVersion.replace(/-+/g, "-");

      // 移除开头和结尾的横线
      formattedVersion = formattedVersion.replace(/^-+|-+$/g, "");

      // 首字母大写
      return (
        formattedVersion.charAt(0).toUpperCase() + formattedVersion.slice(1)
      );
  }
};

/**
 * 从后端获取现有实例列表
 * @returns {Promise<Array>} - 现有实例列表
 */
export const fetchExistingInstances = async () => {
  try {
    const response = await instancesApi.getInstances();
    console.log("获取实例列表响应:", response);

    // 正确处理axios响应结构
    const instances = response?.data?.instances || response?.instances || [];
    console.log("解析到的实例列表:", instances);

    return instances;
  } catch (error) {
    console.warn("获取实例列表失败，使用空列表:", error);
    return [];
  }
};

/**
 * 检查实例名称是否已存在
 * @param {string} name - 要检查的实例名称
 * @param {Array} existingInstances - 现有实例列表
 * @returns {boolean} - 是否已存在
 */
export const isInstanceNameExists = (name, existingInstances) => {
  return existingInstances.some(
    (instance) => instance.name.toLowerCase() === name.toLowerCase()
  );
};

/**
 * 生成唯一的实例名称
 * @param {string} version - 选择的版本
 * @param {Array} existingInstances - 现有实例列表
 * @returns {string} - 唯一的实例名称
 */
export const generateUniqueInstanceName = (version, existingInstances = []) => {
  const formattedVersion = formatVersionForInstanceName(version);
  
  // 基础名称格式：MaiBot-{Version}
  const baseName = `MaiBot-${formattedVersion}`;

  // 如果基础名称不存在，直接返回
  if (!isInstanceNameExists(baseName, existingInstances)) {
    return baseName;
  }

  // 如果存在，则递增数字后缀：MaiBot-{Version}-2, MaiBot-{Version}-3, ...
  let counter = 2; // 从2开始，因为第一个是没有数字后缀的
  let candidateName = `${baseName}-${counter}`;

  while (isInstanceNameExists(candidateName, existingInstances)) {
    counter++;
    candidateName = `${baseName}-${counter}`;
  }

  return candidateName;
};

/**
 * 异步生成唯一的实例名称（从后端获取最新实例列表）
 * @param {string} version - 选择的版本
 * @returns {Promise<string>} - 唯一的实例名称
 */
export const generateUniqueInstanceNameAsync = async (version) => {
  try {
    const existingInstances = await fetchExistingInstances();
    return generateUniqueInstanceName(version, existingInstances);  
  } catch (error) {
    console.error("生成实例名称时获取实例列表失败:", error);
    // 降级处理：生成带时间戳的名称确保唯一性
    const formattedVersion = formatVersionForInstanceName(version);
    const timestamp = Date.now().toString().slice(-4);
    return `MaiBot-${formattedVersion}-${timestamp}`;
  }
};

export default {
  formatVersionForInstanceName,
  fetchExistingInstances,
  isInstanceNameExists,
  generateUniqueInstanceName,
  generateUniqueInstanceNameAsync,
  setInstanceNamePattern,
  getInstanceNamePattern,
};

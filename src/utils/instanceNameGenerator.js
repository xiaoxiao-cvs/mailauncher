/**
 * 实例名称生成工具
 * 负责根据版本选择和现有实例列表生成唯一的实例名称
 */

import { instancesApi } from "@/services/api";

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
      // 对于版本号，保持原样但首字母大写
      if (version.startsWith("v") || /^\d+\.\d+/.test(version)) {
        return version.charAt(0).toUpperCase() + version.slice(1);
      }
      return version.charAt(0).toUpperCase() + version.slice(1).toLowerCase();
  }
};

/**
 * 从后端获取现有实例列表
 * @returns {Promise<Array>} - 现有实例列表
 */
export const fetchExistingInstances = async () => {
  try {
    const response = await instancesApi.getInstances();
    return response.instances || [];
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
  const baseName = `MaiBot-${formattedVersion}`;

  // 如果基础名称不存在，直接返回
  if (!isInstanceNameExists(baseName, existingInstances)) {
    return baseName;
  }

  // 如果存在，则递增数字后缀
  let counter = 1;
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
    // 降级处理：使用时间戳确保唯一性
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
};

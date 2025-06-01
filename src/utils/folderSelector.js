/**
 * 文件夹选择工具函数
 * 使用 Tauri 的文件对话框 API
 */

import { open } from "@tauri-apps/plugin-dialog";

/**
 * 选择文件夹
 * @param {Object} options - 选择选项
 * @param {string} options.title - 对话框标题
 * @param {string} options.defaultPath - 默认路径
 * @returns {Promise<string|null>} 选择的文件夹路径，如果取消则返回 null
 */
export const selectFolder = async (options = {}) => {
  try {
    const { title = "选择文件夹", defaultPath = undefined } = options;

    const selected = await open({
      directory: true,
      multiple: false,
      title,
      defaultPath,
    });

    return selected;
  } catch (error) {
    console.error("选择文件夹失败:", error);
    return null;
  }
};

/**
 * 获取默认数据存放路径
 * @returns {string} 默认路径
 */
export const getDefaultDataPath = () => {
  // Windows 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "windows") {
    return "D:\\MaiBot\\Data";
  }
  // macOS 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "macos") {
    return "~/Documents/MaiBot/Data";
  }
  // Linux 默认路径
  return "~/MaiBot/Data";
};

/**
 * 保存数据存放路径到本地存储
 * @param {string} path - 路径
 */
export const saveDataPath = (path) => {
  if (path) {
    localStorage.setItem("dataStoragePath", path);
  }
};

/**
 * 获取保存的数据存放路径
 * @returns {string} 保存的路径或默认路径
 */
export const getSavedDataPath = () => {
  return localStorage.getItem("dataStoragePath") || getDefaultDataPath();
};

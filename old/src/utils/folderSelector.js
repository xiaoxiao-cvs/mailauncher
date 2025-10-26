/**
 * 文件夹选择工具函数
 * 使用 Tauri 的文件对话框 API
 */

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

    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && (window.__TAURI__ || window.isTauriApp)) {
      // 动态导入 Tauri dialog 插件以避免在非 Tauri 环境中出错
      const { open } = await import("@tauri-apps/plugin-dialog");
      
      const selected = await open({
        directory: true,
        multiple: false,
        title,
        defaultPath,
      });

      return selected;
    } else {
      // 如果不在 Tauri 环境中，使用浏览器的文件选择 API（如果可用）
      console.warn("文件夹选择功能仅在 Tauri 环境中可用");
      
      // 可以考虑显示一个提示对话框
      if (typeof window !== 'undefined' && window.confirm) {
        alert("请在桌面应用中使用此功能，或手动输入路径。");
      }
      
      return null;
    }
  } catch (error) {
    console.error("选择文件夹失败:", error);
    
    // 如果是 Tauri API 错误，提供更详细的错误信息
    if (error.message && error.message.includes('invoke')) {
      console.error("Tauri API 调用失败，请确保应用已正确编译并运行在 Tauri 环境中");
    }
    
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

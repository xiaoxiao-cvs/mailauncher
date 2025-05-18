/**
 * 设置服务
 * 用于管理全局设置、打开设置面板等功能
 */

// 回调函数列表
let tabChangeCallbacks = [];
let currentTab = localStorage.getItem("settingsTab") || "appearance";
let isSettingsOpen = false;

/**
 * 打开设置面板
 * @param {String} tab 打开的标签页
 */
const openSettings = (tab) => {
  console.log("打开设置面板, 标签页:", tab);
  isSettingsOpen = true;

  // 如果指定了标签页，则切换到该标签页
  if (tab) {
    currentTab = tab;
    localStorage.setItem("settingsTab", tab);

    // 通知订阅者
    notifyTabChange(tab);
  }

  // 添加body类
  document.body.classList.add("settings-open");
};

/**
 * 关闭设置面板
 */
const closeSettings = () => {
  console.log("关闭设置面板");
  isSettingsOpen = false;

  // 移除body类
  document.body.classList.remove("settings-open");
};

/**
 * 设置当前标签页
 * @param {String} tab 标签页
 */
const setTab = (tab) => {
  console.log("设置标签页:", tab);
  currentTab = tab;
  localStorage.setItem("settingsTab", tab);

  // 通知订阅者
  notifyTabChange(tab);
};

/**
 * 获取当前标签页
 * @returns {String} 当前标签页
 */
const getTab = () => {
  return currentTab;
};

/**
 * 订阅标签页变化事件
 * @param {Function} callback 回调函数
 */
const onTabChange = (callback) => {
  if (typeof callback === "function") {
    tabChangeCallbacks.push(callback);
  }
};

/**
 * 取消订阅标签页变化事件
 * @param {Function} callback 回调函数
 */
const offTabChange = (callback) => {
  tabChangeCallbacks = tabChangeCallbacks.filter((cb) => cb !== callback);
};

/**
 * 通知标签页变化
 * @param {String} tab 变化后的标签页
 */
const notifyTabChange = (tab) => {
  console.log("通知标签页变化:", tab);
  tabChangeCallbacks.forEach((callback) => {
    try {
      callback(tab);
    } catch (error) {
      console.error("标签页变化回调执行错误:", error);
    }
  });
};

/**
 * 重置所有设置
 */
const resetSettings = () => {
  // 保存需要重置的设置项列表
  const settingsToReset = [
    "darkMode",
    "theme",
    "animationsEnabled",
    "sidebarExpanded",
    "dashboard-layout",
  ];

  // 逐项重置
  settingsToReset.forEach((key) => {
    localStorage.removeItem(key);
  });

  // 返回true表示重置成功
  return true;
};

// 导出设置服务
export default {
  openSettings,
  closeSettings,
  setTab,
  getTab,
  onTabChange,
  offTabChange,
  resetSettings,
};

/**
 * 资源管理器服务
 * 用于管理 MaiBot 资源管理器状态、打开资源管理器等功能
 */

// 回调函数列表
let tabChangeCallbacks = [];
let currentTab = localStorage.getItem("resourceManagerTab") || "overview";
let isResourceManagerOpen = false;
let currentInstanceId = null;
let currentInstanceName = null;

/**
 * 打开资源管理器
 * @param {String} instanceId 实例ID
 * @param {String} instanceName 实例名称
 * @param {String} tab 打开的标签页
 */
const openResourceManager = (instanceId, instanceName, tab) => {
  console.log("打开资源管理器, 实例:", instanceName, "标签页:", tab);
  isResourceManagerOpen = true;
  currentInstanceId = instanceId;
  currentInstanceName = instanceName;

  // 如果指定了标签页，则切换到该标签页
  if (tab) {
    currentTab = tab;
    localStorage.setItem("resourceManagerTab", tab);

    // 通知订阅者
    notifyTabChange(tab);
  }

  // 添加body类
  document.body.classList.add("resource-manager-open");
};

/**
 * 关闭资源管理器
 */
const closeResourceManager = () => {
  console.log("关闭资源管理器");
  isResourceManagerOpen = false;
  currentInstanceId = null;
  currentInstanceName = null;

  // 移除body类
  document.body.classList.remove("resource-manager-open");
};

/**
 * 设置标签页
 * @param {String} tabName 标签页名称
 */
const setTab = (tabName) => {
  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.setAttribute("data-resource-tab", tabName);

    // 触发标签页改变事件
    window.dispatchEvent(
      new CustomEvent("resource-tab-changed", {
        detail: { tab: tabName },
      })
    );

    return true;
  }
  return false;
};

/**
 * 获取当前标签页
 * @returns {String} 当前标签页
 */
const getTab = () => {
  const appRoot = document.getElementById("app");
  if (appRoot) {
    return appRoot.getAttribute("data-resource-tab") || "overview";
  }
  return "overview";
};

/**
 * 获取当前实例信息
 * @returns {Object} 当前实例信息
 */
const getCurrentInstance = () => {
  return {
    id: currentInstanceId,
    name: currentInstanceName,
    isOpen: isResourceManagerOpen
  };
};

/**
 * 订阅标签页变化事件
 * @param {Function} callback 回调函数
 */
const onTabChange = (callback) => {
  if (typeof callback === "function") {
    window.addEventListener("resource-tab-changed", (e) =>
      callback(e.detail.tab)
    );
  }
};

/**
 * 取消订阅标签页变化事件
 * @param {Function} callback 回调函数
 */
const offTabChange = (callback) => {
  if (typeof callback === "function") {
    window.removeEventListener("resource-tab-changed", callback);
  }
};

/**
 * 通知标签页变化
 * @param {String} tab 变化后的标签页
 */
const notifyTabChange = (tab) => {
  console.log("通知资源管理器标签页变化:", tab);
  tabChangeCallbacks.forEach((callback) => {
    try {
      callback(tab);
    } catch (error) {
      console.error("资源管理器标签页变化回调执行错误:", error);
    }
  });
};

/**
 * 重置资源管理器设置
 */
const resetResourceManagerSettings = () => {
  // 保存需要重置的设置项列表
  const settingsToReset = [
    "resourceManagerTab",
    "autoBackup_",  // 这个会在具体实例中处理
  ];

  // 逐项重置
  settingsToReset.forEach((key) => {
    if (key === "autoBackup_") {
      // 清理所有自动备份设置
      Object.keys(localStorage).forEach(storageKey => {
        if (storageKey.startsWith("autoBackup_")) {
          localStorage.removeItem(storageKey);
        }
      });
    } else {
      localStorage.removeItem(key);
    }
  });

  // 重置当前标签页
  currentTab = "overview";

  // 触发重置事件
  window.dispatchEvent(new CustomEvent("resource-manager-reset"));

  // 返回true表示重置成功
  return true;
};

/**
 * 检查资源管理器是否打开
 * @returns {Boolean} 是否打开
 */
const isOpen = () => {
  return isResourceManagerOpen;
};

// 导出资源管理器服务
export default {
  openResourceManager,
  closeResourceManager,
  setTab,
  getTab,
  getCurrentInstance,
  onTabChange,
  offTabChange,
  resetResourceManagerSettings,
  isOpen,
};

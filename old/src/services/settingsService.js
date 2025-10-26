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
 * 设置标签页
 * @param {String} tabName 标签页名称
 */
const setTab = (tabName) => {
  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.setAttribute("data-settings-tab", tabName);

    // 触发标签页改变事件
    window.dispatchEvent(
      new CustomEvent("settings-tab-changed", {
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
    return appRoot.getAttribute("data-settings-tab") || "appearance";
  }
  return "appearance";
};

/**
 * 订阅标签页变化事件
 * @param {Function} callback 回调函数
 */
const onTabChange = (callback) => {
  if (typeof callback === "function") {
    window.addEventListener("settings-tab-changed", (e) =>
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
    window.removeEventListener("settings-tab-changed", callback);
  }
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
    "themeMode",
    "animationsEnabled",
    "sidebarExpanded",
    "dashboard-layout",
    "themeColor",
    "fontSize",
    "layoutDensity",
  ];

  // 逐项重置
  settingsToReset.forEach((key) => {
    localStorage.removeItem(key);
  });

  // 重置主题为light
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.classList.remove("dark-mode");

  // 移除自定义主题色
  document.documentElement.style.removeProperty("--p");
  document.documentElement.style.removeProperty("--primary");
  document.documentElement.style.removeProperty("--primary-color");
  document.documentElement.style.removeProperty("--primary-light");
  document.documentElement.style.removeProperty("--primary-dark");
  document.documentElement.style.removeProperty("--pf");
  document.documentElement.style.removeProperty("--pc");

  // 触发主题重置事件
  window.dispatchEvent(new CustomEvent("theme-reset"));

  // 重置字体大小
  document.documentElement.style.setProperty("--base-font-size", "14px");

  // 重置布局密度
  document.documentElement.setAttribute("data-density", "comfortable");

  // 恢复动画效果
  document.documentElement.classList.remove("no-animations");

  // 返回true表示重置成功
  return true;
};

/**
 * 设置配置项
 * @param {String} key 配置键
 * @param {*} value 配置值
 */
const setSetting = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`设置已保存: ${key} = ${value}`);
  } catch (error) {
    console.error(`保存设置失败: ${key}`, error);
  }
};

/**
 * 获取配置项
 * @param {String} key 配置键
 * @param {*} defaultValue 默认值
 * @returns {*} 配置值
 */
const getSetting = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`获取设置失败: ${key}`, error);
    return defaultValue;
  }
};

/**
 * 获取所有设置
 * @returns {Object} 所有设置的对象
 */
const getSettings = () => {
  const settings = {};
  
  // 预定义的设置键
  const settingKeys = [
    'theme.mode',
    'appearance.glassEffect',
    'appearance.reduceAnimations', 
    'appearance.dynamicWallpaper',
    'appearance.fontSize',
    'system.autoStart',
    'system.minimizeToTray',
    'system.gpuAcceleration',
    'network.serverUrl',
    'network.connectionTimeout'
  ];
  
  settingKeys.forEach(key => {
    const value = getSetting(key);
    if (value !== null) {
      // 将点分割的键转换为嵌套对象
      const keys = key.split('.');
      let current = settings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }
  });
  
  return settings;
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
  setSetting,
  getSetting,
  getSettings,
};

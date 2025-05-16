// 布局控制服务
const LOCAL_STORAGE_KEY = "dashboard-layout";

/**
 * 保存布局配置到本地存储
 * @param {Object} layout 布局配置对象
 * @returns {boolean} 保存成功返回true
 */
export const saveLayout = (layout) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
    return true;
  } catch (e) {
    console.error("保存布局配置失败:", e);
    return false;
  }
};

/**
 * 从本地存储加载布局配置
 * @returns {Object|null} 布局配置对象，如果没有保存过则返回null
 */
export const loadLayout = () => {
  try {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
      return JSON.parse(savedLayout);
    }
    return null;
  } catch (e) {
    console.error("加载布局配置失败:", e);
    return null;
  }
};

/**
 * 重置布局配置到默认状态
 * @returns {Object} 默认布局配置对象
 */
export const resetLayout = () => {
  const defaultLayout = {
    msgChartSize: "md:col-span-3 lg:col-span-4",
    statusCardSize: "md:col-span-1 lg:col-span-2",
    noticeCardSize: "md:col-span-2 lg:col-span-3",
    instanceCardSize: "md:col-span-2 lg:col-span-3",
  };

  saveLayout(defaultLayout);
  return defaultLayout;
};

export default {
  saveLayout,
  loadLayout,
  resetLayout,
};

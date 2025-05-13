import { ref } from "vue";

// 创建设置状态管理
export const useSettingsService = () => {
  // 设置面板是否显示
  const isSettingsOpen = ref(false);

  // 当前活动的设置选项卡
  const activeSettingsTab = ref("appearance");

  // 打开设置面板
  const openSettings = (tab = "appearance") => {
    activeSettingsTab.value = tab;
    isSettingsOpen.value = true;
    document.body.style.overflow = "hidden"; // 防止背景滚动
  };

  // 关闭设置面板
  const closeSettings = () => {
    isSettingsOpen.value = false;
    document.body.style.overflow = ""; // 恢复背景滚动
  };

  // 切换设置选项卡
  const switchSettingsTab = (tab) => {
    activeSettingsTab.value = tab;
  };

  return {
    isSettingsOpen,
    activeSettingsTab,
    openSettings,
    closeSettings,
    switchSettingsTab,
  };
};

// 创建全局单例
const settingsService = useSettingsService();
export default settingsService;

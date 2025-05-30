<template>
  <!-- 修复：移除直接访问window，改用计算属性 -->
  <div v-if="isMockMode" class="backend-offline-warning">
    <div class="alert alert-warning shadow-lg max-w-md mx-auto">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none"
          viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>后端连接失败，当前使用模拟数据</span>
      </div>
    </div>
  </div>

  <div id="app" class="app-container"
    :class="{ 'dark-mode': darkMode, 'sidebar-expanded': sidebarExpanded, 'sidebar-collapsed': !sidebarExpanded }"
    :data-theme="currentTheme">
    <!-- 侧边栏 -->
    <AppSidebar :is-expanded="sidebarExpanded" @toggle="toggleSidebar" />

    <!-- 主内容区域 -->
    <div class="content-area" :class="{ 'sidebar-expanded': sidebarExpanded }">
      <!-- 页面切换动画 -->
      <transition name="page-transition" mode="out-in">
        <component :is="currentComponent" :key="activeTab" />
      </transition>
    </div>

    <!-- 设置抽屉 -->
    <SettingsDrawer :is-open="isSettingsOpen" @close="closeSettings" />

    <!-- 编辑模式覆盖层 - 当任何组件进入编辑模式时显示 -->
    <div v-if="isAnyEditModeActive" class="dashboard-edit-overlay"></div>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, computed, onBeforeUnmount, watch, nextTick, h } from 'vue'
import HomeView from './components/HomeView.vue'
import DownloadsPanel from './components/DownloadsPanel.vue'
import InstancesPanel from './components/InstancesPanel.vue'
import AppSidebar from './components/AppSidebar.vue'
import SettingsDrawer from './components/settings/SettingsDrawer.vue'
import PluginsView from './views/PluginsView.vue'
import ChatRoom from './components/chat/ChatRoom.vue' // 导入聊天室组件
import settingsService from './services/settingsService'
import { initTheme, applyThemeColor, useDarkMode } from './services/theme'
import toastService from './services/toastService';
import { exposeToastForDebugging } from './utils/debugUtils';
import apiService from './services/apiService';
import backendConfig from './config/backendConfig';
import { usePollingStore } from './stores/pollingStore';

// 添加模拟模式状态
const useMockData = ref(localStorage.getItem("useMockData") === "true");

// 添加计算属性，替代直接访问window属性
const isMockMode = computed(() => useMockData.value);

// 提供模拟模式状态给所有组件
provide('useMockData', useMockData);

// 深色模式状态 - 应用级别的中心管理
const { darkMode, toggleDarkMode } = useDarkMode();

// 侧边栏展开状态
const sidebarExpanded = ref(false);
// 设置面板状态
const isSettingsOpen = ref(false);
// 任何编辑模式状态
const isAnyEditModeActive = ref(false);

// 当前主题
const currentTheme = computed(() => {
  // 从localStorage获取保存的主题，如果没有则返回'light'
  return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
});

// 创建更完整的事件总线
const emitter = {
  _events: {},
  on(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
  },
  emit(event, ...args) {
    if (this._events[event]) {
      this._events[event].forEach(callback => callback(...args));
    }
  },
  off(event, callback) {
    if (this._events[event]) {
      if (callback) {
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      } else {
        // 如果没有传回调，则删除整个事件
        delete this._events[event];
      }
    }
  },
  // 添加清理方法
  clear() {
    this._events = {};
  }
};

// 提供事件总线给所有组件
provide('emitter', emitter);

// 提供深色模式状态给所有组件
provide('darkMode', darkMode);

// 提供当前主题给所有组件
provide('currentTheme', currentTheme);

// 提供侧边栏状态给所有组件
provide('sidebarExpanded', sidebarExpanded);

// 提供编辑模式状态给所有组件
provide('isAnyEditModeActive', isAnyEditModeActive);

// 提供Toast服务给所有组件
provide('toast', toastService);

// 在开发环境下暴露toast服务到全局用于调试
if (process.env.NODE_ENV !== 'production') {
  exposeToastForDebugging(toastService);
}

// 获取轮询store实例
const pollingStore = usePollingStore();

// 侧边栏菜单项，更新为DaisyUI风格的图标
const menuItems = {
  home: { title: '仪表盘', icon: 'mdi:home' },
  instances: { title: '实例管理', icon: 'mdi:server' },
  downloads: { title: '下载中心', icon: 'mdi:download' },
  chat: { title: '聊天室', icon: 'mdi:chat' }, // 添加聊天室菜单项
  settings: { title: '系统设置', icon: 'mdi:cog' },
  plugins: { title: '插件广场', icon: 'mdi:puzzle' }
}

// 提供菜单项给侧边栏组件
provide('menuItems', menuItems);

// 标签页相关
const activeTab = ref('home')

// 处理标签页切换 - 将通过事件总线由HomeView的侧边栏触发
const handleTabSelect = (tab) => {
  activeTab.value = tab;
}

// 提供activeTab供侧边栏组件使用
provide('activeTab', activeTab);

// 计算当前组件 - 确保使用SettingsDrawer而非SettingsPanel
const currentComponent = computed(() => {
  switch (activeTab.value) {
    case 'home': return HomeView;
    case 'instances': return InstancesPanel;
    case 'downloads': return DownloadsPanel;
    case 'chat': return ChatRoom; // 添加聊天室组件
    case 'settings':
      // 使用设置抽屉而不是旧的设置组件
      openSettings();
      return HomeView; // 保持当前页面为首页
    case 'plugins':
      return PluginsView;
    default:
      // 默认处理逻辑保持不变
      return {
        render() {
          return h('div', { class: 'tab-content' }, [
            h('h3', {}, menuItems[activeTab.value]?.title || activeTab.value),
            h('p', {}, '页面内容建设中...')
          ]);
        }
      };
  }
});

// 提供处理安装事件 - 添加实例名称验证
provide('handleInstall', (installConfig) => {
  if (!installConfig.instanceName || installConfig.instanceName.trim() === '') {
    // 使用原生警告代替ElMessage
    alert('安装失败: 缺少实例名称');
    return false;
  }
  // 处理安装逻辑
  console.log('开始安装实例:', installConfig);
  return true;
});

// 监听深色模式变化
const updateDarkMode = (isDark) => {
  darkMode.value = isDark;

  // 应用深色模式到根文档
  if (isDark) {
    document.documentElement.classList.add('dark-mode');

    // 更新与主题相关的状态
    if (['light', 'cupcake', 'bumblebee', 'corporate', 'emerald'].includes(currentTheme.value)) {
      // 如果当前主题是明亮系主题，自动切换到dark主题
      changeTheme('dark');
    }
  } else {
    document.documentElement.classList.remove('dark-mode');

    // 更新与主题相关的状态
    if (['dark', 'night', 'dracula', 'black'].includes(currentTheme.value)) {
      // 如果当前主题是暗色系主题，自动切换到light主题
      changeTheme('light');
    }
  }
};

// 初始化深色模式状态
const initDarkMode = () => {
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode !== null) {
    darkMode.value = savedDarkMode === 'true';
  } else {
    // 检查系统偏好
    darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // 立即应用当前深色模式设置
  updateDarkMode(darkMode.value);
};

// 切换侧边栏状态 - 更新为DaisyUI兼容的处理
const toggleSidebar = () => {
  console.log('侧边栏切换被触发，当前状态:', sidebarExpanded.value);

  // 切换状态
  sidebarExpanded.value = !sidebarExpanded.value;

  // 保存状态到本地存储
  localStorage.setItem('sidebarExpanded', sidebarExpanded.value.toString());

  // 更新CSS变量以确保内容区域正确偏移
  const sidebarWidth = sidebarExpanded.value ? '220px' : '64px';
  document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  document.documentElement.style.setProperty(
    '--content-margin',
    sidebarExpanded.value ? '235px' : '79px'
  );
  document.documentElement.style.setProperty(
    '--content-width',
    sidebarExpanded.value ? 'calc(100% - 220px)' : 'calc(100% - 64px)'
  );

  // 添加类以控制整体布局
  const appElement = document.querySelector('.app-container');
  if (appElement) {
    if (sidebarExpanded.value) {
      appElement.classList.add('sidebar-expanded');
      appElement.classList.remove('sidebar-collapsed');
    } else {
      appElement.classList.add('sidebar-collapsed');
      appElement.classList.remove('sidebar-expanded');
    }
  }

  // 触发自定义事件，通知侧边栏状态变化
  window.dispatchEvent(new CustomEvent('sidebar-state-changed'));

  // 确保DOM更新后再触发resize事件
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    console.log('侧边栏切换完成，新状态:', sidebarExpanded.value);
  }, 300);
};

// 监听侧边栏展开状态变化 - 确保正确应用CSS变量
const checkSidebarState = () => {
  sidebarExpanded.value = localStorage.getItem('sidebarExpanded') === 'true';

  // 根据侧边栏状态更新CSS变量
  const sidebarWidth = sidebarExpanded.value ? '220px' : '64px';
  document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  document.documentElement.style.setProperty(
    '--content-margin',
    sidebarExpanded.value ? '235px' : '79px'
  );
  document.documentElement.style.setProperty(
    '--content-width',
    sidebarExpanded.value ? 'calc(100% - 220px)' : 'calc(100% - 64px)'
  );
};

// 打开设置面板
const openSettings = (tab) => {
  isSettingsOpen.value = true;
  settingsService.openSettings(tab);
};

// 关闭设置面板
const closeSettings = () => {
  isSettingsOpen.value = false;
  settingsService.closeSettings();

  // 不再自动跳转到主页，保持在当前页面
};

// 监听日志查看事件和页面导航
onMounted(() => {
  // 初始化模拟数据设置 - 如果localStorage中没有值，默认为false
  if (localStorage.getItem("useMockData") === null) {
    localStorage.setItem("useMockData", "false");
    useMockData.value = false;
  }

  // 初始化深色模式 (从App.vue中集中管理)
  initDarkMode();

  // 初始化主题色
  initTheme();

  // 初始化侧边栏状态
  checkSidebarState();

  // 应用保存的主题 (确保在mounted中只设置一次)
  document.documentElement.setAttribute('data-theme', currentTheme.value);

  // 添加全局导航事件监听 - 用于从任何组件强制导航
  window.addEventListener('force-navigate', (event) => {
    if (event.detail && event.detail.tab) {
      console.log('强制导航到:', event.detail.tab);
      activeTab.value = event.detail.tab;
    }
  });

  // 监听侧边栏状态变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'sidebarExpanded') {
      checkSidebarState();
    }
  });

  // 定期检查侧边栏状态 - 改用事件监听
  window.addEventListener('sidebar-state-changed', () => {
    checkSidebarState();
  });

  // 重写导航事件处理,添加调试日志
  emitter.on('navigate-to-tab', (tabName) => {
    console.log(`接收到导航事件: ${tabName}`);

    // 强制延迟执行导航，确保任何组件内的操作都完成
    setTimeout(() => {
      // 清除已有处理器并重新绑定
      if (tabName === 'settings') {
        console.log('正在打开设置抽屉');
        // 如果是导航到设置，打开设置抽屉
        openSettings();
      } else if (menuItems[tabName] || tabName === 'home') {
        console.log(`切换标签页到: ${tabName}`);
        // 如果是其他有效选项卡，切换标签页
        activeTab.value = tabName;

        // 添加额外的强制更新机制
        nextTick(() => {
          // 强制触发DOM更新
          if (document.querySelector('.content-area')) {
            document.querySelector('.content-area').classList.add('tab-changing');
            setTimeout(() => {
              document.querySelector('.content-area')?.classList.remove('tab-changing');
            }, 50);
          }
        });
      } else {
        console.warn(`未知标签页: ${tabName}`);
      }
    }, 10);
  });

  // 添加深色模式变化监听
  emitter.on('dark-mode-changed', updateDarkMode);

  // 添加主题色变化监听
  emitter.on('theme-color-changed', (color) => {
    console.log('Theme color changed to:', color);
    // 更新全局主题色变量
    window.currentThemeColor = color;

    // 更新图表颜色
    const lightenColor = adjustColorBrightness(color, 20);
    document.documentElement.style.setProperty('--chart-line', color);
    document.documentElement.style.setProperty('--chart-secondary', lightenColor);

    // 触发窗口的resize事件，让图表重新绘制
    window.dispatchEvent(new Event('resize'));
  });

  // 添加主题变化监听
  emitter.on('theme-changed', (themeName) => {
    changeTheme(themeName);
  });
  // 应用初始化
  checkApiConnection().then(() => {
    console.log("应用初始化完成：使用模拟数据模式");
  });

  // 初始化轮询系统
  console.log("正在初始化轮询系统...");
  pollingStore.initializeDefaultPolling();
  console.log("轮询系统初始化完成");

  // 监听系统深色模式变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // 只有当用户未明确设置时，才跟随系统变化
    if (localStorage.getItem('darkMode') === null) {
      updateDarkMode(e.matches);
    }
  });

  // 添加编辑模式事件监听
  emitter.on('edit-mode-changed', (isActive) => {
    isAnyEditModeActive.value = isActive;
  });

  // 监听主题变化事件
  window.addEventListener('theme-changed', (event) => {
    if (event.detail && event.detail.name) {
      currentTheme.value = event.detail.name;
    }
  });

  // 监听主题重置事件
  window.addEventListener('theme-reset', () => {
    currentTheme.value = 'light';
    darkMode.value = false;
  });

  // 监听Bot配置事件
  emitter.on('open-bot-config', (instance) => {
    console.log('App收到打开Bot配置事件:', instance);
    // 通知实例面板直接打开Bot配置 - 添加fromDetailView标记
    emitter.emit('instance-panel-open-bot-config', instance);
  });
});

// 颜色亮度调整工具函数
const adjustColorBrightness = (hex, percent) => {
  // 将十六进制颜色转换为RGB
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // 调整亮度
  r = Math.min(255, Math.max(0, Math.round(r + (r * percent / 100))));
  g = Math.min(255, Math.max(0, Math.round(g + (g * percent / 100))));
  b = Math.min(255, Math.max(0, Math.round(b + (b * percent / 100))));

  // 转换回十六进制格式
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// 添加侧边栏颜色更新函数
const updateSidebarColorVariable = (themeColor, isDarkMode) => {
  // 根据主题色生成配套的侧边栏颜色
  const baseColor = isDarkMode
    ? adjustColorBrightness(themeColor, -40) // 深色模式下变暗
    : adjustColorBrightness(themeColor, 90);  // 浅色模式下变亮

  // 转换为rgba格式
  const hexToRgba = (hex, opacity) => {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // 生成侧边栏背景色
  const sidebarBg = hexToRgba(baseColor, 0.65);

  // 更新CSS变量
  document.documentElement.style.setProperty('--sidebar-bg', sidebarBg);
};

// 监听深色模式变化
watch(darkMode, (newValue) => {
  // 当深色模式变化时，更新侧边栏颜色
  if (window.currentThemeColor) {
    updateSidebarColorVariable(window.currentThemeColor, newValue);
  }
});

// 监听主题变化
watch(currentTheme, (newValue) => {
  // 当主题变化时，更新data-theme属性
  document.documentElement.setAttribute('data-theme', newValue);

  // 根据新主题判断是否为深色主题，并更新darkMode状态
  const isDarkTheme = ['dark', 'night', 'dracula', 'black'].includes(newValue);
  if (isDarkTheme !== darkMode.value) {
    darkMode.value = isDarkTheme;
    localStorage.setItem('darkMode', isDarkTheme);
  }
});

// 组件卸载时清理
onBeforeUnmount(() => {
  // 清理事件总线
  emitter.clear();

  // 移除系统深色模式监听
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => { });

  // 移除编辑模式事件监听
  emitter.off('edit-mode-changed');

  // 移除全局导航事件监听
  window.removeEventListener('force-navigate', () => { });

  // 删除可能存在的对ModuleSettingsModal的引用和事件监听
  emitter.off('open-module-settings');
  emitter.off('close-module-settings');

  window.removeEventListener('theme-changed', () => { });
  window.removeEventListener('theme-reset', () => { });
});

// 检查API连接 - 更新为使用实际后端连接检测
const checkApiConnection = async () => {
  console.log("检查后端连接...");
  console.log(`后端地址: ${backendConfig.getBackendUrl()}`);

  try {
    // 尝试连接到health端点
    const connected = await apiService.testBackendConnection();

    if (connected) {
      console.log("成功连接到后端服务!");
      localStorage.setItem("useMockData", "false");
      useMockData.value = false;
      toastService.success("已连接到后端服务");
      return true;
    } else {
      throw new Error("连接测试失败");
    }
  } catch (error) {
    console.warn("无法连接到后端服务，将使用模拟数据:", error);

    // 自动切换到模拟数据模式
    localStorage.setItem("useMockData", "true");
    useMockData.value = true;

    // 显示提示
    setTimeout(() => {
      toastService.warning("无法连接到后端服务，应用将使用模拟数据");
    }, 1500);

    return false;
  }
};

// 添加安全的主题应用函数
const safeApplyTheme = (themeName) => {
  try {
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);

    // 发送主题变化事件
    emitter.emit('theme-changed', themeName);

    // 确保颜色变量正确更新
    const savedColor = localStorage.getItem('themeColor') || '#3b82f6';
    if (savedColor.includes('%') || savedColor.split(' ').length === 3) {
      // 如果是无效的HSL格式,使用默认颜色
      console.log('检测到无效HSL格式,使用默认颜色');
      localStorage.setItem('themeColor', '#3b82f6');
      document.documentElement.style.setProperty('--primary-color', '#3b82f6');
    } else {
      document.documentElement.style.setProperty('--primary-color', savedColor);
    }
  } catch (err) {
    console.error('应用主题失败:', err);
    // 使用安全默认值
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

// 替换原来的changeTheme函数
const changeTheme = (themeName) => {
  safeApplyTheme(themeName);
};
</script>

<style>
/* 确保所有@apply指令已被正确转换，避免相关错误 */
@import './assets/css/app.css';
@import './assets/css/dashboard-layout.css';
@import './assets/css/simple-icons.css';
@import './assets/css/icon-fixes.css';
@import './assets/css/theme-utils.css';
/* 添加图标修复样式 */

/* 后端离线警告样式 */
.backend-offline-warning {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 100%;
  max-width: 30rem;
}
</style>

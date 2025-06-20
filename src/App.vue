<template>  <div id="app" class="app-container enhanced-light-theme"
    :class="{ 
      'dark-mode': darkMode, 
      'sidebar-expanded': sidebarExpanded, 
      'sidebar-collapsed': !sidebarExpanded, 
      'theme-dark': currentTheme === 'dark', 
      'theme-light': currentTheme === 'light',
      'enhanced-theme': true
    }"
    :data-theme="currentTheme"><!-- 侧边栏 -->
    <AppSidebar :is-expanded="sidebarExpanded" :is-settings-open="isSettingsOpen" @toggle="toggleSidebar" />

    <!-- 主内容区域 -->
    <div class="content-area" :class="{ 'sidebar-expanded': sidebarExpanded }" :data-theme="currentTheme">
      <!-- 页面切换动画 -->
      <transition :name="transitionName" mode="out-in">
        <component :is="currentComponent" :key="componentKey" />
      </transition>
    </div><!-- 设置抽屉 -->
    <SettingsDrawer :is-open="isSettingsOpen" @close="closeSettings" /> <!-- 欢迎弹窗 -->
    <WelcomeModal :visible="showWelcomeModal" @close="closeWelcomeModal" @start-setup-wizard="startSetupWizard"
      @open-settings="openSettingsFromWelcome" />

    <!-- 首次设置向导 -->
    <FirstTimeSetupWizard :visible="showSetupWizard" @close="closeSetupWizard" @complete="handleSetupComplete" />

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
import WelcomeModal from './components/common/WelcomeModal.vue'
import FirstTimeSetupWizard from './components/setup/FirstTimeSetupWizard.vue'
import PluginsView from './views/PluginsView.vue'
import ChatRoom from './components/chat/ChatRoom.vue' // 导入聊天室组件
import IconifyIcon from './components/common/IconifyIcon.vue' // 导入图标组件
import settingsService from './services/settingsService'
import { initTheme, setTheme, useDarkMode, useTheme } from './services/theme-simplified'
import toastService from './services/toastService';
import { exposeToastForDebugging } from './utils/debugUtils';
import apiService from './services/apiService';
import backendConfig from './config/backendConfig.js';
import { usePollingStore } from './stores/pollingStore';

// 快速重连状态
const isQuickReconnecting = ref(false);

// 深色模式状态 - 应用级别的中心管理
const { darkMode, toggleDarkMode } = useDarkMode();

// 侧边栏展开状态
const sidebarExpanded = ref(false);
// 设置面板状态
const isSettingsOpen = ref(false);
// 任何编辑模式状态
const isAnyEditModeActive = ref(false);

// 欢迎弹窗状态
const showWelcomeModal = ref(false);
const showSetupWizard = ref(false);

// 欢迎弹窗相关方法
const closeWelcomeModal = () => {
  showWelcomeModal.value = false;
};

const handleDontShowAgain = () => {
  localStorage.setItem('welcomeModalDontShow', 'true');
  showWelcomeModal.value = false;
};

// 从欢迎弹窗打开设置
const openSettingsFromWelcome = () => {
  showWelcomeModal.value = false;
  setTimeout(() => {
    openSettings('system'); // 默认打开系统设置标签页
  }, 300);
};

// 开始首次设置向导
const startSetupWizard = () => {
  showWelcomeModal.value = false;
  showSetupWizard.value = true;
};

// 关闭设置向导
const closeSetupWizard = () => {
  showSetupWizard.value = false;
};

// 设置向导完成
const handleSetupComplete = () => {
  showSetupWizard.value = false;
  toastService.success('配置完成，欢迎使用 MaiLauncher！');
};

// 检查是否应该显示欢迎弹窗或设置向导
const checkWelcomeModal = () => {
  const dontShow = localStorage.getItem('welcomeModalDontShow');
  const setupCompleted = localStorage.getItem('firstTimeSetupCompleted');

  // 如果是首次使用且没有完成设置，直接显示设置向导
  if (!setupCompleted) {
    showSetupWizard.value = true;
    return;
  }

  // 否则检查是否应该显示欢迎弹窗
  if (!dontShow || dontShow !== 'true') {
    showWelcomeModal.value = true;
  }
};

// 当前主题 - 使用简化的主题服务
const { currentTheme } = useTheme();

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
  chat: { title: '聊天室 (开发中)', icon: 'mdi:chat' }, // 聊天室功能正在开发中
  settings: { title: '系统设置', icon: 'mdi:cog' },
  plugins: { title: '插件广场', icon: 'mdi:puzzle' }
}

// 提供菜单项给侧边栏组件
provide('menuItems', menuItems);

// 标签页相关
const activeTab = ref('home')
// 添加一个ref来追踪当设置打开时应该显示的页面
const lastNonSettingsTab = ref('home')

// 处理标签页切换 - 将通过事件总线由HomeView的侧边栏触发
const handleTabSelect = (tab) => {
  activeTab.value = tab;
}

// 提供activeTab供侧边栏组件使用
provide('activeTab', activeTab);

// 暴露activeTab到全局供Toast服务等使用
window.currentActiveTab = activeTab.value;
watch(activeTab, (newTab) => {
  window.currentActiveTab = newTab;
  console.log('当前活跃标签页更新为:', newTab);
});

// 计算当前组件 - 简化逻辑，移除设置页面
const currentComponent = computed(() => {
  // 如果当前标签是设置，使用最后的非设置标签页
  const tabToShow = activeTab.value === 'settings' ? lastNonSettingsTab.value : activeTab.value;

  switch (tabToShow) {
    case 'home': return HomeView;
    case 'instances': return InstancesPanel;
    case 'downloads': return DownloadsPanel;
    case 'chat': return ChatRoom;
    case 'plugins': return PluginsView;
    default:
      // 如果是未知标签页，返回主页
      return HomeView;
  }
});

// 计算组件key，避免设置时的动画
const componentKey = computed(() => {
  // 如果当前是设置模式，使用lastNonSettingsTab作为key
  // 这样可以避免在打开/关闭设置时触发组件重新渲染
  return activeTab.value === 'settings' ? lastNonSettingsTab.value : activeTab.value;
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

// 页面导航方向检测
const pageOrder = ['home', 'instances', 'downloads', 'chat', 'plugins'];
const navigationDirection = ref('forward');
const previousTab = ref(activeTab.value);

// 计算导航方向
const getNavigationDirection = (fromTab, toTab) => {
  const fromIndex = pageOrder.indexOf(fromTab);
  const toIndex = pageOrder.indexOf(toTab);

  if (fromIndex === -1 || toIndex === -1) return 'forward';

  return toIndex > fromIndex ? 'forward' : 'backward';
};

// 监听标签页变化以更新导航方向
watch(activeTab, (newTab, oldTab) => {
  if (oldTab && newTab !== oldTab) {
    navigationDirection.value = getNavigationDirection(oldTab, newTab);
    previousTab.value = oldTab;
  }
});

// 计算过渡动画名称
const transitionName = computed(() => {
  return navigationDirection.value === 'forward' ? 'slide-down' : 'slide-up';
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
      setTheme('dark');
    }
  } else {
    document.documentElement.classList.remove('dark-mode');

    // 更新与主题相关的状态
    if (currentTheme.value === 'dark') {
      // 如果当前主题是暗色系主题，自动切换到light主题
      setTheme('light');
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
  // 设置关闭后保持在设置页面，用户可以手动切换到其他页面
};

// 监听日志查看事件和页面导航
onMounted(() => {
  // 检查是否显示欢迎弹窗 (在所有初始化完成后)
  setTimeout(() => {
    checkWelcomeModal();
  }, 1000);
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
  // 简化导航事件处理
  emitter.on('navigate-to-tab', (tabName) => {
    console.log(`接收到导航事件: ${tabName}, 当前页面: ${activeTab.value}`);

    if (tabName === 'settings') {
      // 设置页面：记录当前页面作为背景页面，只打开设置抽屉
      if (activeTab.value !== 'settings') {
        lastNonSettingsTab.value = activeTab.value;
      }
      console.log(`打开设置，背景页面保持为: ${lastNonSettingsTab.value}`);
      openSettings();
    } else if (menuItems[tabName] || tabName === 'home') {
      // 其他页面：更新背景页面记录并切换
      console.log(`从 ${activeTab.value} 切换到 ${tabName}`);
      lastNonSettingsTab.value = tabName;
      activeTab.value = tabName;
    } else {
      console.warn(`未知标签页: ${tabName}`);
    }
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
  // 添加主题变化监听 - 移除以防止无限循环
  // emitter.on('theme-changed', (themeName) => {
  //   changeTheme(themeName);
  // });  // 应用初始化
  checkApiConnection().then(() => {
    console.log("应用初始化完成");
  });

  // 检查轮询系统是否已经初始化，避免重复初始化
  if (!pollingStore.isGlobalPollingActive) {
    console.log("正在初始化轮询系统...");
    pollingStore.initializeDefaultPolling();
    console.log("轮询系统初始化完成");
  } else {
    console.log("轮询系统已经初始化，跳过重复初始化");
  }// 监听localStorage变化
  window.addEventListener('storage', (e) => {
    // 可以在这里处理其他需要监听的localStorage变化
    console.log('localStorage变更:', e.key, e.newValue);
  });  // 监听后端连接状态变化事件（从设置面板触发）
  window.addEventListener('backend-connection-changed', (e) => {
    const { connected } = e.detail;
    console.log('接收到后端连接状态变化:', { connected });
    // 可以在这里处理连接状态变化的逻辑
  });

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
  });  // 主题变更监听处理
  const handleThemeChange = (event) => {
    console.log('App.vue 接收到主题变更事件:', event.type, new Date().toISOString());

    // 获取新主题
    const newTheme = event.detail?.theme || (event.detail?.isDark ? 'dark' : 'light');
    const currentAppTheme = document.documentElement.getAttribute('data-theme');

    console.log('应用新主题:', newTheme, '当前主题:', currentAppTheme);

    // 强制设置主题到所有关键元素（移除提前返回的检查）
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);

    // 应用到所有主要容器元素，包括主页面内容
    const selectors = [
      '.app-container',
      '.content-area',
      '.home-view',
      '.instances-panel',
      '.main-content',
      '.sidebar',
      '.app-main',
      '.view-container'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el) {
          el.setAttribute('data-theme', newTheme);
          // 添加适当的主题类
          if (newTheme === 'dark') {
            el.classList.add('dark-mode', 'theme-dark');
            el.classList.remove('theme-light');
          } else {
            el.classList.remove('dark-mode', 'theme-dark');
            el.classList.add('theme-light');
          }
        }
      });
    });    // 强制重新渲染应用
    nextTick(() => {
      // 确保设置面板保持不透明
      const settingsContainer = document.querySelector('.settings-drawer-container');
      if (settingsContainer) {
        settingsContainer.style.backgroundColor = 'hsl(var(--b1))';
        settingsContainer.style.opacity = '1';
      }

      // 强制更新所有可能的主题相关元素
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        // 检查元素是否有主题相关的类
        if (el.classList.contains('app-container') ||
          el.classList.contains('content-area') ||
          el.classList.contains('home-view') ||
          el.classList.contains('main-content') ||
          el.tagName === 'MAIN' ||
          el.classList.contains('view-container')) {
          el.setAttribute('data-theme', newTheme);
        }
      });

      // 确保CSS变量正确更新
      document.documentElement.style.colorScheme = newTheme === 'dark' ? 'dark' : 'light';

      // 强制重新计算样式
      void document.documentElement.offsetHeight;

      // 触发重绘
      document.body.style.transform = 'translateZ(0)';
      setTimeout(() => {
        document.body.style.transform = '';
      }, 0);
    });
  };

  // 添加主题变更事件监听
  window.addEventListener('theme-changed', handleThemeChange);
  window.addEventListener('theme-mode-changed', handleThemeChange);

  // 组件卸载时清理事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('theme-changed', handleThemeChange);
    window.removeEventListener('theme-mode-changed', handleThemeChange);
  });
});

// 简化的主题应用函数 - 现在由theme-simplified服务处理
const applyThemeToAllComponents = () => {
  // 新的主题服务会自动处理主题应用
  // 这里只需要触发主题变更事件确保所有组件同步
  const themeName = document.documentElement.getAttribute('data-theme') || 'light';
  window.dispatchEvent(
    new CustomEvent("theme-changed", { detail: { theme: themeName } })
  );
};

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
  document.body.setAttribute('data-theme', newValue);

  // 确保主题应用到所有主要容器
  document.querySelectorAll('.app-container, .content-area, .home-view, .instances-panel').forEach(el => {
    el.setAttribute('data-theme', newValue);
  });

  // 根据新主题判断是否为深色主题，并更新darkMode状态
  const isDarkTheme = newValue === 'dark';
  if (isDarkTheme !== darkMode.value) {
    darkMode.value = isDarkTheme;
    localStorage.setItem('darkMode', isDarkTheme);
  }

  // 应用适当的主题类，确保CSS选择器能正确匹配
  if (isDarkTheme) {
    document.documentElement.classList.add('dark-mode', 'theme-dark');
    document.documentElement.classList.remove('theme-light');
    document.body.classList.add('dark-mode', 'theme-dark');
    document.body.classList.remove('theme-light');
  } else {
    document.documentElement.classList.remove('dark-mode', 'theme-dark');
    document.documentElement.classList.add('theme-light');
    document.body.classList.remove('dark-mode', 'theme-dark');
    document.body.classList.add('theme-light');
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

// 检查API连接
const checkApiConnection = async () => {
  console.log("检查后端连接...");
  console.log(`后端地址: ${backendConfig.getBackendUrl()}`);

  try {
    // 尝试连接到health端点
    const connected = await apiService.testBackendConnection();

    if (connected) {
      console.log("成功连接到后端服务!");
      toastService.success("已连接到后端服务");
      return true;
    } else {
      throw new Error("连接测试失败");
    }
  } catch (error) {
    console.error("无法连接到后端服务:", error);
    setTimeout(() => {
      toastService.error("无法连接到后端服务，请检查后端是否运行");
    }, 1500);
    return false;
  }
};

// 快速重连方法 - 供顶部警告栏使用
const quickReconnect = async () => {
  if (isQuickReconnecting.value) return;

  isQuickReconnecting.value = true;

  try {
    console.log('开始快速重连...');
    toastService.info('正在尝试重新连接后端服务...');

    const connected = await apiService.testBackendConnection(); if (connected) {
      console.log("快速重连成功!");
      toastService.success("重连成功！已连接到后端服务");
    } else {
      toastService.error('重连失败，请检查后端服务是否正常运行');
    }
  } catch (error) {
    console.error('快速重连失败:', error);
    toastService.error('重连失败: ' + error.message);
  } finally {
    isQuickReconnecting.value = false;
  }
};

// 简化的主题切换函数
const changeTheme = (themeName) => {
  setTheme(themeName);
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

/* 主题切换过渡效果 */
#app,
#app * {
  transition-property: color, background-color, border-color, box-shadow;
  transition-duration: 200ms;
  transition-timing-function: ease-out;
}

/* 确保深色模式下应用正确的背景和文本颜色 */
#app.dark-mode {
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

/* 确保设置抽屉在深色模式下不透明 */
:root[data-theme="dark"] .settings-drawer-container,
.dark-mode .settings-drawer-container {
  background-color: hsl(var(--b1) / 1) !important;
  color: hsl(var(--bc)) !important;
  opacity: 1 !important;
}

/* 加强暗色模式选择器优先级，确保主题正确应用 */
.app-container[data-theme="dark"],
.content-area[data-theme="dark"],
.theme-dark,
[data-theme="dark"],
:root[data-theme="dark"] {
  color-scheme: dark;
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

/* 确保亮色主题也正确应用 */
.app-container[data-theme="light"],
.content-area[data-theme="light"],
.theme-light,
[data-theme="light"],
:root[data-theme="light"] {
  color-scheme: light;
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

/* 确保主内容区域也应用正确的主题 */
.content-area[data-theme="dark"],
.dark-mode .content-area {
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

/* 实例管理等页面特别选择器 */
.home-view[data-theme="dark"],
.instances-panel[data-theme="dark"],
.downloads-panel[data-theme="dark"],
.plugins-view[data-theme="dark"],
.home-view.dark-mode,
.instances-panel.dark-mode,
.downloads-panel.dark-mode,
.plugins-view.dark-mode {
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

/* 页面滑动动画 - Vue 3 语法 */
.slide-down-enter-active,
.slide-up-enter-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.slide-down-leave-active,
.slide-up-leave-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

/* 向前导航（向下滑动）*/
.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* 向后导航（向上滑动）*/
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>

<template>
  <div class="app-container"
    :class="{ 'dark-mode': darkMode, 'sidebar-expanded': sidebarExpanded, 'sidebar-collapsed': !sidebarExpanded }">
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
  </div>
</template>

<script setup>
import { ref, provide, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import HomeView from './components/HomeView.vue'
import LogsPanel from './components/LogsPanel.vue'
import DownloadsPanel from './components/DownloadsPanel.vue'
import InstancesPanel from './components/InstancesPanel.vue'
import AppSidebar from './components/AppSidebar.vue'
import SettingsDrawer from './components/settings/SettingsDrawer.vue'
import { HomeFilled, List, Download, Document, Setting, Grid } from '@element-plus/icons-vue'
import settingsService from './services/settingsService'
import { initTheme, applyThemeColor } from './services/theme'

// 深色模式状态 - 应用级别的中心管理
const darkMode = ref(false);
// 侧边栏展开状态
const sidebarExpanded = ref(false);
// 设置面板状态
const isSettingsOpen = ref(false);

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

// 提供侧边栏状态给所有组件
provide('sidebarExpanded', sidebarExpanded);

// 日志面板引用
const logsPanel = ref(null);

// 侧边栏菜单项
const menuItems = {
  home: { title: '仪表盘', icon: HomeFilled },
  instances: { title: '实例管理', icon: List },
  downloads: { title: '下载中心', icon: Download },
  logs: { title: '系统日志', icon: Document },
  settings: { title: '系统设置', icon: Setting },
  plugins: { title: '插件广场', icon: Grid }
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

// 计算当前组件
const currentComponent = computed(() => {
  switch (activeTab.value) {
    case 'home': return HomeView;
    case 'instances': return InstancesPanel;
    case 'downloads': return DownloadsPanel;
    case 'logs': return LogsPanel;
    case 'settings':
      // 现在当选择settings标签时，打开设置抽屉，而不是加载旧的设置组件
      openSettings();
      return HomeView; // 保持当前页面为首页
    case 'plugins':
      return {
        template: `<div class="tab-content">
                    <h3>插件广场</h3>
                    <p>功能正在开发中...</p>
                  </div>`
      };
    default:
      return {
        template: `<div class="tab-content">
                    <h3>${menuItems[activeTab.value]?.title || activeTab.value}</h3>
                    <p>页面内容建设中...</p>
                  </div>`
      };
  }
});

// 提供处理安装事件 - 添加实例名称验证
provide('handleInstall', (installConfig) => {
  if (!installConfig.instanceName || installConfig.instanceName.trim() === '') {
    ElMessage.error('安装失败: 缺少实例名称');
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
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.setAttribute('data-theme', 'light');
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

// 切换侧边栏状态 - 增加日志和调试信息
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

  // 如果当前标签页是设置，切换回首页
  if (activeTab.value === 'settings') {
    activeTab.value = 'home';
  }
};

// 监听日志查看事件和页面导航
onMounted(() => {
  // 初始化深色模式 (从App.vue中集中管理)
  initDarkMode();

  // 初始化主题色
  initTheme();

  // 初始化侧边栏状态
  checkSidebarState();

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

  // 监听显示实例日志事件
  emitter.on('show-instance-logs', (instanceName) => {
    // 切换到日志选项卡
    activeTab.value = 'logs';
    // 在下一个渲染周期，告诉日志面板显示特定实例的日志
    setTimeout(() => {
      if (logsPanel.value && logsPanel.value.changeLogSource) {
        logsPanel.value.changeLogSource(instanceName);
      }
    }, 100);
  });

  // 添加导航事件处理
  emitter.on('navigate-to-tab', (tabName) => {
    if (tabName === 'settings') {
      // 如果是导航到设置，打开设置抽屉
      openSettings();
    } else if (menuItems[tabName] || tabName === 'home') {
      // 如果是其他有效选项卡，切换标签页
      activeTab.value = tabName;
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

  // 应用初始化
  checkApiConnection().then(() => {
    console.log("应用初始化完成：使用模拟数据模式");
  });

  // 监听系统深色模式变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // 只有当用户未明确设置时，才跟随系统变化
    if (localStorage.getItem('darkMode') === null) {
      updateDarkMode(e.matches);
    }
  });
});

// 初始化主题色
const initThemeColor = () => {
  const savedTheme = localStorage.getItem('themeColor');
  if (savedTheme) {
    const themeColors = {
      blue: '#4a7eff',
      green: '#42b983',
      purple: '#9370db',
      orange: '#e67e22',
      pink: '#e84393',
      teal: '#00b894'
    };

    if (themeColors[savedTheme]) {
      // 保存当前主题色到全局变量，供图表等组件使用
      window.currentThemeColor = themeColors[savedTheme];

      document.documentElement.style.setProperty('--el-color-primary', themeColors[savedTheme]);
      document.documentElement.style.setProperty('--primary-color', themeColors[savedTheme]);

      // 生成主题色的亮色和暗色变体
      const lightenColor = adjustColorBrightness(themeColors[savedTheme], 20);
      const darkenColor = adjustColorBrightness(themeColors[savedTheme], -20);

      document.documentElement.style.setProperty('--primary-light', lightenColor);
      document.documentElement.style.setProperty('--primary-dark', darkenColor);

      // 图表颜色绑定到主题色
      document.documentElement.style.setProperty('--chart-line', themeColors[savedTheme]);
      document.documentElement.style.setProperty('--chart-secondary', lightenColor);

      // 更新侧边栏颜色变量 - 基于当前主题色
      updateSidebarColorVariable(themeColors[savedTheme], darkMode.value);
    }
  } else {
    // 设置默认主题色到全局变量
    window.currentThemeColor = '#4a7eff';
    // 更新侧边栏颜色变量 - 使用默认主题
    updateSidebarColorVariable('#4a7eff', darkMode.value);
  }
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

// 组件卸载时清理
onBeforeUnmount(() => {
  // 清理事件总线
  emitter.clear();

  // 移除系统深色模式监听
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => { });
});

// 检查API连接 - 修改为始终使用模拟数据
const checkApiConnection = async () => {
  console.log("应用配置：后端已从项目移出，将使用模拟数据模式");

  // 确保模拟数据模式开启
  window._useMockData = true;
  localStorage.setItem("useMockData", "true");

  return false; // 返回false表示没有真实后端连接
};
</script>

<style>
@import './assets/css/app.css';

/* 修改为使用CSS变量实现一致的边距 */
.content-area {
  transition: margin-left 0.3s ease, width 0.3s ease;
  margin-left: var(--sidebar-width, 64px);
  width: var(--content-width, calc(100% - 64px));
  box-sizing: border-box;
}

/* 移除固定值，使用CSS变量 */
.content-area.sidebar-expanded {
  margin-left: var(--sidebar-width, 220px);
  width: var(--content-width, calc(100% - 220px));
}

/* 统一所有动画效果 */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-transition-enter-from,
.page-transition-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 当设置面板打开时禁止滚动 */
body.settings-open {
  overflow: hidden;
}
</style>
<template>
  <transition name="hyperos-settings" appear>
    <div v-if="isOpen" class="hyperos2-settings-backdrop" @click.self="handleBackdropClick">
      <div class="hyperos2-settings-container">
        <!-- HyperOS 2 风格头部 -->
        <div class="hyperos2-settings-header">
          <div class="header-content">
            <h2 class="hyperos2-settings-title">系统设置</h2>
            <div class="header-subtitle">个性化您的 MaiLauncher 体验</div>
          </div>
          <button class="hyperos2-close-btn" @click="closeDrawer" title="关闭">
            <IconifyIcon icon="mdi:close" size="20" />
          </button>
        </div>

        <!-- HyperOS 2 风格主体 -->
        <div class="hyperos2-settings-body">
          <!-- 侧边栏导航 -->
          <div class="hyperos2-settings-sidebar">
            <nav class="hyperos2-navigation">
              <button 
                v-for="tab in settingTabs" 
                :key="tab.key"
                :class="['hyperos2-nav-item', { active: activeTab === tab.key }]"
                @click="switchTab(tab.key)"
              >
                <div class="hyperos2-nav-icon">
                  <IconifyIcon :icon="tab.icon" size="20" />
                </div>
                <span class="hyperos2-nav-label">{{ tab.title }}</span>
                <div v-if="activeTab === tab.key" class="hyperos2-nav-indicator"></div>
              </button>
            </nav>
          </div>

          <!-- 主内容区 -->
          <div class="hyperos2-settings-main">
            <transition 
              :name="panelTransitionName" 
              mode="out-in" 
              :duration="{ enter: 300, leave: 200 }"
              appear
            >
              <div :key="activeTab" class="hyperos2-settings-panel">
                
                <!-- 外观设置面板 -->
                <div v-if="activeTab === 'appearance'" class="hyperos2-panel-content">
                  <div class="hyperos2-panel-header">
                    <h3 class="hyperos2-panel-title">外观设置</h3>
                    <p class="hyperos2-panel-description">自定义界面主题、颜色和视觉效果，打造专属的使用体验</p>
                  </div>

                  <!-- 主题模式组 -->
                  <div class="hyperos2-setting-group hyperos2-gradient-border">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:palette" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">主题模式</h4>
                        <p class="hyperos2-group-subtitle">选择您喜欢的界面风格</p>
                      </div>
                    </div>
                    
                    <div class="hyperos2-theme-selector">
                      <div 
                        v-for="theme in themeOptions" 
                        :key="theme.value"
                        :class="['hyperos2-theme-option', { active: themeMode === theme.value }]"
                        @click="changeThemeMode(theme.value)"
                      >
                        <div class="theme-preview" :data-theme="theme.value">
                          <div class="preview-bg"></div>
                          <div class="preview-content">
                            <div class="preview-header"></div>
                            <div class="preview-body">
                              <div class="preview-item"></div>
                              <div class="preview-item"></div>
                            </div>
                          </div>
                        </div>
                        <div class="theme-info">
                          <div class="theme-name">{{ theme.label }}</div>
                          <div class="theme-desc">{{ theme.description }}</div>
                        </div>
                        <div v-if="themeMode === theme.value" class="theme-check">
                          <IconifyIcon icon="mdi:check-circle" size="20" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 视觉效果组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:blur" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">视觉效果</h4>
                        <p class="hyperos2-group-subtitle">调整界面动画和特效</p>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">玻璃态效果</div>
                        <div class="hyperos2-setting-description">启用毛玻璃背景和透明效果</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: glassEffect }]"
                          @click="toggleGlassEffect"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">流畅动画</div>
                        <div class="hyperos2-setting-description">减少动画以提升性能</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: reduceAnimations }]"
                          @click="toggleReduceAnimations"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">动态壁纸</div>
                        <div class="hyperos2-setting-description">启用动态背景效果</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: dynamicWallpaper }]"
                          @click="toggleDynamicWallpaper"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 字体设置组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:format-font" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">字体设置</h4>
                        <p class="hyperos2-group-subtitle">调整文字显示效果</p>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">字体大小</div>
                        <div class="hyperos2-setting-description">调整界面文字大小</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <select v-model="fontSize" class="hyperos2-select" @change="changeFontSize">
                          <option value="small">小</option>
                          <option value="medium">中</option>
                          <option value="large">大</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 系统设置面板 -->
                <div v-else-if="activeTab === 'system'" class="hyperos2-panel-content">
                  <div class="hyperos2-panel-header">
                    <h3 class="hyperos2-panel-title">系统设置</h3>
                    <p class="hyperos2-panel-description">管理系统行为、性能和功能设置</p>
                  </div>

                  <!-- 启动设置组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:rocket-launch" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">启动设置</h4>
                        <p class="hyperos2-group-subtitle">控制应用程序启动行为</p>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">开机自启</div>
                        <div class="hyperos2-setting-description">系统启动时自动运行 MaiLauncher</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: autoStart }]"
                          @click="toggleAutoStart"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">最小化到托盘</div>
                        <div class="hyperos2-setting-description">关闭窗口时最小化到系统托盘</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: minimizeToTray }]"
                          @click="toggleMinimizeToTray"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 性能设置组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:speedometer" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">性能优化</h4>
                        <p class="hyperos2-group-subtitle">提升应用运行效率</p>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">GPU 加速</div>
                        <div class="hyperos2-setting-description">启用硬件加速提升渲染性能</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <button 
                          :class="['hyperos2-switch', { checked: gpuAcceleration }]"
                          @click="toggleGpuAcceleration"
                        >
                          <div class="hyperos2-switch-thumb"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 网络设置面板 -->
                <div v-else-if="activeTab === 'network'" class="hyperos2-panel-content">
                  <div class="hyperos2-panel-header">
                    <h3 class="hyperos2-panel-title">网络设置</h3>
                    <p class="hyperos2-panel-description">配置网络连接和代理设置</p>
                  </div>

                  <!-- 连接设置组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:wifi" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">连接设置</h4>
                        <p class="hyperos2-group-subtitle">管理网络连接参数</p>
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">服务器地址</div>
                        <div class="hyperos2-setting-description">后端服务器连接地址</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <input 
                          v-model="serverUrl" 
                          type="text" 
                          class="hyperos2-input"
                          placeholder="http://localhost:8080"
                          @blur="updateServerUrl"
                        />
                      </div>
                    </div>

                    <div class="hyperos2-setting-item">
                      <div class="hyperos2-setting-info">
                        <div class="hyperos2-setting-label">连接超时</div>
                        <div class="hyperos2-setting-description">网络请求超时时间（秒）</div>
                      </div>
                      <div class="hyperos2-setting-control">
                        <input 
                          v-model="connectionTimeout" 
                          type="number" 
                          class="hyperos2-input"
                          min="5"
                          max="60"
                          @blur="updateConnectionTimeout"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 关于面板 -->
                <div v-else-if="activeTab === 'about'" class="hyperos2-panel-content">
                  <div class="hyperos2-panel-header">
                    <h3 class="hyperos2-panel-title">关于</h3>
                    <p class="hyperos2-panel-description">应用信息和开发团队</p>
                  </div>

                  <!-- 应用信息组 -->
                  <div class="hyperos2-setting-group">
                    <div class="hyperos2-group-header">
                      <div class="hyperos2-group-icon">
                        <IconifyIcon icon="mdi:information" size="20" />
                      </div>
                      <div class="hyperos2-group-info">
                        <h4 class="hyperos2-group-title">应用信息</h4>
                        <p class="hyperos2-group-subtitle">当前版本和更新信息</p>
                      </div>
                    </div>

                    <div class="hyperos2-app-info">
                      <div class="app-logo">
                        <img src="/assets/icon.ico" alt="MaiLauncher" />
                      </div>
                      <div class="app-details">
                        <h4>MaiLauncher</h4>
                        <p>版本 0.1.0-preview.4</p>
                        <p>由 MaiMai 开发团队打造，旨在提供简洁高效的桌面体验</p>
                      </div>
                    </div>

                    <div class="hyperos2-action-buttons">
                      <button class="hyperos2-btn hyperos2-btn-primary">
                        <IconifyIcon icon="mdi:update" size="16" />
                        检查更新
                      </button>
                      <button class="hyperos2-btn hyperos2-btn-secondary">
                        <IconifyIcon icon="mdi:github" size="16" />
                        查看源码
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject, nextTick } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'
import settingsService from '@/services/settingsService'
import { setTheme } from '@/services/theme-simplified'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close'])

// 响应式数据
const activeTab = ref('appearance')
const panelTransitionName = ref('hyperos-panel')

// 注入依赖
const currentTheme = inject('currentTheme', ref('light'))
const darkMode = inject('darkMode', ref(false))

// 设置数据
const themeMode = ref('light')
const glassEffect = ref(true)
const reduceAnimations = ref(false)
const dynamicWallpaper = ref(false)
const fontSize = ref('medium')
const autoStart = ref(false)
const minimizeToTray = ref(true)
const gpuAcceleration = ref(true)
const serverUrl = ref('http://localhost:8080')
const connectionTimeout = ref(30)

// 设置标签页配置
const settingTabs = [
  {
    key: 'appearance',
    title: '外观',
    icon: 'mdi:palette'
  },
  {
    key: 'system',
    title: '系统',
    icon: 'mdi:cog'
  },
  {
    key: 'network',
    title: '网络',
    icon: 'mdi:wifi'
  },
  {
    key: 'about',
    title: '关于',
    icon: 'mdi:information'
  }
]

// 主题选项
const themeOptions = [
  {
    value: 'light',
    label: '浅色模式',
    description: '清新明亮的界面风格'
  },
  {
    value: 'dark',
    label: '深色模式',
    description: '护眼的深色界面'
  },
  {
    value: 'auto',
    label: '自动',
    description: '跟随系统主题设置'
  }
]

// 方法
const handleBackdropClick = () => {
  closeDrawer()
}

const closeDrawer = () => {
  emit('close')
}

const switchTab = (tabKey) => {
  activeTab.value = tabKey
}

const changeThemeMode = (mode) => {
  console.log('开始切换主题:', themeMode.value, '->', mode)
  
  // 立即更新本地状态
  themeMode.value = mode
  
  // 使用现有的主题服务进行切换，增强立即生效
  if (mode === 'auto') {
    // 实现自动主题逻辑
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const targetTheme = prefersDark ? 'dark' : 'light'
    console.log('自动主题检测到:', targetTheme)
    setTheme(targetTheme)
  } else {
    console.log('切换到指定主题:', mode)
    setTheme(mode)
  }
  
  // 保存设置
  settingsService.setSetting('theme.mode', mode)
  
  // 强制更新当前组件的主题相关样式
  nextTick(() => {
    // 确保Vue组件状态也立即更新
    const event = new CustomEvent('hyperos2-theme-changed', { 
      detail: { theme: mode, timestamp: Date.now() } 
    })
    window.dispatchEvent(event)
    console.log('主题切换完成并强制刷新组件:', mode)
  })
}

const toggleGlassEffect = () => {
  glassEffect.value = !glassEffect.value
  settingsService.setSetting('appearance.glassEffect', glassEffect.value)
}

const toggleReduceAnimations = () => {
  reduceAnimations.value = !reduceAnimations.value
  settingsService.setSetting('appearance.reduceAnimations', reduceAnimations.value)
  
  // 应用动画设置
  if (reduceAnimations.value) {
    document.documentElement.classList.add('reduce-animations')
  } else {
    document.documentElement.classList.remove('reduce-animations')
  }
}

const toggleDynamicWallpaper = () => {
  dynamicWallpaper.value = !dynamicWallpaper.value
  settingsService.setSetting('appearance.dynamicWallpaper', dynamicWallpaper.value)
}

const changeFontSize = () => {
  settingsService.setSetting('appearance.fontSize', fontSize.value)
  
  // 应用字体大小
  const rootElement = document.documentElement
  rootElement.classList.remove('font-small', 'font-medium', 'font-large')
  rootElement.classList.add(`font-${fontSize.value}`)
}

const toggleAutoStart = () => {
  autoStart.value = !autoStart.value
  settingsService.setSetting('system.autoStart', autoStart.value)
}

const toggleMinimizeToTray = () => {
  minimizeToTray.value = !minimizeToTray.value
  settingsService.setSetting('system.minimizeToTray', minimizeToTray.value)
}

const toggleGpuAcceleration = () => {
  gpuAcceleration.value = !gpuAcceleration.value
  settingsService.setSetting('system.gpuAcceleration', gpuAcceleration.value)
}

const updateServerUrl = () => {
  settingsService.setSetting('network.serverUrl', serverUrl.value)
}

const updateConnectionTimeout = () => {
  settingsService.setSetting('network.connectionTimeout', connectionTimeout.value)
}

// 初始化设置
onMounted(async () => {
  try {
    // 加载保存的设置
    const settings = await settingsService.getSettings()
    
    // 从当前主题系统获取主题模式
    themeMode.value = currentTheme.value || 'light'
    glassEffect.value = settingsService.getSetting('appearance.glassEffect', true)
    reduceAnimations.value = settingsService.getSetting('appearance.reduceAnimations', false)
    dynamicWallpaper.value = settingsService.getSetting('appearance.dynamicWallpaper', false)
    fontSize.value = settingsService.getSetting('appearance.fontSize', 'medium')
    autoStart.value = settingsService.getSetting('system.autoStart', false)
    minimizeToTray.value = settingsService.getSetting('system.minimizeToTray', true)
    gpuAcceleration.value = settingsService.getSetting('system.gpuAcceleration', true)
    serverUrl.value = settingsService.getSetting('network.serverUrl', 'http://localhost:8080')
    connectionTimeout.value = settingsService.getSetting('network.connectionTimeout', 30)
    
    console.log('HyperOS2 设置界面初始化完成')
  } catch (error) {
    console.error('加载设置失败:', error)
  }
})

// 监听主题变化
watch(currentTheme, (newTheme) => {
  themeMode.value = newTheme
})
</script>

<style scoped>
/* 组件特定样式 */
.header-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-subtitle {
  font-size: 0.8rem;
  color: var(--hyperos-text-secondary);
  font-weight: 400;
}

.hyperos2-navigation {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-xs);
}

.hyperos2-nav-indicator {
  position: absolute;
  right: 8px;
  width: 4px;
  height: 16px;
  background: white;
  border-radius: var(--hyperos-radius-full);
  opacity: 0.8;
}

.hyperos2-theme-selector {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--hyperos-space-md);
}

.hyperos2-theme-option {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-md);
  padding: var(--hyperos-space-md);
  border: 2px solid var(--hyperos-border-secondary);
  border-radius: var(--hyperos-radius-md);
  cursor: pointer;
  transition: all var(--hyperos-transition-fast);
  background: var(--hyperos-bg-primary);
}

.hyperos2-theme-option:hover {
  border-color: var(--hyperos-primary);
  transform: translateY(-1px);
  box-shadow: var(--hyperos-shadow-md);
}

.hyperos2-theme-option.active {
  border-color: var(--hyperos-primary);
  background: rgba(0, 122, 255, 0.05);
}

.theme-preview {
  width: 60px;
  height: 40px;
  border-radius: var(--hyperos-radius-sm);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  border: 1px solid var(--hyperos-border-primary);
}

.theme-preview[data-theme="light"] .preview-bg {
  background: #ffffff;
}

.theme-preview[data-theme="dark"] .preview-bg {
  background: #1f2937;
}

.theme-preview[data-theme="auto"] .preview-bg {
  background: linear-gradient(45deg, #ffffff 50%, #1f2937 50%);
}

.preview-bg {
  position: absolute;
  inset: 0;
}

.preview-content {
  position: absolute;
  inset: 4px;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 2px;
}

.preview-header {
  height: 8px;
  background: rgba(0, 122, 255, 0.3);
  margin: 2px 2px 1px 2px;
  border-radius: 1px;
}

.preview-body {
  padding: 1px 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.preview-item {
  height: 4px;
  background: rgba(0, 122, 255, 0.2);
  border-radius: 1px;
}

.theme-info {
  flex: 1;
}

.theme-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--hyperos-text-primary);
  margin-bottom: 2px;
}

.theme-desc {
  font-size: 0.75rem;
  color: var(--hyperos-text-secondary);
}

.theme-check {
  color: var(--hyperos-primary);
  flex-shrink: 0;
}

.hyperos2-app-info {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-lg);
  padding: var(--hyperos-space-lg) 0;
  border-bottom: 1px solid var(--hyperos-divider);
  margin-bottom: var(--hyperos-space-lg);
}

.app-logo img {
  width: 64px;
  height: 64px;
  border-radius: var(--hyperos-radius-md);
}

.app-details h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hyperos-text-primary);
  margin: 0 0 4px 0;
}

.app-details p {
  font-size: 0.875rem;
  color: var(--hyperos-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.hyperos2-action-buttons {
  display: flex;
  gap: var(--hyperos-space-md);
  flex-wrap: wrap;
}

/* 过渡动画 */
.hyperos-settings-enter-active,
.hyperos-settings-leave-active {
  transition: all var(--hyperos-transition-normal);
}

.hyperos-settings-enter-from,
.hyperos-settings-leave-to {
  opacity: 0;
}

.hyperos-settings-enter-from .hyperos2-settings-container,
.hyperos-settings-leave-to .hyperos2-settings-container {
  transform: scale(0.9) translateY(20px);
}

.hyperos-panel-enter-active,
.hyperos-panel-leave-active {
  transition: all var(--hyperos-transition-normal);
}

.hyperos-panel-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.hyperos-panel-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>

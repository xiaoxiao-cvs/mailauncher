<template>
  <div class="settings-panel">
    <div class="panel-header">
      <h3 class="panel-title">外观设置</h3>
      <p class="panel-description">自定义界面外观和主题样式</p>
    </div>

    <div class="settings-section">
      <!-- 主题模式设置 -->
      <SettingGroup 
        title="主题模式" 
        icon="mdi:palette" 
        :iconClass="'text-purple-500'"
        :gradient-border="true"
      >
        <ThemeSelector
          v-model="settings.themeMode"
          @change="handleThemeChange"
        />
      </SettingGroup>

      <!-- 界面调整 -->
      <SettingGroup 
        title="界面调整" 
        icon="mdi:tune" 
        :iconClass="'text-blue-500'"
        :gradient-border="true"
      >
        <SettingSwitch
          label="动画效果"
          description="启用或禁用界面动画"
          v-model="settings.enableAnimations"
          @change="handleAnimationChange"
        />

        <SettingSlider
          label="字体大小"
          description="调整界面文字的显示大小"
          :min="12"
          :max="18"
          suffix="px"
          v-model="settings.fontSize"
          @change="handleFontSizeChange"
        />

        <SettingSelect
          label="布局密度"
          description="选择界面元素的间距紧密程度"
          :options="densityOptions"
          v-model="settings.layoutDensity"
          @change="handleDensityChange"
        />
      </SettingGroup>

      <!-- 高级外观选项 -->
      <SettingGroup 
        title="高级选项" 
        subtitle="实验性功能和高级自定义"
        icon="mdi:cog" 
        :iconClass="'text-gray-500'"
        :gradient-border="true"
      >
        <SettingSwitch
          label="透明效果"
          description="启用窗口和元素的透明效果（实验性功能）"
          v-model="settings.enableTransparency"
          @change="handleTransparencyChange"
        />

        <SettingSwitch
          label="减少动画"
          description="为视觉敏感用户减少动画效果"
          v-model="settings.reduceMotion"
          @change="handleMotionChange"
        />

        <SettingInput
          label="自定义CSS类"
          description="添加自定义CSS类名到根元素"
          placeholder="custom-theme dark-mode"
          v-model="settings.customCssClass"
          :show-reset-button="true"
          default-value=""
          @change="handleCustomCssChange"
        />
      </SettingGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import SettingGroup from '../base/HyperOS2SettingGroup.vue'
import SettingSwitch from '../base/SettingSwitch.vue'
import SettingSlider from '../base/SettingSlider.vue'
import SettingSelect from '../base/SettingSelect.vue'
import SettingInput from '../base/SettingInput.vue'
import ThemeSelector from '../forms/ThemeSelector.vue'

/**
 * 外观设置面板
 * 演示如何使用设置组件库构建完整的设置面板
 */

// 设置数据
const settings = reactive({
  themeMode: 'system',
  enableAnimations: true,
  fontSize: 14,
  layoutDensity: 'comfortable',
  enableTransparency: false,
  reduceMotion: false,
  customCssClass: ''
})

// 布局密度选项
const densityOptions = [
  { value: 'comfortable', label: '舒适' },
  { value: 'compact', label: '紧凑' },
  { value: 'spacious', label: '宽松' }
]

// 事件处理函数
const handleThemeChange = (value) => {
  console.log('主题模式已更改:', value)
  // 这里可以调用主题服务来应用新主题
  localStorage.setItem('themeMode', value)
}

const handleAnimationChange = (value) => {
  console.log('动画效果设置已更改:', value)
  localStorage.setItem('enableAnimations', value.toString())
  
  // 应用动画设置到文档
  if (value) {
    document.documentElement.classList.add('animations-enabled')
    document.documentElement.classList.remove('animations-disabled')
  } else {
    document.documentElement.classList.add('animations-disabled')
    document.documentElement.classList.remove('animations-enabled')
  }
}

const handleFontSizeChange = (value) => {
  console.log('字体大小已更改:', value)
  localStorage.setItem('fontSize', value.toString())
  
  // 应用字体大小到文档
  document.documentElement.style.setProperty('--custom-font-size', `${value}px`)
}

const handleDensityChange = (value) => {
  console.log('布局密度已更改:', value)
  localStorage.setItem('layoutDensity', value)
  
  // 应用布局密度到文档
  document.documentElement.setAttribute('data-density', value)
}

const handleTransparencyChange = (value) => {
  console.log('透明效果设置已更改:', value)
  localStorage.setItem('enableTransparency', value.toString())
  
  // 应用透明效果
  if (value) {
    document.documentElement.classList.add('transparency-enabled')
  } else {
    document.documentElement.classList.remove('transparency-enabled')
  }
}

const handleMotionChange = (value) => {
  console.log('减少动画设置已更改:', value)
  localStorage.setItem('reduceMotion', value.toString())
  
  // 应用减少动画设置
  if (value) {
    document.documentElement.classList.add('reduce-motion')
  } else {
    document.documentElement.classList.remove('reduce-motion')
  }
}

const handleCustomCssChange = (value) => {
  console.log('自定义CSS类已更改:', value)
  localStorage.setItem('customCssClass', value)
  
  // 清除之前的自定义类
  const savedClasses = localStorage.getItem('previousCustomClasses')
  if (savedClasses) {
    savedClasses.split(' ').forEach(cls => {
      if (cls.trim()) {
        document.documentElement.classList.remove(cls.trim())
      }
    })
  }
  
  // 应用新的自定义类
  if (value.trim()) {
    value.split(' ').forEach(cls => {
      if (cls.trim()) {
        document.documentElement.classList.add(cls.trim())
      }
    })
    localStorage.setItem('previousCustomClasses', value)
  }
}

// 初始化设置
const initializeSettings = () => {
  settings.themeMode = localStorage.getItem('themeMode') || 'system'
  settings.enableAnimations = localStorage.getItem('enableAnimations') !== 'false'
  settings.fontSize = parseInt(localStorage.getItem('fontSize') || '14')
  settings.layoutDensity = localStorage.getItem('layoutDensity') || 'comfortable'
  settings.enableTransparency = localStorage.getItem('enableTransparency') === 'true'
  settings.reduceMotion = localStorage.getItem('reduceMotion') === 'true'
  settings.customCssClass = localStorage.getItem('customCssClass') || ''
}

// 组件挂载时初始化
initializeSettings()
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.panel-header {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid hsl(var(--b3) / 0.1);
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: hsl(var(--bc) / 0.9);
  margin-bottom: 0.75rem;
}

.panel-description {
  color: hsl(var(--bc) / 0.6);
  margin-bottom: 0;
  line-height: 1.6;
  font-size: 0.95rem;
}

.settings-section {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
}

/* 滚动条样式 */
.settings-section::-webkit-scrollbar {
  width: 6px;
}

.settings-section::-webkit-scrollbar-track {
  background: transparent;
}

.settings-section::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.2);
  border-radius: 3px;
}

.settings-section::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .panel-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
  }
  
  .panel-title {
    font-size: 1.25rem;
  }
  
  .settings-section {
    padding-right: 0;
  }
}
</style>

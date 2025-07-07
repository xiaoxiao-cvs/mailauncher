<template>
  <div class="hyperos2-demo-page">
    <!-- 头部介绍 -->
    <div class="demo-header">
      <h1 class="demo-title">HyperOS 2 设计语言</h1>
      <p class="demo-subtitle">体验小米 HyperOS 2 风格的现代化设置界面</p>
      <div class="demo-actions">
        <HyperOS2Button 
          variant="primary" 
          prefix-icon="mdi:cog"
          @click="openSettings"
        >
          打开设置
        </HyperOS2Button>
        <HyperOS2Button 
          variant="secondary" 
          prefix-icon="mdi:palette"
          @click="toggleTheme"
        >
          切换主题
        </HyperOS2Button>
      </div>
    </div>

    <!-- 特性展示 -->
    <div class="demo-features">
      <div class="feature-grid">
        <div class="feature-card" v-for="feature in features" :key="feature.id">
          <div class="feature-icon">
            <IconifyIcon :icon="feature.icon" size="24" />
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <!-- 组件预览 -->
    <div class="demo-components">
      <h2 class="section-title">组件预览</h2>
      
      <div class="component-showcase">
        <!-- HyperOS 2 开关组件 -->
        <HyperOS2Group 
          title="HyperOS 2 开关" 
          subtitle="现代化的开关控件，支持禁用状态和动画效果"
          icon="mdi:toggle-switch"
          icon-class="text-blue-500"
        >
          <div class="showcase-content">
            <HyperOS2Switch v-model="demoSwitch1" label="启用功能" />
            <HyperOS2Switch v-model="demoSwitch2" label="禁用示例" disabled />
          </div>
        </HyperOS2Group>

        <!-- HyperOS 2 滑块组件 -->
        <HyperOS2Group 
          title="HyperOS 2 滑块" 
          subtitle="优雅的数值选择控件，支持实时预览和范围限制"
          icon="mdi:tune"
          icon-class="text-green-500"
        >
          <div class="showcase-content">
            <HyperOS2Slider
              v-model="demoSlider"
              label="音量大小"
              description="调整系统音量"
              :min="0"
              :max="100"
              suffix="%"
              show-range
            />
            <HyperOS2Slider
              v-model="demoSlider2"
              label="界面缩放"
              description="调整界面显示大小"
              :min="80"
              :max="200"
              :step="10"
              suffix="%"
              show-input
            />
          </div>
        </HyperOS2Group>

        <!-- HyperOS 2 输入框组件 -->
        <HyperOS2Group 
          title="HyperOS 2 输入框" 
          subtitle="精美的文本输入控件，支持图标、清除和验证"
          icon="mdi:form-textbox"
          icon-class="text-purple-500"
        >
          <div class="showcase-content">
            <HyperOS2Input
              v-model="demoInput"
              label="用户名"
              placeholder="请输入用户名"
              prefix-icon="mdi:account"
              clearable
            />
            <HyperOS2Input
              v-model="demoInput2"
              label="密码"
              type="password"
              placeholder="请输入密码"
              prefix-icon="mdi:lock"
            />
          </div>
        </HyperOS2Group>

        <!-- HyperOS 2 选择框组件 -->
        <HyperOS2Group 
          title="HyperOS 2 选择框" 
          subtitle="流畅的下拉选择控件，支持搜索和自定义选项"
          icon="mdi:format-list-bulleted"
          icon-class="text-orange-500"
        >
          <div class="showcase-content">
            <HyperOS2Select
              v-model="demoSelect"
              label="主题模式"
              :options="themeOptions"
              placeholder="选择主题"
            />
            <HyperOS2Select
              v-model="demoSelect2"
              label="语言设置"
              :options="languageOptions"
              placeholder="选择语言"
            />
          </div>
        </HyperOS2Group>

        <!-- HyperOS 2 文本区域组件 -->
        <HyperOS2Group 
          title="HyperOS 2 文本区域" 
          subtitle="支持多行文本输入，具有字符计数和自动调整大小功能"
          icon="mdi:text-box"
          icon-class="text-indigo-500"
        >
          <div class="showcase-content">
            <HyperOS2Textarea
              v-model="demoTextarea"
              label="项目描述"
              description="详细描述您的项目功能和特点"
              placeholder="请输入详细描述..."
              :max-length="500"
              show-count
              clearable
              :rows="4"
            />
            <HyperOS2Textarea
              v-model="demoTextarea2"
              label="备注信息"
              placeholder="添加备注信息..."
              :rows="3"
              clearable
            />
          </div>
        </HyperOS2Group>

        <!-- HyperOS 2 按钮组件 -->
        <HyperOS2Group 
          title="HyperOS 2 按钮" 
          subtitle="多样化的按钮样式，支持图标、加载状态和多种主题"
          icon="mdi:gesture-tap-button"
          icon-class="text-red-500"
        >
          <div class="showcase-content">
            <div class="button-group">
              <HyperOS2Button variant="primary">主要按钮</HyperOS2Button>
              <HyperOS2Button variant="secondary">次要按钮</HyperOS2Button>
              <HyperOS2Button variant="success" prefix-icon="mdi:check">成功</HyperOS2Button>
              <HyperOS2Button variant="warning" prefix-icon="mdi:alert">警告</HyperOS2Button>
              <HyperOS2Button variant="error" prefix-icon="mdi:close">错误</HyperOS2Button>
            </div>
            <div class="button-group">
              <HyperOS2Button variant="primary" loading>加载中</HyperOS2Button>
              <HyperOS2Button variant="secondary" disabled>禁用状态</HyperOS2Button>
              <HyperOS2Button variant="primary" round prefix-icon="mdi:plus">圆角按钮</HyperOS2Button>
            </div>
          </div>
        </HyperOS2Group>
      </div>
    </div>

    <!-- HyperOS 2 设置抽屉 -->
    <HyperOS2SettingsDrawer 
      :is-open="settingsOpen" 
      @close="closeSettings" 
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'
import {
  HyperOS2SettingsDrawer,
  HyperOS2Button,
  HyperOS2Switch,
  HyperOS2Input,
  HyperOS2Select,
  HyperOS2Group,
  HyperOS2Slider,
  HyperOS2Textarea
} from '@/components/settings/hyperos2.js'

// 响应式数据
const settingsOpen = ref(false)
const demoSwitch1 = ref(true)
const demoSwitch2 = ref(false)
const demoSlider = ref(75)
const demoSlider2 = ref(100)
const demoInput = ref('')
const demoInput2 = ref('')
const demoSelect = ref('')
const demoSelect2 = ref('')
const demoTextarea = ref('')
const demoTextarea2 = ref('')

// 特性数据
const features = [
  {
    id: 1,
    icon: 'mdi:palette',
    title: '现代设计语言',
    description: '采用 HyperOS 2 的设计规范，圆润的视觉风格和优雅的交互体验'
  },
  {
    id: 2,
    icon: 'mdi:blur',
    title: '玻璃态效果',
    description: '毛玻璃背景和透明效果，营造层次分明的视觉深度'
  },
  {
    id: 3,
    icon: 'mdi:animation-play',
    title: '流畅动画',
    description: '自然的过渡动画和反馈效果，提升用户体验'
  },
  {
    id: 4,
    icon: 'mdi:responsive',
    title: '响应式设计',
    description: '适配不同屏幕尺寸，在各种设备上都有完美的显示效果'
  },
  {
    id: 5,
    icon: 'mdi:theme-light-dark',
    title: '智能主题',
    description: '支持亮色、暗色和自动主题切换，符合用户使用习惯'
  },
  {
    id: 6,
    icon: 'mdi:speedometer',
    title: '性能优化',
    description: '高效的渲染和优化的动画，确保流畅的使用体验'
  }
]

// 主题选项
const themeOptions = [
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' },
  { value: 'auto', label: '自动' }
]

// 语言选项
const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' }
]

// 方法
const openSettings = () => {
  settingsOpen.value = true
}

const closeSettings = () => {
  settingsOpen.value = false
}

const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', newTheme)
}
</script>

<style scoped>
@import '@/components/settings/hyperos2-variables.css';

.hyperos2-demo-page {
  min-height: 100vh;
  background: var(--hyperos-bg-primary);
  padding: var(--hyperos-space-2xl);
}

.demo-header {
  text-align: center;
  margin-bottom: var(--hyperos-space-4xl);
}

.demo-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--hyperos-text-primary);
  margin: 0 0 var(--hyperos-space-md) 0;
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.demo-subtitle {
  font-size: 1.125rem;
  color: var(--hyperos-text-secondary);
  margin: 0 0 var(--hyperos-space-2xl) 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.demo-actions {
  display: flex;
  gap: var(--hyperos-space-lg);
  justify-content: center;
  flex-wrap: wrap;
}

.demo-features {
  margin-bottom: var(--hyperos-space-4xl);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--hyperos-space-2xl);
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: var(--hyperos-bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--hyperos-radius-lg);
  padding: var(--hyperos-space-2xl);
  border: 1px solid var(--hyperos-border-secondary);
  box-shadow: var(--hyperos-shadow-sm);
  transition: all var(--hyperos-transition-fast);
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--hyperos-shadow-lg);
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--hyperos-radius-lg);
  background: linear-gradient(135deg, var(--hyperos-primary), var(--hyperos-primary-light));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--hyperos-space-lg);
  box-shadow: var(--hyperos-shadow-md);
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--hyperos-text-primary);
  margin: 0 0 var(--hyperos-space-sm) 0;
}

.feature-description {
  color: var(--hyperos-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.demo-components {
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--hyperos-text-primary);
  text-align: center;
  margin: 0 0 var(--hyperos-space-3xl) 0;
}

.component-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-2xl);
}

.showcase-content {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-lg);
}

.button-group {
  display: flex;
  gap: var(--hyperos-space-md);
  flex-wrap: wrap;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hyperos2-demo-page {
    padding: var(--hyperos-space-lg);
  }
  
  .demo-title {
    font-size: 2rem;
  }
  
  .demo-subtitle {
    font-size: 1rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
    gap: var(--hyperos-space-lg);
  }
  
  .feature-card {
    padding: var(--hyperos-space-lg);
  }
  
  .demo-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .component-showcase {
    gap: var(--hyperos-space-xl);
  }
  
  .button-group {
    flex-direction: column;
    width: 100%;
  }
  
  .button-group :deep(.hyperos2-button) {
    width: 100%;
  }
}
</style>

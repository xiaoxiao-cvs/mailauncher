<template>
  <div class="settings-demo">
    <div class="demo-header">
      <h1>设置组件库演示</h1>
      <p>展示所有可用的设置组件及其用法</p>
    </div>

    <div class="demo-content">
      <!-- 基础组件演示 -->
      <SettingGroup 
        title="基础组件演示" 
        subtitle="展示基础设置组件的使用方法"
        icon="mdi:widgets" 
        icon-class="text-blue-500"
      >
        <SettingSwitch
          label="开关组件"
          description="这是一个开关设置组件的示例"
          v-model="demoData.switchValue"
        />

        <SettingSlider
          label="滑块组件"
          description="用于选择数值范围的滑块组件"
          :min="0"
          :max="100"
          suffix="%"
          v-model="demoData.sliderValue"
        />

        <SettingSelect
          label="下拉选择"
          description="从预定义选项中选择一个值"
          :options="selectOptions"
          v-model="demoData.selectValue"
        />

        <SettingInput
          label="输入框组件"
          description="用于输入文本或数字的组件"
          placeholder="请输入内容"
          :show-reset-button="true"
          default-value="默认值"
          v-model="demoData.inputValue"
        />

        <SettingRadioGroup
          label="单选组"
          description="从多个选项中选择一个"
          :options="radioOptions"
          v-model="demoData.radioValue"
        />
      </SettingGroup>

      <!-- 专用组件演示 -->
      <SettingGroup 
        title="专用组件演示" 
        subtitle="展示专门用途的设置组件"
        icon="mdi:tools" 
        icon-class="text-green-500"
      >
        <ThemeSelector v-model="demoData.themeMode" />

        <PathSelector
          label="路径选择器"
          description="选择文件夹路径的专用组件"
          placeholder="请选择路径"
          dialog-title="选择演示路径"
          :default-path="getDefaultPath()"
          v-model="demoData.pathValue"
        />

        <PortConfig
          label="端口配置器"
          description="配置端口号并测试连接的专用组件"
          :default-port="8080"
          :show-test-button="true"
          :show-status="true"
          :access-urls="getAccessUrls()"
          hint="请确保端口未被其他应用占用"
          v-model="demoData.portValue"
          @test="handlePortTest"
        />
      </SettingGroup>

      <!-- 连接测试演示 -->
      <ConnectionTester 
        :url="getTestUrl()" 
        :auto-test="false"
        @test="handleConnectionTest"
        @reconnect="handleReconnect"
        @status-change="handleStatusChange"
      />

      <!-- 数据展示 -->
      <SettingGroup 
        title="当前设置数据" 
        subtitle="实时显示所有设置的当前值"
        icon="mdi:database" 
        icon-class="text-purple-500"
      >
        <div class="data-display">
          <pre>{{ JSON.stringify(demoData, null, 2) }}</pre>
        </div>
      </SettingGroup>

      <!-- 重置按钮 -->
      <div class="demo-actions">
        <button @click="resetAllSettings" class="btn btn-outline btn-lg">
          <IconifyIcon icon="mdi:refresh" class="w-5 h-5 mr-2" />
          重置所有设置
        </button>
        <button @click="saveSettings" class="btn btn-primary btn-lg">
          <IconifyIcon icon="mdi:content-save" class="w-5 h-5 mr-2" />
          保存设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import {
  SettingGroup,
  SettingSwitch,
  SettingSlider,
  SettingSelect,
  SettingInput,
  SettingRadioGroup,
  ThemeSelector,
  PathSelector,
  PortConfig,
  ConnectionTester
} from '../index.js'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * 设置组件库完整演示
 * 展示所有组件的使用方法和效果
 */

// 演示数据
const demoData = reactive({
  switchValue: true,
  sliderValue: 50,
  selectValue: 'option2',
  inputValue: '',
  radioValue: 'option1',
  themeMode: 'system',
  pathValue: '',
  portValue: 8080
})

// 选择器选项
const selectOptions = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三' }
]

// 单选组选项
const radioOptions = [
  { value: 'option1', label: '选项 A', icon: 'mdi:alpha-a' },
  { value: 'option2', label: '选项 B', icon: 'mdi:alpha-b' },
  { value: 'option3', label: '选项 C', icon: 'mdi:alpha-c' }
]

// 获取默认路径
const getDefaultPath = () => {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return 'C:\\Users\\Default\\Documents'
  }
  return '/home/user/documents'
}

// 获取访问URL
const getAccessUrls = () => {
  return [
    { label: '本地访问', url: `http://localhost:${demoData.portValue}` },
    { label: '局域网访问', url: `http://[本机IP]:${demoData.portValue}` }
  ]
}

// 获取测试URL
const getTestUrl = () => {
  return `http://localhost:${demoData.portValue}`
}

// 事件处理函数
const handlePortTest = (port) => {
  console.log('测试端口:', port)
}

const handleConnectionTest = (url) => {
  console.log('测试连接:', url)
}

const handleReconnect = (url) => {
  console.log('重新连接:', url)
}

const handleStatusChange = (status) => {
  console.log('连接状态变化:', status)
}

const resetAllSettings = () => {
  Object.assign(demoData, {
    switchValue: false,
    sliderValue: 0,
    selectValue: '',
    inputValue: '',
    radioValue: '',
    themeMode: 'system',
    pathValue: '',
    portValue: 3000
  })
  
  console.log('所有设置已重置')
}

const saveSettings = () => {
  // 模拟保存设置到本地存储
  Object.keys(demoData).forEach(key => {
    localStorage.setItem(`demo_${key}`, JSON.stringify(demoData[key]))
  })
  
  console.log('设置已保存')
  
  // 显示成功提示（如果有toast服务）
  if (window.toastService) {
    window.toastService.success('设置保存成功')
  }
}

// 初始化时加载保存的设置
const loadSavedSettings = () => {
  Object.keys(demoData).forEach(key => {
    const saved = localStorage.getItem(`demo_${key}`)
    if (saved) {
      try {
        demoData[key] = JSON.parse(saved)
      } catch (e) {
        console.warn(`无法解析保存的设置: ${key}`)
      }
    }
  })
}

// 组件挂载时加载设置
loadSavedSettings()
</script>

<style scoped>
.settings-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 3rem;
}

.demo-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: hsl(var(--bc));
  margin-bottom: 1rem;
}

.demo-header p {
  font-size: 1.125rem;
  color: hsl(var(--bc) / 0.7);
}

.demo-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.data-display {
  background: hsl(var(--b1));
  border: 1px solid hsl(var(--b3));
  border-radius: 0.75rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.data-display pre {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  color: hsl(var(--bc));
  white-space: pre-wrap;
  word-break: break-all;
}

.demo-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 2rem 0;
  border-top: 1px solid hsl(var(--b3) / 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .settings-demo {
    padding: 1rem;
  }
  
  .demo-header h1 {
    font-size: 2rem;
  }
  
  .demo-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .data-display {
    padding: 1rem;
  }
  
  .data-display pre {
    font-size: 0.75rem;
  }
}
</style>

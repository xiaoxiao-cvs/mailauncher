<template>
  <div class="settings-tab">
    <h3 class="section-title">系统设置</h3>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>界面设置</span>
        </div>
      </template>

      <!-- 深色模式切换 -->
      <div class="setting-item">
        <span class="setting-label">深色模式</span>
        <div class="setting-control">
          <el-switch
            v-model="darkMode"
            :active-icon="Moon"
            :inactive-icon="Sunny"
            @change="toggleDarkMode"
          />
        </div>
      </div>

      <!-- 主题色选择 -->
      <div class="setting-item">
        <span class="setting-label">主题色</span>
        <div class="setting-control color-theme-selector">
          <div 
            v-for="(color, name) in themeColors" 
            :key="name"
            class="color-item" 
            :class="{ active: selectedTheme === name }"
            :style="{ backgroundColor: color }"
            @click="selectTheme(name, color)"
          ></div>
        </div>
      </div>

      <!-- 界面动画效果 -->
      <div class="setting-item">
        <span class="setting-label">界面动画效果</span>
        <div class="setting-control">
          <el-switch v-model="enableAnimations" @change="toggleAnimations" />
        </div>
      </div>
      
      <!-- 系统紧凑模式 -->
      <div class="setting-item">
        <span class="setting-label">紧凑界面</span>
        <div class="setting-control">
          <el-select v-model="density" placeholder="选择密度" style="width: 150px">
            <el-option label="默认" value="default" />
            <el-option label="紧凑" value="compact" />
          </el-select>
        </div>
      </div>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>应用设置</span>
        </div>
      </template>

      <!-- 自动检查更新 -->
      <div class="setting-item">
        <span class="setting-label">自动检查更新</span>
        <div class="setting-control">
          <el-switch v-model="autoCheckUpdates" />
        </div>
      </div>

      <!-- 日志级别 -->
      <div class="setting-item">
        <span class="setting-label">日志级别</span>
        <div class="setting-control">
          <el-select v-model="logLevel" placeholder="选择日志级别" style="width: 150px">
            <el-option label="调试" value="debug" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warn" />
            <el-option label="错误" value="error" />
          </el-select>
        </div>
      </div>
    </el-card>

    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>关于</span>
        </div>
      </template>

      <div class="about-content">
        <p><strong>X² Launcher</strong> - MaiBot 管理器</p>
        <p>版本: 0.1.1</p>
        <p>
          <el-button type="primary" link @click="checkForUpdates" :loading="checkingUpdates">
            检查更新
          </el-button>
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Moon, Sunny } from '@element-plus/icons-vue';
import { useDarkMode, useTheme } from '../services/theme';

// 获取共享状态
const emitter = inject('emitter');
const appDarkMode = inject('darkMode', ref(false)); // 使用App.vue提供的darkMode

// 获取主题服务
const { darkMode, toggleDarkMode } = useDarkMode(emitter);
const { currentTheme, themeColors, selectTheme } = useTheme(emitter);

// 设置状态
const enableAnimations = ref(true);
const density = ref('default');
const autoCheckUpdates = ref(true);
const logLevel = ref('info');
const selectedTheme = ref('blue'); // 默认主题色
const checkingUpdates = ref(false);

// 同步深色模式状态
watch(appDarkMode, (newValue) => {
  darkMode.value = newValue;
});

// 获取本地存储中的设置
onMounted(() => {
  // 同步深色模式设置
  darkMode.value = appDarkMode.value;

  // 加载其他的配置
  const savedAnimations = localStorage.getItem('enableAnimations');
  if (savedAnimations !== null) {
    enableAnimations.value = savedAnimations === 'true';
  }

  const savedDensity = localStorage.getItem('density');
  if (savedDensity) {
    density.value = savedDensity;
  }

  const savedLogLevel = localStorage.getItem('logLevel');
  if (savedLogLevel) {
    logLevel.value = savedLogLevel;
  }

  const savedAutoCheck = localStorage.getItem('autoCheckUpdates');
  if (savedAutoCheck !== null) {
    autoCheckUpdates.value = savedAutoCheck === 'true';
  }
  
  // 加载保存的主题色
  const savedTheme = localStorage.getItem('themeColor');
  if (savedTheme && themeColors[savedTheme]) {
    selectedTheme.value = savedTheme;
  }
});

// 切换动画效果
const toggleAnimations = (value) => {
  localStorage.setItem('enableAnimations', value);
  if (!value) {
    document.documentElement.classList.add('no-animations');
  } else {
    document.documentElement.classList.remove('no-animations');
  }
};

// 监听密度变化
const watchDensity = (newValue) => {
  localStorage.setItem('density', newValue);
  document.documentElement.setAttribute('data-density', newValue);
};

// 检查更新
const checkForUpdates = async () => {
  checkingUpdates.value = true;
  
  try {
    // 模拟检查更新的过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    ElMessage.success('您的应用已是最新版本');
  } catch (error) {
    ElMessage.error('检查更新时出错');
    console.error('检查更新失败:', error);
  } finally {
    checkingUpdates.value = false;
  }
};

// 监听选项变化
watchDensity(density.value);
</script>

<style>
@import '../assets/css/settingsPanel.css';
</style>

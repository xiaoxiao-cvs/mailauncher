<!-- 性能优化的主题切换组件 -->
<template>
  <div class="performance-theme-switcher">
    <button
      @click="handleToggle"
      :disabled="isTransitioning"
      class="theme-btn"
      :class="{ 'switching': isTransitioning }"
      :title="`切换到${currentTheme === 'light' ? '暗色' : '亮色'}主题`"
    >
      <!-- 简化的图标 -->
      <svg 
        v-if="currentTheme === 'light'"
        class="theme-icon"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
      </svg>
      <svg 
        v-else
        class="theme-icon"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
      </svg>
      
      <!-- 文本（可选） -->
      <span v-if="showText" class="theme-text">
        {{ currentTheme === 'light' ? '暗色' : '亮色' }}
      </span>
    </button>

    <!-- 性能统计（开发模式） -->
    <div v-if="showPerformanceStats && isDevelopment" class="performance-stats">
      <div class="stat">
        <span class="stat-value">{{ switchCount }}</span>
        <span class="stat-label">切换次数</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ averageTime }}ms</span>
        <span class="stat-label">平均耗时</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'

export default {
  name: 'PerformanceThemeSwitcher',
  props: {
    showText: {
      type: Boolean,
      default: false
    },
    showPerformanceStats: {
      type: Boolean,
      default: false
    }
  },
  emits: ['theme-changed'],
  setup(props, { emit }) {
    const currentTheme = ref('light')
    const isTransitioning = ref(false)
    const switchCount = ref(0)
    const totalTime = ref(0)
    
    // 计算平均时间
    const averageTime = computed(() => {
      if (switchCount.value === 0) return 0
      return Math.round(totalTime.value / switchCount.value)
    })
    
    // 检查是否为开发环境
    const isDevelopment = computed(() => {
      return import.meta.env?.MODE === 'development'
    })

    // 获取主题引擎
    const getThemeEngine = () => {
      return window.optimizedTheme || window.themeEngine
    }

    // 主题切换处理
    const handleToggle = async () => {
      if (isTransitioning.value) return

      const engine = getThemeEngine()
      if (!engine) {
        console.error('主题引擎未找到')
        return
      }

      const startTime = performance.now()
      isTransitioning.value = true

      try {
        // 执行主题切换
        await engine.toggle()
        
        // 更新当前主题
        currentTheme.value = engine.getCurrentTheme()
        
        // 记录性能
        const endTime = performance.now()
        const duration = endTime - startTime
        switchCount.value++
        totalTime.value += duration
        
        // 发送事件
        emit('theme-changed', {
          theme: currentTheme.value,
          duration,
          switchCount: switchCount.value,
          averageTime: averageTime.value
        })

        console.log(`🎨 主题切换: ${currentTheme.value}, 耗时: ${duration.toFixed(2)}ms`)
        
      } catch (error) {
        console.error('主题切换失败:', error)
      } finally {
        isTransitioning.value = false
      }
    }

    // 同步主题状态
    const syncThemeState = () => {
      const engine = getThemeEngine()
      if (engine) {
        currentTheme.value = engine.getCurrentTheme()
      }
    }

    // 监听主题变化事件
    const handleThemeChange = (event) => {
      if (event.detail?.theme) {
        currentTheme.value = event.detail.theme
      }
    }

    onMounted(() => {
      // 初始化主题状态
      syncThemeState()
      
      // 监听主题变化
      document.addEventListener('theme-changed', handleThemeChange)
      
      // 预热主题引擎
      const engine = getThemeEngine()
      if (engine && typeof engine.preWarm === 'function') {
        engine.preWarm()
      }
    })

    onUnmounted(() => {
      document.removeEventListener('theme-changed', handleThemeChange)
    })

    return {
      currentTheme,
      isTransitioning,
      switchCount,
      averageTime,
      isDevelopment,
      handleToggle
    }
  }
}
</script>

<style scoped>
.performance-theme-switcher {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid hsl(var(--b3));
  border-radius: 6px;
  background: hsl(var(--b1));
  color: hsl(var(--bc));
  cursor: pointer;
  transition: none !important;
  font-size: 14px;
  min-height: 32px;
}

.theme-btn:hover:not(:disabled) {
  background: hsl(var(--b2));
  border-color: hsl(var(--p));
  transform: translateY(-1px);
}

.theme-btn:active:not(:disabled) {
  transform: translateY(0);
}

.theme-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.theme-btn.switching {
  pointer-events: none;
  opacity: 0.8;
}

.theme-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.theme-text {
  font-weight: 500;
  white-space: nowrap;
}

.performance-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
  opacity: 0.7;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.stat-value {
  font-weight: bold;
  color: hsl(var(--p));
}

.stat-label {
  font-size: 9px;
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .theme-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .theme-icon {
    width: 14px;
    height: 14px;
  }
  
  .performance-stats {
    display: none;
  }
}

/* 暗色主题适配 */
[data-theme="dark"] .theme-btn {
  border-color: hsl(var(--b3));
  background: hsl(var(--b2));
}

[data-theme="dark"] .theme-btn:hover:not(:disabled) {
  background: hsl(var(--b3));
  border-color: hsl(var(--p));
}

/* 完全禁用动画 */
@media (prefers-reduced-motion: reduce) {
  .theme-btn {
    transition: none !important;
  }
}

/* 全局禁用主题按钮动画 */
.theme-btn {
  transition: none !important;
}
</style>

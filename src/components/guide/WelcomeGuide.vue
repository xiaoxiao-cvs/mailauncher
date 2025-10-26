<template>
  <div class="welcome-guide-wrapper">
    <svg class="welcome-guide-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <!-- 内部刻度线 (半径 210, 100根, 每3.6度一根, 固定不动) -->
      <g class="tick-lines">
        <line
          v-for="i in 100"
          :key="`tick-${i}`"
          :x1="300"
          :y1="90"
          :x2="300"
          :y2="96"
          :transform="`rotate(${i * 3.6} 300 300)`"
          stroke="rgba(255, 255, 255, 0.2)"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </g>

            <!-- 最外层5段彩色圆环 - 简化方案：每段独立绘制 -->
      <!-- 周长=1696.46, 每段60度=282.74, 每间隙12度=56.55 -->
      <!-- 从12点右侧半个间隙位置开始，依次绘制5段 -->
      <g class="outer-ring">
        <!-- 分段1: 红色 (从12点右侧半间隙开始，绘制一段) -->
        <circle
          class="progress-segment segment-1"
          cx="300"
          cy="300"
          r="270"
          fill="none"
          stroke="#FF6B6B"
          stroke-width="12"
          stroke-dasharray="282.74 1413.72"
          stroke-dashoffset="-28.275"
          transform="rotate(-90 300 300)"
          stroke-linecap="round"
          :style="{ opacity: segmentProgress[0] / 100 * 0.7 + 0.3 }"
        />
        
        <!-- 分段2: 橙色 (红色后 + 完整间隙后) -->
        <circle
          class="progress-segment segment-2"
          cx="300"
          cy="300"
          r="270"
          fill="none"
          stroke="#FFA726"
          stroke-width="12"
          stroke-dasharray="282.74 1413.72"
          stroke-dashoffset="-367.565"
          transform="rotate(-90 300 300)"
          stroke-linecap="round"
          :style="{ opacity: segmentProgress[1] / 100 * 0.7 + 0.3 }"
        />
        
        <!-- 分段3: 绿色 -->
        <circle
          class="progress-segment segment-3"
          cx="300"
          cy="300"
          r="270"
          fill="none"
          stroke="#4ADE80"
          stroke-width="12"
          stroke-dasharray="282.74 1413.72"
          stroke-dashoffset="-706.855"
          transform="rotate(-90 300 300)"
          stroke-linecap="round"
          :style="{ opacity: segmentProgress[2] / 100 * 0.7 + 0.3 }"
        />
        
        <!-- 分段4: 青色 -->
        <circle
          class="progress-segment segment-4"
          cx="300"
          cy="300"
          r="270"
          fill="none"
          stroke="#22D3EE"
          stroke-width="12"
          stroke-dasharray="282.74 1413.72"
          stroke-dashoffset="-1046.145"
          transform="rotate(-90 300 300)"
          stroke-linecap="round"
          :style="{ opacity: segmentProgress[3] / 100 * 0.7 + 0.3 }"
        />
        
        <!-- 分段5: 紫色 -->
        <circle
          class="progress-segment segment-5"
          cx="300"
          cy="300"
          r="270"
          fill="none"
          stroke="#A78BFA"
          stroke-width="12"
          stroke-dasharray="282.74 1413.72"
          stroke-dashoffset="-1385.435"
          transform="rotate(-90 300 300)"
          stroke-linecap="round"
          :style="{ opacity: segmentProgress[4] / 100 * 0.7 + 0.3 }"
        />
      </g>

      <!-- 中心 Iconify 齿轮图标 -->
      <foreignObject x="225" y="225" width="150" height="150" class="gear-icon-wrapper">
        <div class="gear-icon-container">
          <Icon icon="eos-icons:rotating-gear" class="gear-icon" />
        </div>
      </foreignObject>
    </svg>
  </div>
</template>

<script setup>
import { onMounted, defineProps } from 'vue'
import { animate } from 'animejs'
import { Icon } from '@iconify/vue'

const props = defineProps({
  segmentProgress: {
    type: Array,
    default: () => [100, 100, 100, 100, 100] // 默认全部显示100%
  }
})

onMounted(() => {
  // 移除呼吸动画，避免与进度透明度冲突
})
</script>

<style scoped>
.welcome-guide-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.welcome-guide-svg {
  width: 100%;
  height: 100%;
  max-width: 600px;
  max-height: 600px;
}

.gear-icon-wrapper {
  transform-origin: 75px 75px;
}

.gear-icon-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gear-icon {
  width: 120px;
  height: 120px;
  color: #FF6B6B;
  filter: drop-shadow(0 0 8px #FF6B6B);
}

/* 最外层分段圆环样式 */
.progress-segment {
  filter: drop-shadow(0 0 6px currentColor);
  transition: opacity 0.5s ease;
}

.segment-1 {
  filter: drop-shadow(0 0 10px #FF6B6B);
}

.segment-2 {
  filter: drop-shadow(0 0 10px #FFA726);
}

.segment-3 {
  filter: drop-shadow(0 0 10px #4ADE80);
}

.segment-4 {
  filter: drop-shadow(0 0 10px #22D3EE);
}

.segment-5 {
  filter: drop-shadow(0 0 10px #A78BFA);
}
</style>

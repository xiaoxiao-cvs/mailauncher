<template>
  <div class="guide-page-container" data-theme="dark">
    <div class="guide-content">
      <!-- 左侧标题区域 -->
      <div class="guide-title-section">
        <div class="title-slider" :style="{ transform: `translateY(-${currentStep * 100}%)` }">
          <div v-for="(step, index) in steps" :key="index" class="title-item">
            <h1 class="text-5xl font-bold mb-4">{{ step.title }}</h1>
            <p class="text-xl opacity-80">{{ step.subtitle }}</p>
          </div>
        </div>
      </div>

      <!-- 中间圆环区域 -->
      <div class="guide-circle-section">
        <WelcomeGuide :segment-progress="progressValues" />
        
        <!-- 下一步按钮 -->
        <div class="next-button-wrapper">
          <button 
            class="btn btn-primary btn-lg gap-2"
            @click="nextStep"
          >
            {{ isLastStep ? '完成' : '下一步' }}
            <Icon :icon="isLastStep ? 'mdi:check' : 'mdi:arrow-right'" class="text-xl" />
          </button>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="guide-form-section">
        <Transition name="slide-fade" mode="out-in">
          <div v-if="currentStep > 0" :key="currentStep" class="form-card backdrop-blur-lg bg-base-200/30 p-6 rounded-2xl border border-base-300/50">
            <!-- 第二页：基本信息 -->
            <div v-if="currentStep === 1" class="form-content">
              <h3 class="text-2xl font-bold mb-6">基本信息</h3>
              <div class="form-control w-full mb-4">
                <label class="label">
                  <span class="label-text">用户名</span>
                </label>
                <input 
                  type="text" 
                  placeholder="请输入用户名" 
                  class="input input-bordered w-full" 
                  v-model="formData.username"
                  @input="updateProgress(1)"
                />
              </div>
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text">邮箱</span>
                </label>
                <input 
                  type="email" 
                  placeholder="请输入邮箱" 
                  class="input input-bordered w-full" 
                  v-model="formData.email"
                  @input="updateProgress(1)"
                />
              </div>
            </div>

            <!-- 第三页：偏好设置 -->
            <div v-else-if="currentStep === 2" class="form-content">
              <h3 class="text-2xl font-bold mb-6">偏好设置</h3>
              <div class="form-control w-full mb-4">
                <label class="label">
                  <span class="label-text">语言</span>
                </label>
                <select 
                  class="select select-bordered w-full" 
                  v-model="formData.language"
                  @change="updateProgress(2)"
                >
                  <option disabled selected>请选择语言</option>
                  <option>简体中文</option>
                  <option>English</option>
                  <option>日本語</option>
                </select>
              </div>
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text">主题</span>
                </label>
                <select 
                  class="select select-bordered w-full" 
                  v-model="formData.theme"
                  @change="updateProgress(2)"
                >
                  <option disabled selected>请选择主题</option>
                  <option>浅色</option>
                  <option>深色</option>
                </select>
              </div>
            </div>

            <!-- 第四页：高级设置 -->
            <div v-else-if="currentStep === 3" class="form-content">
              <h3 class="text-2xl font-bold mb-6">高级设置</h3>
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">自动更新</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    v-model="formData.autoUpdate"
                    @change="updateProgress(3)"
                  />
                </label>
              </div>
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">启动时最小化</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    v-model="formData.minimizeOnStart"
                    @change="updateProgress(3)"
                  />
                </label>
              </div>
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">通知提醒</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    v-model="formData.notifications"
                    @change="updateProgress(3)"
                  />
                </label>
              </div>
            </div>

            <!-- 第五页：完成 -->
            <div v-else-if="currentStep === 4" class="form-content">
              <h3 class="text-2xl font-bold mb-6">准备就绪</h3>
              <div class="space-y-4">
                <div class="alert alert-success">
                  <Icon icon="mdi:check-circle" class="text-2xl" />
                  <span>所有配置已完成！</span>
                </div>
                <div class="stats shadow w-full">
                  <div class="stat">
                    <div class="stat-title">用户名</div>
                    <div class="stat-value text-2xl">{{ formData.username || '未设置' }}</div>
                  </div>
                </div>
                <div class="stats shadow w-full">
                  <div class="stat">
                    <div class="stat-title">语言</div>
                    <div class="stat-value text-2xl">{{ formData.language || '未设置' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import WelcomeGuide from './WelcomeGuide.vue'

const currentStep = ref(0)

const steps = [
  {
    title: '欢迎使用',
    subtitle: '麦麦启动器 - 全新的游戏启动体验'
  },
  {
    title: '基本信息',
    subtitle: '让我们先了解一下您'
  },
  {
    title: '偏好设置',
    subtitle: '个性化您的启动器'
  },
  {
    title: '高级设置',
    subtitle: '更多自定义选项'
  },
  {
    title: '完成设置',
    subtitle: '开始您的旅程'
  }
]

const formData = ref({
  username: '',
  email: '',
  language: '',
  theme: '',
  autoUpdate: false,
  minimizeOnStart: false,
  notifications: true
})

// 每个分段的进度值 (0-100)
const progressValues = ref([100, 0, 0, 0, 0])

const isLastStep = computed(() => currentStep.value === steps.length - 1)

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    // 更新下一个分段的进度为激活状态
    if (currentStep.value < progressValues.value.length) {
      progressValues.value[currentStep.value] = 100
    }
  } else {
    // 完成引导
    alert('引导完成！')
  }
}

const updateProgress = (stepIndex) => {
  // 根据表单填写情况更新进度
  let progress = 0
  
  if (stepIndex === 1) {
    // 基本信息：用户名和邮箱
    if (formData.value.username) progress += 50
    if (formData.value.email) progress += 50
  } else if (stepIndex === 2) {
    // 偏好设置：语言和主题
    if (formData.value.language) progress += 50
    if (formData.value.theme) progress += 50
  } else if (stepIndex === 3) {
    // 高级设置：3个选项
    progress = 33.33 * [
      formData.value.autoUpdate,
      formData.value.minimizeOnStart,
      formData.value.notifications
    ].filter(Boolean).length
  }
  
  progressValues.value[stepIndex] = Math.min(100, progress)
}
</script>

<style scoped>
.guide-page-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem;
}

.guide-content {
  display: grid;
  grid-template-columns: 1fr 600px 1fr;
  gap: 4rem;
  align-items: center;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

/* 左侧标题区域 */
.guide-title-section {
  height: 600px;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: white;
}

.title-slider {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.title-item {
  height: 600px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
}

/* 中间圆环区域 */
.guide-circle-section {
  position: relative;
  width: 600px;
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.next-button-wrapper {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
}

/* 右侧表单区域 */
.guide-form-section {
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  width: 100%;
  max-width: 400px;
  min-height: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.form-content {
  animation: fadeIn 0.5s ease-in-out;
}

/* 过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s ease;
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .guide-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .guide-title-section {
    height: auto;
  }
  
  .title-item {
    height: auto;
    padding: 1rem;
  }
  
  .title-slider {
    transform: none !important;
  }
  
  .guide-form-section {
    height: auto;
  }
}
</style>

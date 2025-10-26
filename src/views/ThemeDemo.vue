<template>
  <div class="theme-demo-page min-h-screen bg-base-200 transition-colors duration-300">
    <div class="container mx-auto p-8">
      <!-- 主题切换器 -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-4xl font-bold">主题演示页面</h1>
        <ThemeToggle />
      </div>

      <!-- 组件展示 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 按钮样式 -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">按钮样式</h2>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-primary">Primary</button>
              <button class="btn btn-secondary">Secondary</button>
              <button class="btn btn-accent">Accent</button>
              <button class="btn btn-ghost">Ghost</button>
              <button class="btn btn-link">Link</button>
            </div>
          </div>
        </div>

        <!-- 表单元素 -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">表单元素</h2>
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text">输入框</span>
              </label>
              <input type="text" placeholder="Type here" class="input input-bordered w-full" />
            </div>
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">开关</span>
                <input type="checkbox" class="toggle toggle-primary" checked />
              </label>
            </div>
          </div>
        </div>

        <!-- 警告框 -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">警告框</h2>
            <div class="space-y-2">
              <div class="alert alert-info">
                <Icon icon="mdi:information" />
                <span>Info alert!</span>
              </div>
              <div class="alert alert-success">
                <Icon icon="mdi:check-circle" />
                <span>Success alert!</span>
              </div>
              <div class="alert alert-warning">
                <Icon icon="mdi:alert" />
                <span>Warning alert!</span>
              </div>
              <div class="alert alert-error">
                <Icon icon="mdi:close-circle" />
                <span>Error alert!</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">统计卡片</h2>
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Total Users</div>
                <div class="stat-value">89,400</div>
                <div class="stat-desc">21% more than last month</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import ThemeToggle from '../components/layout/ThemeToggle.vue'
</script>

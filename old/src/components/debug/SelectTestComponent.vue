<template>
  <div class="select-test-component p-6 bg-base-100 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold mb-4 text-base-content">下拉框显示测试</h2>
    
    <div class="space-y-4">
      <!-- 基础HTML select -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">基础HTML选择框</span>
        </label>
        <select class="select select-bordered">
          <option value="">请选择...</option>
          <option value="option1">选项 1</option>
          <option value="option2">选项 2</option>
          <option value="option3">选项 3</option>
        </select>
      </div>

      <!-- DaisyUI样式 select -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">DaisyUI选择框</span>
        </label>
        <select class="select select-bordered select-primary">
          <option value="">请选择...</option>
          <option value="primary1">主要选项 1</option>
          <option value="primary2">主要选项 2</option>
          <option value="primary3">主要选项 3</option>
        </select>
      </div>

      <!-- 小尺寸选择框 -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">小尺寸选择框</span>
        </label>
        <select class="select select-bordered select-sm">
          <option value="">请选择...</option>
          <option value="small1">小选项 1</option>
          <option value="small2">小选项 2</option>
          <option value="small3">小选项 3</option>
        </select>
      </div>

      <!-- 禁用状态选择框 -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">禁用状态选择框</span>
        </label>
        <select class="select select-bordered" disabled>
          <option value="">禁用选择框</option>
          <option value="disabled1">禁用选项 1</option>
          <option value="disabled2">禁用选项 2</option>
        </select>
      </div>

      <!-- HyperOS2 风格选择框 -->
      <div class="form-control" v-if="showHyperOS2">
        <HyperOS2Select
          label="HyperOS2 风格选择框"
          :options="hyperOS2Options"
          v-model="selectedHyperOS2"
          placeholder="请选择 HyperOS2 选项..."
        />
      </div>

      <!-- 设置选择框 -->
      <div class="form-control" v-if="showSettingSelect">
        <SettingSelect
          label="设置选择框"
          description="这是一个设置组件选择框"
          :options="settingOptions"
          v-model="selectedSetting"
        />
      </div>
    </div>

    <!-- 测试按钮 -->
    <div class="mt-6 flex gap-2 flex-wrap">
      <button class="btn btn-primary btn-sm" @click="diagnose">
        诊断显示问题
      </button>
      <button class="btn btn-secondary btn-sm" @click="applyFix">
        应用紧急修复
      </button>
      <button class="btn btn-accent btn-sm" @click="showVars">
        查看CSS变量
      </button>
      <button class="btn btn-info btn-sm" @click="toggleTheme">
        切换主题测试
      </button>
    </div>

    <!-- 诊断结果 -->
    <div v-if="diagnosticResult" class="mt-4 p-4 bg-base-200 rounded-lg">
      <h3 class="font-bold mb-2">诊断结果:</h3>
      <pre class="text-sm">{{ JSON.stringify(diagnosticResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 动态导入组件（避免在组件不存在时报错）
const showHyperOS2 = ref(false);
const showSettingSelect = ref(false);
let HyperOS2Select = null;
let SettingSelect = null;

// 响应式数据
const selectedHyperOS2 = ref('');
const selectedSetting = ref('');
const diagnosticResult = ref(null);

// 选项数据
const hyperOS2Options = [
  { value: 'hyper1', label: 'HyperOS 选项 1' },
  { value: 'hyper2', label: 'HyperOS 选项 2' },
  { value: 'hyper3', label: 'HyperOS 选项 3' }
];

const settingOptions = [
  { value: 'setting1', label: '设置选项 1' },
  { value: 'setting2', label: '设置选项 2' },
  { value: 'setting3', label: '设置选项 3' }
];

// 诊断方法
const diagnose = () => {
  if (window.selectDiagnostic) {
    diagnosticResult.value = window.selectDiagnostic.diagnose();
  } else {
    console.warn('诊断工具未加载');
  }
};

// 应用修复
const applyFix = () => {
  if (window.selectDiagnostic) {
    window.selectDiagnostic.emergencyFix();
    console.log('✅ 紧急修复已应用');
  } else {
    console.warn('修复工具未加载');
  }
};

// 显示变量
const showVars = () => {
  if (window.selectDiagnostic) {
    window.selectDiagnostic.getCssVariables();
  } else {
    console.warn('诊断工具未加载');
  }
};

// 切换主题测试
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  console.log(`🎨 主题已切换到: ${newTheme}`);
};

// 组件挂载时尝试加载可选组件
onMounted(async () => {
  try {
    const hyperOS2Module = await import('@/components/settings/base/HyperOS2Select.vue');
    HyperOS2Select = hyperOS2Module.default;
    showHyperOS2.value = true;
  } catch (error) {
    console.log('HyperOS2Select 组件未找到');
  }

  try {
    const settingSelectModule = await import('@/components/settings/base/SettingSelect.vue');
    SettingSelect = settingSelectModule.default;
    showSettingSelect.value = true;
  } catch (error) {
    console.log('SettingSelect 组件未找到');
  }
});
</script>

<style scoped>
/* 测试组件特定样式 */
.select-test-component {
  max-width: 600px;
  margin: 0 auto;
}

/* 确保测试组件的选择框正确显示 */
.select-test-component .select,
.select-test-component select {
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}

.select-test-component .select option,
.select-test-component select option {
  color: hsl(var(--bc)) !important;
  background-color: hsl(var(--b1)) !important;
}
</style>

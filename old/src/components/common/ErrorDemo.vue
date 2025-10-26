<!-- 错误展示测试组件 -->
<template>
  <div class="error-demo-container p-6">
    <h3 class="text-xl font-bold mb-4">Toast错误展示测试</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button 
        @click="triggerSimpleError" 
        class="btn btn-error"
      >
        触发简单错误
      </button>
      
      <button 
        @click="triggerDetailedError" 
        class="btn btn-warning"
      >
        触发详细错误
      </button>
      
      <button 
        @click="triggerNetworkError" 
        class="btn btn-info"
      >
        触发网络错误
      </button>
      
      <button 
        @click="triggerPathError" 
        class="btn btn-secondary"
      >
        触发路径错误
      </button>
    </div>
  </div>
</template>

<script setup>
import enhancedToastService from '@/services/enhancedToastService';
import { safeNormalizePath } from '@/utils/pathSync';

const triggerSimpleError = () => {
  const error = new Error('这是一个简单的测试错误');
  enhancedToastService.showError('简单错误测试', error);
};

const triggerDetailedError = () => {
  const error = new TypeError('Cannot read property of undefined');
  error.stack = `TypeError: Cannot read property 'test' of undefined
    at testFunction (test.js:10:5)
    at Object.handler (component.vue:25:3)
    at HTMLButtonElement.click (main.js:100:7)`;
  
  enhancedToastService.showError('详细错误测试', error, {
    context: {
      component: 'ErrorDemo',
      action: 'triggerDetailedError',
      timestamp: new Date().toLocaleString()
    }
  });
};

const triggerNetworkError = () => {
  const networkError = new Error('Failed to fetch data from server');
  networkError.name = 'NetworkError';
  
  const errorDetails = {
    stack: networkError.stack,
    context: {
      url: 'https://api.example.com/data',
      method: 'GET',
      status: 404,
      statusText: 'Not Found'
    },
    suggestions: [
      '检查网络连接是否正常',
      '确认API地址是否正确',
      '检查服务器状态'
    ]
  };
  
  enhancedToastService.showError('网络请求失败', errorDetails);
};

const triggerPathError = () => {
  try {
    // 模拟路径错误
    const invalidPath = null;
    safeNormalizePath(invalidPath, { operation: 'pathTest' });
    
    // 手动触发一个路径相关错误
    throw new Error('normalizePath is not defined');
  } catch (error) {
    enhancedToastService.showError('路径处理错误', error, {
      context: {
        operation: '路径标准化测试',
        inputPath: 'null',
        expectedOutput: '标准化路径'
      }
    });
  }
};
</script>

<style scoped>
.error-demo-container {
  background: hsl(var(--b1));
  border-radius: 8px;
  border: 1px solid hsl(var(--b3));
}
</style>

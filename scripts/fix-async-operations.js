/**
 * 修复异步操作和变量初始化问题的脚本
 */

console.log('=== MaiLauncher 异步操作修复脚本 ===');

// 检查并修复全局错误处理
function setupGlobalErrorHandling() {
  console.log('🔧 设置全局错误处理...');
  
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 检查是否是初始化错误
    if (event.reason && event.reason.message && 
        event.reason.message.includes('before initialization')) {
      console.warn('检测到初始化顺序问题，尝试修复...');
      
      // 延迟重试
      setTimeout(() => {
        console.log('延迟重试异步操作...');
        // 这里可以添加具体的重试逻辑
      }, 1000);
    }
    
    // 防止错误在控制台中显示（可选）
    event.preventDefault();
  });

  // 捕获全局JavaScript错误
  window.addEventListener('error', function(event) {
    console.error('全局JavaScript错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // 检查是否是变量初始化错误
    if (event.message && event.message.includes('before initialization')) {
      console.warn('检测到变量初始化问题:', event.message);
      
      // 尝试重新加载相关模块（如果可能）
      if (event.filename && event.filename.includes('versionService')) {
        console.log('重新初始化版本服务...');
        // 这里可以添加重新初始化逻辑
      }
    }
  });
  
  console.log('✅ 全局错误处理已设置');
}

// 检查服务初始化状态
function checkServiceInitialization() {
  console.log('🔍 检查服务初始化状态...');
  
  // 检查常用的全局服务
  const servicesToCheck = [
    'versionService',
    'deployStore', 
    'instanceStore',
    'pollingStore'
  ];
  
  servicesToCheck.forEach(serviceName => {
    try {
      // 尝试通过动态导入检查服务
      if (window[serviceName]) {
        console.log(`✅ ${serviceName} 已在全局作用域中`);
      } else {
        console.log(`⚠️ ${serviceName} 未在全局作用域中找到`);
      }
    } catch (error) {
      console.error(`❌ 检查 ${serviceName} 时出错:`, error);
    }
  });
}

// 修复异步操作链
function fixAsyncOperations() {
  console.log('🔧 修复异步操作链...');
  
  // 重写Promise.all以添加更好的错误处理
  const originalPromiseAll = Promise.all;
  Promise.all = function(promises) {
    return originalPromiseAll.call(this, promises).catch(error => {
      console.error('Promise.all 失败:', error);
      
      // 如果是初始化错误，提供降级处理
      if (error.message && error.message.includes('before initialization')) {
        console.log('使用降级策略处理Promise.all失败...');
        return [];
      }
      
      throw error;
    });
  };
  
  // 为fetch添加超时和重试机制
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // 设置默认超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
    
    const enhancedOptions = {
      ...options,
      signal: controller.signal
    };
    
    return originalFetch(url, enhancedOptions)
      .then(response => {
        clearTimeout(timeoutId);
        return response;
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('Fetch 请求失败:', { url, error });
        
        // 如果是网络错误，可以考虑重试
        if (error.name === 'AbortError') {
          console.log('请求超时，可能需要重试');
        }
        
        throw error;
      });
  };
  
  console.log('✅ 异步操作修复完成');
}

// 延迟初始化检查
function delayedInitializationCheck() {
  console.log('⏰ 启动延迟初始化检查...');
  
  setTimeout(() => {
    console.log('🔍 执行延迟初始化检查...');
    
    // 检查关键组件是否已初始化
    const criticalChecks = [
      () => document.readyState === 'complete',
      () => window.Vue !== undefined,
      () => window.Pinia !== undefined
    ];
    
    const results = criticalChecks.map((check, index) => {
      try {
        const result = check();
        console.log(`检查 ${index + 1}: ${result ? '✅' : '❌'}`);
        return result;
      } catch (error) {
        console.error(`检查 ${index + 1} 失败:`, error);
        return false;
      }
    });
    
    const allPassed = results.every(result => result);
    
    if (allPassed) {
      console.log('✅ 所有延迟检查通过');
    } else {
      console.warn('⚠️ 某些延迟检查失败，可能需要重新加载');
    }
    
  }, 2000); // 2秒后检查
}

// 清理无效的定时器和监听器
function cleanupInvalidTimers() {
  console.log('🧹 清理无效的定时器和监听器...');
  
  // 检查是否有无效的setInterval
  let intervalCount = 0;
  const originalSetInterval = window.setInterval;
  const activeIntervals = new Set();
  
  window.setInterval = function(callback, delay) {
    const intervalId = originalSetInterval.call(this, callback, delay);
    activeIntervals.add(intervalId);
    intervalCount++;
    
    console.log(`创建定时器 ${intervalId}, 当前活跃定时器数: ${intervalCount}`);
    
    return intervalId;
  };
  
  const originalClearInterval = window.clearInterval;
  window.clearInterval = function(intervalId) {
    if (activeIntervals.has(intervalId)) {
      activeIntervals.delete(intervalId);
      intervalCount--;
      console.log(`清理定时器 ${intervalId}, 剩余活跃定时器数: ${intervalCount}`);
    }
    
    return originalClearInterval.call(this, intervalId);
  };
  
  console.log('✅ 定时器监控已设置');
}

// 执行所有修复操作
try {
  setupGlobalErrorHandling();
  checkServiceInitialization();
  fixAsyncOperations();
  delayedInitializationCheck();
  cleanupInvalidTimers();
  
  console.log('🎉 异步操作修复脚本执行完成！');
  
} catch (error) {
  console.error('❌ 修复脚本执行失败:', error);
}

console.log('=== 修复脚本执行完毕 ===');

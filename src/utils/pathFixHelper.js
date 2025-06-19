// 路径修复辅助工具 - 在前端控制台运行

/**
 * 修复 localStorage 中的重复路径问题
 */
export const fixDeploymentPaths = () => {
  console.log('=== MaiLauncher 部署路径修复工具 ===');
  
  const savedDeploymentPath = localStorage.getItem('deploymentPath');
  console.log('当前部署路径:', savedDeploymentPath);
  
  if (!savedDeploymentPath) {
    console.log('✅ 未检测到部署路径配置，无需修复');
    return;
  }
  
  // 检查路径是否有重复问题
  const hasRepeat = savedDeploymentPath.includes('MaiBot\\Deployments\\MaiBot\\Deployments') ||
                   savedDeploymentPath.includes('MaiBot/Deployments/MaiBot/Deployments') ||
                   savedDeploymentPath.includes('MaiBot\\MaiBot') ||
                   savedDeploymentPath.includes('D:\\MaiBot\\D:');
  
  if (hasRepeat) {
    console.warn('🔍 检测到路径重复问题:', savedDeploymentPath);
    
    // 清除有问题的路径
    localStorage.removeItem('deploymentPath');
    console.log('🧹 已清除问题路径');
    
    // 设置默认路径
    const defaultPath = '~\\MaiBot\\Deployments';
    localStorage.setItem('deploymentPath', defaultPath);
    console.log('✅ 已设置默认路径:', defaultPath);
    
    // 发送路径变更事件
    window.dispatchEvent(new CustomEvent('deployment-path-changed', {
      detail: { path: defaultPath }
    }));
    
    return {
      fixed: true,
      oldPath: savedDeploymentPath,
      newPath: defaultPath
    };
  } else {
    console.log('✅ 路径格式正常，无需修复');
    return { fixed: false, path: savedDeploymentPath };
  }
};

/**
 * 检查所有相关的 localStorage 配置
 */
export const checkAllPaths = () => {
  console.log('=== 检查所有路径配置 ===');
  
  const paths = {
    deploymentPath: localStorage.getItem('deploymentPath'),
    dataStoragePath: localStorage.getItem('dataStoragePath'),
    selectedInstancePath: localStorage.getItem('selectedInstancePath')
  };
  
  console.table(paths);
  
  // 检查实例路径是否有问题
  if (paths.selectedInstancePath && 
      (paths.selectedInstancePath.includes('MaiBot\\MaiBot') || 
       paths.selectedInstancePath.includes('Deployments\\Deployments'))) {
    console.warn('🔍 检测到实例路径重复问题:', paths.selectedInstancePath);
    localStorage.removeItem('selectedInstancePath');
    console.log('🧹 已清除问题实例路径');
  }
  
  return paths;
};

/**
 * 重置所有路径配置
 */
export const resetAllPaths = () => {
  console.log('=== 重置所有路径配置 ===');
  
  const pathKeys = ['deploymentPath', 'dataStoragePath', 'selectedInstancePath'];
  
  pathKeys.forEach(key => {
    const oldValue = localStorage.getItem(key);
    if (oldValue) {
      localStorage.removeItem(key);
      console.log(`🧹 已清除 ${key}:`, oldValue);
    }
  });
  
  // 设置默认值
  const defaultPaths = {
    deploymentPath: '~\\MaiBot\\Deployments',
    dataStoragePath: '~\\MaiBot\\Data'
  };
  
  Object.entries(defaultPaths).forEach(([key, value]) => {
    localStorage.setItem(key, value);
    console.log(`✅ 已设置默认 ${key}:`, value);
    
    // 发送变更事件
    window.dispatchEvent(new CustomEvent(`${key.replace('Path', '')}-path-changed`, {
      detail: { path: value }
    }));
  });
  
  console.log('✅ 所有路径配置已重置');
  return defaultPaths;
};

// 在开发环境下添加到全局对象，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.pathFixHelper = {
    fixDeploymentPaths,
    checkAllPaths,
    resetAllPaths
  };
  
  console.log('🔧 路径修复工具已加载，可在控制台使用：');
  console.log('  window.pathFixHelper.fixDeploymentPaths() - 修复部署路径');
  console.log('  window.pathFixHelper.checkAllPaths() - 检查所有路径');
  console.log('  window.pathFixHelper.resetAllPaths() - 重置所有路径');
}

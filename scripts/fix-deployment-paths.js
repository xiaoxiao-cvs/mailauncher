/**
 * 修复部署路径问题的脚本
 * 清理localStorage中可能存在的错误路径配置
 */

console.log('=== MaiLauncher 部署路径修复脚本 ===');

// 检查并修复部署路径
function fixDeploymentPaths() {
  const savedDeploymentPath = localStorage.getItem('deploymentPath');
  
  console.log('当前部署路径:', savedDeploymentPath);
  
  // 检查是否存在路径重复问题
  if (savedDeploymentPath && (
    savedDeploymentPath.includes('MaiBot\\MaiBot') || 
    savedDeploymentPath.includes('MaiBot/MaiBot') ||
    savedDeploymentPath.includes('Deployments\\Deployments') ||
    savedDeploymentPath.includes('Deployments/Deployments') ||
    (savedDeploymentPath.match(/MaiBot[\/\\]Deployments/g) || []).length > 1
  )) {
    console.warn('🔧 检测到路径重复问题，正在修复...');
    console.log('问题路径:', savedDeploymentPath);
    
    // 清除错误的路径配置
    localStorage.removeItem('deploymentPath');
    
    // 设置默认路径
    const defaultPath = window.navigator.platform.includes('Win') ? 
      '~\\MaiBot\\Deployments' : '~/MaiBot/Deployments';
    
    localStorage.setItem('deploymentPath', defaultPath);
    
    console.log('✅ 已修复为默认路径:', defaultPath);
    
    // 发送路径变更事件
    window.dispatchEvent(new CustomEvent('deployment-path-changed', {
      detail: { path: defaultPath }
    }));
    
    return true;
  } else {
    console.log('✅ 部署路径正常');
    return false;
  }
}

// 检查并修复数据路径
function fixDataPaths() {
  const savedDataPath = localStorage.getItem('dataStoragePath');
  
  console.log('当前数据路径:', savedDataPath);
  
  // 检查是否存在路径重复问题  
  if (savedDataPath && (
    savedDataPath.includes('MaiBot\\MaiBot') || 
    savedDataPath.includes('MaiBot/MaiBot') ||
    savedDataPath.includes('Data\\Data') ||
    savedDataPath.includes('Data/Data')
  )) {
    console.warn('🔧 检测到数据路径重复问题，正在修复...');
    console.log('问题路径:', savedDataPath);
    
    // 清除错误的路径配置
    localStorage.removeItem('dataStoragePath');
    
    // 设置默认路径
    const defaultPath = window.navigator.platform.includes('Win') ? 
      'D:\\MaiBot\\Data' : '~/Documents/MaiBot/Data';
    
    localStorage.setItem('dataStoragePath', defaultPath);
    
    console.log('✅ 已修复为默认路径:', defaultPath);
    
    // 发送路径变更事件
    window.dispatchEvent(new CustomEvent('data-path-changed', {
      detail: { path: defaultPath }
    }));
    
    return true;
  } else {
    console.log('✅ 数据路径正常');
    return false;
  }
}

// 执行修复
const deploymentFixed = fixDeploymentPaths();
const dataFixed = fixDataPaths();

if (deploymentFixed || dataFixed) {
  console.log('🎉 路径修复完成！请刷新页面以确保更改生效。');
  
  // 可选：自动刷新页面
  if (confirm('路径已修复，是否刷新页面以应用更改？')) {
    window.location.reload();
  }
} else {
  console.log('✅ 所有路径配置正常，无需修复。');
}

console.log('=== 修复脚本执行完毕 ===');

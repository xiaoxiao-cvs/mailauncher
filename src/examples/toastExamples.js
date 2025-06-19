/**
 * EnhancedToast使用示例
 * 演示如何使用新的Toast系统进行部署进度显示
 */

import enhancedToastService from '../services/enhancedToastService'

// 示例1: 显示基本的小尺寸Toast
export function showBasicToast() {
  enhancedToastService.small('这是一个小尺寸的Toast消息', {
    type: 'info',
    duration: 3000
  })
}

// 示例2: 显示部署Toast
export function showDeploymentToast() {
  const deploymentData = {
    instanceName: 'my-mai-instance',
    port: '8080',
    image: 'maimai:latest',
    targetUrl: 'http://localhost:8080'
  }

  const toastId = enhancedToastService.showDeploymentToast(deploymentData, {
    onExpand: (id, expanded) => {
      console.log(`Toast ${id} 展开状态: ${expanded}`)
    },
    onClose: (id) => {
      console.log(`Toast ${id} 已关闭`)
    }
  })

  if (toastId === -1) {
    console.log('用户在下载页，Toast未显示')
    return
  }

  // 模拟部署进度更新
  simulateDeploymentProgress(toastId)
}

// 示例3: 模拟部署进度
function simulateDeploymentProgress(toastId) {
  let progress = 0
  const services = [
    { name: '数据库', status: 'pending' },
    { name: 'Web服务', status: 'pending' },
    { name: '代理服务', status: 'pending' }
  ]

  const progressInterval = setInterval(() => {
    progress += Math.random() * 15
    
    // 更新服务状态
    if (progress > 20) services[0].status = 'running'
    if (progress > 50) services[1].status = 'running'
    if (progress > 80) services[2].status = 'running'

    // 更新Toast进度
    enhancedToastService.updateDeploymentProgress(
      toastId,
      Math.min(progress, 100),
      `安装进度 ${Math.round(progress)}%`,
      services
    )

    // 完成安装
    if (progress >= 100) {
      clearInterval(progressInterval)
      
      setTimeout(() => {
        enhancedToastService.completeDeployment(
          toastId,
          true,
          '实例安装完成！点击访问'
        )
      }, 500)
    }
  }, 800)
}

// 示例4: 显示错误Toast
export function showErrorToast() {
  enhancedToastService.error('安装失败：端口8080已被占用', {
    size: 'medium',
    duration: 0, // 不自动关闭
    deploymentData: {
      instanceName: 'failed-instance',
      port: '8080',
      error: 'Port already in use'
    }
  })
}

// 示例5: 显示成功Toast
export function showSuccessToast() {
  enhancedToastService.success('实例部署成功！', {
    size: 'medium',
    duration: 5000
  })
}

// 示例6: 显示大尺寸Toast（完全展开）
export function showLargeToast() {
  const deploymentData = {
    instanceName: 'advanced-mai-instance',
    port: '9090',
    image: 'maimai:v2.1.0',
    targetUrl: 'http://localhost:9090',
    status: '运行中',
    lastUpdate: new Date().toLocaleTimeString(),
    servicesProgress: [
      { name: 'MySQL数据库', status: 'running' },
      { name: 'Redis缓存', status: 'running' },
      { name: 'Nginx代理', status: 'running' },
      { name: 'MaiMai应用', status: 'running' }
    ]
  }

  enhancedToastService.large('高级实例部署完成', {
    type: 'success',
    duration: 0,
    deploymentData
  })
}

// 示例7: 根据当前页面智能显示
export function showSmartToast() {
  const currentTab = enhancedToastService.getCurrentActiveTab()
  
  console.log('当前页面:', currentTab)
  
  if (currentTab === 'downloads') {
    console.log('在下载页，将不显示Toast')
  } else {
    console.log('不在下载页，将显示Toast')
  }
  
  // 这会检查当前页面并决定是否显示
  showDeploymentToast()
}

// 快捷测试方法
export function testAllToastTypes() {
  console.log('测试所有Toast类型...')
  
  setTimeout(() => showBasicToast(), 100)
  setTimeout(() => showSuccessToast(), 1000)
  setTimeout(() => showErrorToast(), 2000)
  setTimeout(() => showDeploymentToast(), 3000)
  setTimeout(() => showLargeToast(), 5000)
}

// 在浏览器控制台中可用的调试方法
if (typeof window !== 'undefined') {
  window.testToast = {
    basic: showBasicToast,
    deployment: showDeploymentToast,
    error: showErrorToast,
    success: showSuccessToast,
    large: showLargeToast,
    smart: showSmartToast,
    all: testAllToastTypes
  }
  
  console.log('Toast测试方法已加载到 window.testToast')
  console.log('可用方法: basic, deployment, error, success, large, smart, all')
}

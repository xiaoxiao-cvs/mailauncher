import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { OnboardingPage } from '@/components/onboarding'
import { HomePage } from '@/pages/HomePage'
import { InstancesPage } from '@/pages/InstancesPage'
import { DownloadsPage } from '@/pages/DownloadsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import './App.css'

/**
 * 路由组件 - 处理引导流程和主页跳转
 */
function AppRoutes() {
  const navigate = useNavigate()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  // 检查本地存储,判断是否已完成引导
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    if (completed === 'true') {
      setHasCompletedOnboarding(true)
    }
  }, [])

  // 开发环境:在控制台添加 test1() 命令用于跳转到引导页
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).test1 = () => {
        console.log('清除引导标记,跳转到引导页...')
        localStorage.removeItem('onboarding_completed')
        // 直接刷新页面，让应用重新加载并进入引导页
        window.location.href = '/onboarding'
      }
      console.log('开发提示:在控制台执行 test1() 可以跳转到引导页')
    }
    
    return () => {
      if (import.meta.env.DEV) {
        delete (window as any).test1
      }
    }
  }, [navigate])

  const handleOnboardingComplete = () => {
    console.log('引导完成！')
    localStorage.setItem('onboarding_completed', 'true')
    setHasCompletedOnboarding(true)
    navigate('/home')
  }

  const handleOnboardingSkip = () => {
    console.log('跳过引导！')
    localStorage.setItem('onboarding_completed', 'true')
    setHasCompletedOnboarding(true)
    navigate('/home')
  }

  return (
    <Routes>
      <Route 
        path="/onboarding" 
        element={
          <OnboardingPage 
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        } 
      />
      <Route path="/home" element={<HomePage />} />
      <Route path="/instances" element={<InstancesPage />} />
      <Route path="/downloads" element={<DownloadsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route 
        path="/" 
        element={
          <Navigate to={hasCompletedOnboarding ? "/home" : "/onboarding"} replace />
        } 
      />
    </Routes>
  )
}

/**
 * 应用主组件
 * 职责：路由管理和组件组合
 */
function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App

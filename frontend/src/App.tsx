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

  // 开发环境：每次都清除引导完成标记，确保引导页每次都加载
  useEffect(() => {
    if (import.meta.env.DEV) {
      localStorage.removeItem('onboarding_completed')
    }
  }, [])

  // 检查本地存储，判断是否已完成引导
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    if (completed === 'true') {
      setHasCompletedOnboarding(true)
    }
  }, [])

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

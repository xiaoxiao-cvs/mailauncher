import { BrowserRouter as Router } from 'react-router-dom'
import { OnboardingPage } from '@/components/onboarding'
import './App.css'

/**
 * 应用主组件
 * 职责：路由管理和组件组合
 */
function App() {
  const handleOnboardingComplete = () => {
    console.log('引导完成！')
    // TODO: 跳转到主应用
  }

  const handleOnboardingSkip = () => {
    console.log('跳过引导！')
    // TODO: 直接进入主应用
  }

  return (
    <Router>
      <OnboardingPage 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </Router>
  )
}

export default App

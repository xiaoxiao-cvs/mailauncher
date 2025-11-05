import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { animate } from 'animejs'
import { Button } from '@/components/ui/button'
import { 
  BotIcon, 
  RocketIcon, 
  ZapIcon, 
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  SparklesIcon
} from 'lucide-react'
import './App.css'

type OnboardingStep = {
  id: number
  title: string
  subtitle: string
  description: string[]
  icon: React.ReactNode
  gradient: string
  color: string
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: '可视化管理',
    subtitle: '告别命令行的复杂操作',
    description: [
      '直观的图形界面，所有配置一目了然',
      '实时状态监控，随时掌握运行情况',
      '一键启停，无需记忆复杂命令'
    ],
    icon: <BotIcon className="w-8 h-8" />,
    gradient: 'from-[#a2d2ff] to-[#bde0fe]',
    color: '#a2d2ff'
  },
  {
    id: 2,
    title: '快速部署',
    subtitle: '从零到上线只需几分钟',
    description: [
      '智能配置向导，自动检测系统环境',
      '一键安装依赖，无需手动配置',
      '模板化配置，快速创建新实例'
    ],
    icon: <RocketIcon className="w-8 h-8" />,
    gradient: 'from-[#ffafcc] to-[#ffc8dd]',
    color: '#ffafcc'
  },
  {
    id: 3,
    title: '多实例管理',
    subtitle: '同时管理多个机器人账号',
    description: [
      '支持多个 Bot 实例同时运行',
      '独立的配置和日志管理',
      '批量操作，提升管理效率'
    ],
    icon: <ZapIcon className="w-8 h-8" />,
    gradient: 'from-[#cdb4db] to-[#ffc8dd]',
    color: '#cdb4db'
  },
  {
    id: 4,
    title: '安全稳定',
    subtitle: '7×24 小时稳定运行',
    description: [
      '完善的错误处理和自动重启机制',
      '详细的日志记录，方便问题排查',
      '定期备份配置，数据安全无忧'
    ],
    icon: <ShieldCheckIcon className="w-8 h-8" />,
    gradient: 'from-[#bde0fe] to-[#cdb4db]',
    color: '#bde0fe'
  }
]

function App() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 初始入场动画
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [0, 1],
        translateX: [50, 0],
        duration: 800,
        ease: 'outQuad'
      })
    }
  }, [])

  const handleNext = () => {
    if (isAnimating) return
    
    if (currentStep < steps.length - 1) {
      animateTransition(() => setCurrentStep(currentStep + 1))
    } else {
      // 最后一步，完成引导
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (isAnimating || currentStep === 0) return
    animateTransition(() => setCurrentStep(currentStep - 1))
  }

  const handleSkip = () => {
    animateTransition(() => handleComplete())
  }

  const animateTransition = (callback: () => void) => {
    setIsAnimating(true)

    // 退出动画
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [1, 0],
        translateX: [0, -50],
        duration: 300,
        ease: 'inQuad',
        onComplete: () => {
          callback()
          
          // 入场动画
          if (contentRef.current) {
            animate(contentRef.current, {
              opacity: [0, 1],
              translateX: [50, 0],
              duration: 400,
              ease: 'outQuad',
              onComplete: () => setIsAnimating(false)
            })
          }
        }
      })
    }
  }

  const handleComplete = () => {
    console.log('引导完成！')
    // 这里可以跳转到主应用
  }

  const currentStepData = steps[currentStep]

  return (
    <Router>
      <div 
        className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative"
        style={{
          ['--step-color' as string]: currentStepData.color,
          ['--step-color-light' as string]: `${currentStepData.color}20`,
          ['--step-color-lighter' as string]: `${currentStepData.color}10`,
          ['--step-color-fade' as string]: `${currentStepData.color}40`
        } as React.CSSProperties}
      >
        {/* 优化的动态渐变背景 - 使用纯CSS动画以提升性能和跨浏览器兼容性 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 蓝色渐变球 */}
          <div className="gradient-blob blob-1 absolute top-0 left-0 w-[900px] h-[900px] rounded-full blur-3xl opacity-40" />
          {/* 粉色渐变球 */}
          <div className="gradient-blob blob-2 absolute top-1/3 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-45" />
          {/* 紫色渐变球 */}
          <div className="gradient-blob blob-3 absolute bottom-0 left-1/3 w-[850px] h-[850px] rounded-full blur-3xl opacity-35" />
        </div>

        {/* 全新左右分栏式布局 */}
        <div className="relative w-full max-w-6xl z-10 flex gap-8">
          {/* 左侧：步骤导航 */}
          <div className="hidden md:flex flex-col w-80 gap-4">
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-xl">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a2d2ff] to-[#bde0fe] flex items-center justify-center">
                  <BotIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#03045e]">MAI Launcher</h1>
                  <p className="text-xs text-[#023e8a]/60">引导设置</p>
                </div>
              </div>

              {/* 步骤列表 */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (!isAnimating && index !== currentStep) {
                        animateTransition(() => setCurrentStep(index))
                      }
                    }}
                    disabled={isAnimating}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                      index === currentStep
                        ? 'bg-white shadow-lg scale-105'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`step-icon-bg w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                          index === currentStep ? 'scale-110' : ''
                        }`}
                        style={{
                          ['--icon-color' as string]: step.color,
                          ['--icon-color-dark' as string]: `${step.color}dd`
                        } as React.CSSProperties}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#023e8a]/60">
                            步骤 {index + 1}
                          </span>
                          {index === currentStep && (
                            <SparklesIcon className="w-3 h-3 text-[#ffafcc]" />
                          )}
                        </div>
                        <p className={`text-sm font-semibold truncate ${
                          index === currentStep ? 'text-[#03045e]' : 'text-[#023e8a]/70'
                        }`}>
                          {step.title}
                        </p>
                      </div>
                      {index < currentStep && (
                        <CheckCircle2Icon className="w-5 h-5 text-[#a2d2ff]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 跳过按钮 */}
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isAnimating}
              className="w-full text-[#023e8a]/60 hover:text-[#023e8a] hover:bg-white/50"
            >
              跳过引导，直接开始
            </Button>
          </div>

          {/* 右侧：内容展示区 */}
          <div className="flex-1">
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/60 shadow-xl min-h-[600px] flex flex-col">
              {/* 移动端步骤指示器 */}
              <div className="md:hidden flex justify-center gap-2 mb-6">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`step-indicator-bg h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep ? 'w-8' : 'w-1.5'
                    }`}
                    style={{
                      ['--indicator-color' as string]: index === currentStep 
                        ? currentStepData.color 
                        : `${currentStepData.color}40`
                    } as React.CSSProperties}
                  />
                ))}
              </div>

              {/* 内容区域 */}
              <div ref={contentRef} className="flex-1 flex flex-col">
                {/* 标题区域 */}
                <div className="mb-8">
                  <div className="step-badge-bg inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4">
                    <span className="step-text-color text-xs font-medium">
                      步骤 {currentStep + 1} / {steps.length}
                    </span>
                  </div>
                  <h2 className="text-4xl font-bold text-[#03045e] mb-3">
                    {currentStepData.title}
                  </h2>
                  <p className="text-xl text-[#023e8a]/70 font-medium">
                    {currentStepData.subtitle}
                  </p>
                </div>

                {/* 特性列表 */}
                <div className="flex-1 space-y-4 mb-8">
                  {currentStepData.description.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 hover:shadow-md"
                    >
                      <div 
                        className="step-icon-bg w-6 h-6 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm mt-0.5"
                        style={{
                          ['--icon-color' as string]: currentStepData.color,
                          ['--icon-color-dark' as string]: `${currentStepData.color}dd`
                        } as React.CSSProperties}
                      >
                        {index + 1}
                      </div>
                      <p className="text-[#023e8a] leading-relaxed flex-1">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 底部按钮 */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-[#023e8a]/10">
                  {currentStep > 0 ? (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={isAnimating}
                      className="bg-white/60 border-[#023e8a]/20 text-[#023e8a] hover:bg-white"
                    >
                      上一步
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    disabled={isAnimating}
                    className="text-white border-0 px-8 py-6 text-base shadow-lg hover:shadow-xl transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${currentStepData.color}, ${currentStepData.color}dd)`
                    }}
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        <CheckCircle2Icon className="w-5 h-5 mr-2" />
                        开始使用 MAI Launcher
                      </>
                    ) : (
                      <>
                        下一步
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App

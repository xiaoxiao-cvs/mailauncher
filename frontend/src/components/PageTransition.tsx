/**
 * 页面过渡动画组件
 * 为路由切换添加平滑的过渡效果
 */

import { ReactNode, useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
  /** 动画持续时间（毫秒） */
  duration?: number
}

/**
 * 页面过渡动画包装器
 * 提供淡入淡出效果
 */
export function PageTransition({ children, duration = 300 }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 组件挂载后触发淡入动画
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="w-full h-full transition-all"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'ease-out'
      }}
    >
      {children}
    </div>
  )
}

/**
 * 滑动过渡动画
 * 从右侧滑入
 */
export function SlideTransition({ children, duration = 300 }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="w-full h-full transition-all"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'ease-in-out'
      }}
    >
      {children}
    </div>
  )
}

/**
 * 缩放过渡动画
 * 放大淡入效果
 */
export function ScaleTransition({ children, duration = 300 }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="w-full h-full transition-all"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'ease-in-out'
      }}
    >
      {children}
    </div>
  )
}


import { useRef, useEffect, useState } from 'react'
import { animate } from 'animejs'

/**
 * 引导页动画 Hook
 * 职责：管理引导页的过渡动画逻辑
 */
export function useOnboardingAnimation() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // 初始入场动画
  useEffect(() => {
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        ease: 'outQuad'
      })
    }
  }, [])

  /**
   * 执行过渡动画
   * @param callback 动画完成后的回调函数
   * @param direction 动画方向 (next: 下一步, prev: 上一步)
   */
  const animateTransition = (
    callback: () => void,
    direction: 'next' | 'prev' = 'next'
  ) => {
    setIsAnimating(true)

    // 根据方向设置退出和入场动画
    const exitY = direction === 'next' ? -30 : 30  // 下一步向上退出，上一步向下退出
    const enterY = direction === 'next' ? 30 : -30 // 下一步从下进入，上一步从上进入

    // 退出动画
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [1, 0],
        translateY: [0, exitY],
        duration: 300,
        ease: 'inQuad',
        onComplete: () => {
          callback()
          
          // 使用 setTimeout 确保状态更新完成后再执行入场动画
          setTimeout(() => {
            if (contentRef.current) {
              animate(contentRef.current, {
                opacity: [0, 1],
                translateY: [enterY, 0],
                duration: 400,
                ease: 'outQuad',
                onComplete: () => setIsAnimating(false)
              })
            }
          }, 10)
        }
      })
    } else {
      // 如果 ref 不可用，直接执行回调
      callback()
      setIsAnimating(false)
    }
  }

  return {
    contentRef,
    isAnimating,
    animateTransition
  }
}

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
        translateY: [24, 0],
        duration: 600,
        easing: 'easeOutCubic'
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

    const exitY = direction === 'next' ? -12 : 12
    const enterY = direction === 'next' ? 16 : -16

    // 退出动画
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [1, 0],
        translateY: [0, exitY],
        duration: 200,
        easing: 'easeInCubic',
        complete: () => {
          // 在 React 更新 DOM 前锁定不可见状态，防止新内容闪帧
          if (contentRef.current) {
            contentRef.current.style.opacity = '0'
            contentRef.current.style.transform = `translateY(${enterY}px)`
          }

          callback()

          // 等待 React 完成 DOM 更新后再入场
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (contentRef.current) {
                animate(contentRef.current, {
                  opacity: [0, 1],
                  translateY: [enterY, 0],
                  duration: 380,
                  easing: 'easeOutCubic',
                  complete: () => setIsAnimating(false)
                })
              }
            })
          })
        }
      })
    } else {
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

import { useRef, useEffect, useState } from 'react'
import { animate, stagger, set, splitText } from 'animejs'

/**
 * 引导页动画 Hook
 * 职责：管理分层交错入场动画 + 逐字标题揭示
 */
export function useOnboardingAnimation() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  // 缓存 splitText 实例，以便在下次动画前 revert
  const splitterRef = useRef<ReturnType<typeof splitText> | null>(null)

  /** 清理上一次的 splitText */
  const revertSplitter = () => {
    if (splitterRef.current) {
      try { splitterRef.current.revert() } catch { /* ignore */ }
      splitterRef.current = null
    }
  }

  /** 获取 contentRef 下所有 data-animate 元素（按 DOM 顺序） */
  const getAnimTargets = () => {
    if (!contentRef.current) return []
    return Array.from(
      contentRef.current.querySelectorAll<HTMLElement>('[data-animate]')
    )
  }

  /** 对标题做逐字动画 */
  const animateTitle = (titleContainer: HTMLElement, delay: number) => {
    const h2 = titleContainer.querySelector('h2')
    if (!h2) return

    revertSplitter()
    const splitter = splitText(h2)
    splitterRef.current = splitter

    if (splitter.chars && splitter.chars.length > 0) {
      set(splitter.chars, { opacity: 0, translateY: 16 })
      animate(splitter.chars, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 450,
        delay: stagger(35, { start: delay }),
        easing: 'easeOutCubic',
        onComplete: () => revertSplitter()
      })
    }
  }

  /** 分层交错入场动画 */
  const staggerEnter = (enterY: number, isMount = false) => {
    const targets = getAnimTargets()
    if (targets.length === 0) {
      setIsAnimating(false)
      return
    }

    const duration = isMount ? 400 : 320
    const staggerDelay = isMount ? 80 : 60

    // 找到 title 元素，单独处理
    const titleEl = targets.find(el => el.dataset.animate === 'title')
    const otherTargets = targets.filter(el => el.dataset.animate !== 'title')

    // 设置所有元素初始状态
    set(targets, { opacity: 0, translateY: enterY })

    // title 容器只做 opacity，translateY 由逐字动画负责
    if (titleEl) {
      set(titleEl, { translateY: 0 })
    }

    // 恢复容器可见性
    if (contentRef.current) {
      contentRef.current.style.opacity = '1'
      contentRef.current.style.transform = ''
      contentRef.current.style.visibility = 'visible'
    }

    // 非 title 元素交错入场
    if (otherTargets.length > 0) {
      animate(otherTargets, {
        opacity: [0, 1],
        translateY: [enterY, 0],
        duration,
        delay: stagger(staggerDelay),
        easing: 'easeOutCubic',
        onComplete: () => setIsAnimating(false)
      })
    }

    // title 容器 opacity 渐显 + 逐字揭示
    if (titleEl) {
      const titleDelay = staggerDelay // title 在序列中第二位
      animate(titleEl, {
        opacity: [0, 1],
        duration: duration * 0.6,
        delay: titleDelay,
        easing: 'easeOutCubic'
      })
      animateTitle(titleEl, titleDelay)
    }
  }

  // 初始入场动画
  useEffect(() => {
    if (contentRef.current) {
      setIsAnimating(true)
      // 首次加载时延迟一帧确保 DOM 就绪
      requestAnimationFrame(() => {
        staggerEnter(24, true)
      })
    }
    return () => revertSplitter()
  }, [])

  /**
   * 执行过渡动画
   */
  const animateTransition = (
    callback: () => void,
    direction: 'next' | 'prev' = 'next'
  ) => {
    setIsAnimating(true)
    revertSplitter()

    const enterY = direction === 'next' ? 16 : -16
    const targets = getAnimTargets()

    // 退出动画：所有元素同时快速淡出
    if (targets.length > 0) {
      animate(targets, {
        opacity: [1, 0],
        duration: 180,
        easing: 'easeInCubic',
        onComplete: () => {
          // 锁定容器不可见
          if (contentRef.current) {
            contentRef.current.style.visibility = 'hidden'
          }

          callback()

          // 等 React DOM 更新后交错入场
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              staggerEnter(enterY)
            })
          })
        }
      })
    } else {
      // 没有 targets 时的 fallback
      if (contentRef.current) {
        contentRef.current.style.visibility = 'hidden'
      }
      callback()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          staggerEnter(enterY)
        })
      })
    }
  }

  return {
    contentRef,
    isAnimating,
    animateTransition
  }
}

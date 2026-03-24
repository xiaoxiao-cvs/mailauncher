import { useRef, useEffect, useState } from 'react'
import { animate, stagger, set, splitText } from 'animejs'

/**
 * 引导页动画 Hook
 * 职责：管理分层交错入场动画 + 逐字标题揭示
 */
export function useOnboardingAnimation() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
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

    const titleEl = targets.find(el => el.dataset.animate === 'title')
    const otherTargets = targets.filter(el => el.dataset.animate !== 'title')

    set(targets, { opacity: 0, translateY: enterY })

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
      const titleDelay = staggerDelay
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
      requestAnimationFrame(() => {
        staggerEnter(24, true)
      })
    }
    return () => revertSplitter()
  }, [])

  /**
   * 执行过渡动画（固定高度容器，仅做内容淡出→切换→淡入）
   */
  const animateTransition = (
    callback: () => void,
    direction: 'next' | 'prev' = 'next'
  ) => {
    setIsAnimating(true)
    revertSplitter()

    const enterY = direction === 'next' ? 16 : -16
    const targets = getAnimTargets()

    const afterExit = () => {
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

    // 退出动画：所有元素同时快速淡出
    if (targets.length > 0) {
      animate(targets, {
        opacity: [1, 0],
        duration: 180,
        easing: 'easeInCubic',
        onComplete: afterExit
      })
    } else {
      afterExit()
    }
  }

  return {
    contentRef,
    isAnimating,
    animateTransition
  }
}

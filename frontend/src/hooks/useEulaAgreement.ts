import { useState, useEffect, useCallback, useRef } from 'react'

const EULA_ACCEPTED_KEY = 'eula_accepted'
const CURRENT_EULA_VERSION = '1.0'
const COUNTDOWN_SECONDS = 10

interface UseEulaAgreementReturn {
  hasScrolledToBottom: boolean
  remainingSeconds: number
  canProceed: boolean
  alreadyAccepted: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement>
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export function useEulaAgreement(
  onCanProceedChange: (canProceed: boolean) => void,
  onButtonLabelChange: (label: string | null) => void
): UseEulaAgreementReturn {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_SECONDS)
  const [alreadyAccepted, setAlreadyAccepted] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null!)

  // 检查是否已经接受过
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EULA_ACCEPTED_KEY) || '{}')
      if (stored.version === CURRENT_EULA_VERSION) {
        setAlreadyAccepted(true)
        setHasScrolledToBottom(true)
        setRemainingSeconds(0)
      }
    } catch {
      // ignore
    }
  }, [])

  // 倒计时
  useEffect(() => {
    if (alreadyAccepted || remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [alreadyAccepted, remainingSeconds])

  // 检查内容是否不需要滚动（高度不够）
  useEffect(() => {
    if (alreadyAccepted) return

    const el = scrollContainerRef.current
    if (!el) return

    const checkOverflow = () => {
      if (el.scrollHeight <= el.clientHeight + 20) {
        setHasScrolledToBottom(true)
      }
    }

    // 延迟检查，等内容渲染完
    const timeout = setTimeout(checkOverflow, 200)
    return () => clearTimeout(timeout)
  }, [alreadyAccepted])

  // 滚动检测
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (hasScrolledToBottom) return
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setHasScrolledToBottom(true)
    }
  }, [hasScrolledToBottom])

  // 计算 canProceed 并同步到外部
  const canProceed = hasScrolledToBottom && remainingSeconds === 0

  useEffect(() => {
    onCanProceedChange(canProceed)
  }, [canProceed, onCanProceedChange])

  // 更新按钮文案
  useEffect(() => {
    if (alreadyAccepted) {
      onButtonLabelChange(null)
      return
    }

    if (remainingSeconds > 0) {
      onButtonLabelChange(`请阅读协议 (${remainingSeconds}s)`)
    } else if (!hasScrolledToBottom) {
      onButtonLabelChange('请滚动阅读完整协议')
    } else {
      onButtonLabelChange(null)
    }
  }, [remainingSeconds, hasScrolledToBottom, alreadyAccepted, onButtonLabelChange])

  // canProceed 为 true 时持久化
  useEffect(() => {
    if (canProceed && !alreadyAccepted) {
      localStorage.setItem(EULA_ACCEPTED_KEY, JSON.stringify({
        version: CURRENT_EULA_VERSION,
        timestamp: Date.now()
      }))
    }
  }, [canProceed, alreadyAccepted])

  return {
    hasScrolledToBottom,
    remainingSeconds,
    canProceed,
    alreadyAccepted,
    scrollContainerRef,
    handleScroll,
  }
}

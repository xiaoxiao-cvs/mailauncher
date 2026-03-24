import { useState, useEffect, useCallback, useRef } from 'react'

const EULA_ACCEPTED_KEY = 'eula_accepted'
const CURRENT_EULA_VERSION = '1.0'

interface UseEulaAgreementReturn {
  hasScrolledToBottom: boolean
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
  const [alreadyAccepted, setAlreadyAccepted] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null!)

  // 检查是否已经接受过
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EULA_ACCEPTED_KEY) || '{}')
      if (stored.version === CURRENT_EULA_VERSION) {
        setAlreadyAccepted(true)
        setHasScrolledToBottom(true)
      }
    } catch {
      // ignore
    }
  }, [])

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

  // canProceed 同步到外部
  const canProceed = hasScrolledToBottom

  useEffect(() => {
    onCanProceedChange(canProceed)
  }, [canProceed, onCanProceedChange])

  // 更新按钮文案
  useEffect(() => {
    if (alreadyAccepted || hasScrolledToBottom) {
      onButtonLabelChange(null)
    } else {
      onButtonLabelChange('请滚动阅读完整协议')
    }
  }, [hasScrolledToBottom, alreadyAccepted, onButtonLabelChange])

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
    canProceed,
    alreadyAccepted,
    scrollContainerRef,
    handleScroll,
  }
}

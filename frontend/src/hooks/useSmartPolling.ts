export interface SmartPollingOptions {
  intervalMs?: number
  leading?: boolean
  visibleOnly?: boolean
}

export function useSmartPolling(fn: () => void, deps: any[] = [], options: SmartPollingOptions = {}) {
  const intervalMs = options.intervalMs ?? 10000
  const leading = options.leading ?? true
  const visibleOnly = options.visibleOnly ?? true
  let timer: number | null = null

  const start = () => {
    if (leading) fn()
    stop()
    timer = window.setInterval(() => {
      if (visibleOnly && document.hidden) return
      fn()
    }, intervalMs)
  }

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const onVisibility = () => {
    if (!visibleOnly) return
    if (!document.hidden && timer === null) start()
  }

  ;(window as any).__smartPollingCleanup ??= []
  ;(window as any).__smartPollingCleanup.push(stop)

  start()
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    stop()
  }
}

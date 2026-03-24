import { useContext } from 'react'
import ReactMarkdown from 'react-markdown'
import { CheckCircle2Icon } from 'lucide-react'
import eulaContent from '@/assets/EULA.md?raw'
import { useEulaAgreement } from '@/hooks/useEulaAgreement'
import { EulaContext } from './EulaContext'

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-muted-foreground leading-relaxed text-[14px]">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-muted-foreground text-[14px]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-brand/30 pl-4 my-3 text-muted-foreground text-[14px]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
}

export function EulaAgreement() {
  const { onCanProceedChange, onButtonLabelChange } = useContext(EulaContext)
  const {
    alreadyAccepted,
    scrollContainerRef,
    handleScroll,
  } = useEulaAgreement(onCanProceedChange, onButtonLabelChange)

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 已接受提示条 */}
      {alreadyAccepted && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 flex-shrink-0">
          <CheckCircle2Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-[13px] text-emerald-700 dark:text-emerald-400">
            你已同意当前版本的用户协议，可直接继续。
          </p>
        </div>
      )}

      {/* 协议全文始终可见 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <ReactMarkdown components={markdownComponents}>
          {eulaContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

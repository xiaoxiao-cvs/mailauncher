import { useContext } from "react";
import ReactMarkdown from "react-markdown";
import { CheckCircle2Icon } from "lucide-react";
import eulaContent from "@/assets/EULA.md?raw";
import { Surface } from "@/components/ls";
import { useEulaAgreement } from "@/hooks/useEulaAgreement";
import { EulaContext } from "./EulaContext";

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--ls-ink)" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2
      className="text-xl font-semibold mb-3 mt-6"
      style={{ color: "var(--ls-ink)" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3
      className="text-lg font-semibold mb-2 mt-4"
      style={{ color: "var(--ls-ink)" }}
    >
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p
      className="mb-3 leading-relaxed text-[14px]"
      style={{ color: "var(--ls-ink-soft)" }}
    >
      {children}
    </p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[14px]" style={{ color: "var(--ls-ink-soft)" }}>
      {children}
    </li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold" style={{ color: "var(--ls-ink)" }}>
      {children}
    </strong>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote
      className="pl-4 my-3 text-[14px]"
      style={{
        borderLeft: "4px solid var(--ls-hairline)",
        color: "var(--ls-ink-soft)",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6" style={{ borderColor: "var(--ls-hairline)" }} />
  ),
};

export function EulaAgreement() {
  const { onCanProceedChange, onButtonLabelChange } = useContext(EulaContext);
  const { alreadyAccepted, scrollContainerRef, handleScroll } =
    useEulaAgreement(onCanProceedChange, onButtonLabelChange);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 已接受提示条 */}
      {alreadyAccepted && (
        <Surface
          variant="inset"
          className="flex items-center gap-3 p-3 flex-shrink-0"
          style={{
            background: "var(--ls-life-soft)",
            borderColor: "transparent",
          }}
        >
          <CheckCircle2Icon
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "var(--ls-life)" }}
          />
          <p className="text-[13px]" style={{ color: "var(--ls-life)" }}>
            你已同意当前版本的用户协议，可直接继续。
          </p>
        </Surface>
      )}

      {/* 协议全文始终可见 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-2 scrollbar-thin"
      >
        <ReactMarkdown components={markdownComponents}>
          {eulaContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

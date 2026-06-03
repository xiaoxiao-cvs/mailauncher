import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 顶层错误边界:任一页面渲染崩溃时显示可重试的兜底,而非整树卸载白屏。
 * 配合开发期"一个一个调":崩了能直接看到是哪个错、点重试恢复,不必重启 tauri dev。
 * 样式自包含(不依赖主题/设计 token),确保即便样式层出问题也能正常显示。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] 渲染崩溃:", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          color: "#2b2722",
          background: "#f3efe9",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            maxWidth: 680,
            width: "100%",
            padding: 24,
            borderRadius: 16,
            border: "1px solid rgba(43,39,34,0.08)",
            background: "#fbf8f3",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: "#2b2722" }}>
            页面渲染出错
          </div>
          <div style={{ fontSize: 13, color: "#79716a" }}>
            请查看下方错误信息,修复后点击重试。
          </div>
          <pre
            style={{
              maxWidth: "100%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#c5563e",
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "8px 18px",
              borderRadius: 12,
              border: "1px solid rgba(43,39,34,0.08)",
              background: "#ffffff",
              color: "#2b2722",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }
}

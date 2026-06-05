/**
 * 组件日志视图 —— 统一风格的结构化日志渲染器(取代 xterm 终端模拟器)
 *
 * 订阅与终端同源的数据(`terminal_get_history` + `terminal-output` 事件),把 PTY 流拼行、剥 ANSI、
 * 解析 时间戳 / level / 模块,按 Living Surfaces 风格逐行渲染。进程层 PTY 不动——Ctrl+C 优雅停止
 * 仍靠它(往 PTY 写 \x03)。我们不需要终端的输入 / 尺寸 / 二维码(QR 走 PNG),故砍掉那套,只做"看日志"。
 *
 * 性能:高频日志合批 setState(每 ~120ms 一刷),内存保留上限 1500 行,行用 memo 避免旧行重渲。
 * 注:WSL2 的实时轮询兜底未在此视图搬运,本地(event 流)为全量;远程需要再补轮询。
 */

import { memo, useEffect, useRef, useState } from "react";

import { transport } from "@/services/transport";
import { tauriInvoke } from "@/services/tauriInvoke";
import { instanceApi, type MaibotLogCursor } from "@/services/instanceApi";
import { terminalOutputEvent } from "@/types/tauriEvents";
import { feedLines, parseLogLine, type LogLevel } from "@/utils/logParse";

interface RenderLine {
  id: number;
  level: LogLevel;
  ts?: string;
  module?: string;
  text: string;
}

interface ComponentLogViewProps {
  instanceId: string;
  component: "MaiBot" | "NapCat";
  className?: string;
}

/** 内存保留行数上限(超出丢最旧)。 */
const MAX_LINES = 1500;
/** 批量刷新间隔(ms):高频日志合批,避免每行一次 setState。 */
const FLUSH_MS = 120;
/** 麦麦结构化日志轮询间隔(ms)。 */
const POLL_MS = 700;

/** 把外部 level 串(麦麦 jsonl 的 info/warning/error...)归一到本视图的 LogLevel。 */
function normLevel(raw: string): LogLevel {
  const k = raw.toLowerCase();
  if (k.startsWith("err") || k === "critical" || k === "fatal") return "error";
  if (k.startsWith("warn")) return "warn";
  if (k === "success") return "success";
  if (k === "debug" || k === "trace") return "debug";
  return "info";
}

const LEVEL_META: Record<
  LogLevel,
  { label: string; color: string; tint?: string } | null
> = {
  error: {
    label: "ERR",
    color: "var(--ls-danger)",
    tint: "var(--ls-danger-soft)",
  },
  warn: { label: "WARN", color: "var(--ls-warn)", tint: "var(--ls-warn-soft)" },
  success: { label: "OK", color: "var(--ls-life)" },
  info: { label: "INFO", color: "var(--ls-ink-soft)" },
  debug: { label: "DBG", color: "var(--ls-ink-faint)" },
  plain: null,
};

const LogRow = memo(function LogRow({ line }: { line: RenderLine }) {
  const meta = LEVEL_META[line.level];
  return (
    <div
      className="flex items-baseline gap-2 px-3 py-[1px]"
      style={meta?.tint ? { background: meta.tint } : undefined}
    >
      {line.ts && (
        <span
          className="shrink-0 tabular-nums"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {line.ts}
        </span>
      )}
      <span
        className="w-9 shrink-0 text-right font-semibold"
        style={{ color: meta ? meta.color : "var(--ls-ink-faint)" }}
      >
        {meta?.label ?? ""}
      </span>
      {line.module && (
        <span
          className="shrink-0 rounded px-1"
          style={{
            background: "var(--ls-surface-hi)",
            color: "var(--ls-ink-soft)",
          }}
        >
          {line.module}
        </span>
      )}
      <span
        className="min-w-0 flex-1 whitespace-pre-wrap break-all"
        style={{ color: "var(--ls-ink)" }}
      >
        {line.text}
      </span>
    </div>
  );
});

export function ComponentLogView({
  instanceId,
  component,
  className = "",
}: ComponentLogViewProps) {
  const [lines, setLines] = useState<RenderLine[]>([]);
  const carry = useRef({ buf: "" });
  const pending = useRef<RenderLine[]>([]);
  const idRef = useRef(0);
  const flushTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    // 切实例 / 组件时重置
    setLines([]);
    carry.current = { buf: "" };
    pending.current = [];
    idRef.current = 0;
    stick.current = true;

    let cancelled = false;

    // 合批落地:把已解析的行推入待刷队列,定时合并 setState(避免高频日志每行一刷)
    const pushParsed = (recs: Omit<RenderLine, "id">[]) => {
      for (const r of recs) pending.current.push({ id: idRef.current++, ...r });
      if (flushTimer.current == null) {
        flushTimer.current = window.setTimeout(() => {
          flushTimer.current = null;
          if (!pending.current.length) return;
          const batch = pending.current;
          pending.current = [];
          setLines((prev) => {
            const next = prev.concat(batch);
            return next.length > MAX_LINES
              ? next.slice(next.length - MAX_LINES)
              : next;
          });
        }, FLUSH_MS);
      }
    };

    const cleanups: Array<() => void> = [];

    if (component === "MaiBot") {
      // 麦麦:轮询其结构化 jsonl(干净、无需 ANSI 解析);只收 logger 输出,自带甩掉开机横幅
      let cursor: MaibotLogCursor | null = null;
      let timer: number | null = null;
      const poll = async () => {
        try {
          const chunk = await instanceApi.getMaibotLogs(instanceId, cursor);
          if (cancelled) return;
          cursor = chunk.cursor;
          if (chunk.records.length) {
            pushParsed(
              chunk.records.map((r) => ({
                level: normLevel(r.level),
                ts: r.ts || undefined,
                module: r.module || undefined,
                text: r.message,
              })),
            );
          }
        } catch {
          // 瞬时读失败忽略,下次轮询再试
        }
        if (!cancelled) timer = window.setTimeout(poll, POLL_MS);
      };
      void poll();
      cleanups.push(() => {
        if (timer != null) window.clearTimeout(timer);
      });
    } else {
      // NapCat:无结构化日志源(Winston 纯文本),走 PTY 终端流 + 剥 ANSI 解析
      let unlisten: (() => void) | null = null;
      void (async () => {
        try {
          const history = await tauriInvoke<string[]>("terminal_get_history", {
            instanceId,
            component,
            lines: 800,
          });
          if (cancelled) return;
          const histLines = feedLines(history.join(""), carry.current);
          if (carry.current.buf) {
            histLines.push(carry.current.buf);
            carry.current.buf = "";
          }
          pushParsed(histLines.map(parseLogLine));

          const eventName = terminalOutputEvent(instanceId, component);
          unlisten = await transport.listen<string>(eventName, (payload) => {
            if (!cancelled) {
              pushParsed(feedLines(payload, carry.current).map(parseLogLine));
            }
          });
        } catch (e) {
          if (!cancelled) {
            pushParsed([parseLogLine(`[启动器] 日志连接失败: ${String(e)}`)]);
          }
        }
      })();
      cleanups.push(() => unlisten?.());
    }

    return () => {
      cancelled = true;
      for (const c of cleanups) c();
      if (flushTimer.current != null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
    };
  }, [instanceId, component]);

  // 贴底自动滚动(用户上滚时暂停)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const copyAll = () => {
    const text = lines
      .map((l) =>
        [l.ts, l.module ? `[${l.module}]` : "", l.text]
          .filter(Boolean)
          .join(" "),
      )
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={`flex min-h-0 flex-col ${className}`}
      style={{ background: "var(--ls-bg)" }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1.5 text-[11px]"
        style={{
          borderColor: "var(--ls-hairline)",
          color: "var(--ls-ink-faint)",
        }}
      >
        <span>{lines.length} 行</span>
        <button
          type="button"
          onClick={copyAll}
          className="rounded px-2 py-0.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          复制全部
        </button>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto py-1 font-mono text-xs leading-snug"
      >
        {lines.length === 0 ? (
          <div className="px-3 py-2" style={{ color: "var(--ls-ink-faint)" }}>
            暂无日志
          </div>
        ) : (
          lines.map((l) => <LogRow key={l.id} line={l} />)
        )}
      </div>
    </div>
  );
}

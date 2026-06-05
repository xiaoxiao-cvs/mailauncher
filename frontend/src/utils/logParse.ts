/**
 * 终端 PTY 流 → 结构化日志行解析
 *
 * MaiBot / NapCat 经 PTY 输出的是带 ANSI 的终端字节流。本模块把它拼成完整行、剥掉 ANSI,
 * 并尽力解析出 时间戳 / level / 模块,供统一风格的日志渲染器(ComponentLogView)使用。
 * 设计原则:绝不丢内容——任何解析不出结构的行,原样作为 text 呈现(level=plain)。
 *
 * level 有两条来源(两个组件日志格式不同):
 * - NapCat:`[info]` 等字面 token;
 * - MaiBot:severity 编码在行首 ANSI 颜色里(方括号内是模块名)。
 *   故先读行首 SGR 颜色映射 level,再剥 ANSI。
 */

export type LogLevel =
  | "debug"
  | "info"
  | "success"
  | "warn"
  | "error"
  | "plain";

export interface LogLine {
  level: LogLevel;
  ts?: string;
  module?: string;
  text: string;
}

// CSI 转义序列(颜色及其它),用于剥除
// eslint-disable-next-line no-control-regex -- 需匹配 ESC(0x1b)开头的 ANSI 转义序列
const ANSI_CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

/** 剥除全部 ANSI CSI 转义序列。 */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_CSI, "");
}

/** 从行首第一段 SGR 颜色推断 level(MaiBot 用前景色编码 severity);认不出返回 null。 */
function levelFromColor(raw: string): LogLevel | null {
  // eslint-disable-next-line no-control-regex -- 匹配行首 SGR 颜色序列
  const match = raw.match(/\x1b\[([0-9;]*)m/);
  if (!match) return null;
  const codes = match[1].split(";").map((c) => Number.parseInt(c, 10));
  for (const c of codes) {
    if (c === 31 || c === 91) return "error"; // 红
    if (c === 33 || c === 93) return "warn"; // 黄
    if (c === 32 || c === 92) return "success"; // 绿
    if (c === 34 || c === 94 || c === 36 || c === 96) return "info"; // 蓝 / 青
    if (c === 90) return "debug"; // 亮黑(灰)
  }
  return null;
}

// 字面 level token(NapCat 等)→ 归一 level
const LITERAL_LEVEL: Record<string, LogLevel> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  success: "success",
  warn: "warn",
  warning: "warn",
  error: "error",
  critical: "error",
  fatal: "error",
};

// 行首时间戳:`MM-DD HH:MM:SS(.fff)` 或 `HH:MM:SS(.fff)`
const TS_RE = /^(?:\d{2}-\d{2}\s+)?\d{2}:\d{2}:\d{2}(?:[.,]\d+)?/;

/** 解析一条原始行(可能含 ANSI)为结构化 LogLine;解析不出结构则整行作 text(绝不丢内容)。 */
export function parseLogLine(raw: string): LogLine {
  const colorLevel = levelFromColor(raw);
  let rest = stripAnsi(raw).replace(/\s+$/, "");

  let ts: string | undefined;
  const tsMatch = rest.match(TS_RE);
  if (tsMatch) {
    ts = tsMatch[0];
    rest = rest.slice(tsMatch[0].length).replace(/^\s+/, "");
  }

  let level: LogLevel = colorLevel ?? "plain";
  let module: string | undefined;

  const first = rest.match(/^\[([^\]]+)\]\s*/);
  if (first) {
    const tag = first[1].trim();
    const literal = LITERAL_LEVEL[tag.toLowerCase()];
    if (literal) {
      level = literal;
      rest = rest.slice(first[0].length);
      // 字面 level 后可能再跟一个模块方括号(NapCat:`[info] [模块] ...`)
      const second = rest.match(/^\[([^\]]+)\]\s*/);
      if (second) {
        module = second[1].trim();
        rest = rest.slice(second[0].length);
      }
    } else {
      module = tag;
      rest = rest.slice(first[0].length);
    }
  }

  return { level, ts, module, text: rest };
}

/** 流式拼行的滚动状态(半行留存)。 */
export interface LineCarry {
  buf: string;
}

/**
 * 把一段流式 chunk 拼进 carry,切出完整行(原始,含 ANSI),半行留在 `carry.buf`。
 * `\r\n` 归一为 `\n`;行内裸 `\r`(就地刷新 / 进度条)取最后一个 `\r` 之后的内容。
 */
export function feedLines(chunk: string, carry: LineCarry): string[] {
  carry.buf += chunk.replace(/\r\n/g, "\n");
  const lines: string[] = [];
  let nl = carry.buf.indexOf("\n");
  while (nl >= 0) {
    let line = carry.buf.slice(0, nl);
    carry.buf = carry.buf.slice(nl + 1);
    const cr = line.lastIndexOf("\r");
    if (cr >= 0) line = line.slice(cr + 1);
    lines.push(line);
    nl = carry.buf.indexOf("\n");
  }
  return lines;
}

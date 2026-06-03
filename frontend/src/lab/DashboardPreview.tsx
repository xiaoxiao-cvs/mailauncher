import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Home,
  Boxes,
  Download,
  Settings,
  Bell,
  Moon,
  Sun,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TactileButton } from "@/components/ls";
import { springSettle, springTap } from "@/design/motion";

/**
 * 数据看板重设计原型 v3(mock 数据,无需 Tauri)。
 * 全宽 app 壳:左 Living Surfaces 侧边栏 + 主内容 12 栅格铺满。
 * 左上=系统概览+资源占用;右+下=数据(消息英雄/KPI/模型分布/队列)。
 * vite dev 下访问 /dashboard.html 预览。
 */

const yuan = (n: number): string =>
  "¥" + (n >= 100 ? n.toFixed(0) : n.toFixed(2));

const GiB = 1024 ** 3;
const fmtGB = (bytes: number) => (bytes / GiB).toFixed(1) + " GB";
const fmtRate = (bps: number) =>
  bps >= 1024 * 1024
    ? (bps / 1024 / 1024).toFixed(1) + " MB/s"
    : bps >= 1024
      ? (bps / 1024).toFixed(0) + " KB/s"
      : bps + " B/s";

// mock 系统快照(形状与后端 SystemStats 一致:字节 / 字节每秒)
const sys = {
  cpu_usage: 18.4,
  cpu_core_count: 16,
  memory_total: 16 * GiB,
  memory_used: 6.2 * GiB,
  disk_total: 931 * GiB,
  disk_available: 402 * GiB,
  net_rx_rate: 1.2 * 1024 * 1024,
  net_tx_rate: 240 * 1024,
};

const history = [210, 180, 320, 290, 410, 380, 520, 470, 610, 560, 700, 980];

const models = [
  { name: "gpt-4o", cost: 5.21, requests: 3120, tone: "var(--ls-life)" },
  { name: "deepseek-v3", cost: 3.04, requests: 2600, tone: "#cf9442" },
  { name: "claude-haiku-4.5", cost: 2.1, requests: 1500, tone: "#c5563e" },
  { name: "gemini-2.5-flash", cost: 1.25, requests: 900, tone: "#7f9b6a" },
  { name: "qwen-max", cost: 0.87, requests: 301, tone: "#b07d56" },
];
const modelTotal = models.reduce((s, m) => s + m.cost, 0);

const queue = [
  { group: "测试群", status: "生成中", tone: "var(--ls-life)" },
  { group: "闲聊", status: "规划中", tone: "#cf9442" },
  { group: "夜间值守", status: "发送中", tone: "var(--ls-life)" },
];

const NAV = [
  { icon: Home, label: "主页", active: true },
  { icon: Boxes, label: "实例管理", active: false },
  { icon: Download, label: "下载", active: false },
];

const RANGES = ["24h", "7d", "30d"] as const;
type Range = (typeof RANGES)[number];

const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSettle },
};

function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      variants={child}
      whileHover={{ y: -2 }}
      transition={springTap}
      className={cn("ls-card p-4", className)}
    >
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[11px] font-medium"
      style={{ color: "var(--ls-ink-soft)" }}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <Label>{label}</Label>
      <div className="ls-num mt-2 text-xl font-semibold leading-none">
        {value}
      </div>
      {sub && (
        <div
          className="ls-num mt-1.5 text-xs"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}

/* CPU 环形占用 */
function Ring({ value }: { value: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: 60, height: 60 }}>
      <svg width={60} height={60} viewBox="0 0 60 60">
        <circle
          cx={30}
          cy={30}
          r={r}
          fill="none"
          stroke="var(--ls-hairline)"
          strokeWidth={6}
        />
        <motion.circle
          cx={30}
          cy={30}
          r={r}
          fill="none"
          stroke="var(--ls-life)"
          strokeWidth={6}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ ...springSettle, delay: 0.2 }}
        />
      </svg>
      <div className="ls-num absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {value}%
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 320;
  const H = 64;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const pts = values.map(
    (v, i) =>
      `${(i * step).toFixed(1)},${(H - ((v - min) / range) * (H - 6) - 3).toFixed(1)}`,
  );
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ls-life)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--ls-life)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#spark)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--ls-life)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

function SegmentControl({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  return (
    <div
      className="ls-inset flex p-0.5 text-sm"
      style={{ borderRadius: "var(--ls-r-control)" }}
    >
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className="ls-num relative px-3 py-1.5 font-medium"
          style={{
            color: value === r ? "var(--ls-ink)" : "var(--ls-ink-soft)",
          }}
        >
          {value === r && (
            <motion.span
              layoutId="seg-active"
              className="absolute inset-0"
              style={{
                background: "var(--ls-surface-hi)",
                borderRadius: 9,
                boxShadow: "var(--ls-shadow-soft)",
              }}
              transition={springSettle}
            />
          )}
          <span className="relative">{r}</span>
        </button>
      ))}
    </div>
  );
}

/* 左侧边栏(Living Surfaces 预览,替代旧毛玻璃侧栏) */
function SidebarMock() {
  return (
    <aside
      className="ls-panel flex h-full w-60 flex-shrink-0 flex-col p-3"
      style={{ borderRadius: "var(--ls-r-panel)" }}
    >
      <div className="flex items-center gap-2.5 px-2 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: "var(--ls-life)" }}
        >
          MAI
        </div>
        <span className="text-[15px] font-semibold">mailauncher</span>
      </div>

      <nav className="mt-4 flex-1 space-y-1">
        {NAV.map((it) => (
          <button
            key={it.label}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm"
            style={{
              borderRadius: "var(--ls-r-control)",
              background: it.active ? "var(--ls-surface-hi)" : "transparent",
              color: it.active ? "var(--ls-ink)" : "var(--ls-ink-soft)",
              boxShadow: it.active ? "var(--ls-shadow-soft)" : "none",
              fontWeight: it.active ? 600 : 400,
            }}
          >
            <it.icon
              size={18}
              style={{ color: it.active ? "var(--ls-life)" : "inherit" }}
            />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="space-y-1 pt-2">
        {[
          { icon: Bell, label: "通知" },
          { icon: Settings, label: "设置" },
        ].map((it) => (
          <button
            key={it.label}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm"
            style={{
              borderRadius: "var(--ls-r-control)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <it.icon size={18} />
            {it.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function Meter({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span
          className="ls-num text-xs"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {fmtGB(used)} / {fmtGB(total)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--ls-bg-2)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--ls-life)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ...springSettle, delay: 0.25 }}
        />
      </div>
    </div>
  );
}

function SystemPanel() {
  return (
    <Card className="col-span-12 flex flex-col lg:col-span-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">系统</div>
        <div className="text-xs" style={{ color: "var(--ls-ink-faint)" }}>
          Windows 11 · 启动器 v0.1.0
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex flex-col items-center">
          <Ring value={Math.round(sys.cpu_usage)} />
          <div
            className="mt-1 text-[11px]"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            CPU · {sys.cpu_core_count} 核
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <Meter label="内存" used={sys.memory_used} total={sys.memory_total} />
          <Meter
            label="磁盘"
            used={sys.disk_total - sys.disk_available}
            total={sys.disk_total}
          />
        </div>
      </div>

      <div
        className="mt-4 flex items-center gap-5 border-t pt-3"
        style={{ borderColor: "var(--ls-hairline)" }}
      >
        <Label>网络</Label>
        <div className="flex items-center gap-1.5 text-sm">
          <ArrowDown size={13} style={{ color: "var(--ls-life)" }} />
          <span className="ls-num">{fmtRate(sys.net_rx_rate)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <ArrowUp size={13} style={{ color: "var(--ls-ink-soft)" }} />
          <span className="ls-num" style={{ color: "var(--ls-ink-soft)" }}>
            {fmtRate(sys.net_tx_rate)}
          </span>
        </div>
      </div>

      <div
        className="mt-4 border-t pt-3"
        style={{ borderColor: "var(--ls-hairline)" }}
      >
        <div className="flex items-baseline justify-between">
          <Label>在线实例</Label>
          <span className="ls-num text-lg font-semibold">
            2 <span style={{ color: "var(--ls-ink-faint)" }}>/ 5</span>
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{
                background: i < 2 ? "var(--ls-life)" : "var(--ls-ink-faint)",
                opacity: i < 2 ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="mt-auto pt-3 text-xs"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        运行 5h 23m · 状态正常
      </div>
    </Card>
  );
}

export function DashboardPreview() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [range, setRange] = useState<Range>("24h");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden p-3"
      style={{ background: "var(--ls-bg)" }}
    >
      <SidebarMock />

      <main className="ml-3 flex-1 overflow-auto">
        <div className="px-3 py-2">
          <header className="flex items-end justify-between">
            <div>
              <div
                className="text-xs uppercase tracking-[0.2em]"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                概览
              </div>
              <h1 className="mt-1 text-2xl font-semibold">全部实例</h1>
            </div>
            <div className="flex items-center gap-2.5">
              <SegmentControl value={range} onChange={setRange} />
              <TactileButton variant="solid" onClick={toggleTheme}>
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              </TactileButton>
            </div>
          </header>

          <motion.div
            className="mt-5 grid grid-cols-12 gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.05, delayChildren: 0.04 },
              },
            }}
          >
            {/* 左上:系统概览 + 占用 */}
            <SystemPanel />

            {/* 右上:消息英雄 + KPI */}
            <div className="col-span-12 flex flex-col gap-3 lg:col-span-8">
              <Card>
                <div className="flex items-start justify-between">
                  <Label>今日消息处理</Label>
                  <span
                    className="ls-num inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: "var(--ls-life-soft)",
                      color: "var(--ls-life)",
                    }}
                  >
                    ↑ 18%
                  </span>
                </div>
                <div className="ls-num mt-2 text-[2.5rem] font-semibold leading-none">
                  12,840
                </div>
                <div className="mt-3">
                  <Sparkline values={history} />
                  <div
                    className="ls-num mt-2 flex gap-4 text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    <span>峰值 980 / 时</span>
                    <span>均值 430 / 时</span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="总花费 · 24h" value="¥12.47" sub="¥0.52 / 小时" />
                <Stat label="回复" value="9,633" sub="回复率 75%" />
                <Stat label="Token" value="2.3M" sub="↑1.9M ↓438k" />
                <Stat label="平均响应" value="1.82s" sub="总请求 8,421" />
              </div>
            </div>

            {/* 下方:模型分布 + 队列 + 小指标 */}
            <Card className="col-span-12 lg:col-span-5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">模型分布</div>
                <div
                  className="text-xs"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  按花费
                </div>
              </div>
              <div className="mt-3 flex h-3 gap-1 overflow-hidden">
                {models.map((m) => (
                  <motion.div
                    key={m.name}
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.cost / modelTotal) * 100}%` }}
                    transition={{ ...springSettle, delay: 0.2 }}
                    style={{ background: m.tone, borderRadius: 4 }}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {models.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: m.tone }}
                    />
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="ls-num w-16 text-right font-semibold">
                      {yuan(m.cost)}
                    </span>
                    <span
                      className="ls-num w-10 text-right"
                      style={{ color: "var(--ls-ink-faint)" }}
                    >
                      {((m.cost / modelTotal) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="col-span-12 lg:col-span-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">消息队列</div>
                <div
                  className="ls-num text-xs"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  在途 3 · 已处理 13.4k
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {queue.map((q, i) => (
                  <div
                    key={i}
                    className="ls-inset flex items-center gap-2.5 px-3 py-2 text-sm"
                  >
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: q.tone }}
                    />
                    <span className="flex-1 truncate font-medium">
                      {q.group}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="col-span-12 grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-1">
              <Stat label="在线时长" value="5h 23m" />
              <Stat label="今日峰值" value="980" sub="条 / 小时" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

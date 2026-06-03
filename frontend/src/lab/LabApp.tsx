import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import {
  Play,
  Square,
  MoreHorizontal,
  Settings2,
  RotateCw,
  Trash2,
  Moon,
  Sun,
} from "lucide-react";
import {
  springMorph,
  springTap,
  springSettle,
  springPop,
} from "@/design/motion";

/* ---------- 跟手:通用按压(轻量、柔软回弹) ---------- */
function TactileButton({
  children,
  onClick,
  variant = "ghost",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "life";
  title?: string;
}) {
  const bg =
    variant === "solid"
      ? "var(--ls-surface-hi)"
      : variant === "life"
        ? "var(--ls-life)"
        : "transparent";
  return (
    <motion.button
      title={title}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      transition={springTap}
      className="ls-num inline-flex select-none items-center gap-2 px-3.5 py-2 text-sm font-medium"
      style={{
        background: bg,
        color: variant === "life" ? "#fff" : "var(--ls-ink)",
        border: "1px solid var(--ls-hairline)",
        borderRadius: "var(--ls-r-control)",
        boxShadow: variant === "ghost" ? "none" : "var(--ls-shadow-soft)",
      }}
    >
      {children}
    </motion.button>
  );
}

/* ---------- 招牌:图标本体非线性形变为菜单(从图标长出,非凭空出现) ----------
   同一块哑光面:闭合=36px 的 ··· chip;点击后 ··· 淡出消失、面 spring 长成菜单,
   菜单首行即"配置"、无顶部空行;关闭时菜单缩回、··· 再带弹性动画归位。 */
function IconMenu() {
  const [open, setOpen] = useState(false);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [openH, setOpenH] = useState(132);

  // 在固定展开宽度下测一次菜单自然高度(只含菜单项、不含图标行 -> 无顶部空行)。
  useLayoutEffect(() => {
    if (itemsRef.current) setOpenH(itemsRef.current.scrollHeight);
  }, []);

  const items = [
    { icon: Settings2, label: "配置", danger: false },
    { icon: RotateCw, label: "重启", danger: false },
    { icon: Trash2, label: "删除", danger: true },
  ];
  const W = 184;

  return (
    <div className="relative h-9 w-9">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}

      <motion.div
        className="absolute right-0 top-0 z-20 overflow-hidden"
        initial={false}
        animate={{
          width: open ? W : 36,
          height: open ? openH : 36,
          borderRadius: open ? 16 : 12,
        }}
        transition={springMorph}
        style={{
          background: "var(--ls-surface-hi)",
          border: "1px solid var(--ls-hairline)",
          boxShadow: open
            ? "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)"
            : "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
        }}
      >
        {/* 菜单项:首行即"配置",固定展开宽度以稳定测高;展开时由上而下逐条淡入 */}
        <div
          ref={itemsRef}
          className="absolute right-0 top-0 p-1.5"
          style={{ width: W }}
        >
          {items.map((it, i) => (
            <motion.button
              key={it.label}
              onClick={() => setOpen(false)}
              whileTap={{ scale: 0.97 }}
              initial={false}
              animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }}
              transition={{
                ...springSettle,
                delay: open ? 0.05 + i * 0.04 : 0,
              }}
              style={{
                color: it.danger ? "var(--ls-danger)" : "var(--ls-ink)",
                borderRadius: 10,
                pointerEvents: open ? "auto" : "none",
              }}
              className="ls-item flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm"
            >
              <it.icon size={16} />
              {it.label}
            </motion.button>
          ))}
        </div>

        {/* ··· 图标:闭合时居中显示;点击展开后快速淡出消失;关闭时带弹性归位 */}
        <motion.button
          aria-label="更多"
          onClick={() => setOpen(true)}
          initial={false}
          animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
          transition={open ? { duration: 0.1 } : { ...springPop, delay: 0.06 }}
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center"
          style={{
            color: "var(--ls-ink-soft)",
            pointerEvents: open ? "none" : "auto",
          }}
        >
          <MoreHorizontal size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ---------- 状态点:绿色=活着;切换时一次性弹入(非循环呼吸) ---------- */
function StatusDot({ running }: { running: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      <motion.span
        key={running ? "on" : "off"}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={springTap}
        className="inline-flex h-2.5 w-2.5 rounded-full"
        style={{
          background: running ? "var(--ls-life)" : "var(--ls-ink-faint)",
          boxShadow: running ? "0 0 0 3px var(--ls-life-soft)" : "none",
        }}
      />
    </span>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="ls-inset px-3 py-2.5">
      <div className="text-[11px]" style={{ color: "var(--ls-ink-soft)" }}>
        {label}
      </div>
      <div className="ls-num mt-1 text-lg font-semibold leading-none">
        {value}
      </div>
    </div>
  );
}

/* ---------- 标杆:实例面板(安静、跟手启停) ---------- */
function LivingPanel() {
  const [running, setRunning] = useState(true);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setUptime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="ls-panel p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StatusDot running={running} />
          <div>
            <div className="text-[15px] font-semibold leading-tight">
              麦麦 · 主实例
            </div>
            <div
              className="mt-0.5 text-xs"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              {running ? "运行中" : "已停止"} · MaiBot 1.0.0-rc.4
            </div>
          </div>
        </div>
        <IconMenu />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Readout label="运行时长" value={running ? fmt(uptime) : "--:--"} />
        <Readout label="今日消息" value={running ? "1,284" : "0"} />
        <Readout label="内存" value={running ? "312 MB" : "0 MB"} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        {running ? (
          <TactileButton
            variant="solid"
            onClick={() => setRunning(false)}
            title="停止"
          >
            <Square size={15} /> 停止
          </TactileButton>
        ) : (
          <TactileButton
            variant="life"
            onClick={() => {
              setRunning(true);
              setUptime(0);
            }}
            title="启动"
          >
            <Play size={15} /> 启动
          </TactileButton>
        )}
        <span className="text-xs" style={{ color: "var(--ls-ink-faint)" }}>
          点启动 / 停止试试跟手
        </span>
      </div>
    </div>
  );
}

/* ---------- 实例列表:逐项落定 ---------- */
function InstanceRack() {
  const rows = [
    { name: "麦麦 · 主实例", running: true, meta: "QQ 100xxxxxx" },
    { name: "测试实例", running: false, meta: "QQ 200xxxxxx" },
    { name: "夜间值守", running: true, meta: "QQ 300xxxxxx" },
  ];
  return (
    <motion.div
      className="ls-card overflow-hidden"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
      }}
    >
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: springSettle },
          }}
          className="ls-item flex items-center gap-3 px-4 py-3"
          style={{ borderTop: i ? "1px solid var(--ls-hairline)" : "none" }}
        >
          <StatusDot running={r.running} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.name}</div>
            <div className="text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              {r.meta}
            </div>
          </div>
          <span
            className="ls-num text-xs"
            style={{
              color: r.running ? "var(--ls-life)" : "var(--ls-ink-faint)",
            }}
          >
            {r.running ? "在线" : "离线"}
          </span>
          <IconMenu />
        </motion.div>
      ))}
    </motion.div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-2.5 text-xs font-medium"
      style={{ color: "var(--ls-ink-faint)" }}
    >
      {children}
    </div>
  );
}

export function LabApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-full px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <div
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              mailauncher · design study
            </div>
            <h1 className="mt-1 text-2xl font-semibold">
              Living Surfaces — 生息
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ls-ink-soft)" }}>
              暖 · 哑光 ·
              安静。零玻璃,靠柔和投影与暖中性色立层级;生命感来自绿色信号与跟手动效。
            </p>
          </div>
          <TactileButton
            variant="solid"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            {theme === "light" ? "暗色" : "亮色"}
          </TactileButton>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="md:col-span-2">
            <Caption>标杆:实例面板(安静、跟手启停)</Caption>
            <LivingPanel />
          </section>

          <section>
            <Caption>
              招牌交互:图标本体形变为菜单(从图标长出,非凭空出现)
            </Caption>
            <div
              className="ls-card flex items-center justify-center gap-4 p-10"
              style={{ minHeight: 160 }}
            >
              <span className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
                点这个图标
              </span>
              <IconMenu />
            </div>
          </section>

          <section>
            <Caption>实例列表(逐项落定)</Caption>
            <InstanceRack />
          </section>
        </div>
      </div>
    </div>
  );
}

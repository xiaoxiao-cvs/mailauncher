/**
 * 系统监控共享格式化纯函数。
 *
 * 语义重建自 home/HomeView 第 47-81 行的原地实现(num / fmtGB / fmtRate / fmtBytes / fmtUptime),
 * 抽到此处供监控 hub 各 deep tab 复用——HomeView 保留自己的私有副本不动,避免牵动首页。
 * 全部为纯函数:同输入恒等输出、无副作用、可直接单测。所有读数入口先经 num() 兜底,
 * 挡住后端聚合空集导致的 null / NaN / Infinity,这是真·无数据态的合理 0 呈现,非掩盖业务异常。
 */

const KiB = 1024;
const MiB = 1024 ** 2;
const GiB = 1024 ** 3;
const TiB = 1024 ** 4;

/**
 * 数值兜底:非有限数(NaN / +-Infinity)与缺失值一律归 0。
 * 所有对外格式化函数的第一步都过它,保证下游算术不被脏值污染。
 */
export function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * 字节 -> 自适应 B | KB | MB | GB | TB(累计总量读数用,无 /s)。
 * 阶梯精度:>=TB 两位、GB 两位、MB 一位、KB 取整、B 取整。
 */
export function fmtBytes(bytes: number | null | undefined): string {
  const b = num(bytes);
  if (b >= TiB) return (b / TiB).toFixed(2) + " TB";
  if (b >= GiB) return (b / GiB).toFixed(2) + " GB";
  if (b >= MiB) return (b / MiB).toFixed(1) + " MB";
  if (b >= KiB) return (b / KiB).toFixed(0) + " KB";
  return Math.round(b) + " B";
}

/**
 * 字节每秒 -> 自适应 B/s | KB/s | MB/s(网络速率读数用)。
 * 与 fmtBytes 区别:带 /s 后缀、上限到 MB/s 即可覆盖常见家用/服务器带宽量级。
 */
export function fmtRate(bps: number | null | undefined): string {
  const rate = num(bps);
  if (rate >= MiB) return (rate / MiB).toFixed(1) + " MB/s";
  if (rate >= KiB) return (rate / KiB).toFixed(0) + " KB/s";
  return Math.round(rate) + " B/s";
}

/** 0-100 的比率 -> 整数百分比文案(如 "73%")。CPU / 占用率读数用。 */
export function fmtPct(v: number | null | undefined): string {
  return Math.round(num(v)) + "%";
}

/**
 * 秒 -> "Xh Ym"(系统运行时长 footer 用)。
 * 负值钳到 0;只展示小时与分钟两段,秒级抖动不进入展示。
 */
export function fmtUptime(secs: number | null | undefined): string {
  const s = Math.max(0, Math.floor(num(secs)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** 字节 -> GB(一位小数,如 "93.1 GB")。系统内存 / 磁盘容量读数用。 */
export function fmtGB(bytes: number | null | undefined): string {
  return (num(bytes) / GiB).toFixed(1) + " GB";
}

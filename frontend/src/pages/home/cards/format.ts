import { num } from "@/utils/format";

/**
 * 首页统计读数格式化 —— 跨各卡复用。数值兜底用 @/utils/format 的 num()
 * (无数据/NaN/Infinity 归 0,仅用于"真无数据"展示,不掩盖业务异常)。
 */

/** 紧凑数字:1284 -> 1.3k,2_340_115 -> 2.3M。 */
export function fmtCompact(value: number | null | undefined): string {
  const n = num(value);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(Math.round(n));
}

/** 千分位:12840 -> "12,840"。英雄大计数用。 */
export function fmtGrouped(value: number | null | undefined): string {
  return Math.round(num(value)).toLocaleString("en-US");
}

/** 花费:¥;>=100 取整,否则两位小数。 */
export function fmtCost(usd: number | null | undefined): string {
  const n = num(usd);
  return "¥" + (n >= 100 ? n.toFixed(0) : n.toFixed(2));
}

/** 响应时长:秒,两位小数。 */
export function fmtSeconds(s: number | null | undefined): string {
  return num(s).toFixed(2) + "s";
}

/** 在线时长:秒 -> "Xh Ym"。 */
export function fmtUptime(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(num(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/** 实例内存(MB):<1024 显示 MB,>=1024 转 GB(两位小数)。对齐 InstanceCard 口径。 */
export function fmtInstanceMem(mb: number | null | undefined): string {
  const v = num(mb);
  return v >= 1024 ? `${(v / 1024).toFixed(2)} GB` : `${v.toFixed(0)} MB`;
}

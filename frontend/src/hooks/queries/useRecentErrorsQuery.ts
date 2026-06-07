/**
 * 近期错误日志聚合查询 hook
 *
 * 后端 get_recent_errors 跨全部实例扫读结构化日志,仅保留 ERROR/WARN 两级,
 * 合并后按 ts 倒序、截断到 limit 返回。属轮询态(无持久游标),故定时全量重拉。
 */

import { useQuery } from "@tanstack/react-query";

import { tauriInvoke } from "@/services/tauriInvoke";

/**
 * 一条聚合后的错误/警告日志。字段与后端 Rust `AggregatedLogRecord`
 * (#[derive(Serialize)],默认 snake_case 命名)一一对应,前端按 snake_case 读。
 */
export interface AggregatedLogRecord {
  instance_id: string;
  instance_name: string;
  ts: string;
  level: string;
  module: string;
  message: string;
}

/**
 * 拉取近期 ERROR/WARN 日志(默认 100 条,后端已倒序)。
 * refetchInterval 10s 贴合日志墙的低频观察;staleTime 5s 抑制聚焦抖动重拉。
 */
export function useRecentErrorsQuery(limit = 100) {
  return useQuery({
    queryKey: ["logs", "recentErrors", limit] as const,
    queryFn: () =>
      tauriInvoke<AggregatedLogRecord[]>("get_recent_errors", { limit }),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

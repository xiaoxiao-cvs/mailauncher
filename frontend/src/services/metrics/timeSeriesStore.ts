/**
 * 监控数据层 - 通用时序滚动缓冲(全局持久化单例)
 *
 * 取代原网络专用缓冲:按 scope + metric 分桶保存多条标量序列,供监控 hub 各 tab
 * 与首页缩略图读取。设计要点:
 * - 模块级单例 + 应用生命周期常驻订阅:切页面不中断采集,切回即见完整历史;
 * - 每条序列预填 SERIES_CAP 个 0,默认即平直基线("没数据前的曲线"),真实样本从右滚入,
 *   始终是密集 CAP 点——避免稀疏点被平滑曲线连成大波浪;
 * - useSyncExternalStore + 逐序列引用比对:仅本帧变化的序列触发其订阅者重渲染。
 *
 * 由 App 挂载时调用一次 startMetrics() 启动;订阅刻意常驻、不解除。
 */
import { useSyncExternalStore } from "react";
import { LocalHostMetricsSource, type MetricsSource } from "./MetricsSource";
import {
  HOST_METRIC_KEYS,
  scopeKey,
  type MetricKey,
  type MetricSample,
  type MetricScope,
} from "./types";

/** 滚动缓冲容量:每约 1.5s 一帧,48 帧约 72s 走势。 */
export const SERIES_CAP = 48;

/** 稳定的空序列:未知 scope/metric 读取时返回,引用恒定以免触发无谓重渲染。勿修改其内容。 */
const EMPTY: number[] = new Array(SERIES_CAP).fill(0);

type SeriesMap = Map<MetricKey, number[]>;

const buckets = new Map<string, SeriesMap>(); // scopeKey -> metric -> 序列
const latest = new Map<string, MetricSample>(); // scopeKey -> 最近整样本(cores 等非标量字段)
const listeners = new Set<() => void>();

let started = false;

function seeded(): number[] {
  return new Array(SERIES_CAP).fill(0);
}

function bucketOf(key: string): SeriesMap {
  let m = buckets.get(key);
  if (!m) {
    m = new Map();
    buckets.set(key, m);
  }
  return m;
}

function push(sample: MetricSample): void {
  const key = scopeKey(sample.scope);
  const series = bucketOf(key);
  for (const metric of Object.keys(sample.metrics) as MetricKey[]) {
    const value = sample.metrics[metric];
    if (value === undefined) continue; // 本样本未携带该指标,保留旧序列
    const prev = series.get(metric) ?? seeded();
    // 换新数组引用:满足 useSyncExternalStore 的不可变快照约定,触发该序列订阅者重渲染
    series.set(metric, [...prev, value].slice(-SERIES_CAP));
  }
  latest.set(key, sample);
  for (const l of listeners) l();
}

/** 启动全局指标累积(幂等)。默认本地来源;订阅常驻应用生命周期,不解除。 */
export function startMetrics(
  source: MetricsSource = new LocalHostMetricsSource(),
): void {
  if (started) return;
  started = true;
  // 预填 host 已知标量序列,默认即平直基线
  const host = bucketOf("host");
  for (const m of HOST_METRIC_KEYS) {
    if (!host.has(m)) host.set(m, seeded());
  }
  source.subscribe(push);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 读取某 scope 下某指标的滚动序列(该序列每帧更新时触发重渲染)。 */
export function useTimeSeries(scope: MetricScope, metric: MetricKey): number[] {
  const key = scopeKey(scope);
  const get = () => buckets.get(key)?.get(metric) ?? EMPTY;
  return useSyncExternalStore(subscribe, get, get);
}

/** 读取某 scope 的最近整样本(用于 cores 等非标量字段;首样本到达前为 undefined)。 */
export function useLatestSample(scope: MetricScope): MetricSample | undefined {
  const key = scopeKey(scope);
  const get = () => latest.get(key);
  return useSyncExternalStore(subscribe, get, get);
}

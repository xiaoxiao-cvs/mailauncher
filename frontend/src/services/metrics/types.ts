/**
 * 监控数据层 - 指标样本与作用域契约
 *
 * 这是监控 hub 数据层的载重契约:所有时序数据按"作用域(scope)+ 指标(metric)"组织。
 * scope 区分整机(host)与单个 MaiBot 实例进程(instance),为将来"按实例看资源"预留——
 * timeSeriesStore 据 scope 分桶,UI 切换 scope 即切换数据源,存储层无需改动。
 */

/** 指标作用域:整机,或某实例的某组件进程(main/napcat)。 */
export type MetricScope =
  | { kind: "host" }
  | { kind: "instance"; instanceId: string; component: string };

/** 整机作用域常量(避免每次构造新对象,便于做默认参数)。 */
export const HOST_SCOPE: MetricScope = { kind: "host" };

/** scope 的稳定字符串键,用作 timeSeriesStore 的分桶键。 */
export function scopeKey(scope: MetricScope): string {
  return scope.kind === "host"
    ? "host"
    : `instance:${scope.instanceId}:${scope.component}`;
}

/**
 * 保留的标量时序指标键。
 * 均为可直接画曲线的量:cpu/mem/swap/disk/load 为百分比(0-100),
 * netRx/netTx、diskRead/diskWrite 为字节每秒的原始速率(波形用,不归一化)。
 */
export type MetricKey =
  | "cpu"
  | "mem"
  | "swap"
  | "disk"
  | "diskRead"
  | "diskWrite"
  | "netRx"
  | "netTx"
  | "load";

/** host 作用域启动时预填的标量序列(默认即平直基线)。 */
export const HOST_METRIC_KEYS: readonly MetricKey[] = [
  "cpu",
  "mem",
  "swap",
  "disk",
  "diskRead",
  "diskWrite",
  "netRx",
  "netTx",
  "load",
];

/**
 * 一次采样产出的归一化样本(与传输方式无关)。
 * metrics 为本次携带的标量序列值(缺省的键本次不更新对应序列);
 * cores 为逐核 CPU 使用率,后端启用 per-core 采集后填充(届时本类型无需改动)。
 */
export interface MetricSample {
  scope: MetricScope;
  metrics: Partial<Record<MetricKey, number>>;
  cores?: number[];
}

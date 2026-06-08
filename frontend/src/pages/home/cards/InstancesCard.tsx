import { Icon } from "@iconify/react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { fmtInstanceMem, fmtUptime } from "@/pages/home/cards/format";
import type {
  ComponentType,
  Instance,
  InstanceStatus,
} from "@/services/instanceApi";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 实例总览卡 —— 单瓦片 bento:折叠态给状态点串 + 前几个实例的紧凑摘要,
 * 展开后逐实例铺开资源/在线/版本/组件状态。容器形变钻取由 ExpandableBentoCard 承载,
 * 本文件只负责实例语义(状态着色、资源采样口径、详情行布局)。
 *
 * 资源读数严格沿用 InstanceCard 口径:cpu_usage / memory_usage 仅在有真实采样
 * (定义且 > 0)时显示,否则一律占位 "—",绝不用 0 伪装"已采集"。
 */

const PLACEHOLDER = "—";
/** 折叠态最多列出的实例条数,超出靠状态点串与 trailing 计数体现整体。 */
const COLLAPSED_MAX = 4;
/** 详情每行行距 px:据此按可用高度推算可容纳行数,自适应铺满(行高约 30 + 间距)。 */
const ROW_PITCH = 38;
/** 详情列表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 3;

/** 状态 -> 色:运行/部分运行为生命色,失败为危险,启停/等待为暖琥珀,停止/未知为淡墨。 */
function statusTone(status: InstanceStatus): string {
  switch (status) {
    case "running":
    case "partial":
      return "var(--ls-life)";
    case "failed":
      return "var(--ls-danger)";
    case "starting":
    case "stopping":
    case "pending":
      return "var(--ls-warn)";
    case "stopped":
    case "unknown":
    default:
      return "var(--ls-ink-faint)";
  }
}

const STATUS_LABEL: Record<InstanceStatus, string> = {
  running: "运行中",
  partial: "部分运行",
  starting: "启动中",
  stopping: "停止中",
  stopped: "已停止",
  pending: "等待",
  failed: "失败",
  unknown: "未知",
};

/** CPU 有效采样:定义且 > 0 才算采到,否则占位。 */
function cpuText(inst: Instance): string {
  return inst.cpu_usage !== undefined && inst.cpu_usage > 0
    ? `${inst.cpu_usage.toFixed(1)}%`
    : PLACEHOLDER;
}

/** 内存有效采样:定义且 > 0 才算采到,沿用 fmtInstanceMem 的 MB/GB 口径。 */
function memText(inst: Instance): string {
  return inst.memory_usage !== undefined && inst.memory_usage > 0
    ? fmtInstanceMem(inst.memory_usage)
    : PLACEHOLDER;
}

export interface InstancesCardProps {
  instances: Instance[];
  runningInstances: number;
  totalInstances: number;
  /** P1 占位入参(尺寸槽);P1 不改密度、默认行为不变,改密度在 P2。 */
  size?: WidgetSize;
}

export function InstancesCard({
  instances,
  runningInstances,
  totalInstances,
  size: _size,
}: InstancesCardProps) {
  const tiles: BentoTile[] = [
    {
      key: "instances",
      icon: "ph:stack-thin",
      label: "实例总览",
      pad: 14,
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          运行 {runningInstances}/{totalInstances}
        </span>
      ),
      collapsed: <InstancesCollapsed instances={instances} />,
      detail: <InstancesDetail instances={instances} />,
    },
  ];

  return <ExpandableBentoCard cardId="instances" tiles={tiles} />;
}

/** 状态圆点(可调径),色按状态;复用于折叠点串与各行行首。 */
function StatusDotMark({
  status,
  size = 7,
}: {
  status: InstanceStatus;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: statusTone(status),
      }}
    />
  );
}

/** 组件运行点:MaiBot/NapCat 各一颗,running 生命色、否则淡墨,旁标首字母缩写。 */
function ComponentDots({ states }: { states: Instance["component_states"] }) {
  if (states.length === 0) return null;
  const abbr: Record<ComponentType, string> = { MaiBot: "M", NapCat: "N" };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {states.map((s) => (
        <span
          key={s.component}
          style={{ display: "flex", alignItems: "center", gap: 3 }}
          title={s.component}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: s.running ? "var(--ls-life)" : "var(--ls-ink-faint)",
            }}
          />
          <span style={{ fontSize: 9.5, color: "var(--ls-ink-faint)" }}>
            {abbr[s.component]}
          </span>
        </span>
      ))}
    </span>
  );
}

function InstancesCollapsed({ instances }: { instances: Instance[] }) {
  if (instances.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "var(--ls-ink-faint)",
        }}
      >
        暂无实例
      </div>
    );
  }
  const shown = instances.slice(0, COLLAPSED_MAX);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        marginTop: 8,
        gap: 8,
      }}
    >
      {/* 全实例状态点串:一眼看整体健康分布,不受 COLLAPSED_MAX 截断 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexWrap: "wrap",
        }}
      >
        {instances.map((inst) => (
          <StatusDotMark key={inst.id} status={inst.status} />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {shown.map((inst) => {
          const cpu = cpuText(inst);
          const mem = memText(inst);
          return (
            <div
              key={inst.id}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <StatusDotMark status={inst.status} />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--ls-ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: "0 1 auto",
                  minWidth: 0,
                }}
              >
                {inst.name}
              </span>
              {inst.qq_account ? (
                <span
                  className="ls-num"
                  style={{
                    fontSize: 10,
                    color: "var(--ls-ink-faint)",
                    flexShrink: 0,
                  }}
                >
                  {inst.qq_account}
                </span>
              ) : null}
              {/* 只在采到资源时占右侧位,避免一排 "—" 噪声 */}
              {cpu !== PLACEHOLDER || mem !== PLACEHOLDER ? (
                <span
                  className="ls-num"
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "var(--ls-ink-soft)",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cpu !== PLACEHOLDER ? cpu : ""}
                  {cpu !== PLACEHOLDER && mem !== PLACEHOLDER ? " · " : ""}
                  {mem !== PLACEHOLDER ? mem : ""}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InstancesDetail({ instances }: { instances: Instance[] }) {
  // 按可用高度自适应行数:矮则少、高则多,超出部分滚动,正好铺满不留空。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (instances.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无实例
      </div>
    );
  }
  const overflow = instances.length > rows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="实例" hint={`共 ${instances.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {instances.map((inst) => (
          <InstanceRow key={inst.id} inst={inst} />
        ))}
      </div>
    </div>
  );
}

function InstanceRow({ inst }: { inst: Instance }) {
  const cpu = cpuText(inst);
  const mem = memText(inst);
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <StatusDotMark status={inst.status} size={8} />
        <span
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {inst.name}
        </span>
        {inst.qq_account ? (
          <span
            className="ls-num shrink-0 text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            {inst.qq_account}
          </span>
        ) : null}
        <span
          className="shrink-0 text-[10px]"
          style={{ color: statusTone(inst.status) }}
        >
          {STATUS_LABEL[inst.status]}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <Metric icon="ph:cpu-thin" value={cpu} />
          <Metric icon="ph:memory-thin" value={mem} />
          <Metric icon="ph:clock-thin" value={fmtUptime(inst.run_time)} />
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2.5">
        <ComponentDots states={inst.component_states} />
        {inst.bot_version ? (
          <span
            className="ls-num text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            v{inst.bot_version}
          </span>
        ) : null}
        {inst.last_status_reason ? (
          <span
            className="truncate text-[10px]"
            style={{ color: "var(--ls-ink-faint)", minWidth: 0 }}
            title={inst.last_status_reason}
          >
            {inst.last_status_reason}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** 行内带图标的等宽读数;value 为 "—" 时整体淡化,提示该项未采到。 */
function Metric({ icon, value }: { icon: string; value: string }) {
  const empty = value === PLACEHOLDER;
  return (
    <span
      className="ls-num flex items-center gap-1 text-[10.5px]"
      style={{ color: empty ? "var(--ls-ink-faint)" : "var(--ls-ink-soft)" }}
    >
      <Icon icon={icon} width={12} height={12} />
      {value}
    </span>
  );
}

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { num } from "@/utils/format";
import {
  useWatchdogStatusQuery,
  type WatchdogInstanceStatus,
} from "@/hooks/queries/useWatchdogStatusQuery";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 看门狗健康卡 —— 单瓦片 bento:折叠态给"存活/总数"读数 + 前几个看护组件的紧凑摘要,
 * 展开后逐组件铺开存活态与自动重启偏好。容器形变钻取由 ExpandableBentoCard 承载,
 * 本文件只负责看护语义(存活着色、自动重启徽标、详情行布局),数据自取(无 props)。
 */

/** 折叠态最多列出的组件条数,超出靠 trailing 计数与详情体现整体。 */
const COLLAPSED_MAX = 4;
/** 详情每行行距 px:据此按可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 38;
/** 详情列表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 3;

export function HealthCard(_props: { size?: WidgetSize } = {}) {
  const { data } = useWatchdogStatusQuery();
  const items = data ?? [];
  const aliveCount = items.filter((it) => it.is_alive).length;
  const total = items.length;
  const autorestartCount = items.filter((it) => it.autorestart_enabled).length;

  const tiles: BentoTile[] = [
    {
      key: "health",
      icon: "ph:heartbeat-thin",
      label: "看护状态",
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {num(aliveCount)}/{num(total)} 存活
        </span>
      ),
      collapsed: <HealthCollapsed items={items} />,
      detail: (
        <HealthDetail
          items={items}
          total={total}
          autorestartCount={autorestartCount}
        />
      ),
    },
  ];

  return <ExpandableBentoCard cardId="health" tiles={tiles} />;
}

/** 存活圆点(可调径):存活 -> 生命色,否则危险色;复用于折叠摘要与各详情行行首。 */
function AliveDot({ alive, size = 7 }: { alive: boolean; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: alive ? "var(--ls-life)" : "var(--ls-danger)",
      }}
    />
  );
}

/** 自动重启徽标:开 -> life 档,关 -> neutral 档。 */
function AutorestartBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge tone={enabled ? "life" : "neutral"} style={{ flexShrink: 0 }}>
      自动重启{enabled ? "开" : "关"}
    </Badge>
  );
}

/** 空态:居中淡色提示,折叠/详情共用。 */
function EmptyHint() {
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
      无看护中的组件
    </div>
  );
}

function HealthCollapsed({ items }: { items: WatchdogInstanceStatus[] }) {
  if (items.length === 0) return <EmptyHint />;
  const shown = items.slice(0, COLLAPSED_MAX);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        marginTop: 8,
        gap: 5,
      }}
    >
      {shown.map((it) => (
        <div
          key={`${it.instance_id}:${it.component}`}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <AliveDot alive={it.is_alive} />
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
            {it.instance_name}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--ls-ink-faint)",
              flexShrink: 0,
            }}
          >
            {it.component}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 9.5,
              color: "var(--ls-ink-faint)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            自动重启{it.autorestart_enabled ? "开" : "关"}
          </span>
        </div>
      ))}
    </div>
  );
}

function HealthDetail({
  items,
  total,
  autorestartCount,
}: {
  items: WatchdogInstanceStatus[];
  total: number;
  autorestartCount: number;
}) {
  // 按可用高度自适应行数:矮则少、高则多,超出滚动,正好铺满不留空。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (items.length === 0) return <EmptyHint />;
  const overflow = items.length > rows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="看护组件" hint={`共 ${items.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {items.map((it) => (
          <HealthRow key={`${it.instance_id}:${it.component}`} item={it} />
        ))}
      </div>
      <span className="text-[10px]" style={{ color: "var(--ls-ink-faint)" }}>
        看护 <span className="ls-num">{num(total)}</span> 组件,自动重启{" "}
        <span className="ls-num">{num(autorestartCount)}</span> 开
      </span>
    </div>
  );
}

function HealthRow({ item }: { item: WatchdogInstanceStatus }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <AliveDot alive={item.is_alive} size={8} />
        <span
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {item.instance_name}
        </span>
        <span
          className="shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {item.component}
        </span>
        <span
          className="shrink-0 text-[10px]"
          style={{
            color: item.is_alive ? "var(--ls-life)" : "var(--ls-danger)",
          }}
        >
          {item.is_alive ? "运行中" : "已停止"}
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          <AutorestartBadge enabled={item.autorestart_enabled} />
        </span>
      </div>
    </div>
  );
}

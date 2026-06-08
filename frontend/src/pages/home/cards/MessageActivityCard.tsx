import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { num } from "@/utils/format";
import { fmtCompact } from "@/pages/home/cards/format";
import { SectionHead } from "@/pages/home/cards/CardKit";
import type {
  MessageStatus,
  MessageQueueItem,
  MessageQueueResponse,
} from "@/services/messageQueueApi";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 麦麦活动卡 —— 在途会话(消息队列)的 bento 磁贴(单瓦片,摘要 -> 详情原位钻取)。
 *
 * 折叠态:只读摘要,列出当前在途会话(色点 + 会话名 + 状态文案),无在途时给空态。
 * 展开态:按实例分组的队列全貌,每条消息带状态色点、预览、轮次/重试/动作/时延。
 *
 * 数据来源:messages 仅当与实例的 WS 监控桥接通(connected)时才有;
 * 未连为空属正常空态(实例未开监控或刚启动),不当错误处理。
 */

/** 行行距(px):据此按详情列表可用高度推算可容纳行数(行高约 28 + 间距)。 */
const ROW_PITCH = 34;
/** 详情列表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 3;

/** 状态文案与色 token。色 token 直接落到 var(--ls-*),不写死色值。 */
const STATUS_META: Record<MessageStatus, { label: string; color: string }> = {
  pending: { label: "待处理", color: "var(--ls-ink-faint)" },
  planning: { label: "规划中", color: "var(--ls-warn)" },
  generating: { label: "生成中", color: "var(--ls-life)" },
  sending: { label: "发送中", color: "var(--ls-life)" },
  sent: { label: "已发送", color: "var(--ls-ink-faint)" },
  failed: { label: "失败", color: "var(--ls-danger)" },
};

/** 在途:既未发出也未失败,即仍在管线中(待处理/规划/生成/发送)。 */
function isInFlight(s: MessageStatus): boolean {
  return s !== "sent" && s !== "failed";
}

/** 单条消息时延(秒):已发出取 sent-start,否则取 now-start;时间戳为 epoch 秒,负值钳 0。 */
function latencySeconds(m: MessageQueueItem): number {
  const start = num(m.start_time);
  const end = m.sent_time != null ? num(m.sent_time) : Date.now() / 1000;
  return Math.max(0, end - start);
}

/** 状态色点 —— StatusDot 仅二态(运行/停止),这里需按 6 态状态色着色,故本地实现。 */
function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: 999,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export function MessageActivityCard({
  queues,
}: {
  queues: MessageQueueResponse[];
  /** P1 占位入参(尺寸槽);P1 不改密度、默认行为不变,改密度在 P2。 */
  size?: WidgetSize;
}) {
  const tiles: BentoTile[] = [
    {
      key: "queue",
      icon: "ph:pulse-thin",
      label: "麦麦活动",
      trailing: <QueueTrailing queues={queues} />,
      collapsed: <QueueCollapsed queues={queues} />,
      detail: <QueueDetail queues={queues} />,
    },
  ];

  return <ExpandableBentoCard cardId="queue" tiles={tiles} />;
}

/** 折叠头右侧:在途数 + 累计已处理(跨实例汇总)。 */
function QueueTrailing({ queues }: { queues: MessageQueueResponse[] }) {
  let inFlightCount = 0;
  let processed = 0;
  for (const q of queues) {
    for (const m of q.messages) if (isInFlight(m.status)) inFlightCount++;
    processed += num(q.total_processed);
  }
  return (
    <span
      className="ls-num"
      style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
    >
      处理中 {inFlightCount} · 已处理 {fmtCompact(processed)}
    </span>
  );
}

/** 折叠态:跨实例筛出在途会话,最多约 6 行;无在途给居中空态。 */
function QueueCollapsed({ queues }: { queues: MessageQueueResponse[] }) {
  // 摘要不关心来自哪个实例的细节,只摊平在途项;会话名优先 group_name,回退实例名。
  const inFlight = queues.flatMap((q) =>
    q.messages
      .filter((m) => isInFlight(m.status))
      .map((m) => ({
        key: `${q.instance_id}:${m.id}`,
        name: m.group_name ?? q.instance_name,
        status: m.status,
      })),
  );

  if (inFlight.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-[11px]"
        style={{ minHeight: 0, color: "var(--ls-ink-faint)" }}
      >
        当前没有正在处理的会话
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        marginTop: 6,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        overflow: "hidden",
      }}
    >
      {inFlight.slice(0, 6).map((it) => {
        const meta = STATUS_META[it.status];
        return (
          <div
            key={it.key}
            className="flex items-center gap-2 text-[11px]"
            style={{ color: "var(--ls-ink)" }}
          >
            <StatusDot color={meta.color} />
            <span className="min-w-0 flex-1 truncate">{it.name}</span>
            <span style={{ fontSize: 10, color: meta.color }}>
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 展开态:按实例分节的队列全貌,长列表用 useAutoRows 限行 + 滚动兜底。 */
function QueueDetail({ queues }: { queues: MessageQueueResponse[] }) {
  // 自适应:量出列表可用高度 / 行距 -> 总可容纳行数,按实例顺序填满,余下滚动。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  // 实例 + 其下消息逐条摊平为统一行流,据 rows 截断;每个实例首条带分节头。
  const flat: Array<
    | { kind: "head"; key: string; q: MessageQueueResponse }
    | { kind: "msg"; key: string; m: MessageQueueItem }
  > = [];
  for (const q of queues) {
    flat.push({ kind: "head", key: `head:${q.instance_id}`, q });
    for (const m of q.messages) {
      flat.push({ kind: "msg", key: `msg:${q.instance_id}:${m.id}`, m });
    }
  }

  if (queues.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无实例消息队列
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SectionHead title="消息队列" hint="按实例分组" />
      <div
        ref={listRef}
        className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto"
      >
        {flat
          .slice(0, rows)
          .map((row) =>
            row.kind === "head" ? (
              <QueueGroupHead key={row.key} q={row.q} />
            ) : (
              <QueueMessageRow key={row.key} m={row.m} />
            ),
          )}
      </div>
    </div>
  );
}

/** 实例分节头:连接状态点 + 实例名 + 错误(若有)。 */
function QueueGroupHead({ q }: { q: MessageQueueResponse }) {
  return (
    <div className="flex items-center gap-2 pt-1 text-[11px]">
      <StatusDot
        color={q.connected ? "var(--ls-life)" : "var(--ls-ink-faint)"}
      />
      <span className="font-medium" style={{ color: "var(--ls-ink)" }}>
        {q.instance_name}
      </span>
      {q.error ? (
        <span
          className="min-w-0 flex-1 truncate"
          style={{ color: "var(--ls-danger)" }}
        >
          {q.error}
        </span>
      ) : !q.connected ? (
        <span style={{ color: "var(--ls-ink-faint)" }}>未连接</span>
      ) : q.messages.length === 0 ? (
        <span style={{ color: "var(--ls-ink-faint)" }}>空闲</span>
      ) : null}
    </div>
  );
}

/** 队列单条:状态色点 + 会话名 + 状态文案 + 预览(截断)+ 右侧轮次/重试/动作/时延小字。 */
function QueueMessageRow({ m }: { m: MessageQueueItem }) {
  const meta = STATUS_META[m.status];
  const meters: string[] = [];
  if (num(m.cycle_count) > 0) meters.push(`#${num(m.cycle_count)}`);
  if (num(m.retry_count) > 0) {
    meters.push(
      m.retry_reason
        ? `重试${num(m.retry_count)}·${m.retry_reason}`
        : `重试${num(m.retry_count)}`,
    );
  }
  if (m.action_type) meters.push(m.action_type);
  meters.push(`${latencySeconds(m).toFixed(1)}s`);

  return (
    <div className="flex items-start gap-2 pl-1 text-[11px]">
      <span className="mt-1">
        <StatusDot color={meta.color} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate" style={{ color: "var(--ls-ink)" }}>
            {m.group_name ?? m.stream_id}
          </span>
          <span style={{ fontSize: 10, color: meta.color }}>{meta.label}</span>
        </div>
        {m.message_preview ? (
          <div
            className="truncate"
            style={{ fontSize: 10, color: "var(--ls-ink-faint)" }}
          >
            {m.message_preview}
          </div>
        ) : null}
      </div>
      <span
        className="ls-num shrink-0 self-center text-right"
        style={{ fontSize: 10, color: "var(--ls-ink-soft)" }}
      >
        {meters.join(" · ")}
      </span>
    </div>
  );
}

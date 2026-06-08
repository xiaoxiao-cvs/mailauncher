import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import type { BadgeTone } from "@/components/ls";
import { useRecentErrorsQuery } from "@/hooks/queries/useRecentErrorsQuery";
import type { AggregatedLogRecord } from "@/hooks/queries/useRecentErrorsQuery";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { num } from "@/utils/format";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 近期错误日志墙 —— 单瓦片 bento:折叠态给错误/警告计数 + 最近几条速览,
 * 展开后按可用高度自适应铺开全部条目(时间/级别/来源/模块/正文)。
 * 数据自取(useRecentErrorsQuery,无 props),容器形变钻取由 ExpandableBentoCard 承载。
 *
 * level 归一:后端虽已只回 ERROR/WARN,但级别字符串大小写/前后缀不保证规整,
 * 故前端再大写后做 includes 判定,ERROR 优先于 WARN,落到 danger / warn 两色。
 */

/** 折叠态各尺寸列出的条目数:S 紧凑,M 维持,L 略多;超出靠 trailing 计数体现整体。 */
const COLLAPSED_MAX: Record<WidgetSize, number> = { s: 2, m: 4, l: 6 };
/** 详情每行行距 px:据此按可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 34;
/** 详情列表最少行数(容器极矮时的下限)。 */
const MIN_ROWS = 3;

type LogLevel = "error" | "warn";

/** 级别归一:大写后判 ERROR/WARN(ERROR 优先);非两者一律按 warn 兜底(后端只回这两级)。 */
function normLevel(raw: string): LogLevel {
  return raw.toUpperCase().includes("ERROR") ? "error" : "warn";
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: "var(--ls-danger)",
  warn: "var(--ls-warn)",
};

const LEVEL_BADGE: Record<LogLevel, { tone: BadgeTone; label: string }> = {
  error: { tone: "danger", label: "ERROR" },
  warn: { tone: "warn", label: "WARN" },
};

/** ts 截断到时分秒:形如 "2026-06-08 12:34:56" 取末段;无法解析则原样返回。 */
function shortTs(ts: string): string {
  const m = ts.match(/(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : ts;
}

export function LogsCard({ size = "m" }: { size?: WidgetSize } = {}) {
  const { data } = useRecentErrorsQuery(100);
  const records = data ?? [];
  const errCount = records.filter((r) => normLevel(r.level) === "error").length;
  const warnCount = records.length - errCount;

  const tiles: BentoTile[] = [
    {
      key: "logs",
      icon: "ph:warning-octagon-thin",
      label: "近期错误",
      trailing: (
        <span style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}>
          错误 <span className="ls-num">{num(errCount)}</span> · 警告{" "}
          <span className="ls-num">{num(warnCount)}</span>
        </span>
      ),
      collapsed: <LogsCollapsed records={records} size={size} />,
      detail: <LogsDetail records={records} />,
    },
  ];

  return <ExpandableBentoCard cardId="logs" tiles={tiles} />;
}

/** 级别色点:折叠/详情行首共用,色按归一后级别。 */
function LevelDot({ level, size = 7 }: { level: LogLevel; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: LEVEL_COLOR[level],
      }}
    />
  );
}

function EmptyState() {
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
      暂无错误或警告
    </div>
  );
}

function LogsCollapsed({
  records,
  size,
}: {
  records: AggregatedLogRecord[];
  size: WidgetSize;
}) {
  if (records.length === 0) return <EmptyState />;
  const shown = records.slice(0, COLLAPSED_MAX[size]);
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
      {shown.map((r, i) => {
        const level = normLevel(r.level);
        return (
          <div
            key={`${r.instance_id}-${r.ts}-${i}`}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <LevelDot level={level} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ls-ink-soft)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: "0 1 auto",
                maxWidth: "38%",
                minWidth: 0,
              }}
            >
              {r.instance_name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--ls-ink-faint)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: "1 1 auto",
                minWidth: 0,
              }}
              title={r.message}
            >
              {r.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LogsDetail({ records }: { records: AggregatedLogRecord[] }) {
  // 按可用高度自适应行数:矮则少、高则多,超出滚动,正好铺满不留空。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (records.length === 0) return <EmptyState />;

  const overflow = records.length > rows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="错误与警告" hint={`共 ${records.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {records.map((r, i) => (
          <LogRow key={`${r.instance_id}-${r.ts}-${i}`} record={r} />
        ))}
      </div>
    </div>
  );
}

function LogRow({ record }: { record: AggregatedLogRecord }) {
  const level = normLevel(record.level);
  const badge = LEVEL_BADGE[level];
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="ls-num shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {shortTs(record.ts)}
        </span>
        <Badge tone={badge.tone} className="shrink-0 !px-1.5 !text-[9.5px]">
          {badge.label}
        </Badge>
        <span
          className="truncate text-[11px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {record.instance_name}
        </span>
        {record.module ? (
          <span
            className="truncate text-[10px]"
            style={{
              color: "var(--ls-ink-faint)",
              flex: "0 1 auto",
              minWidth: 0,
            }}
            title={record.module}
          >
            {record.module}
          </span>
        ) : null}
      </div>
      <div
        className="mt-1 truncate text-[10.5px]"
        style={{ color: "var(--ls-ink-soft)" }}
        title={record.message}
      >
        {record.message}
      </div>
    </div>
  );
}

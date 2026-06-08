import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { useSchedulesQuery } from "@/hooks/queries/useScheduleQueries";
import type {
  Schedule,
  ScheduleAction,
  ScheduleType,
} from "@/services/scheduleApi";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 计划任务卡 —— 单瓦片 bento。卡内自取数(useSchedulesQuery 不传 instanceId 取全部任务),
 * 折叠态给"启用/总"计数 + 前几条任务摘要,展开后逐任务铺开动作/触发方式/上次·下次运行。
 * 容器形变钻取由 ExpandableBentoCard 承载,本文件只负责计划任务语义
 * (启用状态着色、action/schedule_type 中文映射、时间字段原样展示不臆造格式)。
 */

/** 折叠态最多列出的任务条数,超出靠 trailing 计数体现整体。 */
const COLLAPSED_MAX = 4;
/** 详情每行行距 px:据此按可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 34;
/** 详情列表最少行数(容器极矮时下限)。 */
const MIN_ROWS = 3;

/** 动作枚举 -> 中文(契约 ScheduleAction 三值穷尽,无 fallback 分支)。 */
const ACTION_LABEL: Record<ScheduleAction, string> = {
  start: "启动",
  stop: "停止",
  restart: "重启",
};

/** 触发方式枚举 -> 中文(契约 ScheduleType 四值穷尽)。 */
const TYPE_LABEL: Record<ScheduleType, string> = {
  once: "单次",
  daily: "每日",
  weekly: "每周",
  monitor: "监控",
};

/** 后端若返回契约外的新值,原样透出而非吞掉,便于发现枚举漂移。 */
function actionText(action: ScheduleAction): string {
  return ACTION_LABEL[action] ?? action;
}

function typeText(type: ScheduleType): string {
  return TYPE_LABEL[type] ?? type;
}

export function SchedulesCard(_props: { size?: WidgetSize } = {}) {
  const { data: schedules = [] } = useSchedulesQuery();
  const enabledCount = schedules.filter((s) => s.enabled).length;

  const tiles: BentoTile[] = [
    {
      key: "schedules",
      icon: "ph:calendar-check-thin",
      label: "计划任务",
      pad: 14,
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {enabledCount}/{schedules.length} 启用
        </span>
      ),
      collapsed: <SchedulesCollapsed schedules={schedules} />,
      detail: <SchedulesDetail schedules={schedules} />,
    },
  ];

  return <ExpandableBentoCard cardId="schedules" tiles={tiles} />;
}

/** 启用状态圆点:启用生命色、停用淡墨。复用于折叠摘要与详情行首。 */
function EnabledDot({
  enabled,
  size = 7,
}: {
  enabled: boolean;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: enabled ? "var(--ls-life)" : "var(--ls-ink-faint)",
      }}
    />
  );
}

/** 居中空态提示,折叠/详情共用。 */
function EmptyCenter({ text }: { text: string }) {
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
      {text}
    </div>
  );
}

function SchedulesCollapsed({ schedules }: { schedules: Schedule[] }) {
  if (schedules.length === 0) {
    return <EmptyCenter text="暂无计划任务" />;
  }
  const shown = schedules.slice(0, COLLAPSED_MAX);
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
      {shown.map((s) => (
        <div
          key={s.id}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <EnabledDot enabled={s.enabled} />
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
            {s.name}
          </span>
          <span
            style={{ fontSize: 10, color: "var(--ls-ink-soft)", flexShrink: 0 }}
          >
            {actionText(s.action)}
          </span>
          {/* 下次运行存在才占右位,避免一排空文案噪声 */}
          {s.next_run ? (
            <span
              className="ls-num"
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: "var(--ls-ink-faint)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {s.next_run}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SchedulesDetail({ schedules }: { schedules: Schedule[] }) {
  // 按可用高度自适应行数:矮则少、高则多,超出滚动,正好铺满不留空。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (schedules.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无计划任务
      </div>
    );
  }
  const overflow = schedules.length > rows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="计划任务" hint={`共 ${schedules.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {schedules.map((s) => (
          <ScheduleRow key={s.id} schedule={s} />
        ))}
      </div>
    </div>
  );
}

function ScheduleRow({ schedule: s }: { schedule: Schedule }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <EnabledDot enabled={s.enabled} size={8} />
        <span
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {s.name}
        </span>
        <span
          className="shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {actionText(s.action)}
        </span>
        <span
          className="ml-auto shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {typeText(s.schedule_type)}
        </span>
      </div>
      {/* 时间字段为字符串(可能缺省),原样透出不臆造格式 */}
      <div
        className="mt-1 flex items-center gap-3 text-[10px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        <span
          className="ls-num truncate"
          style={{ minWidth: 0 }}
          title={s.last_run}
        >
          上次 {s.last_run ?? "—"}
        </span>
        <span
          className="ls-num truncate"
          style={{ minWidth: 0 }}
          title={s.next_run}
        >
          下次 {s.next_run ?? "—"}
        </span>
      </div>
    </div>
  );
}

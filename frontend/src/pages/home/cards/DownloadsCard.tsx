import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Ring } from "@/components/ls";
import { num } from "@/utils/format";
import { MiniBar, SectionHead } from "@/pages/home/cards/CardKit";
import {
  useDownloadTasksQuery,
  type DownloadStatus,
  type DownloadTask,
} from "@/hooks/queries/useDownloadQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 下载/安装任务卡 —— 单瓦片 bento,卡内自取数(useDownloadTasksQuery)。
 * 任务为内存态(启动器重启即清空),空态正常,不当异常处理。
 *
 * 折叠态聚焦"当下在装什么":有进行中任务时给首个活动任务的进度环 + 实例名 + 步骤;
 * 展开态逐任务铺开状态/进度条/百分比/步骤或错误。容器形变钻取由基座承载。
 *
 * 百分比字段沿用后端真实命名 progress.progress(0-100 的 f64),非规格草拟的 percentage。
 */

/** 进行中状态集合:这四档表示任务尚在推进,据此筛活动任务与计数。 */
const ACTIVE_STATUSES: ReadonlySet<DownloadStatus> = new Set<DownloadStatus>([
  "pending",
  "downloading",
  "installing",
  "configuring",
]);

const STATUS_LABEL: Record<DownloadStatus, string> = {
  pending: "等待中",
  downloading: "下载中",
  installing: "安装依赖",
  configuring: "配置中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

/** 状态 -> 色:进行中暖琥珀,完成生命色,失败危险,取消淡墨。 */
function statusTone(status: DownloadStatus): string {
  if (status === "completed") return "var(--ls-life)";
  if (status === "failed") return "var(--ls-danger)";
  if (status === "cancelled") return "var(--ls-ink-faint)";
  return "var(--ls-warn)";
}

function isActive(task: DownloadTask): boolean {
  return ACTIVE_STATUSES.has(task.status);
}

/** 详情每行行距(px):据此按展开后可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 46;
/** 详情列表最少行数(容器极矮时下限)。 */
const MIN_ROWS = 2;

export function DownloadsCard(_props: { size?: WidgetSize } = {}) {
  const { data } = useDownloadTasksQuery();
  const tasks = data ?? [];
  const activeCount = tasks.filter(isActive).length;

  const tiles: BentoTile[] = [
    {
      key: "downloads",
      icon: "ph:download-simple-thin",
      label: "下载任务",
      pad: 14,
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          进行中 {activeCount}
        </span>
      ),
      collapsed: <DownloadsCollapsed tasks={tasks} />,
      detail: <DownloadsDetail tasks={tasks} />,
    },
  ];

  return <ExpandableBentoCard cardId="downloads" tiles={tiles} />;
}

function DownloadsCollapsed({ tasks }: { tasks: DownloadTask[] }) {
  // 取首个进行中任务作英雄展示;无进行中(含全空/全终态)则给空态文案。
  const active = tasks.find(isActive);
  if (!active) {
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
        暂无下载任务
      </div>
    );
  }
  const pct = num(active.progress.progress);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Ring
        value={Math.round(pct)}
        size={52}
        stroke={6}
        centerLabel={
          <span
            style={{ display: "grid", placeItems: "center", lineHeight: 1 }}
          >
            <span className="ls-num" style={{ fontSize: 14, fontWeight: 600 }}>
              {pct.toFixed(0)}
            </span>
            <span style={{ fontSize: 8, color: "var(--ls-ink-faint)" }}>%</span>
          </span>
        }
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ls-ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {active.instance_name}
        </div>
        <div
          style={{
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <StatusDot status={active.status} />
          <span style={{ fontSize: 10, color: statusTone(active.status) }}>
            {STATUS_LABEL[active.status]}
          </span>
        </div>
        {active.progress.message ? (
          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "var(--ls-ink-faint)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={active.progress.message}
          >
            {active.progress.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DownloadsDetail({ tasks }: { tasks: DownloadTask[] }) {
  // 按可用高度自适应行数,超出滚动,正好铺满不留空。
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (tasks.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无下载任务
      </div>
    );
  }
  const overflow = tasks.length > rows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="任务" hint={`共 ${tasks.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: DownloadTask }) {
  const pct = num(task.progress.progress);
  // 任务级 error_message 优先;退而取 progress.error;均无则展示步骤 message。
  const note =
    task.error_message ?? task.progress.error ?? task.progress.message;
  const isError = task.error_message != null || task.progress.error != null;
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={task.status} />
        <span
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {task.instance_name}
        </span>
        <span
          className="shrink-0 text-[10px]"
          style={{ color: statusTone(task.status) }}
        >
          {STATUS_LABEL[task.status]}
        </span>
        <span
          className="ls-num ml-auto shrink-0 text-[10.5px]"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5">
        <MiniBar pct={pct} color={statusTone(task.status)} />
      </div>
      {note ? (
        <div
          className="mt-1 truncate text-[10px]"
          style={{
            color: isError ? "var(--ls-danger)" : "var(--ls-ink-faint)",
            minWidth: 0,
          }}
          title={note}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}

/** 状态圆点:色按状态,复用于折叠英雄与各行行首。 */
function StatusDot({ status }: { status: DownloadStatus }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        flexShrink: 0,
        background: statusTone(status),
      }}
    />
  );
}

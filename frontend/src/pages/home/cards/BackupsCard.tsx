import { useQueries } from "@tanstack/react-query";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { fmtBytes, fmtDateTime } from "@/pages/home/cards/format";
import { num } from "@/utils/format";
import { useInstancesQuery } from "@/hooks/queries/useInstanceQueries";
import { versionKeys } from "@/hooks/queries/useVersionQueries";
import {
  getBackups,
  getComponentDisplayName,
  type VersionBackup,
} from "@/services/versionApi";
import type { Instance } from "@/services/instanceApi";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 备份卡 —— 单瓦片 bento。自取数:先列实例,再对每个实例并发拉本地备份记录(get_backups,
 * version_backups 表的廉价 DB 读取,N+1 经 useQueries 并发);跨实例汇总后按备份时间倒序。
 *
 * 折叠态聚焦"最近几条备份"(组件名 + 版本 + 时间);展开逐条铺开组件 / 版本 / commit / 体积 / 时间。
 * 备份恢复是实例页的职责,本卡只读概览,不提供恢复按钮(首页只读)。
 */

const PLACEHOLDER = "—";
const ROW_PITCH = 46;
const MIN_ROWS = 2;

/** 折叠态列出的备份条数:S 紧凑,M 维持,L 略多;超出靠 trailing 总数体现。 */
const COLLAPSED_MAX: Record<WidgetSize, number> = { s: 3, m: 5, l: 8 };

/** 一条备份 + 其所属实例名(跨实例汇总后用于展示归属)。 */
interface BackupRow {
  instanceId: string;
  instanceName: string;
  backup: VersionBackup;
}

/** 列实例 + 各实例并发拉备份,汇总成按 created_at 倒序的扁平列表。 */
function useAllBackups(): { rows: BackupRow[]; isLoading: boolean } {
  const { data: instanceList } = useInstancesQuery();
  const instances: Instance[] = instanceList?.instances ?? [];

  const results = useQueries({
    queries: instances.map((inst) => ({
      queryKey: versionKeys.backups(inst.id),
      queryFn: () => getBackups(inst.id),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const rows: BackupRow[] = [];
  instances.forEach((inst, i) => {
    const list = results[i]?.data ?? [];
    for (const backup of list) {
      rows.push({ instanceId: inst.id, instanceName: inst.name, backup });
    }
  });
  // created_at 为 SQLite NaiveDateTime 字符串(可字典序比较即时间序),倒序取最近。
  rows.sort((a, b) => b.backup.created_at.localeCompare(a.backup.created_at));

  const isLoading = results.some((r) => r.isLoading);
  return { rows, isLoading };
}

export function BackupsCard({ size = "m" }: { size?: WidgetSize } = {}) {
  const { rows } = useAllBackups();

  const tiles: BentoTile[] = [
    {
      key: "backups",
      icon: "ph:archive-thin",
      label: "备份",
      pad: 14,
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {num(rows.length)} 份
        </span>
      ),
      collapsed: <BackupsCollapsed rows={rows} size={size} />,
      detail: <BackupsDetail rows={rows} />,
    },
  ];

  return <ExpandableBentoCard cardId="backups" tiles={tiles} />;
}

function EmptyState({ text }: { text: string }) {
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

function BackupsCollapsed({
  rows,
  size,
}: {
  rows: BackupRow[];
  size: WidgetSize;
}) {
  if (rows.length === 0) return <EmptyState text="暂无备份记录" />;
  const shown = rows.slice(0, COLLAPSED_MAX[size]);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        marginTop: 8,
        gap: 5,
        overflow: "hidden",
      }}
    >
      {shown.map(({ backup, instanceName }) => (
        <div
          key={backup.id}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
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
            {getComponentDisplayName(backup.component)}
          </span>
          {size !== "s" ? (
            <span
              style={{
                fontSize: 10,
                color: "var(--ls-ink-faint)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: "0 1 auto",
                minWidth: 0,
              }}
            >
              {instanceName}
            </span>
          ) : null}
          <span
            className="ls-num"
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "var(--ls-ink-faint)",
              flexShrink: 0,
            }}
          >
            {fmtDateTime(backup.created_at) ?? PLACEHOLDER}
          </span>
        </div>
      ))}
    </div>
  );
}

function BackupsDetail({ rows }: { rows: BackupRow[] }) {
  const { ref: listRef, rows: visRows } = useAutoRows(ROW_PITCH, MIN_ROWS);

  if (rows.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无备份记录
      </div>
    );
  }
  const overflow = rows.length > visRows;
  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="备份记录" hint={`共 ${rows.length}`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {rows.map((row) => (
          <BackupRowItem key={row.backup.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function BackupRowItem({ row }: { row: BackupRow }) {
  const { backup, instanceName } = row;
  const when = fmtDateTime(backup.created_at);
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--ls-bg-2)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--ls-ink)", flex: "0 1 auto", minWidth: 0 }}
        >
          {getComponentDisplayName(backup.component)}
        </span>
        <span
          className="shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {instanceName}
        </span>
        {backup.version ? (
          <Badge tone="neutral" style={{ flexShrink: 0 }}>
            {backup.version}
          </Badge>
        ) : null}
        <span
          className="ls-num ml-auto shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {fmtBytes(backup.backup_size)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2.5 text-[10px]">
        {backup.commit_hash ? (
          <span
            className="ls-num font-mono"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            #{backup.commit_hash.slice(0, 7)}
          </span>
        ) : null}
        {when ? (
          <span className="ls-num" style={{ color: "var(--ls-ink-faint)" }}>
            {when}
          </span>
        ) : null}
        {backup.description ? (
          <span
            className="truncate"
            style={{ color: "var(--ls-ink-faint)", minWidth: 0 }}
            title={backup.description}
          >
            {backup.description}
          </span>
        ) : null}
      </div>
    </div>
  );
}

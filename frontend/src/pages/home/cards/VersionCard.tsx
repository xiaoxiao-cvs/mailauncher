import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Icon } from "@iconify/react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { Badge } from "@/components/ls";
import { num } from "@/utils/format";
import { useInstancesQuery } from "@/hooks/queries/useInstanceQueries";
import { useCheckComponentUpdateQuery } from "@/hooks/queries/useVersionQueries";
import { versionKeys } from "@/hooks/queries/useVersionQueries";
import {
  getInstanceComponentsVersion,
  getComponentDisplayName,
} from "@/services/versionApi";
import type {
  ComponentVersionInfo,
  ComponentUpdateCheck,
} from "@/services/versionApi";
import type { Instance } from "@/services/instanceApi";

/**
 * 组件版本卡 —— 单瓦片 bento。自取数:先列实例,再对每个实例并发拉本地组件版本快照
 * (component_versions 表,廉价 DB 读取)。折叠态按实例分组列已安装组件名+版本;
 * 展开详情逐组件铺开 commit / 安装方式 / 安装时间,行尾「检查更新」按需走网络对该组件查 GitHub。
 *
 * 更新检查(check_component_update)走 N 次 GitHub 往返,故严格按需触发:默认不查,
 * 用户在详情里逐组件点按钮才发起,避免一进首页就把所有组件全网查一遍。
 */

const PLACEHOLDER = "—";
const ROW_PITCH = 44;
const MIN_ROWS = 3;

/** 折叠态每实例最多列出的组件条数,超出靠 trailing 总数体现。 */
const COLLAPSED_PER_INSTANCE = 3;

interface InstanceVersions {
  instance: Instance;
  components: ComponentVersionInfo[];
}

/** 把实例列表 + 各实例组件版本查询结果合成为分组视图(只保留有组件的实例)。 */
function useInstanceVersions(): {
  groups: InstanceVersions[];
  totalComponents: number;
  isLoading: boolean;
} {
  const { data: instanceList } = useInstancesQuery();
  const instances = instanceList?.instances ?? [];

  const results = useQueries({
    queries: instances.map((inst) => ({
      queryKey: versionKeys.components(inst.id),
      queryFn: () => getInstanceComponentsVersion(inst.id),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const groups: InstanceVersions[] = instances.map((inst, i) => ({
    instance: inst,
    components: results[i]?.data ?? [],
  }));

  const totalComponents = groups.reduce(
    (sum, g) => sum + g.components.length,
    0,
  );
  const isLoading = results.some((r) => r.isLoading);

  return { groups, totalComponents, isLoading };
}

export function VersionCard() {
  const { groups, totalComponents } = useInstanceVersions();

  const tiles: BentoTile[] = [
    {
      key: "version",
      icon: "ph:package-thin",
      label: "组件版本",
      pad: 14,
      trailing: (
        <span
          className="ls-num"
          style={{ fontSize: 10.5, color: "var(--ls-ink-faint)" }}
        >
          {num(totalComponents)} 个组件
        </span>
      ),
      collapsed: <VersionCollapsed groups={groups} total={totalComponents} />,
      detail: <VersionDetail groups={groups} />,
    },
  ];

  return <ExpandableBentoCard cardId="version" tiles={tiles} />;
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

function VersionCollapsed({
  groups,
  total,
}: {
  groups: InstanceVersions[];
  total: number;
}) {
  const withComponents = groups.filter((g) => g.components.length > 0);
  if (total === 0) {
    return <EmptyState text="暂无组件版本记录" />;
  }
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        marginTop: 8,
        gap: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {withComponents.map((g) => (
          <div key={g.instance.id}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ls-ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {g.instance.name}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                marginTop: 2,
              }}
            >
              {g.components.slice(0, COLLAPSED_PER_INSTANCE).map((c) => (
                <div
                  key={c.component}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10.5,
                  }}
                >
                  <span
                    style={{
                      color: "var(--ls-ink-soft)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: "0 1 auto",
                      minWidth: 0,
                    }}
                  >
                    {getComponentDisplayName(c.component)}
                  </span>
                  <span
                    className="ls-num"
                    style={{
                      marginLeft: "auto",
                      color: "var(--ls-ink-faint)",
                      flexShrink: 0,
                    }}
                  >
                    {c.version || PLACEHOLDER}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "auto",
          fontSize: 10,
          color: "var(--ls-ink-faint)",
        }}
      >
        展开可逐组件检查更新
      </div>
    </div>
  );
}

function VersionDetail({ groups }: { groups: InstanceVersions[] }) {
  const { ref: listRef, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  const withComponents = groups.filter((g) => g.components.length > 0);

  if (withComponents.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        暂无组件版本记录
      </div>
    );
  }

  const totalRows = withComponents.reduce(
    (sum, g) => sum + g.components.length + 1,
    0,
  );
  const overflow = totalRows > rows;

  return (
    <div className="flex h-full flex-col gap-2">
      <SectionHead title="组件版本" hint={`${withComponents.length} 个实例`} />
      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-2 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {withComponents.map((g) => (
          <div key={g.instance.id} className="space-y-1.5">
            <SectionHead title={g.instance.name} />
            {g.components.map((c) => (
              <ComponentRow
                key={c.component}
                instanceId={g.instance.id}
                component={c}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentRow({
  instanceId,
  component,
}: {
  instanceId: string;
  component: ComponentVersionInfo;
}) {
  // 按需:点了才把 enabled 置真,触发该组件的 check_component_update(网络)。
  const [checking, setChecking] = useState(false);
  const { data: update, isFetching } = useCheckComponentUpdateQuery(
    instanceId,
    component.component,
    { enabled: checking },
  );

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
          {getComponentDisplayName(component.component)}
        </span>
        <span
          className="ls-num shrink-0 text-[10px]"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {component.version || PLACEHOLDER}
        </span>
        {component.commit_hash ? (
          <span
            className="ls-num shrink-0 font-mono text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            #{component.commit_hash.slice(0, 7)}
          </span>
        ) : null}
        <UpdateAction
          checking={checking}
          isFetching={isFetching}
          update={update}
          onCheck={() => setChecking(true)}
        />
      </div>
      <div className="mt-1 flex items-center gap-2.5 text-[10px]">
        <span style={{ color: "var(--ls-ink-faint)" }}>
          {component.install_method}
        </span>
        {component.installed_at ? (
          <span className="ls-num" style={{ color: "var(--ls-ink-faint)" }}>
            {component.installed_at}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** 行尾更新动作:未查显示按钮;查询中转圈;有结果按 has_update 给徽标或"已是最新"。 */
function UpdateAction({
  checking,
  isFetching,
  update,
  onCheck,
}: {
  checking: boolean;
  isFetching: boolean;
  update: ComponentUpdateCheck | undefined;
  onCheck: () => void;
}) {
  if (!checking) {
    return (
      <button
        type="button"
        onClick={onCheck}
        className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px]"
        style={{ color: "var(--ls-ink-soft)", background: "var(--ls-surface)" }}
      >
        检查更新
      </button>
    );
  }
  if (isFetching || !update) {
    return (
      <span
        className="ml-auto flex shrink-0 items-center gap-1 text-[10px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        <Icon
          icon="ph:circle-notch-thin"
          width={12}
          height={12}
          className="animate-spin"
        />
        检查中
      </span>
    );
  }
  if (update.has_update) {
    return (
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {update.commits_behind ? (
          <span
            className="ls-num text-[10px]"
            style={{ color: "var(--ls-warn)" }}
          >
            落后 {update.commits_behind}
          </span>
        ) : null}
        <Badge tone="life">
          {update.latest_version ? `新版 ${update.latest_version}` : "有更新"}
        </Badge>
      </span>
    );
  }
  return (
    <span
      className="ml-auto shrink-0 text-[10px]"
      style={{ color: "var(--ls-life)" }}
    >
      已是最新
    </span>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@iconify/react";

import { ExpandableBentoCard } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { tauriInvoke } from "@/services/tauriInvoke";
import {
  environmentKeys,
  type GitInfo,
} from "@/hooks/queries/useEnvironmentQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 环境就绪卡 —— 单瓦片 bento。检测本机 Git 与 Python 环境是否满足 MaiBot 部署要求。
 *
 * 按需触发(非轮询):discover_python 会扫盘(副作用、较重),check_git_environment 派生子进程,
 * 故默认不查;用户点"检测"才发起。检测过的结果经 React Query 缓存,不重复扫盘。
 * Python 用 discover_python(写库)+ get_python_environments(读库)两步,与 onboarding 同口径;
 * 满足要求 = 至少一个被发现的环境标记 meets_maibot_requirement。
 */

/** discover_python 写库后,get_python_environments 返回的发现项(snake_case,与 Rust 对齐)。 */
interface DiscoveredPythonEnv {
  path: string;
  version: string;
  is_selected: boolean;
  meets_maibot_requirement: boolean;
}

/** 检测一次 Python:先 discover_python 扫盘写库,再读回全量列表(含是否满足 MaiBot 要求)。 */
async function detectPythonEnvironments(): Promise<DiscoveredPythonEnv[]> {
  await tauriInvoke("discover_python");
  return tauriInvoke<DiscoveredPythonEnv[]>("get_python_environments");
}

export function EnvCard({ size = "m" }: { size?: WidgetSize } = {}) {
  // 按需:点了才置真,触发 Git/Python 检测(各自的 query 据此 enabled)。
  const [checking, setChecking] = useState(false);

  const git = useQuery({
    queryKey: environmentKeys.git(),
    queryFn: () => tauriInvoke<GitInfo>("check_git_environment"),
    enabled: checking,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const python = useQuery({
    queryKey: environmentKeys.pythonVersions(),
    queryFn: detectPythonEnvironments,
    enabled: checking,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const fetching = git.isFetching || python.isFetching;
  const pythonOk = (python.data ?? []).some((e) => e.meets_maibot_requirement);
  const pythonBest = (python.data ?? [])
    .filter((e) => e.meets_maibot_requirement)
    .map((e) => e.version)[0];

  const tiles: BentoTile[] = [
    {
      key: "env",
      icon: "ph:wrench-thin",
      label: "环境就绪",
      pad: 14,
      collapsed: (
        <EnvCollapsed
          checked={checking && !fetching && (!!git.data || !!python.data)}
          fetching={fetching}
          size={size}
          gitOk={git.data?.is_available ?? false}
          gitVersion={git.data?.version ?? ""}
          pythonOk={pythonOk}
          pythonBest={pythonBest}
          onCheck={() => setChecking(true)}
        />
      ),
      detail: (
        <EnvDetail
          fetching={fetching}
          git={git.data}
          pythonEnvs={python.data ?? []}
          pythonOk={pythonOk}
          onCheck={() => setChecking(true)}
        />
      ),
    },
  ];

  return <ExpandableBentoCard cardId="env" tiles={tiles} />;
}

/** 就绪点:满足 -> 生命色,不满足 -> 危险色,未检测 -> 淡墨。 */
function ReadyDot({ state }: { state: "ok" | "bad" | "unknown" }) {
  const color =
    state === "ok"
      ? "var(--ls-life)"
      : state === "bad"
        ? "var(--ls-danger)"
        : "var(--ls-ink-faint)";
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        flexShrink: 0,
        background: color,
      }}
    />
  );
}

function CheckButton({
  fetching,
  onCheck,
  label,
}: {
  fetching: boolean;
  onCheck: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onCheck}
      disabled={fetching}
      className="ls-item flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px]"
      style={{
        color: "var(--ls-ink-soft)",
        border: "1px solid var(--ls-hairline)",
      }}
    >
      <Icon
        icon={fetching ? "ph:circle-notch-thin" : "ph:magnifying-glass-thin"}
        width={13}
        height={13}
        className={fetching ? "animate-spin" : undefined}
      />
      {fetching ? "检测中" : label}
    </button>
  );
}

function EnvCollapsed({
  checked,
  fetching,
  size,
  gitOk,
  gitVersion,
  pythonOk,
  pythonBest,
  onCheck,
}: {
  checked: boolean;
  fetching: boolean;
  size: WidgetSize;
  gitOk: boolean;
  gitVersion: string;
  pythonOk: boolean;
  pythonBest: string | undefined;
  onCheck: () => void;
}) {
  if (!checked) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--ls-ink-faint)" }}>
          检测本机 Git 与 Python 是否满足部署要求
        </span>
        <CheckButton fetching={fetching} onCheck={onCheck} label="检测环境" />
      </div>
    );
  }
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ReadyDot state={gitOk ? "ok" : "bad"} />
        <span
          style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ls-ink)" }}
        >
          Git
        </span>
        <span
          className="ls-num"
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ls-ink-faint)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {gitOk ? (size === "s" ? "已就绪" : gitVersion) : "未检测到"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ReadyDot state={pythonOk ? "ok" : "bad"} />
        <span
          style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ls-ink)" }}
        >
          Python
        </span>
        <span
          className="ls-num"
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ls-ink-faint)",
            flexShrink: 0,
          }}
        >
          {pythonOk
            ? pythonBest
              ? `${pythonBest} 就绪`
              : "已就绪"
            : "需 3.12+"}
        </span>
      </div>
    </div>
  );
}

function EnvDetail({
  fetching,
  git,
  pythonEnvs,
  pythonOk,
  onCheck,
}: {
  fetching: boolean;
  git: GitInfo | undefined;
  pythonEnvs: DiscoveredPythonEnv[];
  pythonOk: boolean;
  onCheck: () => void;
}) {
  const checked = !!git || pythonEnvs.length > 0;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionHead title="环境检测" />
        <span data-no-collapse>
          <CheckButton
            fetching={fetching}
            onCheck={onCheck}
            label={checked ? "重新检测" : "检测环境"}
          />
        </span>
      </div>

      <div
        className="rounded-lg px-2.5 py-2"
        style={{ background: "var(--ls-bg-2)" }}
      >
        <div className="flex items-center gap-2">
          <ReadyDot
            state={!checked ? "unknown" : git?.is_available ? "ok" : "bad"}
          />
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--ls-ink)" }}
          >
            Git
          </span>
          <span className="ml-auto flex shrink-0 items-center">
            {!checked ? (
              <span
                className="text-[10px]"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                未检测
              </span>
            ) : git?.is_available ? (
              <Badge tone="life">可用</Badge>
            ) : (
              <Badge tone="danger">未安装</Badge>
            )}
          </span>
        </div>
        {git?.is_available ? (
          <div
            className="ls-num mt-1 truncate text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            {git.version}
            {git.path ? ` · ${git.path}` : ""}
          </div>
        ) : null}
      </div>

      <div
        className="rounded-lg px-2.5 py-2"
        style={{ background: "var(--ls-bg-2)" }}
      >
        <div className="flex items-center gap-2">
          <ReadyDot state={!checked ? "unknown" : pythonOk ? "ok" : "bad"} />
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--ls-ink)" }}
          >
            Python
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            需 3.12+
          </span>
          <span className="ml-auto flex shrink-0 items-center">
            {!checked ? (
              <span
                className="text-[10px]"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                未检测
              </span>
            ) : pythonOk ? (
              <Badge tone="life">满足</Badge>
            ) : (
              <Badge tone="danger">不满足</Badge>
            )}
          </span>
        </div>
        {pythonEnvs.length > 0 ? (
          <div className="mt-1.5 space-y-1">
            {pythonEnvs.map((env) => (
              <div
                key={env.path}
                className="flex items-center gap-2 text-[10px]"
              >
                <ReadyDot state={env.meets_maibot_requirement ? "ok" : "bad"} />
                <span
                  className="ls-num shrink-0"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {env.version}
                </span>
                <span
                  className="ls-num truncate font-mono"
                  style={{ color: "var(--ls-ink-faint)", minWidth: 0 }}
                  title={env.path}
                >
                  {env.path}
                </span>
              </div>
            ))}
          </div>
        ) : checked ? (
          <div
            className="mt-1 text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            未发现 Python 环境
          </div>
        ) : null}
      </div>
    </div>
  );
}

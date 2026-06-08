import { Icon } from "@iconify/react";

import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import { SectionHead } from "@/pages/home/cards/CardKit";
import { useConnectivityQuery } from "@/hooks/queries/useConnectivityQueries";
import {
  useNetworkProxyQuery,
  useSourceConfigQuery,
} from "@/hooks/queries/useSourceProxyQueries";
import type {
  GithubMirror,
  NetworkProxy,
  PypiSource,
} from "@/hooks/queries/useSourceProxyQueries";
import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 网络与源状态卡 —— 单瓦片 bento:折叠态给 GitHub/PyPI 连通点 + 代理一行;
 * 展开后分四节铺开连通性、GitHub 镜像源、PyPI 源、代理详情。容器形变钻取由基座承载。
 *
 * 卡内自取数(不经 props 注入):连通性 / 代理 / 下载源各用其 React Query hook。
 * 连通性沿用 hook 自带的 30s staleTime,不在卡内设短 refetchInterval(避免高频探活)。
 */

const PLACEHOLDER = "—";
/** 源列表行距 px:据此按展开后可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 28;
/** 源列表最少行数(容器极矮时下限)。 */
const MIN_ROWS = 2;

/** 连通点:通=生命色、断=危险色;loading 时降为淡墨,避免误报"断"。 */
function ConnDot({ ok, loading }: { ok: boolean; loading: boolean }) {
  const color = loading
    ? "var(--ls-ink-faint)"
    : ok
      ? "var(--ls-life)"
      : "var(--ls-danger)";
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        flexShrink: 0,
        background: color,
      }}
    />
  );
}

/** enabled 圆点:启用=生命色、停用=淡墨(源条目右端用)。 */
function EnabledDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        flexShrink: 0,
        background: enabled ? "var(--ls-life)" : "var(--ls-ink-faint)",
      }}
    />
  );
}

/** 代理文案:启用则 host:port,否则"未启用"。 */
function proxyText(proxy: NetworkProxy | undefined): string {
  if (!proxy) return PLACEHOLDER;
  return proxy.enabled ? `${proxy.host}:${proxy.port}` : "未启用";
}

export function NetworkSourceCard({ size = "m" }: { size?: WidgetSize } = {}) {
  const tiles: BentoTile[] = [
    {
      key: "network",
      icon: "ph:globe-simple-thin",
      label: "网络与源",
      collapsed: <NetworkCollapsed size={size} />,
      detail: <NetworkDetail />,
    },
  ];

  return <ExpandableBentoCard cardId="network" tiles={tiles} />;
}

function NetworkCollapsed({ size }: { size: WidgetSize }) {
  const { data: conn, isLoading: connLoading } = useConnectivityQuery();
  const { data: proxy } = useNetworkProxyQuery();

  const ghOk = conn?.github ?? false;
  const pypiOk = conn?.pypi ?? false;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ConnDot ok={ghOk} loading={connLoading} />
        <span style={{ fontSize: 12, color: "var(--ls-ink)" }}>
          GitHub {connLoading ? PLACEHOLDER : ghOk ? "通" : "断"}
        </span>
        <span style={{ fontSize: 11, color: "var(--ls-ink-faint)" }}>·</span>
        <ConnDot ok={pypiOk} loading={connLoading} />
        <span style={{ fontSize: 12, color: "var(--ls-ink)" }}>
          PyPI {connLoading ? PLACEHOLDER : pypiOk ? "通" : "断"}
        </span>
      </div>
      {/* S 尺寸隐去代理行,只留连通点串保持紧凑;M 维持现状 */}
      {size !== "s" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon
            icon="ph:plugs-connected-thin"
            width={13}
            height={13}
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <span
            className="ls-num"
            style={{ fontSize: 11, color: "var(--ls-ink-soft)" }}
          >
            代理 {proxyText(proxy)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NetworkDetail() {
  const { data: conn, isLoading: connLoading } = useConnectivityQuery();
  const { data: proxy } = useNetworkProxyQuery();
  const { data: config } = useSourceConfigQuery();

  // 按 priority 升序展示(数值小=优先),口径对齐源管理页的取用顺序。
  const githubMirrors = [...(config?.github ?? [])].sort(
    (a, b) => a.priority - b.priority,
  );
  const pypiSources = [...(config?.pypi ?? [])].sort(
    (a, b) => a.priority - b.priority,
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="flex flex-col gap-1.5">
        <SectionHead title="连通性" />
        <ConnRow
          label="GitHub"
          ok={conn?.github ?? false}
          loading={connLoading}
        />
        <ConnRow label="PyPI" ok={conn?.pypi ?? false} loading={connLoading} />
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-1.5">
        <SectionHead
          title="GitHub 镜像源"
          hint={
            githubMirrors.length > 0 ? `共 ${githubMirrors.length}` : undefined
          }
        />
        <GithubList mirrors={githubMirrors} />
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-1.5">
        <SectionHead
          title="PyPI 源"
          hint={pypiSources.length > 0 ? `共 ${pypiSources.length}` : undefined}
        />
        <PypiList sources={pypiSources} />
      </section>

      <section className="flex flex-col gap-1.5">
        <SectionHead title="代理" />
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: "var(--ls-bg-2)" }}
        >
          <span
            className="ls-num flex-1 truncate text-[11px]"
            style={{ color: "var(--ls-ink)" }}
          >
            {proxy && proxy.enabled ? `${proxy.host}:${proxy.port}` : "未配置"}
          </span>
          <Badge tone={proxy?.enabled ? "life" : "neutral"}>
            {proxy?.enabled ? "已启用" : "未启用"}
          </Badge>
        </div>
      </section>
    </div>
  );
}

/** 连通性单行:行首点 + 标签 + 右端通/断状态字(着语义色)。 */
function ConnRow({
  label,
  ok,
  loading,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <ConnDot ok={ok} loading={loading} />
      <span className="flex-1" style={{ color: "var(--ls-ink)" }}>
        {label}
      </span>
      <span
        style={{
          color: loading
            ? "var(--ls-ink-faint)"
            : ok
              ? "var(--ls-life)"
              : "var(--ls-danger)",
        }}
      >
        {loading ? PLACEHOLDER : ok ? "通" : "断"}
      </span>
    </div>
  );
}

function GithubList({ mirrors }: { mirrors: GithubMirror[] }) {
  const { ref, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  if (mirrors.length === 0) {
    return <EmptyHint text="暂无镜像源" />;
  }
  const overflow = mirrors.length > rows;
  return (
    <div
      ref={ref}
      className={`min-h-0 flex-1 space-y-1 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
    >
      {mirrors.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px]"
          style={{ background: "var(--ls-bg-2)" }}
        >
          <EnabledDot enabled={m.enabled} />
          <span
            className="shrink-0"
            style={{ color: "var(--ls-ink)", maxWidth: "40%" }}
          >
            <span className="block truncate">{m.name}</span>
          </span>
          <span
            className="ls-num flex-1 truncate text-right"
            style={{ color: "var(--ls-ink-faint)" }}
            title={m.prefix}
          >
            {/* 空前缀=官方直连,显式标注以免被误读为"未配置" */}
            {m.prefix || "官方直连"}
          </span>
        </div>
      ))}
    </div>
  );
}

function PypiList({ sources }: { sources: PypiSource[] }) {
  const { ref, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  if (sources.length === 0) {
    return <EmptyHint text="暂无 PyPI 源" />;
  }
  const overflow = sources.length > rows;
  return (
    <div
      ref={ref}
      className={`min-h-0 flex-1 space-y-1 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
    >
      {sources.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px]"
          style={{ background: "var(--ls-bg-2)" }}
        >
          <EnabledDot enabled={s.enabled} />
          <span
            className="shrink-0"
            style={{ color: "var(--ls-ink)", maxWidth: "40%" }}
          >
            <span className="block truncate">{s.name}</span>
          </span>
          <span
            className="ls-num flex-1 truncate text-right"
            style={{ color: "var(--ls-ink-faint)" }}
            title={s.index_url}
          >
            {s.index_url}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-[11px]" style={{ color: "var(--ls-ink-faint)" }}>
      {text}
    </div>
  );
}

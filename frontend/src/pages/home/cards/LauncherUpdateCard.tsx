import { ExpandableBentoCard, useAutoRows } from "@/components/bento";
import type { BentoTile } from "@/components/bento";
import { Badge } from "@/components/ls";
import { Cell, SectionHead } from "@/pages/home/cards/CardKit";
import {
  useCheckUpdateQuery,
  useCurrentVersionQuery,
} from "@/hooks/queries/useUpdateQueries";
import type { UpdateChannel } from "@/types/update";

/**
 * 启动器自更新卡 —— 单瓦片 bento:折叠态给当前版本大字 + 有无新版徽标,
 * 展开后列当前/最新版本与可用更新通道。容器形变钻取由 ExpandableBentoCard 承载,
 * 本文件只负责版本语义(取数口径、有无新版着色、通道罗列)。
 *
 * 取数双源(均卡内自取):
 * - useCurrentVersionQuery 走 Tauri 取本机安装版本,会话期不变(hook staleTime: Infinity),
 *   作为"当前版本"的权威值。
 * - useCheckUpdateQuery 走后端查 GitHub 比对,产出 has_update / latest_version / channels;
 *   属网络低频操作,沿用 hook 默认缓存(staleTime 60s),不另设 refetchInterval 以免频繁打网。
 *
 * 通道罗列口径:后端契约里 UpdateChannel 仅含 { name, label, description },
 * 不携带各通道的最新版本号或 release notes(那些字段只在 update_available / 版本列表里),
 * 故"通道"分节诚实展示 label + description 摘要,绝不凭空补 version/notes。
 */

const PLACEHOLDER = "—";
/** 通道分节行距(px):据此按展开后可用高度推算可容纳行数,自适应铺满。 */
const ROW_PITCH = 40;
/** 通道分节最少行数(容器极矮时下限)。 */
const MIN_ROWS = 2;
/** 比对更新查询固定走的通道(稳定通道);列表本身仍含该响应回报的全部通道。 */
const CHECK_CHANNEL = "main";

export function LauncherUpdateCard() {
  const tiles: BentoTile[] = [
    {
      key: "launcher",
      icon: "ph:rocket-launch-thin",
      label: "启动器",
      pad: 16,
      trailing: <UpdateBadge />,
      collapsed: <LauncherCollapsed />,
      detail: <LauncherDetail />,
    },
  ];

  return <ExpandableBentoCard cardId="launcher" tiles={tiles} />;
}

/** 头部右侧徽标:发现新版为生命色,否则中性"最新";检查未就绪不出徽标(避免误报"最新")。 */
function UpdateBadge() {
  const { data: check } = useCheckUpdateQuery(CHECK_CHANNEL);
  if (!check) return null;
  return check.has_update ? (
    <Badge tone="life">有新版</Badge>
  ) : (
    <Badge tone="neutral">最新</Badge>
  );
}

function LauncherCollapsed() {
  // 当前版本以 Tauri 版本为准,缺失时退回 check.current_version,再不济占位。
  const { data: currentVersion } = useCurrentVersionQuery();
  const { data: check } = useCheckUpdateQuery(CHECK_CHANNEL);
  const current = currentVersion ?? check?.current_version ?? null;

  // 副信息:有新版给"最新 {latest_version}",否则在已查到结果时给"已是最新版本";
  // 检查尚未就绪时副信息占位,不武断断言已是最新。
  let sub = PLACEHOLDER;
  if (check) {
    sub = check.has_update
      ? `最新 ${check.latest_version ?? PLACEHOLDER}`
      : "已是最新版本";
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 5,
      }}
    >
      <div
        className="ls-num"
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--ls-ink)",
          lineHeight: 1.05,
        }}
      >
        {current ?? PLACEHOLDER}
      </div>
      <div
        style={{ fontSize: 11, color: "var(--ls-ink-faint)", lineHeight: 1.3 }}
      >
        {sub}
      </div>
    </div>
  );
}

function LauncherDetail() {
  const { data: currentVersion } = useCurrentVersionQuery();
  const { data: check } = useCheckUpdateQuery(CHECK_CHANNEL);
  const current = currentVersion ?? check?.current_version ?? null;
  const channels = check?.channels ?? [];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Cell label="当前版本" value={current ?? PLACEHOLDER} />
        <Cell label="最新版本" value={check?.latest_version ?? PLACEHOLDER} />
      </div>
      {channels.length > 0 ? <ChannelList channels={channels} /> : null}
      <div
        className="mt-auto text-[10px]"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        前往设置进行更新
      </div>
    </div>
  );
}

/** 更新通道列表:label 为名、description 为摘要;长则按可用高度自适应行数并滚动。 */
function ChannelList({ channels }: { channels: UpdateChannel[] }) {
  const { ref, rows } = useAutoRows(ROW_PITCH, MIN_ROWS);
  const overflow = channels.length > rows;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SectionHead title="通道" hint={`共 ${channels.length}`} />
      <div
        ref={ref}
        className={`min-h-0 flex-1 space-y-1.5 ${overflow ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {channels.map((ch) => (
          <div
            key={ch.name}
            className="rounded-lg px-2.5 py-1.5"
            style={{ background: "var(--ls-bg-2)" }}
          >
            <div
              className="text-[11px] font-semibold"
              style={{ color: "var(--ls-ink)" }}
            >
              {ch.label || ch.name}
            </div>
            {ch.description ? (
              <div
                className="mt-0.5 truncate text-[10px]"
                style={{ color: "var(--ls-ink-faint)" }}
                title={ch.description}
              >
                {ch.description}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

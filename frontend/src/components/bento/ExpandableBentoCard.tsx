import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Icon } from "@iconify/react";

import { springMorph } from "@/design/motion";
import type { BentoTile, ExpandableBentoCardProps } from "./types";
import { useBentoEditMode } from "./editMode";

/**
 * 可展开 bento 卡 —— mailauncher 签名交互的无业务基座(机制层抠自已验证的 SystemCard)。
 *
 * 折叠态:若干暖面瓦片排在固定外框内的网格里,各展折叠摘要。
 * 钻取(招牌):被点瓦片**本体**(同一 motion 元素,不换层)用 `layout` 从格子连续长大到绝对定位
 * 铺满整卡(不透明、高 z,故盖住其余),其余瓦片快速淡出;详情体随后淡入。全程只有这一块在动布局、
 * 不透明地占据画面,故"从哪来到哪去"清楚、不出现两层重影。头部图标/标签用 layoutId 在折叠头与
 * 详情头间 morph。
 *
 * 与 SystemCard 的两点机制修正(因展开铺满整卡):
 * 1) 形变元素恒为 div(不在 button/div 间切换,否则 FLIP 断),展开触发改用折叠态全覆盖按钮,
 *    详情体因此可自由承载交互控件(排序/开关等),不被收起点击包裹。
 * 2) 展开铺满后卡内无"外侧"可点,故关闭走:详情头(可点)+ Esc + 卡外 mousedown(页面级),
 *    不用卡内背板/scrim(会被铺满块全覆盖、不可见)。
 *
 * 铁律:折叠/详情共用同一外框、绝不改尺寸;尺寸由所在网格单元决定(frameClassName 默认填满父级)。
 */

const TILE_RADIUS = 14;

/** 瓦片视觉(暖面 + 发丝边 + 柔影 + 顶高光);折叠/展开同一元素,故同视觉无缝。 */
const TILE_VISUAL: CSSProperties = {
  borderRadius: TILE_RADIUS,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-hairline)",
  boxShadow: "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
  overflow: "hidden",
};

export function ExpandableBentoCard({
  cardId,
  tiles,
  areas,
  columns,
  rows,
  gap = 10,
  pad = 12,
  frameClassName = "relative h-full w-full",
  radius = 16,
  expandedKey,
  onExpandedChange,
}: ExpandableBentoCardProps) {
  const single = tiles.length === 1;

  // 编辑模式:整卡交给 RGL 拖拽,故禁展开(不渲染触发按钮、收起已展开)。
  const editing = useBentoEditMode();

  // 受控 / 非受控双模:传 expandedKey 即受控(跨卡协调),否则内部自管。
  const [internal, setInternal] = useState<string | null>(null);
  const controlled = expandedKey !== undefined;
  const expanded = editing ? null : controlled ? expandedKey : internal;

  const frameRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastExpandedRef = useRef<string | null>(null);

  const setExpanded = useCallback(
    (key: string | null) => {
      if (!controlled) setInternal(key);
      onExpandedChange?.(key);
    },
    [controlled, onExpandedChange],
  );

  const expand = useCallback(
    (key: string) => {
      lastExpandedRef.current = key;
      setExpanded(key);
    },
    [setExpanded],
  );

  const collapse = useCallback(() => setExpanded(null), [setExpanded]);

  // 关闭入口:Esc + 卡外 mousedown(展开铺满整卡,故"外侧"在卡之外的页面)。
  useEffect(() => {
    if (expanded == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    const onDown = (e: MouseEvent) => {
      if (frameRef.current && !frameRef.current.contains(e.target as Node))
        collapse();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [expanded, collapse]);

  // 收回后焦点回到触发瓦片(可达性:键盘用户不丢焦点)。
  useEffect(() => {
    if (expanded === null && lastExpandedRef.current) {
      triggerRefs.current[lastExpandedRef.current]?.focus();
      lastExpandedRef.current = null;
    }
  }, [expanded]);

  return (
    <LayoutGroup>
      <div
        ref={frameRef}
        className={frameClassName}
        style={{ ...TILE_VISUAL, borderRadius: radius }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: single ? 0 : pad,
            display: "grid",
            gap: single ? 0 : gap,
            gridTemplateColumns: columns ?? `repeat(${tiles.length}, 1fr)`,
            gridTemplateRows: rows,
            gridTemplateAreas: areas,
          }}
        >
          {tiles.map((t) => {
            const isExp = expanded === t.key;
            const dim = expanded !== null && !isExp;
            const tilePad = t.pad ?? (single ? 16 : 12);
            return (
              <motion.div
                key={t.key}
                layout
                transition={{
                  layout: springMorph,
                  opacity: { duration: 0.12 },
                }}
                animate={{ opacity: dim ? 0 : 1 }}
                whileHover={
                  editing || isExp || expanded !== null ? undefined : { y: -2 }
                }
                aria-hidden={dim || undefined}
                style={{
                  // 单瓦片卡:瓦片透明、由外框充当唯一暖面,避免卡中套卡的双层发丝边。
                  ...(single
                    ? { borderRadius: radius, overflow: "hidden" }
                    : TILE_VISUAL),
                  ...(isExp
                    ? {
                        position: "absolute",
                        inset: 0,
                        zIndex: 10,
                        padding: single ? 16 : 14,
                      }
                    : {
                        gridArea: single ? undefined : t.area,
                        position: "relative",
                        padding: tilePad,
                      }),
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  pointerEvents: dim ? "none" : "auto",
                }}
              >
                {isExp ? (
                  <DetailBody tile={t} cardId={cardId} onCollapse={collapse} />
                ) : (
                  <>
                    <CollapsedBody tile={t} cardId={cardId} />
                    {/* 全覆盖展开触发:必须透明——绝不挂 ls-item(其 :hover 会铺 --ls-bg-2 暗底盖住内容)。
                        悬停反馈由外层 motion.div 的 whileHover y:-2 给出,与 SystemCard 一致。
                        编辑态不渲染此按钮:让 mousedown 直达 RGL 网格项,实现整卡拖拽、不误触发展开。 */}
                    {!editing && (
                      <button
                        ref={(el) => {
                          triggerRefs.current[t.key] = el;
                        }}
                        type="button"
                        onClick={() => expand(t.key)}
                        aria-label={`展开 ${t.label}`}
                        aria-expanded={false}
                        tabIndex={dim ? -1 : 0}
                        className="absolute inset-0"
                        style={{ zIndex: 2, borderRadius: TILE_RADIUS }}
                      />
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}

/** 折叠态:头部(图标 + 标签 + 可选读数)+ 主体(延迟淡入,等容器走到大半)。 */
function CollapsedBody({ tile, cardId }: { tile: BentoTile; cardId: string }) {
  return (
    <>
      <TileHead
        cardId={cardId}
        tileKey={tile.key}
        icon={tile.icon}
        label={tile.label}
        trailing={tile.trailing}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.06 }}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        {tile.collapsed}
      </motion.div>
    </>
  );
}

/** 展开态:可点的详情头(图标 + 标签 morph + 收起角标)+ 详情主体(可含交互控件)。 */
function DetailBody({
  tile,
  cardId,
  onCollapse,
}: {
  tile: BentoTile;
  cardId: string;
  onCollapse: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, delay: 0.06 }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <button
        type="button"
        onClick={onCollapse}
        aria-label={`收起 ${tile.label}`}
        aria-expanded
        className="ls-item flex items-center gap-[7px]"
        style={{ borderRadius: 8, margin: -2, padding: 2 }}
      >
        <HeadIdentity
          cardId={cardId}
          tileKey={tile.key}
          icon={tile.icon}
          label={tile.label}
        />
        <Icon
          icon="ph:caret-up-thin"
          width={14}
          height={14}
          className="ml-auto"
          style={{ color: "var(--ls-ink-faint)" }}
        />
      </button>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">{tile.detail}</div>
    </motion.div>
  );
}

/** 头部身份(图标托盘 + 标签):折叠头与详情头共用同一 layoutId,morph 时从瓦片原位滑到详情头,不闪。 */
function HeadIdentity({
  cardId,
  tileKey,
  icon,
  label,
}: {
  cardId: string;
  tileKey: string;
  icon: string;
  label: string;
}) {
  return (
    <>
      <motion.span
        layoutId={`head-icon-${cardId}-${tileKey}`}
        transition={springMorph}
        style={{
          display: "grid",
          placeItems: "center",
          width: 20,
          height: 20,
          borderRadius: 7,
          background: "var(--ls-life-soft)",
          color: "var(--ls-life)",
          flexShrink: 0,
        }}
      >
        <Icon icon={icon} width={13} height={13} />
      </motion.span>
      <motion.span
        layoutId={`head-label-${cardId}-${tileKey}`}
        transition={springMorph}
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: "var(--ls-ink-soft)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </motion.span>
    </>
  );
}

/** 折叠瓦片头:头部身份(可 morph)+ 可选右侧读数。 */
function TileHead({
  cardId,
  tileKey,
  icon,
  label,
  trailing,
}: {
  cardId: string;
  tileKey: string;
  icon: string;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <HeadIdentity
        cardId={cardId}
        tileKey={tileKey}
        icon={icon}
        label={label}
      />
      {trailing != null && (
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>{trailing}</span>
      )}
    </div>
  );
}

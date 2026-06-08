import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@iconify/react";

/**
 * 首页一页化(peek)视觉裁剪壳 —— 默认只露首屏一行高,余下隐藏,底部渐隐遮罩 + 箭头条展开。
 *
 * 与 RGL/编辑态解耦:RGL 仍渲染全部网格项(布局完整),peek 只在外层包裹一层 maxHeight 裁剪 +
 * 遮罩;展开即放开高度上限,页面恢复正常滚动。故招牌展开/拖拽/多卡独立展开/尺寸切换均不受影响。
 *
 * 一屏高按"本壳顶边到视口底的可用高度"动态测量(getBoundingClientRect().top),自适应页头/留白高度,
 * 不写死。仅当真实内容高度超过该上限时才裁剪并显示箭头条;不足一屏则等同未裁剪、无箭头。
 *
 * 展开触发:箭头条点击 + 精简态下首个向下滚轮。裁剪态下内容被 overflow:hidden 截断,首页本身无可
 * 滚动余量,故拦截首个向下 wheel 触发展开不与正常滚动打架;展开后立即停止拦截,滚动回归正常。
 */

/** 壳底到视口底保留的余量(px):露出箭头条且不贴边。 */
const BOTTOM_GAP = 16;
/** 触发展开的向下滚轮阈值(px):滤掉触控板微抖与误触。 */
const WHEEL_THRESHOLD = 8;

interface HomePeekProps {
  children: ReactNode;
  /** 已展开:放开高度上限、隐藏遮罩与箭头(由父层持有,便于编辑态联动)。 */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** 禁用裁剪(如编辑态):恒展示全部、不裁剪、不显示箭头,让拖拽/排布看到全部卡。 */
  disabled: boolean;
}

export function HomePeek({
  children,
  expanded,
  onExpandedChange,
  disabled,
}: HomePeekProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 一屏可用高度(壳顶到视口底);0 表示尚未测量。
  const [capHeight, setCapHeight] = useState(0);
  // 真实内容高度;用于判断是否超过一屏(超过才裁剪/显示箭头)。
  const [contentHeight, setContentHeight] = useState(0);

  // 向上找最近的可滚动祖先(首页处于 MainLayout 的 overflow-auto main 内)。
  const scrollParent = useCallback((): HTMLElement | null => {
    let node = wrapRef.current?.parentElement ?? null;
    while (node) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === "auto" || oy === "scroll") return node;
      node = node.parentElement;
    }
    return null;
  }, []);

  // 测量一屏可用高度:壳顶边到视口底减余量。窗口尺寸或壳位置变化时重测。
  // 收起态页面停在顶部(无滚动余量),展开态此值不参与裁剪,故测量始终基于 scrollTop=0 的稳定基线。
  const measureCap = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    setCapHeight(Math.max(0, window.innerHeight - top - BOTTOM_GAP));
  }, []);

  useLayoutEffect(() => {
    measureCap();
    window.addEventListener("resize", measureCap);
    return () => window.removeEventListener("resize", measureCap);
  }, [measureCap]);

  // 监测内容高度变化(卡片增删/尺寸切换/RGL 重排会改变总高),据此判断是否超过一屏。
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setContentHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 仅当内容超过一屏(留 1px 容差防抖)时才需要裁剪;不足一屏则无需 peek。
  const overflowing = capHeight > 0 && contentHeight > capHeight + 1;
  // 实际裁剪态:需裁剪、未展开、未禁用三者同时成立。
  const clipped = overflowing && !expanded && !disabled;

  // 高度上限:禁用态(编辑)或内容未测量则不限;裁剪态收到一屏高,展开态放到完整内容高。
  // 收/展两态均给具体数值,故 CSS transition 能在两者间补间动画(到 auto 无法过渡)。
  const maxHeight =
    disabled || contentHeight === 0
      ? undefined
      : clipped
        ? capHeight
        : contentHeight;
  // overflow:裁剪/过渡期需 hidden 才能裁出遮罩;禁用态(编辑)放开,避免裁掉工具条/拖拽残影。
  const overflow = disabled ? undefined : overflowing ? "hidden" : undefined;

  // 精简态下首个向下滚轮 → 展开。裁剪态首页无滚动余量,拦此手势不与正常滚动冲突;
  // 展开后 clipped 转 false,不再拦截,滚动回归正常。
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!clipped) return;
      if (e.deltaY > WHEEL_THRESHOLD) onExpandedChange(true);
    },
    [clipped, onExpandedChange],
  );

  // 收起:先把滚动容器回到顶部(展开时用户可能已下滚),再收起,使裁剪基线与一屏测量对齐。
  const handleCollapse = useCallback(() => {
    scrollParent()?.scrollTo({ top: 0, behavior: "smooth" });
    onExpandedChange(false);
  }, [scrollParent, onExpandedChange]);

  return (
    <div ref={wrapRef} onWheel={handleWheel}>
      <div className="ls-peek-clip" style={{ maxHeight, overflow }}>
        <div ref={contentRef}>{children}</div>
      </div>

      {clipped && (
        <div className="ls-peek-footer">
          <div className="ls-peek-fade" aria-hidden />
          <button
            type="button"
            className="ls-peek-arrow"
            onClick={() => onExpandedChange(true)}
            aria-label="展开全部组件"
          >
            <Icon icon="ph:caret-down-bold" width={16} height={16} />
            <span>展开全部</span>
          </button>
        </div>
      )}

      {overflowing && expanded && !disabled && (
        <div className="ls-peek-collapse-bar">
          <button
            type="button"
            className="ls-peek-arrow"
            onClick={handleCollapse}
            aria-label="收起组件"
          >
            <Icon icon="ph:caret-up-bold" width={16} height={16} />
            <span>收起</span>
          </button>
        </div>
      )}
    </div>
  );
}

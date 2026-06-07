import type { ReactNode, RefObject } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type ResponsiveLayouts,
} from "react-grid-layout";
import { Icon } from "@iconify/react";

import "react-grid-layout/css/styles.css";
import "./home-grid.css";
import {
  BREAKPOINTS,
  COLS,
  ROW_HEIGHT,
  GRID_MARGIN,
  CONTAINER_PADDING,
} from "./layouts";
import type { CardId } from "./layouts";

export interface HomeCard {
  id: CardId;
  node: ReactNode;
}

interface HomeGridProps {
  cards: HomeCard[];
  layouts: ResponsiveLayouts;
  /** 编辑态:开启拖拽 + 缩放(经卡头手柄/SE 角);关闭则卡片静止,点瓦片即展开。 */
  editing: boolean;
  onLayoutsChange: (layouts: ResponsiveLayouts) => void;
}

/**
 * 首页 bento 网格(壳侧)—— react-grid-layout v2 的 Responsive 自适应网格。
 *
 * 壳/芯分离:RGL 用 transform 定位每个网格项(本组件的直接子 div),招牌容器形变(motion
 * layout/layoutId)只发生在「芯」(卡片内部,更深的节点),两层 transform 物理隔离,互不干扰。
 *
 * 编辑态(用户点"编辑布局"开启):卡头拖拽手柄可拖动、SE 角可缩放,布局变更回传持久化;
 * 非编辑态:dragConfig/resizeConfig 关闭,卡片静止,点瓦片走签名展开,绝不误触发拖拽。
 *
 * 宽度:v2 用 useContainerWidth(ResizeObserver)替代 v1 的 WidthProvider HOC。
 */
export function HomeGrid({
  cards,
  layouts,
  editing,
  onLayoutsChange,
}: HomeGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  return (
    <div
      // useContainerWidth 的 ref 按 React 19 风格标注(current 非空),
      // 本项目 @types/react 为 18,故收窄一次以契合 <div ref>。
      ref={containerRef as RefObject<HTMLDivElement>}
      className={editing ? "ls-grid-editing" : undefined}
    >
      {mounted && (
        <ResponsiveGridLayout
          width={width}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          layouts={layouts}
          rowHeight={ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={CONTAINER_PADDING}
          dragConfig={{
            enabled: editing,
            handle: ".card-drag-handle",
            threshold: 4,
          }}
          resizeConfig={{ enabled: editing, handles: ["se"] }}
          onLayoutChange={(_layout, allLayouts) => onLayoutsChange(allLayouts)}
        >
          {cards.map((c) => (
            <div key={c.id} className="ls-grid-item relative">
              {editing && <DragHandle />}
              <div className="h-full w-full">{c.node}</div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

/** 卡头拖拽手柄(仅编辑态显示);class 须与 dragConfig.handle 选择器一致,故仅它能发起拖拽。 */
function DragHandle() {
  return (
    <div
      className="card-drag-handle absolute right-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-md"
      style={{
        background: "var(--ls-bg-2)",
        border: "1px solid var(--ls-hairline)",
        color: "var(--ls-ink-faint)",
        cursor: "grab",
      }}
      title="拖动卡片"
      aria-label="拖动卡片"
    >
      <Icon icon="ph:dots-six-vertical-bold" width={13} height={13} />
    </div>
  );
}

import { useCallback } from "react";
import type { ReactNode, RefObject } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import { BentoEditModeContext } from "@/components/bento";

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
  /** 编辑态:整卡可拖 + SE 角缩放;关闭则卡片静止、点瓦片即展开。 */
  editing: boolean;
  onLayoutsChange: (layouts: ResponsiveLayouts) => void;
}

/**
 * 首页 bento 网格(壳侧)—— react-grid-layout v2 的 Responsive 自适应网格。
 *
 * 壳/芯分离:RGL 用 transform 定位每个网格项(本组件的直接子 div),招牌容器形变(motion
 * layout/layoutId)只发生在「芯」(卡片内部,更深的节点),两层 transform 物理隔离,互不干扰。
 *
 * 编辑态(点"编辑布局"):整张卡都能拖(无手柄限制),SE 角缩放;经 BentoEditModeContext 通知
 * 卡片基座禁用展开(撤掉全覆盖触发按钮),故 mousedown 直达 RGL、整卡拖拽且不误触发展开;配合
 * .ls-grid-editing 的 user-select:none 杜绝拖动时框选文字。
 * 非编辑态:drag/resize 关闭,卡片静止,点瓦片走签名展开。
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

  // 稳定回调:内联箭头每渲染换 identity 会污染 RGL 内部一串 callback/effect;固定下来。
  const handleLayoutChange = useCallback(
    (_layout: Layout, allLayouts: ResponsiveLayouts) =>
      onLayoutsChange(allLayouts),
    [onLayoutsChange],
  );

  return (
    <BentoEditModeContext.Provider value={editing}>
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
            // 编辑态整卡可拖(不设 handle);非编辑态 enabled:false 卡片静止。
            dragConfig={{ enabled: editing, threshold: 5 }}
            resizeConfig={{ enabled: editing, handles: ["se"] }}
            onLayoutChange={handleLayoutChange}
          >
            {cards.map((c) => (
              <div key={c.id} className="ls-grid-item relative">
                <div className="h-full w-full">{c.node}</div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </BentoEditModeContext.Provider>
  );
}

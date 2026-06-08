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
import { WidgetEditToolbar } from "@/pages/home/widgets/WidgetEditToolbar";
import type { WidgetSize } from "@/pages/home/widgets/types";

export interface HomeCard {
  /** 组件实例 uid;同时作为 React key 与 RGL layout 键(默认 uid=kind)。 */
  uid: string;
  node: ReactNode;
  /** 当前尺寸,供编辑态工具条高亮。 */
  size: WidgetSize;
  /** 该组件支持的尺寸档(注册表声明),供编辑态工具条只列可选档。 */
  sizes: WidgetSize[];
}

interface HomeGridProps {
  cards: HomeCard[];
  layouts: ResponsiveLayouts;
  /** 编辑态:整卡可拖 + 浮出尺寸/删除工具条;关闭则卡片静止、点瓦片即展开。 */
  editing: boolean;
  onLayoutsChange: (layouts: ResponsiveLayouts) => void;
  /** 编辑态切换某组件尺寸(经 S/M/L 工具条)。 */
  onSize: (uid: string, size: WidgetSize) => void;
  /** 编辑态删除某组件。 */
  onRemove: (uid: string) => void;
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
  onSize,
  onRemove,
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
            // 自由 resize 已取消(P2):尺寸只经工具条 S/M/L 切换,故恒关闭缩放手柄。
            resizeConfig={{ enabled: false, handles: ["se"] }}
            onLayoutChange={handleLayoutChange}
          >
            {cards.map((c) => (
              <div key={c.uid} className="ls-grid-item relative">
                {editing && (
                  <WidgetEditToolbar
                    size={c.size}
                    sizes={c.sizes}
                    onSize={(s) => onSize(c.uid, s)}
                    onRemove={() => onRemove(c.uid)}
                  />
                )}
                <div className="h-full w-full">{c.node}</div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </BentoEditModeContext.Provider>
  );
}

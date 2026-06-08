import type { MouseEvent as ReactMouseEvent } from "react";
import { Icon } from "@iconify/react";

import type { WidgetSize } from "@/pages/home/widgets/types";

/**
 * 编辑态每个组件浮出的小工具条 —— 尺寸切换(限注册表支持档)+ 删除。
 *
 * 关键:工具条按钮的 mousedown 必须 stopPropagation,否则会被 RGL 当作"整卡拖拽起手"
 * (编辑态无 drag handle,mousedown 落在卡内任意处即起拖),导致点按钮变成拖动。
 * 工具条只在编辑态由 HomeGrid 覆盖渲染;非编辑态不挂载。
 */

interface WidgetEditToolbarProps {
  /** 当前尺寸。 */
  size: WidgetSize;
  /** 该组件支持的尺寸档(注册表声明,如富卡仅 [m,l]、stat 仅 [s,m])。 */
  sizes: WidgetSize[];
  onSize: (size: WidgetSize) => void;
  onRemove: () => void;
}

const SIZE_LABEL: Record<WidgetSize, string> = { s: "S", m: "M", l: "L" };

/** 拦掉 mousedown,阻止 RGL 把工具条点击误判为整卡拖拽起手。 */
function swallowDown(e: ReactMouseEvent) {
  e.stopPropagation();
}

export function WidgetEditToolbar({
  size,
  sizes,
  onSize,
  onRemove,
}: WidgetEditToolbarProps) {
  return (
    <div
      className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1 rounded-[10px] p-1"
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        boxShadow: "var(--ls-shadow-lift)",
      }}
      onMouseDown={swallowDown}
    >
      {sizes.map((s) => {
        const active = s === size;
        return (
          <button
            key={s}
            type="button"
            onMouseDown={swallowDown}
            onClick={() => onSize(s)}
            aria-label={`尺寸 ${SIZE_LABEL[s]}`}
            aria-pressed={active}
            className="ls-num flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-semibold"
            style={{
              background: active ? "var(--ls-life-soft)" : "transparent",
              color: active ? "var(--ls-life)" : "var(--ls-ink-soft)",
            }}
          >
            {SIZE_LABEL[s]}
          </button>
        );
      })}
      <button
        type="button"
        onMouseDown={swallowDown}
        onClick={onRemove}
        aria-label="删除组件"
        className="ls-item flex h-6 w-6 items-center justify-center rounded-[7px]"
        style={{ color: "var(--ls-danger)" }}
      >
        <Icon icon="ph:x-bold" width={12} height={12} />
      </button>
    </div>
  );
}

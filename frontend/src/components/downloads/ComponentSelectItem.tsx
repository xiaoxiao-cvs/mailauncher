import { Icon } from "@iconify/react";
import { Checkbox } from "@/components/ls";
import { cn } from "@/lib/utils";
import type { DownloadItem } from "@/types/download";

interface ComponentSelectItemProps {
  item: DownloadItem;
  selected: boolean;
  disabled: boolean;
  locked?: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}

export function ComponentSelectItem({
  item,
  selected,
  disabled,
  locked,
  onToggle,
  badge,
}: ComponentSelectItemProps) {
  const interactive = !disabled && !locked && item.status !== "completed";

  return (
    <div
      onClick={() => interactive && onToggle()}
      className={cn(
        "group p-3.5 transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : interactive
            ? "cursor-pointer"
            : "cursor-default",
      )}
      style={{
        borderRadius: "var(--ls-r-card)",
        border: "1px solid",
        borderColor: selected ? "var(--ls-life)" : "transparent",
        background: selected ? "var(--ls-life-soft)" : "transparent",
      }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          disabled={disabled || locked || item.status === "completed"}
          onCheckedChange={() => interactive && onToggle()}
          // 阻止冒泡到外层 div 造成双触发(外层点击已驱动 onToggle)
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3
              className="text-sm font-medium"
              style={{ color: "var(--ls-ink)" }}
            >
              {item.name}
            </h3>
            {item.status === "completed" && (
              <Icon
                icon="ph:check-circle-fill"
                className="w-4 h-4"
                style={{ color: "var(--ls-life)" }}
              />
            )}
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {item.description}
          </p>
          {badge}
        </div>
      </div>
    </div>
  );
}

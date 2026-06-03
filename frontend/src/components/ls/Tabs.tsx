import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";
import { springSettle } from "@/design/motion";

/**
 * 选项卡 Tabs —— 在 SegmentControl(仅切换)之上增加内容区联动。
 * 包 @radix-ui/react-tabs:键盘方向键、roving focus、aria 角色与受控/非受控状态
 * 全部沿用 Radix,本组件只负责换皮(生息面/控件样式)与弹簧动效,不重写交互逻辑。
 *
 * 视觉:TabsList 是凹陷轨(.ls-inset),选中 TabsTrigger 用 layoutId 高面滑块
 * (var(--ls-surface-hi) + soft 影)以 springSettle 跟随;TabsContent 切换淡入。
 *
 * 滑块需要知道"当前选中值"才能渲染在对应 Trigger 上。Radix 的选中态藏在内部 context,
 * 不对外暴露读值,因此本组件用一个并行的轻量 context 把选中值与唯一 layoutId 下发给 Trigger:
 * - 受控(传 value)时直接镜像 value;
 * - 非受控(传 defaultValue)时维护内部镜像,在 onValueChange 时同步并转发调用方回调。
 * Radix 仍是 tab 激活的唯一事实源,此镜像仅供绘制指示滑块,不干预 Radix 自身状态。
 */

interface TabsContextValue {
  /** 当前选中的 tab value(用于判断滑块落在哪个 Trigger 上) */
  selectedValue: string | undefined;
  /** 同页唯一的 layoutId,避免多组 Tabs 的滑块互相抢占 layout 动画 */
  layoutId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    // Trigger 必须在 Tabs 之内使用;脱离上下文属调用方误用,直接报错而非静默降级。
    throw new Error("LS Tabs: TabsTrigger 必须渲染在 <Tabs> 之内");
  }
  return ctx;
}

export interface TabsProps extends RadixTabs.TabsProps {
  children: React.ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, defaultValue, onValueChange, children, ...props }, ref) => {
    const layoutId = React.useId();
    // 非受控镜像:仅当未传 value 时生效,初值取 defaultValue。
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const isControlled = value !== undefined;
    const selectedValue = isControlled ? value : internalValue;

    const handleValueChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    const ctx = React.useMemo<TabsContextValue>(
      () => ({ selectedValue, layoutId }),
      [selectedValue, layoutId],
    );

    return (
      <TabsContext.Provider value={ctx}>
        <RadixTabs.Root
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          {...props}
        >
          {children}
        </RadixTabs.Root>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

export type TabsListProps = RadixTabs.TabsListProps;

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, style, ...props }, ref) => (
    <RadixTabs.List
      ref={ref}
      className={cn("ls-inset inline-flex p-0.5 text-sm", className)}
      style={{ borderRadius: "var(--ls-r-control)", ...style }}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

export type TabsTriggerProps = RadixTabs.TabsTriggerProps;

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ value, className, style, children, ...props }, ref) => {
  const { selectedValue, layoutId } = useTabsContext();
  const isActive = selectedValue === value;
  return (
    <RadixTabs.Trigger
      ref={ref}
      value={value}
      className={cn(
        "ls-num relative px-3 py-1.5 font-medium outline-none",
        className,
      )}
      style={{
        // 选中态用主墨、非选中用次墨;颜色全走 token,明暗自适配。
        color: isActive ? "var(--ls-ink)" : "var(--ls-ink-soft)",
        ...style,
      }}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0"
          style={{
            background: "var(--ls-surface-hi)",
            borderRadius: 9,
            boxShadow: "var(--ls-shadow-soft)",
          }}
          transition={springSettle}
        />
      )}
      <span className="relative">{children}</span>
    </RadixTabs.Trigger>
  );
});
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends RadixTabs.TabsContentProps {
  /** 内层淡入包裹的 motion 属性透传(如需自定义入场幅度);颜色仍禁止裸值。 */
  motionProps?: HTMLMotionProps<"div">;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ children, motionProps, ...props }, ref) => (
    <RadixTabs.Content ref={ref} {...props}>
      {/* Radix 负责挂载/卸载与 aria;内层只做一次性淡入上移,切换时安静地"到位"。
          不用 AnimatePresence-exit:各 TabsContent 由 Radix 独立卸载,退场协调成本高且违背安静优先。 */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSettle}
        {...motionProps}
      >
        {children}
      </motion.div>
    </RadixTabs.Content>
  ),
);
TabsContent.displayName = "TabsContent";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { springSettle } from "@/design/motion";

/**
 * 开关 Switch —— Radix Switch 换皮为生息哑光观感,交互/可访问性逻辑全部沿用 Radix。
 * 轨道:off=次级底 var(--ls-bg-2)+发丝边;on(data-state=checked)=生命色 var(--ls-life)。
 * 拇指 Thumb=最高面 var(--ls-surface-hi)+柔扩散影,位移用 springSettle"落定"手感
 * (用 motion 的 x 弹簧驱动,而非 Radix 默认的 CSS transition)。
 *
 * 之所以镜像一份内部 isOn:Radix 把状态写在 data-state 上,但 motion 的 animate 需要 JS 值。
 * isOn 只服务于拇指动画与轨道色,真正的受控/非受控切换仍由 Radix Root 负责,
 * 键盘(Space/Enter)、焦点、aria-checked、表单提交等可访问性行为零改动。
 */
export type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitive.Root
>;

// 轨道与拇指尺寸(px):拇指直径 18,轨道左右内边距 3,行程 = 轨道宽 - 拇指 - 2*内边距。
const TRACK_W = 44;
const TRACK_H = 24;
const THUMB = 18;
const PAD = 3;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(
  (
    { className, style, checked, defaultChecked, onCheckedChange, ...props },
    ref,
  ) => {
    // 非受控初值取 defaultChecked;受控时下方 effect 会持续对齐外部 checked。
    const [isOn, setIsOn] = React.useState(checked ?? defaultChecked ?? false);

    // 受控模式:外部 checked 变化时同步动画状态(非受控时 checked 为 undefined,不覆盖内部值)。
    React.useEffect(() => {
      if (checked !== undefined) setIsOn(checked);
    }, [checked]);

    return (
      <SwitchPrimitive.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(next) => {
          setIsOn(next);
          onCheckedChange?.(next);
        }}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-50",
          // 焦点可见性:键盘聚焦时套一圈生命色低浓度光环(沿用 Radix 的 focus-visible)。
          "focus-visible:shadow-[0_0_0_3px_var(--ls-life-soft)]",
          className,
        )}
        style={{
          width: TRACK_W,
          height: TRACK_H,
          padding: PAD,
          background: isOn ? "var(--ls-life)" : "var(--ls-bg-2)",
          border: "1px solid var(--ls-hairline)",
          // 轨道色随开关弹簧落定,与拇指位移同步过渡,避免硬切。
          transition: "background-color 0.26s cubic-bezier(.16,1,.3,1)",
          ...style,
        }}
        {...props}
      >
        <SwitchPrimitive.Thumb asChild>
          <motion.span
            className="block rounded-full"
            style={{
              width: THUMB,
              height: THUMB,
              background: "var(--ls-surface-hi)",
              boxShadow: "var(--ls-shadow-soft)",
            }}
            animate={{ x: isOn ? TRAVEL : 0 }}
            transition={springSettle}
          />
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
    );
  },
);
Switch.displayName = "Switch";

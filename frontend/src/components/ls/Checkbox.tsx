import * as React from "react";
import * as RxCheckbox from "@radix-ui/react-checkbox";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { springTap } from "@/design/motion";

/**
 * Checkbox —— Living Surfaces 复选框(基于 @radix-ui/react-checkbox)。
 *
 * 视觉:未选=凹陷方块(--ls-bg-2 底 + 发丝边 + 小圆角,无投影,呼应 .ls-inset);
 * 选中=生命色实底 var(--ls-life),Indicator 里嵌 lucide Check(size 12,白色)。
 * 切换时方块底色/边色用 springTap 跟手过渡,勾本身随 Radix Indicator 挂载时 springTap 勾入。
 *
 * 之所以镜像一份内部 isChecked:Radix 把选中态写在 data-state 上,但 motion 的 animate
 * 需要 JS 值才能驱动弹簧;受控(checked)时由 effect 同步,非受控时由 onCheckedChange 推进。
 *
 * 换皮原则:仅接管"外观 + 弹簧动效";键盘(Space 切换)、焦点、name/value 表单提交、
 * disabled、indeterminate 等交互与可访问性逻辑全部沿用 Radix。
 * forwardRef 透传到底层 button,className 与全部 Radix Checkbox 属性原样透传。
 */
export type CheckboxProps = RxCheckbox.CheckboxProps;

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    { className, style, checked, defaultChecked, onCheckedChange, ...props },
    ref,
  ) => {
    // indeterminate 不点亮生命色实底(仅 true 才算"选中"视觉);'indeterminate' 与 false 同归未选底。
    const initial = (checked ?? defaultChecked) === true;
    const [isChecked, setIsChecked] = React.useState(initial);

    // 受控用法:外部 checked 变化时同步内部镜像,供 motion 弹簧驱动。
    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked === true);
    }, [checked]);

    return (
      <RxCheckbox.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(next) => {
          // 非受控时本地推进镜像;受控时以上方 effect 为准,这里仍回传给外部。
          if (checked === undefined) setIsChecked(next === true);
          onCheckedChange?.(next);
        }}
        {...props}
        className={cn(
          "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        // 方块底色/边色按选中态弹簧过渡(borderWidth/Style 静态声明,仅 animate 颜色)
        // borderRadius 用 6px 字面量:控件级 12px 对 18px 方块过圆,这里取更紧的小圆角。
        asChild
      >
        <motion.button
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 6,
            ...style,
          }}
          animate={{
            background: isChecked ? "var(--ls-life)" : "var(--ls-bg-2)",
            borderColor: isChecked ? "var(--ls-life)" : "var(--ls-hairline)",
          }}
          transition={springTap}
        >
          <RxCheckbox.Indicator forceMount asChild>
            {/* forceMount 让勾常驻 DOM,由 isChecked 驱动其 scale/opacity 弹簧勾入/缩出,
                而非 Radix 默认的瞬时挂载;视觉"选中"以镜像态为准。 */}
            <motion.span
              className="inline-flex items-center justify-center"
              initial={false}
              animate={{
                scale: isChecked ? 1 : 0.4,
                opacity: isChecked ? 1 : 0,
              }}
              transition={springTap}
            >
              <Check size={12} strokeWidth={3} style={{ color: "#fff" }} />
            </motion.span>
          </RxCheckbox.Indicator>
        </motion.button>
      </RxCheckbox.Root>
    );
  },
);
Checkbox.displayName = "Checkbox";

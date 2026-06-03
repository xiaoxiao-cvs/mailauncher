import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { springPop } from "@/design/motion";

/**
 * Modal —— Living Surfaces 统一弹窗底座(基于 @radix-ui/react-dialog)。
 *
 * 设计意图:替代项目中 6+ 个手搓 modal,提供一致的 LS 实色面板 + 半透明纯暗遮罩 +
 * 弹簧进出场,API 贴近 Radix 以便迁移。
 *
 * 可访问性与交互(Esc 关闭、焦点陷阱、锁滚动、点遮罩关闭)全部沿用 Radix Dialog,
 * 本组件只负责"换皮 + 弹簧动效":
 *  - 遮罩 ModalOverlay:半透明纯暗(rgba(0,0,0,.45)),严禁 backdrop-blur 毛玻璃。
 *  - 内容 ModalContent:ls-panel 实色面(--ls-surface + --ls-hairline 发丝边 +
 *    --ls-shadow-lift 浮起影 + inset 顶高光 + --ls-r-panel 圆角)。
 *  - 进出场:用 Radix 的 forceMount 把 Overlay/Content 常驻 DOM,交给 AnimatePresence
 *    受控驱动;遮罩 opacity fade,内容面 scale/位移 springPop 升起、反向退场。
 *
 * 底层可组合件(ModalOverlay / ModalContent)一并导出,供需要细粒度控制的复杂场景拼装;
 * 而 Root / Trigger / Close / Title / Description 直接复用 Radix 原件(从本文件透出别名)。
 */

/** Radix Dialog 原件别名透出,供高级组合场景直接使用。 */
export const ModalRoot = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;
export const ModalPortal = Dialog.Portal;
export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;

/* ---- 进出场动效参数(集中定义,Overlay 与 Content 共享退场时机感) ---- */
const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  // 遮罩是"淡入/淡出"而非物体运动,用短缓动而非弹簧,避免遮罩抖动
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

const contentMotion = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: springPop,
};

/**
 * ModalOverlay —— 半透明纯暗遮罩(forceMount + motion 驱动 fade)。
 * 严禁 backdrop-blur;层级感由内容面的实色 + 阴影表达,而非模糊遮罩。
 */
export const ModalOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, style, ...props }, ref) => (
  <Dialog.Overlay ref={ref} asChild forceMount {...props}>
    <motion.div
      {...overlayMotion}
      className={cn("fixed inset-0 z-50", className)}
      style={{ background: "rgba(0, 0, 0, 0.45)", ...style }}
    />
  </Dialog.Overlay>
));
ModalOverlay.displayName = "ModalOverlay";

export interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof Dialog.Content> {
  children: React.ReactNode;
}

/**
 * ModalContent —— 居中的 ls-panel 实色对话面(forceMount + motion 驱动 springPop 升起)。
 * 仅做视觉与动效;焦点陷阱 / Esc / aria 等沿用 Radix Content。
 */
export const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, style, children, ...props }, ref) => (
    <Dialog.Content ref={ref} asChild forceMount {...props}>
      <motion.div
        {...contentMotion}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6",
          className,
        )}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-hairline)",
          borderRadius: "var(--ls-r-panel)",
          boxShadow: "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)",
          ...style,
        }}
      >
        {children}
      </motion.div>
    </Dialog.Content>
  ),
);
ModalContent.displayName = "ModalContent";

export interface ModalProps {
  /** 受控开关 */
  open: boolean;
  /** 开关变更回调(Esc / 点遮罩 / 关闭按钮均经此回传) */
  onOpenChange: (open: boolean) => void;
  /** 标题(省略则不渲染标题行,但仍提供隐藏 Title 以满足 Radix 可访问性) */
  title?: React.ReactNode;
  /** 描述文案(标题下方次要说明) */
  description?: React.ReactNode;
  /** 底部操作区(通常放 TactileButton 组) */
  footer?: React.ReactNode;
  /** 对话面主体内容 */
  children?: React.ReactNode;
  /** 透传到内容面的额外类名(如自定义 max-width) */
  className?: string;
}

/**
 * Modal —— 高层一体化弹窗:内部组合 Root/Portal/Overlay/Content/Title/Description/Close。
 * 标题、描述、底部操作区、关闭按钮均按 LS 规范排版,常规场景直接用它即可。
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {/* AnimatePresence 必须包住 forceMount 的 Portal,才能在 open 变 false 时驱动退场 */}
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount>
          <ModalOverlay />
          <ModalContent className={className}>
            <Dialog.Close
              aria-label="关闭"
              className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full"
            >
              <X size={16} style={{ color: "var(--ls-ink-soft)" }} />
            </Dialog.Close>

            {/*
              Radix 要求每个 Dialog 都关联 Title 以供屏幕阅读器朗读。
              有 title 时正常渲染;无 title 时仍输出一个视觉隐藏的 Title 占位,
              避免抛出 "DialogContent requires a DialogTitle" 警告。
            */}
            {title ? (
              <Dialog.Title
                className="pr-8 text-base font-semibold"
                style={{ color: "var(--ls-ink)" }}
              >
                {title}
              </Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">对话框</Dialog.Title>
            )}

            {description ? (
              <Dialog.Description
                className="mt-1 text-sm"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {description}
              </Dialog.Description>
            ) : null}

            {children ? (
              <div className={cn(title || description ? "mt-4" : undefined)}>
                {children}
              </div>
            ) : null}

            {footer ? (
              <div className="mt-6 flex items-center justify-end gap-2">
                {footer}
              </div>
            ) : null}
          </ModalContent>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  </Dialog.Root>
);
Modal.displayName = "Modal";

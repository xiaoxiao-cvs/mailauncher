/**
 * Living Surfaces (生息) 组件库 —— 从 design study 定稿小样提升的正式可复用组件。
 * 视觉 token 见 @/design/tokens.css,动效 token 见 @/design/motion.ts。
 */
export { Surface } from "./Surface";
export type { SurfaceProps, SurfaceVariant } from "./Surface";

export { TactileButton } from "./TactileButton";
export type { TactileButtonProps, TactileButtonVariant } from "./TactileButton";

export { IconMenu } from "./IconMenu";
export type { IconMenuProps, IconMenuItem } from "./IconMenu";

export { StatusDot } from "./StatusDot";
export type { StatusDotProps } from "./StatusDot";

export { Readout } from "./Readout";
export type { ReadoutProps } from "./Readout";

export { Card } from "./Card";
export type { CardProps } from "./Card";

export { Stat } from "./Stat";
export type { StatProps } from "./Stat";

export { Ring } from "./Ring";
export type { RingProps } from "./Ring";

export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";

export { MirrorGraph } from "./MirrorGraph";
export type { MirrorGraphProps } from "./MirrorGraph";

export { Meter } from "./Meter";
export type { MeterProps } from "./Meter";

export { SegmentControl } from "./SegmentControl";
export type { SegmentControlProps } from "./SegmentControl";

// —— Phase 2 基础原语(表单 / 弹层 / 按钮 / 徽标)——

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export {
  Modal,
  ModalRoot,
  ModalTrigger,
  ModalClose,
  ModalPortal,
  ModalTitle,
  ModalDescription,
  ModalOverlay,
  ModalContent,
} from "./Modal";
export type { ModalProps, ModalContentProps } from "./Modal";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Label } from "./Label";
export type { LabelProps } from "./Label";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export {
  Select,
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./Select";
export type {
  SelectProps,
  SelectOption,
  SelectTriggerProps,
  SelectContentProps,
  SelectItemProps,
} from "./Select";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from "./Tabs";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./DropdownMenu";
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuLabelProps,
} from "./DropdownMenu";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";

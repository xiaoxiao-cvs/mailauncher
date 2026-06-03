import type { Transition } from "motion/react";

/* ============================================================
   Living Surfaces (生息) 动效 token —— mailauncher 设计语言(锁定 2026-06-03)
   采用 HyperOS / iOS 同款"感知时长 + 弹跳量"两参弹簧模型。
   依据:小米 HyperCore 用可变弹簧(冲量动量)做"快抛快收、极轻过冲";官方不公开精确常量,
   按该手感重建——感知时长 0.22~0.35s、bounce 偏低。
   (Motion 的 duration/bounce 即此模型:stiffness=(2π/duration)^2,damping=((1-bounce)*4π)/duration,mass=1)
   ============================================================ */
export const springMorph: Transition = {
  type: "spring",
  duration: 0.35,
  bounce: 0.14,
}; // 图标 <-> 菜单形变(招牌)
export const springTap: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0,
}; // 按压回弹:脆、不晃
export const springSettle: Transition = {
  type: "spring",
  duration: 0.26,
  bounce: 0.1,
}; // 列表/菜单项落定
export const springPop: Transition = {
  type: "spring",
  duration: 0.32,
  bounce: 0.2,
}; // 小元素归位的轻微回弹(如 ··· 复位)
export const springSoft: Transition = {
  type: "spring",
  duration: 0.34,
  bounce: 0.12,
}; // 较重的浮起/位移

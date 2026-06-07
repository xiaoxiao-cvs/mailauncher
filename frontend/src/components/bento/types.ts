import type { ReactNode } from "react";

/**
 * 一块瓦片的声明。折叠态展示 collapsed 摘要,点击容器形变铺满整卡后展示 detail。
 * 头部(图标托盘 + 标签)由基座统一渲染并用 layoutId 在折叠头/详情头间 morph,
 * 故 collapsed / detail 只需给"头部以下"的主体内容。
 */
export interface BentoTile {
  /** 稳定唯一键;参与 layoutId 命名空间与展开态判定。 */
  key: string;
  /** Iconify 图标名(沿用 ph:*-thin 契约)。 */
  icon: string;
  /** 折叠头与详情头共用的标签,morph 不闪。 */
  label: string;
  /** gridTemplateAreas 区域名;多瓦片必填,单瓦片可省。 */
  area?: string;
  /** 折叠态内边距 px,默认 12(单瓦片卡默认 16)。 */
  pad?: number;
  /** 折叠头右侧读数(如 CPU 主频、网络上下行)。 */
  trailing?: ReactNode;
  /** 折叠态主体(头部以下)。 */
  collapsed: ReactNode;
  /** 展开态主体(头部以下);可含交互控件(详情体不被收起点击包裹)。 */
  detail: ReactNode;
}

export interface ExpandableBentoCardProps {
  /** layoutId 前缀,防多卡同名 layoutId 串台(招牌交互的安全锁)。 */
  cardId: string;
  /** 瓦片声明;长度为 1 时整卡即一块瓦片(摘要 -> 详情的原位钻取)。 */
  tiles: BentoTile[];
  /** gridTemplateAreas;多瓦片必填。 */
  areas?: string;
  /** 列轨道;默认 repeat(瓦片数, 1fr)。 */
  columns?: string;
  /** 行轨道;不传则隐式等高。 */
  rows?: string;
  /** 瓦片间距 px,默认 10。 */
  gap?: number;
  /** 网格外边距 px,默认 12。 */
  pad?: number;
  /** 外框尺寸类;默认填满父级(尺寸由网格单元决定)。 */
  frameClassName?: string;
  /** 外框圆角 px,默认 16(--ls-r-card)。 */
  radius?: number;
  /** 受控展开键(跨卡协调用);不传则内部自管。 */
  expandedKey?: string | null;
  /** 配合受控:展开键变化回调。 */
  onExpandedChange?: (key: string | null) => void;
}

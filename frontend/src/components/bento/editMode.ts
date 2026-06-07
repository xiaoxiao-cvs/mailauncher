import { createContext, useContext } from "react";

/**
 * 编辑模式上下文 —— HomeGrid 提供、ExpandableBentoCard 消费。
 * 编辑态(true):禁用瓦片展开(不渲染全覆盖触发按钮、收起已展开),让 mousedown 直达 RGL 整卡拖拽;
 * 普通态(false):点瓦片正常展开,卡片静止不拖。
 */
export const BentoEditModeContext = createContext(false);

export const useBentoEditMode = () => useContext(BentoEditModeContext);

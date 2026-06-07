import { useEffect, useRef, useState } from "react";

/**
 * 按容器可用高度自适应行数:量出容器高 / 行距,矮则少、高则多,正好铺满不留空也不溢出。
 * 抽自 SystemCard 进程表的自适应逻辑,供所有"详情内长列表"复用(展开态卡高随网格单元变化)。
 *
 * @param rowPitch 单行行距 px(行高 + 行间距)
 * @param minRows  容器极矮时的下限行数
 * @param initial  首帧测量前的初始行数
 */
export function useAutoRows(rowPitch: number, minRows: number, initial = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setRows(Math.max(minRows, Math.floor(el.clientHeight / rowPitch)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowPitch, minRows]);

  return { ref, rows };
}

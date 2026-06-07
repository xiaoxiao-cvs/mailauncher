interface MaiMarkProps {
  size?: number;
  /** 描边色,默认生命色 */
  color?: string;
  /** 描边粗细(viewBox 24 坐标系下) */
  strokeWidth?: number;
  className?: string;
}

/**
 * 麦芽标记 —— 取自 MaiBot「麦麦」Q 版头顶的那株嫩芽。
 * 描边线条风(与侧栏 ph:*-thin 细线图标同语言),非实心:一茎、两片带叶脉的叶、
 * 中心一支小芽,左右严格对称。既是品牌(麦麦)可辨识片段,又是「生息」的生命/萌发意象。
 * 曲线为手画初版,待按截图微调(叶片肥瘦 / 张开角度 / 叶脉走向 / 中心芽长短)。
 */
export function MaiMark({
  size = 24,
  color = "var(--ls-life)",
  strokeWidth = 1.5,
  className,
}: MaiMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* 茎 */}
      <path d="M12 22 L12 12.5" />
      {/* 左叶 + 叶脉 */}
      <path d="M12 13 Q 6.5 7 4.5 5 Q 8.5 11.5 12 13 Z" />
      <path d="M11.6 12.6 Q 8 9.5 5.2 6" />
      {/* 右叶 + 叶脉 */}
      <path d="M12 13 Q 17.5 7 19.5 5 Q 15.5 11.5 12 13 Z" />
      <path d="M12.4 12.6 Q 16 9.5 18.8 6" />
      {/* 中心小芽 */}
      <path d="M12 12.5 Q 10.8 9 12 6.5 Q 13.2 9 12 12.5 Z" />
    </svg>
  );
}

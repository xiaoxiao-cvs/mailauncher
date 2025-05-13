/**
 * 格式化字节大小为可读字符串
 * @param {number} bytes 字节数
 * @param {number} decimals 小数点位数
 * @returns {string} 格式化后的字符串
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * 格式化CPU频率
 * @param {number} frequency CPU频率
 * @returns {string} 格式化后的频率字符串
 */
export const formatCpuFrequency = (frequency) => {
  if (!frequency || isNaN(frequency) || frequency === 0) {
    return "未知";
  }
  // 如果frequency已经小于1000，则假设单位为GHz
  if (frequency < 1000) {
    return `${frequency.toFixed(2)} GHz`;
  }
  // 否则假设单位为MHz，转换为GHz
  return `${(frequency / 1000).toFixed(2)} GHz`;
};

/**
 * 格式化时间为标准时间字符串
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (date) => {
  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * 格式化日期为完整日期时间
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (date) => {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * 格式化日期为文件名安全的格式
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的字符串，适合用于文件命名
 */
export const formatDateForFile = (date) => {
  return date.toISOString().slice(0, 19).replace(/[T:]/g, "-");
};

/**
 * 颜色亮度调整
 * @param {string} hex 十六进制颜色值
 * @param {number} percent 调整百分比，正数变亮，负数变暗
 * @returns {string} 调整后的颜色值
 */
export const adjustColorBrightness = (hex, percent) => {
  // 确保hex是有效的十六进制颜色
  if (!hex || typeof hex !== "string") {
    return "#000000";
  }

  // 去除#前缀
  hex = hex.replace("#", "");

  // 处理简写形式
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // 解析RGB值
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // 调整亮度
  r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)));
  g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)));
  b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)));

  // 转换回十六进制
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

// 添加RGBA颜色转换函数，更方便处理透明度
export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 返回rgba格式
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 根据主题色生成配套的半透明侧边栏颜色
export const generateSidebarColor = (
  themeColor,
  isDarkMode,
  opacity = 0.65
) => {
  // 从主题色计算出适合作为背景的颜色 - 为浅色模式产生更浅的颜色
  const baseColor = isDarkMode
    ? adjustColorBrightness(themeColor, -40) // 在深色模式下变暗
    : adjustColorBrightness(themeColor, 90); // 在浅色模式下变亮

  return hexToRgba(baseColor, opacity);
};

export function formatDate(date) {
  return date.toLocaleDateString();
}

export function isPortValid(ports) {
  if (!ports || typeof ports !== "object") return false;
  return Object.values(ports).every(
    (port) =>
      typeof port === "string" &&
      /^\d+$/.test(port) &&
      parseInt(port) >= 1024 &&
      parseInt(port) <= 65535
  );
}

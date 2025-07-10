/**
 * 版本配置文件
 * 安全地获取和管理应用版本信息
 */

// 动态导入package.json，处理构建时的兼容性
let PACKAGE_VERSION = '0.1.0'; // 默认版本

// 尝试获取package.json版本
try {
  // 使用构建时注入的版本信息
  if (typeof __PACKAGE_VERSION__ !== 'undefined') {
    PACKAGE_VERSION = __PACKAGE_VERSION__;
  } else if (typeof window !== 'undefined' && window.__PACKAGE_VERSION__) {
    // 如果在window对象中有版本信息
    PACKAGE_VERSION = window.__PACKAGE_VERSION__;
  } else {
    // 开发环境或其他情况，使用默认版本
    PACKAGE_VERSION = '0.1.0';
  }
  
  console.log('🔖 获取到版本信息:', PACKAGE_VERSION);
} catch (error) {
  console.warn('⚠️  无法获取版本信息，使用默认版本:', error);
  PACKAGE_VERSION = '0.1.0';
}

/**
 * 版本配置对象
 */
export const versionConfig = {
  // 基础版本（从package.json获取）
  baseVersion: PACKAGE_VERSION,
  
  // 版本类型映射
  versionTypes: {
    development: 'dev',
    preview: 'preview', 
    production: 'stable'
  },
  
  // 构建时的版本后缀
  buildSuffixes: {
    dev: '-dev',
    preview: '-preview',
    beta: '-beta',
    alpha: '-alpha',
    rc: '-rc'
  },
  
  // 版本号中安全的字符
  safeCharacters: /[^a-z0-9.-]/g,
  
  // 预发布版本的正则表达式
  preReleasePattern: /-(preview|beta|alpha|rc|dev)\.?(\d+)?/i
};

/**
 * 获取运行时版本信息
 * @returns {string} 当前应用版本
 */
export function getRuntimeVersion() {
  return versionConfig.baseVersion;
}

/**
 * 设置版本信息（用于构建时注入）
 * @param {string} version 版本号
 */
export function setRuntimeVersion(version) {
  if (version && typeof version === 'string') {
    versionConfig.baseVersion = version;
  }
}

/**
 * 检查是否为预发布版本
 * @param {string} version 版本号
 * @returns {boolean} 是否为预发布版本
 */
export function isPreReleaseVersion(version) {
  return versionConfig.preReleasePattern.test(version || '');
}

/**
 * 获取版本的安全字符串
 * @param {string} version 版本号
 * @returns {string} 安全的版本字符串
 */
export function getSafeVersionName(version) {
  if (!version) return 'unknown';
  
  return version
    .toLowerCase()
    .replace(versionConfig.safeCharacters, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default versionConfig;

/**
 * 版本工具类
 * 用于版本号处理和比较
 */

// 动态导入package.json的版本信息
let packageVersion = '0.1.0'; // 默认版本
try {
  // 在构建时，Vite会处理这个导入
  const packageInfo = await import('../../package.json', { 
    with: { type: 'json' },
    assert: { type: 'json' }
  });
  packageVersion = packageInfo.default?.version || packageInfo.version || '0.1.0';
} catch (error) {
  console.warn('无法动态加载package.json版本，使用默认版本:', error);
}

/**
 * 将版本字符串转换为内部数字版本
 * 例如: "0.1.0-Preview.3" => 103
 * 例如: "1.2.3" => 10203
 * 例如: "0.6.3" => 603
 * @param {string} versionString 版本字符串
 * @returns {number} 内部版本号
 */
export function convertVersionToNumber(versionString) {
  if (!versionString || typeof versionString !== "string") {
    return 0;
  }

  try {
    // 清理版本字符串，移除前缀如 'v'
    let cleanVersion = versionString.replace(/^v/, "");

    // 处理预发布版本，如 "0.1.0-Preview.3" 或 "1.0.0-beta.2"
    let preReleaseNumber = 0;

    // 检查是否有预发布标识
    const preReleaseMatch = cleanVersion.match(
      /-(preview|beta|alpha|rc)\.?(\d+)?/i
    );
    if (preReleaseMatch) {
      preReleaseNumber = parseInt(preReleaseMatch[2] || "0", 10);
      // 移除预发布部分以获取基础版本
      cleanVersion = cleanVersion.split("-")[0];
    }

    // 分割主版本号
    const parts = cleanVersion
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

    // 确保至少有3个部分 [major, minor, patch]
    while (parts.length < 3) {
      parts.push(0);
    }

    const [major, minor, patch] = parts;

    // 计算内部版本号: major * 10000 + minor * 100 + patch + preReleaseNumber
    const internalVersion =
      major * 10000 + minor * 100 + patch + preReleaseNumber;

    console.log(
      `版本转换: ${versionString} => ${internalVersion} (${major}.${minor}.${patch} + ${preReleaseNumber})`
    );

    return internalVersion;
  } catch (error) {
    console.error("版本转换失败:", versionString, error);
    return 0;
  }
}

/**
 * 将内部版本号转换回可读的版本字符串
 * 例如: 103 => "0.1.3"
 * 例如: 10203 => "1.2.3"
 * @param {number} internalVersion 内部版本号
 * @returns {string} 版本字符串
 */
export function convertNumberToVersion(internalVersion) {
  if (!internalVersion || typeof internalVersion !== "number") {
    return "0.0.0";
  }

  try {
    const major = Math.floor(internalVersion / 10000);
    const minor = Math.floor((internalVersion % 10000) / 100);
    const patch = internalVersion % 100;

    return `${major}.${minor}.${patch}`;
  } catch (error) {
    console.error("内部版本号转换失败:", internalVersion, error);
    return "0.0.0";
  }
}

/**
 * 比较两个版本号
 * @param {string} version1 版本1
 * @param {string} version2 版本2
 * @returns {number} -1: version1 < version2, 0: 相等, 1: version1 > version2
 */
export function compareVersions(version1, version2) {
  const num1 = convertVersionToNumber(version1);
  const num2 = convertVersionToNumber(version2);

  if (num1 < num2) return -1;
  if (num1 > num2) return 1;
  return 0;
}

/**
 * 检查是否有新版本
 * @param {string} currentVersion 当前版本
 * @param {string} latestVersion 最新版本
 * @returns {boolean} 是否有新版本
 */
export function hasNewVersion(currentVersion, latestVersion) {
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * 格式化版本显示信息
 * @param {string} versionString 版本字符串
 * @returns {object} 格式化的版本信息
 */
export function formatVersionInfo(versionString) {
  const internalVersion = convertVersionToNumber(versionString);

  return {
    original: versionString,
    internal: internalVersion,
    displayText: `${versionString} (${internalVersion})`,
    isPreRelease: /-(preview|beta|alpha|rc)/i.test(versionString),
    majorMinorPatch: convertNumberToVersion(
      Math.floor(internalVersion / 100) * 100
    ),
  };
}

/**
 * 获取当前应用版本信息
 * @param {string} packageVersion 从package.json获取的版本号
 * @returns {object} 当前版本信息
 */
export function getCurrentVersionInfo(packageVersion = '0.1.0') {
  const buildInfo = getBuildVersionInfo(packageVersion);
  
  return {
    frontend: formatVersionInfo(buildInfo.final),
    buildInfo,
    display: buildInfo.displayVersion,
    safe: getSafeVersionString(buildInfo.final),
    original: buildInfo.base
  };
}

/**
 * 获取构建版本信息
 * 根据不同环境和构建参数生成适当的版本号
 * @returns {object} 版本信息
 */
export function getBuildVersionInfo() {
  const baseVersion = packageVersion;
  const buildTime = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  
  // 检测构建环境
  const isDev = import.meta.env.DEV;
  const isPreview = import.meta.env.VITE_BUILD_TYPE === 'preview';
  const isProduction = import.meta.env.PROD && !isPreview;
  
  let finalVersion = baseVersion;
  let versionSuffix = '';
  
  if (isDev) {
    // 开发环境：添加dev标识和时间戳
    versionSuffix = '-dev';
    finalVersion = `${baseVersion}${versionSuffix}.${buildTime}`;
  } else if (isPreview) {
    // 预览版本：保持preview标识
    if (!baseVersion.includes('preview')) {
      versionSuffix = '-preview';
      finalVersion = `${baseVersion}${versionSuffix}`;
    }
  } else if (isProduction) {
    // 生产版本：移除所有预发布标识
    finalVersion = baseVersion.split('-')[0];
  }
  
  return {
    base: baseVersion,
    final: finalVersion,
    suffix: versionSuffix,
    buildTime,
    environment: isDev ? 'development' : isPreview ? 'preview' : 'production',
    displayVersion: finalVersion
  };
}

/**
 * 获取安全的版本字符串（用于构建文件名等）
 * 移除或替换可能导致构建问题的字符
 * @param {string} versionString 原始版本字符串
 * @returns {string} 安全的版本字符串
 */
export function getSafeVersionString(versionString) {
  if (!versionString) return '0-0-0';
  
  // 替换可能有问题的字符
  return versionString
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')  // 替换非字母数字的字符为连字符
    .replace(/-+/g, '-')           // 合并多个连字符
    .replace(/^-|-$/g, '');        // 移除开头和结尾的连字符
}

export default {
  convertVersionToNumber,
  convertNumberToVersion,
  compareVersions,
  hasNewVersion,
  formatVersionInfo,
  getCurrentVersionInfo,
  getBuildVersionInfo,
  getSafeVersionString,
};

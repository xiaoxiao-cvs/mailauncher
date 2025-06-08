/**
 * 版本工具类
 * 用于版本号处理和比较
 */

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
 * @returns {object} 当前版本信息
 */
export function getCurrentVersionInfo() {
  // 从多个来源获取版本信息
  const frontendVersion = "0.1.0"; // 从 package.json
  const backendVersion = "0.1.0-Preview.2"; // 从后端

  return {
    frontend: formatVersionInfo(frontendVersion),
    backend: formatVersionInfo(backendVersion),
    display: frontendVersion, // 主要显示前端版本
  };
}

export default {
  convertVersionToNumber,
  convertNumberToVersion,
  compareVersions,
  hasNewVersion,
  formatVersionInfo,
  getCurrentVersionInfo,
};

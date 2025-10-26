/**
 * 全局版本相关类型定义
 */

declare global {
  // 构建时注入的全局变量
  const __PACKAGE_VERSION__: string;
  const __BUILD_TYPE__: string;
  const __BUILD_TIME__: string;
  
  interface Window {
    __PACKAGE_VERSION__?: string;
    __BUILD_TYPE__?: string;
    __BUILD_TIME__?: string;
  }
}

/**
 * 版本信息接口
 */
export interface VersionInfo {
  original: string;
  internal: number;
  displayText: string;
  isPreRelease: boolean;
  majorMinorPatch: string;
}

/**
 * 构建信息接口
 */
export interface BuildInfo {
  base: string;
  final: string;
  suffix: string;
  buildTime: string;
  environment: 'development' | 'preview' | 'production';
  displayVersion: string;
}

/**
 * 当前版本信息接口
 */
export interface CurrentVersionInfo {
  frontend: VersionInfo;
  buildInfo: BuildInfo;
  display: string;
  safe: string;
  original: string;
}

/**
 * 版本配置接口
 */
export interface VersionConfig {
  baseVersion: string;
  versionTypes: Record<string, string>;
  buildSuffixes: Record<string, string>;
  safeCharacters: RegExp;
  preReleasePattern: RegExp;
}

export {};

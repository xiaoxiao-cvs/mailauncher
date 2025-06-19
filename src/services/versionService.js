/**
 * 版本检查服务
 * 负责与后端通信检查版本更新
 */

import apiService from "./apiService.js";
import versionUtils from "../utils/versionUtils.js";

/**
 * 版本检查服务类
 */
class VersionService {
  constructor() {
    // 明确初始化所有属性
    this.checkInterval = null;
    this.listeners = new Set();
    
    // 绑定方法以避免this上下文丢失
    this.checkForUpdates = this.checkForUpdates.bind(this);
    this.startAutoCheck = this.startAutoCheck.bind(this);
    this.stopAutoCheck = this.stopAutoCheck.bind(this);
    this.getCurrentVersion = this.getCurrentVersion.bind(this);
    this.cleanup = this.cleanup.bind(this);
    
    console.log('VersionService 已初始化');
  }

  /**
   * 获取当前版本信息
   * @returns {object} 当前版本信息
   */
  getCurrentVersion() {
    try {
      // 从 package.json 获取前端版本
      const frontendVersion = "0.1.0";

      return {
        frontend: {
          version: frontendVersion,
          internal: versionUtils.convertVersionToNumber(frontendVersion),
          formatted: versionUtils.formatVersionInfo(frontendVersion),
        },
      };
    } catch (error) {
      console.error("获取当前版本失败:", error);
      return {
        frontend: {
          version: "0.0.0",
          internal: 0,
          formatted: versionUtils.formatVersionInfo("0.0.0"),
        },
      };
    }
  }

  /**
   * 检查版本更新
   * @param {boolean} forceCheck 是否强制检查
   * @returns {Promise<object>} 检查结果
   */
  async checkForUpdates(forceCheck = false) {
    try {
      console.log("开始检查版本更新...");

      const currentVersion = this.getCurrentVersion();
      console.log("当前版本:", currentVersion);

      // 调用后端API检查更新
      const response = await apiService.get("/version/check", {
        current_version: currentVersion.frontend.version,
        internal_version: currentVersion.frontend.internal,
        force_check: forceCheck,
      });

      const data = response.data || response;
      console.log("版本检查响应:", data);

      if (data.status === "success") {
        const result = {
          hasUpdate: data.has_update || false,
          currentVersion: currentVersion.frontend.version,
          currentInternal: currentVersion.frontend.internal,
          latestVersion: data.latest_version || currentVersion.frontend.version,
          latestInternal: versionUtils.convertVersionToNumber(
            data.latest_version || "0.0.0"
          ),
          updateDescription: data.update_description || "",
          releaseDate: data.release_date || "",
          downloadUrl: data.download_url || "",
          updateType: data.update_type || "patch", // patch, minor, major
          changelog: data.changelog || [],
          compatibility: data.compatibility || "compatible",
          checked: true,
          checkedAt: new Date().toISOString(),
        };

        // 格式化版本信息用于显示
        result.currentFormatted = versionUtils.formatVersionInfo(
          result.currentVersion
        );
        result.latestFormatted = versionUtils.formatVersionInfo(
          result.latestVersion
        );

        console.log("版本检查结果:", result);

        // 通知监听者
        this.notifyListeners("update-checked", result);

        return result;
      } else {
        throw new Error(data.message || "版本检查失败");
      }
    } catch (error) {
      console.error("版本检查失败:", error);

      const errorResult = {
        hasUpdate: false,
        error: error.message || "版本检查失败",
        checked: false,
        checkedAt: new Date().toISOString(),
      };

      this.notifyListeners("update-check-failed", errorResult);
      return errorResult;
    }
  }

  /**
   * 获取后端当前版本信息
   * @returns {Promise<object>} 后端版本信息
   */
  async getCurrentVersionFromBackend() {
    try {
      console.log("获取后端版本信息...");      const response = await apiService.get("/api/v1/version/current");
      const data = response.data || response;console.log("后端版本信息响应:", data);

      // 处理多种可能的响应格式
      if (data.version && data.internal_version) {
        // 直接格式
        return {
          success: true,
          data: {
            version: data.version,
            internal_version: data.internal_version,
            build_date: data.build_date || data.release_date,
            git_commit: data.git_commit,
          },
        };
      } else if (data.status === "success" && data.data) {
        // 嵌套格式
        return {
          success: true,
          data: {
            version: data.data.version,
            internal_version: data.data.internal_version,
            build_date: data.data.build_date,
            git_commit: data.data.git_commit,
          },
        };
      } else {
        console.error("未知的响应格式:", data);
        throw new Error(data.message || "获取后端版本失败");
      }
    } catch (error) {
      console.error("获取后端版本失败:", error);
      return {
        success: false,
        error: error.message || "获取后端版本时发生错误",
      };
    }
  }

  /**
   * 检查版本更新（调用后端API）
   * @param {boolean} forceCheck 是否强制检查
   * @returns {Promise<object>} 更新检查结果
   */
  async checkForUpdatesFromBackend(forceCheck = false) {
    try {
      console.log("调用后端检查版本更新...");

      const currentVersion = this.getCurrentVersion();
      const requestData = {
        current_version: currentVersion.frontend.version,
        internal_version: currentVersion.frontend.internal,
        force_check: forceCheck,
      };

      console.log("发送更新检查请求:", requestData);
      const response = await apiService.get("/version/check", requestData);
      const data = response.data || response;

      console.log("后端版本检查响应:", data);

      if (data.status === "success" && data.data) {
        return {
          success: true,
          data: {
            has_update: data.data.has_update,
            latest_version: data.data.latest_version,
            latest_internal: data.data.latest_internal,
            update_url: data.data.update_url,
            release_notes: data.data.release_notes,
            release_date: data.data.release_date,
            update_type: data.data.update_type,
          },
        };
      } else {
        throw new Error(data.message || "检查更新失败");
      }
    } catch (error) {
      console.error("后端版本检查失败:", error);
      return {
        success: false,
        error: error.message || "检查更新时发生错误",
      };
    }
  }

  /**
   * 获取版本历史记录
   * @param {number} limit 限制条数
   * @returns {Promise<object>} 版本历史记录
   */
  async getVersionHistory(limit = 10) {
    try {
      console.log("获取版本历史记录...");

      const response = await apiService.get("/version/history", { limit });
      const data = response.data || response;

      console.log("版本历史记录响应:", data);

      if (data.status === "success" && data.data) {
        return {
          success: true,
          data: data.data,
        };
      } else {
        throw new Error(data.message || "获取版本历史失败");
      }
    } catch (error) {
      console.error("获取版本历史失败:", error);
      return {
        success: false,
        error: error.message || "获取版本历史时发生错误",
      };
    }
  }
  /**
   * 开始自动检查更新
   * @param {number} interval 检查间隔（毫秒）
   */
  startAutoCheck(interval = 30 * 60 * 1000) {
    // 默认30分钟
    // 确保checkInterval已初始化
    if (!this.hasOwnProperty('checkInterval')) {
      this.checkInterval = null;
    }
    
    this.stopAutoCheck();

    console.log(`开启自动版本检查，间隔: ${interval / 1000 / 60} 分钟`);

    this.checkInterval = setInterval(() => {
      this.checkForUpdates(false).catch((error) => {
        console.error("自动版本检查失败:", error);
      });
    }, interval);

    // 立即检查一次
    setTimeout(() => {
      this.checkForUpdates(false).catch((error) => {
        console.error("初始版本检查失败:", error);
      });
    }, 5000); // 5秒后执行，避免启动时的网络问题
  }

  /**
   * 停止自动检查更新
   */
  stopAutoCheck() {
    // 确保checkInterval已初始化
    if (!this.hasOwnProperty('checkInterval')) {
      this.checkInterval = null;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("已停止自动版本检查");
    }
  }

  /**
   * 添加事件监听器
   * @param {function} listener 监听器函数
   */
  addListener(listener) {
    if (typeof listener === "function") {
      this.listeners.add(listener);
    }
  }

  /**
   * 移除事件监听器
   * @param {function} listener 监听器函数
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   * @param {string} event 事件类型
   * @param {object} data 事件数据
   */
  notifyListeners(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error("版本服务监听器错误:", error);
      }
    });
  }

  /**
   * 比较版本号
   * @param {string} version1 版本1
   * @param {string} version2 版本2
   * @returns {number} 比较结果
   */
  compareVersions(version1, version2) {
    return versionUtils.compareVersions(version1, version2);
  }

  /**
   * 格式化版本信息用于显示
   * @param {string} version 版本字符串
   * @returns {object} 格式化的版本信息
   */
  formatVersion(version) {
    return versionUtils.formatVersionInfo(version);
  }
  /**
   * 清理资源
   */
  cleanup() {
    try {
      this.stopAutoCheck();
      if (this.listeners) {
        this.listeners.clear();
      }
      console.log('VersionService 资源已清理');
    } catch (error) {
      console.error('VersionService 清理资源时出错:', error);
    }
  }
}

/**
 * 安全的属性访问方法
 */
function safePropertyAccess(obj, propertyName, defaultValue = null) {
  try {
    if (obj && obj.hasOwnProperty(propertyName)) {
      return obj[propertyName];
    }
    return defaultValue;
  } catch (error) {
    console.warn(`安全访问属性 ${propertyName} 失败:`, error);
    return defaultValue;
  }
}

/**
 * 安全的方法调用包装器
 */
function safeMethodCall(context, methodName, ...args) {
  try {
    if (context && typeof context[methodName] === 'function') {
      return context[methodName].apply(context, args);
    } else {
      console.warn(`方法 ${methodName} 不存在或不是函数`);
      return null;
    }
  } catch (error) {
    console.error(`调用方法 ${methodName} 时出错:`, error);
    throw error;
  }
}

// 创建单例实例，添加错误处理
let versionService;

try {
  versionService = new VersionService();
  
  // 添加初始化验证
  if (!versionService.checkInterval && versionService.checkInterval !== null) {
    console.warn('VersionService 初始化可能不完整，重新初始化...');
    versionService.checkInterval = null;
  }
  
  if (!versionService.listeners || typeof versionService.listeners.add !== 'function') {
    console.warn('VersionService listeners 初始化失败，重新创建...');
    versionService.listeners = new Set();
  }
  
  console.log('VersionService 单例创建成功');
  
} catch (error) {
  console.error('VersionService 初始化失败:', error);
  
  // 创建一个降级版本
  versionService = {
    checkInterval: null,
    listeners: new Set(),
    getCurrentVersion: () => ({
      frontend: {
        version: "0.1.0",
        internal: 0,
        formatted: "v0.1.0"
      }
    }),
    checkForUpdates: () => Promise.resolve({ hasUpdate: false, checked: false }),
    startAutoCheck: () => console.warn('VersionService 降级模式，自动检查不可用'),
    stopAutoCheck: () => console.warn('VersionService 降级模式，停止检查不可用'),
    cleanup: () => console.warn('VersionService 降级模式，清理不可用'),
    addListener: () => {},
    removeListener: () => {}
  };
  
  console.log('使用 VersionService 降级版本');
}

export default versionService;

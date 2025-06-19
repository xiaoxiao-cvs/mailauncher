// 路径同步工具 - 确保部署界面和实际部署执行使用相同的路径

/**
 * 获取数据存储路径
 */
export const getDataStoragePath = () => {
  const savedPath = localStorage.getItem("dataStoragePath");
  if (savedPath) {
    return savedPath;
  }

  // 返回默认路径
  return getDefaultDataPath();
};

/**
 * 获取部署路径
 */
export const getDeploymentPath = () => {
  const savedPath = localStorage.getItem("deploymentPath");
  if (savedPath) {
    return savedPath;
  }

  // 返回默认路径
  return getDefaultDeploymentPath();
};

/**
 * 设置数据存储路径
 */
export const setDataStoragePath = (path) => {
  localStorage.setItem("dataStoragePath", path);

  // 发送路径变更事件
  window.dispatchEvent(
    new CustomEvent("data-path-changed", {
      detail: { path },
    })
  );
};

/**
 * 设置部署路径
 */
export const setDeploymentPath = (path) => {
  localStorage.setItem("deploymentPath", path);

  // 发送路径变更事件
  window.dispatchEvent(
    new CustomEvent("deployment-path-changed", {
      detail: { path },
    })
  );
};

/**
 * 获取默认数据路径
 */
export const getDefaultDataPath = () => {
  // 检测当前平台
  const isWindows = navigator.platform.includes('Win') || window.__TAURI_INTERNALS__?.platform === "windows";
  const isMacOS = navigator.platform.includes('Mac') || window.__TAURI_INTERNALS__?.platform === "macos";
  
  // Windows 默认路径
  if (isWindows) {
    return "D:\\MaiBot\\Data";
  }
  // macOS 默认路径
  if (isMacOS) {
    return "~/Documents/MaiBot/Data";
  }
  // Linux 默认路径
  return "~/MaiBot/Data";
};

/**
 * 获取默认部署路径
 */
export const getDefaultDeploymentPath = () => {
  // 检测当前平台
  const isWindows = navigator.platform.includes('Win') || window.__TAURI_INTERNALS__?.platform === "windows";
  const isMacOS = navigator.platform.includes('Mac') || window.__TAURI_INTERNALS__?.platform === "macos";
  
  // 所有平台都使用相对于后端根目录的路径
  // ~ 表示相对于启动器后端根目录（开发时）或exe根目录（打包后）
  if (isWindows) {
    return "~\\MaiBot\\Deployments";
  }
  // macOS 默认路径
  if (isMacOS) {
    return "~/MaiBot/Deployments";
  }
  // Linux 默认路径
  return "~/MaiBot/Deployments";
};

/**
 * 生成实例安装路径
 */
export const generateInstancePath = (instanceName, version = null) => {
  const basePath = getDeploymentPath();
  const safeName = instanceName.replace(/[^a-zA-Z0-9\-_]/g, "-");

  // 根据平台使用正确的路径分隔符
  const separator =
    window.__TAURI_INTERNALS__?.platform === "windows" ? "\\" : "/";
  
  // 直接使用实例名称，不再重复添加版本号
  // 因为实例名称通常已经包含了版本信息
  return `${basePath}${separator}${safeName}`;
};

/**
 * 验证路径格式
 */
export const validatePath = (path) => {
  if (!path || typeof path !== "string") {
    return false;
  }

  const trimmedPath = path.trim();
  
  // 支持多种路径格式：
  // - Windows绝对路径: C:\, D:\
  // - Unix绝对路径: /home, /usr
  // - 波浪号路径: ~/Documents, ~\MaiBot
  // - 相对路径: MaiBot, .\MaiBot, ..\MaiBot
  const pathRegex = /^([a-zA-Z]:\\|\/|~\/|~\\|\.\/|\.\\|\.\.\/|\.\.\\|[a-zA-Z0-9\u4e00-\u9fa5])/;
  return pathRegex.test(trimmedPath) && trimmedPath.length > 0;
};

/**
 * 标准化路径分隔符
 */
export const normalizePath = (path) => {
  if (!path) return "";

  // 检测当前平台
  const isWindows = navigator.platform.includes('Win') || window.__TAURI_INTERNALS__?.platform === "windows";

  // Windows 使用反斜杠，其他系统使用正斜杠
  if (isWindows) {
    return path.replace(/\//g, "\\");
  } else {
    return path.replace(/\\/g, "/");
  }
};

/**
 * 安全的路径标准化函数
 * 包含错误处理和日志记录
 */
export const safeNormalizePath = (path, context = {}) => {
  try {
    if (!path || typeof path !== "string") {
      console.warn('safeNormalizePath: 无效的路径输入', { path, context });
      return "";
    }

    // 防止重复调用同一路径
    const cacheKey = `${path}_${JSON.stringify(context)}`;
    if (safeNormalizePath._cache && safeNormalizePath._cache.has(cacheKey)) {
      return safeNormalizePath._cache.get(cacheKey);
    }

    const result = normalizePath(path);
    
    // 缓存结果，避免重复计算
    if (!safeNormalizePath._cache) {
      safeNormalizePath._cache = new Map();
    }
    
    // 限制缓存大小，防止内存泄漏
    if (safeNormalizePath._cache.size > 100) {
      const firstKey = safeNormalizePath._cache.keys().next().value;
      safeNormalizePath._cache.delete(firstKey);
    }
    
    safeNormalizePath._cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('safeNormalizePath: 路径标准化失败', { 
      path, 
      context, 
      error: error.message 
    });
    
    // 触发全局错误处理
    if (window.globalErrorHandler) {
      window.globalErrorHandler.triggerAppError(error, '路径标准化', {
        inputPath: path,
        context
      });
    }
    
    // 返回原始路径作为后备
    return path || "";
  }
};

/**
 * 监听路径变更事件
 */
export const onPathChanged = (type, callback) => {
  const eventName =
    type === "data" ? "data-path-changed" : "deployment-path-changed";

  const handler = (event) => {
    callback(event.detail.path);
  };

  window.addEventListener(eventName, handler);

  // 返回清理函数
  return () => {
    window.removeEventListener(eventName, handler);
  };
};

/**
 * 初始化路径设置
 */
export const initializePaths = () => {
  // 如果没有设置过路径，设置默认路径
  if (!localStorage.getItem("dataStoragePath")) {
    setDataStoragePath(getDefaultDataPath());
  }

  if (!localStorage.getItem("deploymentPath")) {
    setDeploymentPath(getDefaultDeploymentPath());
  }
};

/**
 * 展开路径中的波浪号
 * 注意：~ 路径应该由后端处理，前端不做展开
 * 这个函数主要用于向后兼容和特殊情况处理
 */
export const expandPath = (path) => {
  if (!path || typeof path !== "string") {
    return "";
  }

  // 如果路径以~开头，保持原样，让后端处理
  // ~ 表示相对于启动器后端根目录（开发时）或exe根目录（打包后）
  if (path.startsWith("~")) {
    // 直接返回原路径，让后端处理相对路径展开
    return path;
  }

  return path;
};

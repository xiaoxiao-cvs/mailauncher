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
  // Windows 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "windows") {
    return "D:\\MaiBot\\Data";
  }
  // macOS 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "macos") {
    return "~/Documents/MaiBot/Data";
  }
  // Linux 默认路径
  return "~/MaiBot/Data";
};

/**
 * 获取默认部署路径
 */
export const getDefaultDeploymentPath = () => {
  // Windows 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "windows") {
    return "D:\\MaiBot\\Deployments";
  }
  // macOS 默认路径
  if (window.__TAURI_INTERNALS__?.platform === "macos") {
    return "~/Documents/MaiBot/Deployments";
  }
  // Linux 默认路径
  return "~/MaiBot/Deployments";
};

/**
 * 生成实例安装路径
 */
export const generateInstancePath = (instanceName, version) => {
  const basePath = getDeploymentPath();
  const safeName = instanceName.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return `${basePath}\\${safeName}-${version}`;
};

/**
 * 验证路径格式
 */
export const validatePath = (path) => {
  if (!path || typeof path !== "string") {
    return false;
  }

  // 基本路径格式验证
  const pathRegex = /^[a-zA-Z]:\\|^~\/|^\/[a-zA-Z]/;
  return pathRegex.test(path.trim());
};

/**
 * 标准化路径分隔符
 */
export const normalizePath = (path) => {
  if (!path) return "";

  // Windows 使用反斜杠，其他系统使用正斜杠
  if (window.__TAURI_INTERNALS__?.platform === "windows") {
    return path.replace(/\//g, "\\");
  } else {
    return path.replace(/\\/g, "/");
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

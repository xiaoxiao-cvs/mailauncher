import apiService from "../services/apiService";
import enhancedToastService from "../services/enhancedToastService";
import toastService from "../services/toastService";

/**
 * 获取可用的版本列表
 * @returns {Promise<Array<string>>} 版本列表
 */
export const fetchVersions = async () => {
  try {
    // 使用正确的API路径
    console.log("尝试获取版本列表: /api/v1/deploy/versions");
    const response = await apiService.get("/deploy/versions");
    if (response.data && response.data.versions) {
      console.log("成功获取版本列表:", response.data.versions);
      return response.data.versions;
    }
    return [];
  } catch (error) {
    console.error("获取版本列表失败:", error);
    throw new Error("获取版本列表失败");
  }
};

/**
 * 部署指定版本 (基础部署)
 * @param {string} version 版本号
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 部署结果
 */
export const deployVersion = async (version, instanceName) => {
  console.log(`API: 开始基础部署版本 ${version}, 实例名称: ${instanceName}`);
  try {
    // 使用正确的部署API路径和请求格式
    const deployConfig = {
      instance_name: instanceName,
      install_services: [], // 基础部署不安装额外服务
      install_path: `D:\\MaiBot\\${instanceName}`, // 默认安装路径
      port: 8000, // 默认端口
      version: version,
      host: "127.0.0.1",
      token: ""
    };    const response = await apiService.post("/deploy/deploy", deployConfig);
    console.log(`API: 基础部署请求成功: ${version}`, response);
    
    // 确保正确处理响应数据
    const responseData = response?.data || response;
    console.log(`API: 解析后的响应数据:`, responseData);
    
    return responseData;
  } catch (error) {
    console.error(`API: 基础部署版本 ${version} 失败:`, error);

    return {
      success: false,
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        `部署版本 ${version} 失败`,
    };
  }
};

/**
 * 使用完整配置部署指定版本
 * @param {string} version 版本号
 * @param {string} instanceName 实例名称
 * @param {Object} deploymentConfig 部署配置
 * @returns {Promise<Object>} 部署结果
 */
export const deployVersionWithConfig = async (version, instanceName, deploymentConfig) => {
  console.log(`API: 开始部署版本 ${version}, 实例名称: ${instanceName}`, deploymentConfig);  try {
    // 从deploymentConfig中提取配置信息
    const { installPath, installServices = [], ports = {}, host = "127.0.0.1", token = "" } = deploymentConfig;
    
    // 路径展开交给后端处理，前端不再处理路径展开
    const finalInstallPath = installPath || `~\\MaiBot\\${instanceName}`;
    
    // 构建完整的部署配置
    const deployConfig = {
      instance_name: instanceName,
      install_services: installServices,
      install_path: finalInstallPath,
      port: ports.web || 8000,
      version: version,
      host: host,      token: token
    };

    console.log('发送到后端的部署配置:', deployConfig);

    const response = await apiService.post("/deploy/deploy", deployConfig);
    console.log(`API: 部署请求成功: ${version}`, response);
    
    // 确保正确处理响应数据
    const responseData = response?.data || response;
    console.log(`API: 解析后的响应数据:`, responseData);
    
    return responseData;
  } catch (error) {
    console.error(`API: 部署版本 ${version} 失败:`, error);

    return {
      success: false,
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        `部署版本 ${version} 失败`,
    };
  }
};

/**
 * 检查部署状态
 * @param {string} instanceName 实例名称
 * @returns {Promise<Object>} 部署状态
 */
export const checkDeployStatus = async (instanceName) => {
  try {
    const response = await apiService.get(`/deploy/status/${instanceName}`);
    return response.data;
  } catch (error) {
    console.error("检查部署状态失败:", error);
    throw new Error("检查部署状态失败");
  }
};

/**
 * 配置Bot (详细配置)
 * @param {Object} config 配置对象, e.g., { instance_name, qq_number, install_napcat, install_adapter, ports }
 * @returns {Promise<Object>} 配置结果
 */
export const configureBot = async (config) => {
  try {
    console.log("API: 发送配置Bot请求:", config);
    const response = await apiService.post("/install/configure", config);
    console.log("API: 配置Bot请求成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("API: 配置Bot失败:", error);
    return {
      success: false,
      message: error.response?.data?.detail || error.message || "配置Bot失败",
    };
  }
};

/**
 * 检查安装状态
 * @returns {Promise<Object>} 安装状态
 */
export const checkInstallStatus = async () => {
  try {
    const response = await apiService.get("/install-status");
    return response;
  } catch (error) {
    console.error("检查安装状态失败:", error);
    return {
      data: {
        napcat_installing: false,
        nonebot_installing: false,
      },
    };
  }
};

/**
 * 带Toast的部署功能
 * @param {string} version 版本号
 * @param {Object} deploymentConfig 部署配置
 * @returns {Promise<Object>} 部署结果
 */
export const deployWithToast = async (version, deploymentConfig) => {
  const { instanceName, ports = {}, installPath, installServices = [], ...otherConfig } = deploymentConfig;

  console.log(`开始部署 ${version}，实例: ${instanceName}`);

  // 准备部署数据
  const deploymentData = {
    instanceName,
    version,
    image: `maimai:${version}`,
    port: ports.web || "8080",
    napcatPort: ports.napcat || "3001",
    webPort: ports.web || "8080",
    ...otherConfig,
  };

  // 显示部署Toast（会自动检查当前页面）
  const toastId = enhancedToastService.showDeploymentToast(deploymentData);
  if (toastId === -1) {
    // 用户在下载页，直接执行部署但不显示Toast
    console.log("用户在下载页，执行静默部署");
    const result = await deployVersionWithConfig(version, instanceName, deploymentConfig);
    
    // 确保返回结果包含正确的成功标识
    if (result && (result.instance_id || result.message?.includes("已启动") || result.message?.includes("部署任务已启动"))) {
      return {
        ...result,
        success: true // 明确标记为成功
      };
    }
    
    return result;
  }

  try {
    // 开始部署
    enhancedToastService.updateDeploymentProgress(
      toastId,
      10,
      "正在启动部署..."
    );

    const result = await deployVersionWithConfig(version, instanceName, deploymentConfig);    if (result.success) {
      // 使用真实的部署状态而不是模拟进度
      await trackRealDeploymentProgress(toastId, result.instance_id, deploymentData);
    } else {
      enhancedToastService.completeDeployment(
        toastId,
        false,
        result.message || "部署失败"
      );
    }

    return result;
  } catch (error) {
    console.error("部署过程出错:", error);
    enhancedToastService.completeDeployment(
      toastId,
      false,
      error.message || "部署过程出现错误"    );
    throw error;
  }
};

/**
 * 跟踪真实的部署进度
 * @param {number} toastId Toast ID
 * @param {string} instanceId 实例ID
 * @param {Object} deploymentData 部署数据
 */
async function trackRealDeploymentProgress(toastId, instanceId, deploymentData) {
  const maxAttempts = 120; // 最大等待2分钟（120 * 1秒）
  let attempts = 0;

  while (attempts < maxAttempts) {    try {
      // 获取部署状态
      const response = await apiService.get(`/deploy/install-status/${instanceId}`);
      const status = response?.data || response;

      console.log('部署状态响应:', { response, status });

      // 如果后端返回404，说明实例还未开始部署，继续等待
      if (!status || typeof status !== 'object') {
        console.log('状态数据无效，继续等待...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        return;
      }      // 安全地访问状态属性，提供默认值
      const currentProgress = Number(status?.progress) || 0;
      const rawStatus = status?.status || status?.message || "正在部署...";
      const installStatus = status?.install_status || status?.status;

      // 改进状态描述，提供更详细的信息
      let detailedStatus = rawStatus;
      if (currentProgress === 0) {
        detailedStatus = "初始化部署环境...";
      } else if (currentProgress < 25) {
        detailedStatus = "下载并验证镜像...";
      } else if (currentProgress < 50) {
        detailedStatus = "创建容器实例...";
      } else if (currentProgress < 75) {
        detailedStatus = "配置网络和存储...";
      } else if (currentProgress < 100) {
        detailedStatus = "启动服务和检查健康状态...";
      } else if (installStatus === "completed") {
        detailedStatus = "部署完成！";
      } else {
        // 使用原始状态信息
        detailedStatus = rawStatus;
      }

      console.log('解析后的状态:', { currentProgress, rawStatus, detailedStatus, installStatus });

      // 更新Toast进度，包含更详细的状态和服务进度
      const servicesProgress = status?.services_install_status || [];
      enhancedToastService.updateDeploymentProgress(
        toastId,
        currentProgress,
        detailedStatus,
        servicesProgress
      );

      // 检查是否完成
      if (installStatus === "completed") {
        enhancedToastService.completeDeployment(
          toastId,
          true,
          `实例 "${deploymentData.instanceName}" 部署成功！`
        );
        return;
      } else if (installStatus === "failed") {
        enhancedToastService.completeDeployment(
          toastId,
          false,
          currentStatus || "部署失败"
        );
        return;
      }

      // 等待1秒后继续轮询
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error('获取部署状态失败:', error);
      
      // 如果是404错误，说明实例还未开始部署，继续等待
      if (error.response?.status === 404) {
        console.log('实例尚未开始部署，继续等待...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        return;
      }

      console.error('错误详情:', error.response?.data || error.message);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 超时处理
  enhancedToastService.completeDeployment(
    toastId,
    false,
    "部署超时，请检查后端日志"
  );
}

/**
 * 模拟部署进度（在真实场景中应该通过WebSocket实时获取）
 * @param {number} toastId Toast ID
 * @param {Object} deploymentData 部署数据
 */
async function simulateDeploymentProgress(toastId, deploymentData) {
  const steps = [
    {
      progress: 20,
      status: "下载镜像...",
      services: [{ name: "镜像下载", status: "running" }],
    },
    {
      progress: 40,
      status: "创建容器...",
      services: [
        { name: "镜像下载", status: "running" },
        { name: "容器创建", status: "running" },
      ],
    },
    {
      progress: 60,
      status: "启动服务...",
      services: [
        { name: "镜像下载", status: "running" },
        { name: "容器创建", status: "running" },
        { name: "MaiMai服务", status: "running" },
      ],
    },
    {
      progress: 80,
      status: "配置网络...",
      services: [
        { name: "镜像下载", status: "running" },
        { name: "容器创建", status: "running" },
        { name: "MaiMai服务", status: "running" },
        { name: "网络配置", status: "running" },
      ],
    },
    {
      progress: 95,
      status: "最后检查...",
      services: [
        { name: "镜像下载", status: "running" },
        { name: "容器创建", status: "running" },
        { name: "MaiMai服务", status: "running" },
        { name: "网络配置", status: "running" },
        { name: "健康检查", status: "running" },
      ],
    },
    {
      progress: 100,
      status: "部署完成",
      services: [
        { name: "镜像下载", status: "running" },
        { name: "容器创建", status: "running" },
        { name: "MaiMai服务", status: "running" },
        { name: "网络配置", status: "running" },
        { name: "健康检查", status: "running" },
      ],
    },
  ];

  for (const step of steps) {
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + Math.random() * 400)
    );

    enhancedToastService.updateDeploymentProgress(
      toastId,
      step.progress,
      step.status,
      step.services
    );
  }
}

export default {
  fetchVersions,
  deployVersion,
  deployWithToast,
  checkDeployStatus,
  configureBot,
  checkInstallStatus,
};

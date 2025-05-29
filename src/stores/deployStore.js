import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import { deployApi } from "@/services/api";
import { deployWebSocketService } from "@/services/deployWebSocket";
import toastService from "@/services/toastService";
import { useRequestCacheStore } from "./requestCacheStore";
import { usePollingStore } from "./pollingStore";

export const useDeployStore = defineStore("deploy", () => {
  const requestCache = useRequestCacheStore();
  const pollingStore = usePollingStore();

  // 状态管理
  const availableVersions = ref([
    "latest",
    "main",
    "v0.6.3",
    "v0.6.2",
    "v0.6.1",
  ]);
  const availableServices = ref([
    { name: "napcat-ada", description: "Napcat-ada 服务" },
  ]);

  // 当前部署状态
  const deployments = reactive(new Map()); // 使用 Map 管理多个部署任务
  const currentDeploymentId = ref(null);

  // WebSocket 连接状态
  const wsConnections = reactive(new Map()); // 管理多个 WebSocket 连接

  // 计算属性
  const currentDeployment = computed(() => {
    return currentDeploymentId.value
      ? deployments.get(currentDeploymentId.value)
      : null;
  });

  const isDeploying = computed(() => {
    return Array.from(deployments.values()).some(
      (deployment) => deployment.installing
    );
  });

  // 获取版本列表（带缓存）
  const fetchVersions = async (forceRefresh = false) => {
    const cacheKey = "available_versions";

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) {
        availableVersions.value = cached;
        return cached;
      }
    }

    try {
      const response = await deployApi.getVersions();
      console.log("获取版本响应:", response);

      let versions = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          versions = response.data;
        } else if (
          response.data.versions &&
          Array.isArray(response.data.versions)
        ) {
          versions = response.data.versions;
        }
      } else if (
        response &&
        response.versions &&
        Array.isArray(response.versions)
      ) {
        versions = response.versions;
      }

      if (versions.length > 0) {
        availableVersions.value = versions;
        // 缓存版本列表，有效期 1 小时
        requestCache.set(cacheKey, versions, 3600000);
        console.log("成功更新版本列表:", versions);
        return versions;
      } else {
        console.warn("未获取到有效的版本数据，使用默认版本列表");
        return availableVersions.value;
      }
    } catch (error) {
      console.error("获取版本列表失败:", error);
      // 返回默认版本列表
      return availableVersions.value;
    }
  };

  // 获取服务列表（带缓存）
  const fetchServices = async (forceRefresh = false) => {
    const cacheKey = "available_services";

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) {
        availableServices.value = cached;
        return cached;
      }
    }

    try {
      // 目前只有固定的 napcat-ada 服务
      const services = [{ name: "napcat-ada", description: "Napcat-ada 服务" }];

      availableServices.value = services;
      // 缓存服务列表，有效期 1 小时
      requestCache.set(cacheKey, services, 3600000);
      console.log("服务初始化完成:", services);
      return services;
    } catch (error) {
      console.error("服务初始化失败:", error);
      return availableServices.value;
    }
  };

  // 创建新的部署任务
  const createDeployment = (config) => {
    const deploymentId = Date.now().toString();
    const deployment = {
      id: deploymentId,
      config,
      installing: false,
      installComplete: false,
      installProgress: 0,
      servicesProgress: [],
      logs: [],
      instanceId: null,
      startTime: null,
      endTime: null,
      error: null,
    };

    deployments.set(deploymentId, deployment);
    currentDeploymentId.value = deploymentId;
    return deploymentId;
  };

  // 添加日志到指定部署
  const addLog = (deploymentId, message, level = "info") => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-CN");
    deployment.logs.push({
      time: timeStr,
      message: message,
      level: level,
    });

    // 限制日志数量，避免内存溢出
    if (deployment.logs.length > 1000) {
      deployment.logs.splice(0, 100); // 删除最早的 100 条日志
    }
  };

  // 更新部署进度
  const updateDeploymentProgress = (
    deploymentId,
    progress,
    servicesProgress = null
  ) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    deployment.installProgress = progress;
    if (servicesProgress) {
      deployment.servicesProgress = servicesProgress;
    }
  };

  // 初始化 WebSocket 连接
  const initWebSocketConnection = async (deploymentId) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) {
      throw new Error("部署任务不存在");
    }

    try {
      addLog(
        deploymentId,
        "正在建立WebSocket连接以获取实时部署日志...",
        "info"
      );

      // 检查是否已有连接
      if (wsConnections.has(deploymentId)) {
        const existingConnection = wsConnections.get(deploymentId);
        if (existingConnection.connected) {
          return existingConnection.sessionId;
        }
      }

      // 创建新的连接配置
      const connectionConfig = {
        connected: false,
        sessionId: null,
        handlers: new Map(),
      };

      // 注册事件处理器
      const handlers = {
        open: (data) => {
          connectionConfig.connected = true;
          connectionConfig.sessionId = data.sessionId;
          addLog(
            deploymentId,
            `WebSocket连接已建立 (会话ID: ${data.sessionId})`,
            "success"
          );
        },

        output: (data) => {
          addLog(deploymentId, data.data, "info");
        },

        status: (data) => {
          addLog(deploymentId, data.message, "info");
          // 尝试从状态消息中提取进度信息
          const progressMatch = data.message.match(/(\d+)%/);
          if (progressMatch) {
            updateDeploymentProgress(deploymentId, parseInt(progressMatch[1]));
          }
        },

        progress: (data) => {
          if (data.progress !== undefined) {
            updateDeploymentProgress(
              deploymentId,
              data.progress,
              data.services_status
            );
            addLog(deploymentId, `部署进度: ${data.progress}%`, "info");
          }
          if (data.message) {
            addLog(deploymentId, data.message, "info");
          }
        },

        completed: (data) => {
          const deployment = deployments.get(deploymentId);
          if (deployment) {
            deployment.installComplete = true;
            deployment.installing = false;
            deployment.endTime = new Date();
            addLog(deploymentId, "🎉 部署已完成！", "success");
            toastService.success(
              `MaiBot ${deployment.config.version} 部署成功！`
            );
          }
          closeWebSocketConnection(deploymentId);
        },

        error: (data) => {
          addLog(deploymentId, `错误: ${data.message || data.error}`, "error");
          const deployment = deployments.get(deploymentId);
          if (deployment) {
            deployment.error = data.message || data.error;
          }
        },

        close: (data) => {
          connectionConfig.connected = false;
          if (data.code !== 1000) {
            addLog(
              deploymentId,
              `WebSocket连接异常关闭: ${data.code} ${data.reason}`,
              "warning"
            );
          }
          wsConnections.delete(deploymentId);
        },
      };

      // 注册所有处理器
      Object.entries(handlers).forEach(([event, handler]) => {
        deployWebSocketService.on(event, handler);
        connectionConfig.handlers.set(event, handler);
      });

      // 建立连接
      const sessionId = await deployWebSocketService.connect();
      connectionConfig.sessionId = sessionId;
      wsConnections.set(deploymentId, connectionConfig);

      return sessionId;
    } catch (error) {
      console.error("WebSocket连接失败:", error);
      addLog(deploymentId, `WebSocket连接失败: ${error.message}`, "error");
      throw error;
    }
  };

  // 关闭 WebSocket 连接
  const closeWebSocketConnection = (deploymentId) => {
    const connection = wsConnections.get(deploymentId);
    if (!connection) return;

    // 移除事件监听器
    connection.handlers.forEach((handler, event) => {
      deployWebSocketService.off(event, handler);
    });

    // 断开连接
    if (connection.connected && deployWebSocketService.isConnected()) {
      deployWebSocketService.disconnect();
    }

    wsConnections.delete(deploymentId);
  };

  // 检查安装状态（WebSocket 备用方案）
  const checkInstallStatus = async (deploymentId) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment || !deployment.instanceId) return;

    try {
      const response = await deployApi.checkInstallStatus(
        deployment.instanceId
      );

      if (response) {
        // 更新总体安装进度
        updateDeploymentProgress(
          deploymentId,
          response.progress || 0,
          response.services_install_status
        );

        // 如果有消息，添加到日志
        if (response.message) {
          addLog(deploymentId, response.message);
        }

        // 检查是否已安装完成
        if (response.status === "completed") {
          deployment.installComplete = true;
          deployment.installing = false;
          deployment.endTime = new Date();
          addLog(deploymentId, "安装已完成！", "success");
          toastService.success(
            `MaiBot ${deployment.config.version} 安装成功！`
          );

          // 停止轮询
          pollingStore.stopPolling(`deploy_status_${deploymentId}`);
        }
      }
    } catch (error) {
      console.error("检查安装状态失败:", error);
      addLog(deploymentId, `检查安装状态失败: ${error.message}`, "error");
    }
  };

  // 开始部署
  const startDeployment = async (config) => {
    const deploymentId = createDeployment(config);
    const deployment = deployments.get(deploymentId);

    deployment.installing = true;
    deployment.startTime = new Date();
    addLog(
      deploymentId,
      `🚀 开始安装 MaiBot ${config.version} 实例: ${config.instance_name}`
    );
    toastService.info(`开始安装 MaiBot ${config.version}`);

    try {
      // 步骤1: 尝试建立WebSocket连接
      let useWebSocket = true;
      let sessionId = null;

      try {
        addLog(
          deploymentId,
          "📡 步骤 1/3: 建立WebSocket连接获取实时部署日志...",
          "info"
        );
        sessionId = await initWebSocketConnection(deploymentId);
        addLog(
          deploymentId,
          `✅ WebSocket连接成功，会话ID: ${sessionId}`,
          "success"
        );
      } catch (wsError) {
        console.warn("WebSocket连接失败，将使用轮询模式:", wsError);
        addLog(
          deploymentId,
          "⚠️ WebSocket连接失败，将使用传统轮询模式",
          "warning"
        );
        useWebSocket = false;
        closeWebSocketConnection(deploymentId);
      }

      // 步骤2: 准备部署配置
      addLog(deploymentId, "⚙️ 步骤 2/3: 准备部署配置...", "info");

      const deployConfig = { ...config };
      if (useWebSocket && sessionId) {
        deployConfig.websocket_session_id = sessionId;
      }

      console.log("发送部署请求，配置:", deployConfig);
      addLog(
        deploymentId,
        `📋 部署配置: 实例名="${config.instance_name}", 版本="${config.version}", 路径="${config.install_path}"`,
        "info"
      );

      // 步骤3: 发送部署请求
      addLog(deploymentId, "🚀 步骤 3/3: 发送部署请求...", "info");

      if (useWebSocket && deployWebSocketService.isConnected()) {
        // WebSocket模式：通过WebSocket发送部署配置
        addLog(deploymentId, "📤 通过WebSocket发送部署配置...", "info");
        const configSent =
          deployWebSocketService.sendDeployConfig(deployConfig);

        if (!configSent) {
          throw new Error("无法通过WebSocket发送部署配置");
        }

        addLog(deploymentId, "✅ 部署配置已发送，等待后端处理...", "success");
        addLog(
          deploymentId,
          "📊 将通过WebSocket接收实时部署进度和日志",
          "info"
        );

        // 同时发送HTTP请求作为备用
        try {
          const deployResponse = await Promise.race([
            deployApi.deploy(deployConfig),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("HTTP请求超时")), 15000)
            ),
          ]);

          if (deployResponse && deployResponse.success) {
            deployment.instanceId = deployResponse.instance_id;
            addLog(
              deploymentId,
              `✅ HTTP部署请求成功，实例ID: ${deployment.instanceId}`,
              "success"
            );
          }
        } catch (httpError) {
          console.warn("HTTP部署请求失败，但WebSocket流程继续:", httpError);
          addLog(
            deploymentId,
            "ℹ️ HTTP请求超时，但WebSocket部署流程正在进行中...",
            "info"
          );
        }
      } else {
        // 传统HTTP模式
        addLog(deploymentId, "📤 使用HTTP请求发送部署配置...", "info");
        const deployResponse = await deployApi.deploy(deployConfig);

        if (!deployResponse || !deployResponse.success) {
          throw new Error(deployResponse?.message || "部署失败");
        }

        deployment.instanceId = deployResponse.instance_id;
        addLog(
          deploymentId,
          `✅ 部署任务已提交，实例ID: ${deployment.instanceId}`,
          "success"
        );
        addLog(deploymentId, "🔄 启动状态轮询检查...", "info");

        // 使用轮询管理器启动状态检查
        pollingStore.startPolling(
          `deploy_status_${deploymentId}`,
          () => checkInstallStatus(deploymentId),
          2000, // 每2秒检查一次
          {
            maxRetries: 300, // 最多重试300次（10分钟）
            onError: (error) => {
              console.error("部署状态轮询出错:", error);
              addLog(deploymentId, `状态检查出错: ${error.message}`, "error");
            },
          }
        );
      }

      return deploymentId;
    } catch (error) {
      console.error("安装过程出错:", error);
      addLog(deploymentId, `❌ 安装失败: ${error.message}`, "error");
      toastService.error(`安装失败: ${error.message}`);
      deployment.installing = false;
      deployment.error = error.message;
      deployment.endTime = new Date();
      closeWebSocketConnection(deploymentId);
      throw error;
    }
  };

  // 取消部署
  const cancelDeployment = async (deploymentId) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    try {
      // 停止轮询
      pollingStore.stopPolling(`deploy_status_${deploymentId}`);

      // 关闭WebSocket连接
      closeWebSocketConnection(deploymentId);

      // 如果有实例ID，尝试取消部署
      if (deployment.instanceId) {
        try {
          await deployApi.cancelDeploy(deployment.instanceId);
        } catch (error) {
          console.warn("取消部署请求失败:", error);
        }
      }

      deployment.installing = false;
      deployment.endTime = new Date();
      addLog(deploymentId, "❌ 部署已被取消", "warning");
      toastService.info("部署已取消");
    } catch (error) {
      console.error("取消部署失败:", error);
      addLog(deploymentId, `取消部署失败: ${error.message}`, "error");
    }
  };

  // 清理完成的部署记录
  const cleanupDeployments = () => {
    const completed = [];
    deployments.forEach((deployment, id) => {
      if (deployment.installComplete || deployment.error) {
        completed.push(id);
      }
    });

    completed.forEach((id) => {
      pollingStore.stopPolling(`deploy_status_${id}`);
      closeWebSocketConnection(id);
      deployments.delete(id);
    });

    if (completed.length > 0) {
      console.log(`清理了 ${completed.length} 个已完成的部署记录`);
    }
  };

  // 获取部署历史
  const getDeploymentHistory = () => {
    return Array.from(deployments.values()).sort((a, b) => {
      return new Date(b.startTime) - new Date(a.startTime);
    });
  };

  // 清理所有连接和轮询
  const cleanup = () => {
    // 停止所有轮询
    deployments.forEach((_, id) => {
      pollingStore.stopPolling(`deploy_status_${id}`);
    });

    // 关闭所有WebSocket连接
    wsConnections.forEach((_, id) => {
      closeWebSocketConnection(id);
    });

    // 清空状态
    deployments.clear();
    wsConnections.clear();
    currentDeploymentId.value = null;
  };

  return {
    // 状态
    availableVersions,
    availableServices,
    deployments,
    currentDeploymentId,
    currentDeployment,
    isDeploying,

    // 方法
    fetchVersions,
    fetchServices,
    createDeployment,
    startDeployment,
    cancelDeployment,
    addLog,
    updateDeploymentProgress,
    cleanupDeployments,
    getDeploymentHistory,
    cleanup,
  };
});

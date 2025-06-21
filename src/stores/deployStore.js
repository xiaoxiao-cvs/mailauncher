import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import { deployApi } from "@/services/api";
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
  // 下载页状态管理
  const downloadPageState = reactive({
    isInDownloadPage: false, // 是否在下载页
    currentStep: 'select-mode', // 当前步骤: 'select-mode', 'existing-instance', 'new-instance', 'downloading'
    isLocked: false, // 是否锁定下载页状态
    activeToastId: null, // 当前活跃的部署Toast ID
    activeInstanceName: null, // 当前活跃部署的实例名称
  });

  // 日志自动滚动控制
  const autoScrollEnabled = ref(true);
  const scrollTrigger = ref(0); // 用于触发滚动的响应式变量

  // 请求状态管理，防止重复请求
  const loadingStates = reactive({
    fetchingVersions: false,
    fetchingServices: false,
  });

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
  }); // 获取版本列表（带缓存）
  const fetchVersions = async (forceRefresh = false) => {
    const cacheKey = "available_versions";

    // 如果已经在请求中，等待当前请求完成
    if (loadingStates.fetchingVersions && !forceRefresh) {
      console.log("版本请求已在进行中，等待完成...");
      // 等待请求完成并返回当前值
      while (loadingStates.fetchingVersions) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return availableVersions.value;
    }

    if (!forceRefresh) {
      const cached = requestCache.getCachedData(cacheKey);
      if (cached) {
        availableVersions.value = cached;
        return cached;
      }
    }

    loadingStates.fetchingVersions = true;
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
        requestCache.setCachedData(cacheKey, versions);
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
    } finally {
      loadingStates.fetchingVersions = false;
    }
  }; // 获取服务列表（带缓存）
  const fetchServices = async (forceRefresh = false) => {
    const cacheKey = "available_services";

    // 如果已经在请求中，等待当前请求完成
    if (loadingStates.fetchingServices && !forceRefresh) {
      console.log("服务请求已在进行中，等待完成...");
      // 等待请求完成并返回当前值
      while (loadingStates.fetchingServices) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return availableServices.value;
    }

    if (!forceRefresh) {
      const cached = requestCache.getCachedData(cacheKey);
      if (cached) {
        availableServices.value = cached;
        return cached;
      }
    }

    loadingStates.fetchingServices = true;
    try {
      // 目前只有固定的 napcat-ada 服务
      const services = [{ name: "napcat-ada", description: "Napcat-ada 服务" }];
      availableServices.value = services;
      // 缓存服务列表，有效期 1 小时
      requestCache.setCachedData(cacheKey, services);
      console.log("服务初始化完成:", services);
      return services;
    } catch (error) {
      console.error("服务初始化失败:", error);
      return availableServices.value;
    } finally {
      loadingStates.fetchingServices = false;
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
      lastLogOffset: 0, // 用于跟踪已处理的后端日志数量，避免重复显示
      statusCheckStarted: false, // 标记是否已开始状态检查，避免重复日志
    };

    deployments.set(deploymentId, deployment);
    currentDeploymentId.value = deploymentId;
    return deploymentId;
  };  // 添加日志到指定部署（带去重功能和智能过滤）
  const addLog = (deploymentId, message, level = "info") => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    // 智能过滤：过滤掉过于详细的技术日志
    if (shouldFilterLog(message)) {
      console.log(`🚫 过滤详细日志: "${message}"`);
      return;
    }

    // 简化日志消息
    const simplifiedMessage = simplifyLogMessage(message);

    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-CN");
    
    // 生成日志唯一键用于去重
    const logKey = generateLogKey(simplifiedMessage, level);
    
    // 初始化去重缓存
    if (!deployment.logDeduplicationCache) {
      deployment.logDeduplicationCache = new Map();
    }
    
    const cache = deployment.logDeduplicationCache;
    const cachedLog = cache.get(logKey);
    const currentTime = now.getTime();
    const deduplicationWindow = 5000; // 5秒去重窗口
    
    // 检查是否为重复日志
    if (cachedLog && (currentTime - cachedLog.lastSeen < deduplicationWindow)) {
      // 更新重复计数和时间
      cachedLog.count++;
      cachedLog.lastSeen = currentTime;
      
      // 更新已存在的日志条目
      const existingLogIndex = deployment.logs.findIndex(log => log.id === cachedLog.logId);
      if (existingLogIndex !== -1) {
        deployment.logs[existingLogIndex].count = cachedLog.count;
        deployment.logs[existingLogIndex].time = timeStr; // 更新为最新时间
      }
      
      console.log(`📋 去重日志: "${simplifiedMessage}" (计数: ${cachedLog.count})`);
      return; // 不添加新的日志条目
    }
    
    // 新日志或超出去重窗口的日志
    const logId = `log_${deployment.logs.length}_${currentTime}_${Math.random().toString(36).substr(2, 6)}`;
    const newLog = {
      id: logId,
      time: timeStr,
      message: simplifiedMessage,
      level: level,
      count: 1
    };
    
    deployment.logs.push(newLog);
    
    // 更新去重缓存
    cache.set(logKey, {
      logId: logId,
      count: 1,
      lastSeen: currentTime
    });
    
    // 清理过期的缓存条目
    for (const [key, value] of cache.entries()) {
      if (currentTime - value.lastSeen > deduplicationWindow * 2) {
        cache.delete(key);
      }
    }

    // 限制日志数量，避免内存溢出
    if (deployment.logs.length > 200) { // 降低日志数量限制
      deployment.logs.splice(0, 50); // 删除最早的 50 条日志
      // 同时清理对应的缓存
      deployment.logDeduplicationCache.clear();
    }

    // 触发日志自动滚动
    if (autoScrollEnabled.value) {
      scrollTrigger.value++;
    }
    
    console.log(`📝 新增日志: "${simplifiedMessage}"`);
  };
    // 日志过滤和分类函数
  const shouldFilterLog = (message) => {
    if (!message || typeof message !== 'string') return false;
    
    const msg = message.toLowerCase();
    
    // 过滤掉过于详细的技术日志
    const verbosePatterns = [
      'collecting',
      'downloading',
      'using cached',
      'building wheel',
      'installing collected packages',
      'successfully installed',
      'requirement already satisfied',
      'obtaining file://',
      'installing build dependencies',
      'getting requirements to build wheel',
      'preparing metadata',
      'cloning into',
      'already up to date',
      'checking connectivity',
      'resolving deltas',
      'compressing objects',
      'writing objects'
    ];
    
    // 如果消息包含这些模式，则过滤掉
    for (const pattern of verbosePatterns) {
      if (msg.includes(pattern)) {
        return true; // 需要过滤
      }
    }
    
    return false; // 不需要过滤
  };

  // 简化日志消息函数
  const simplifyLogMessage = (message) => {
    if (!message || typeof message !== 'string') return message;
    
    let simplified = message;
    
    // 简化Git相关消息
    if (simplified.includes('Git克隆进行中')) {
      simplified = simplified.replace(/已用时\d+秒/, '进行中...');
    }
    
    // 简化Python依赖安装消息
    if (simplified.includes('执行依赖安装命令:')) {
      simplified = '📦 正在安装Python依赖包...';
    }
    
    // 简化文件路径
    simplified = simplified.replace(/[A-Z]:\\[^\\]*\\[^\\]*\\[^\\]*\\/, '...\\');
    
    // 移除过长的命令行参数
    if (simplified.length > 150) {
      const parts = simplified.split(' ');
      if (parts.length > 10) {
        simplified = parts.slice(0, 8).join(' ') + ' ...';
      }
    }
    
    return simplified;
  };

  // 生成日志唯一键的辅助函数
  const generateLogKey = (message, level) => {
    if (!message) return `${level}||empty_message`;
    
    let cleanMessage = String(message).trim();
    
    // 对进度类消息进行标准化处理
    if (cleanMessage.includes('部署进度:') && cleanMessage.includes('%')) {
      cleanMessage = cleanMessage.replace(/\d+(\.\d+)?%/g, 'X%');
    } else if (cleanMessage.includes('Installing') && cleanMessage.includes('%')) {
      cleanMessage = cleanMessage.replace(/\d+%/g, 'X%');
    } else if (cleanMessage.includes('安装状态:')) {
      // 将所有安装状态类消息归类
      cleanMessage = cleanMessage.replace(/安装状态: .*/, '安装状态: [状态]');
    } else if (cleanMessage.includes('Progress:') && cleanMessage.includes('%')) {
      cleanMessage = cleanMessage.replace(/\d+(\.\d+)?%/g, 'X%');
    } else if (cleanMessage.includes('Git克隆进行中')) {
      cleanMessage = 'Git克隆进行中';
    } else if (cleanMessage.includes('执行依赖安装命令:')) {
      cleanMessage = '执行依赖安装命令';
    } else if (cleanMessage.includes('Python依赖包')) {
      cleanMessage = 'Python依赖包安装';
    }
    
    return `${level}||${cleanMessage}`;
  };

  // 清空指定部署的日志
  const clearLogs = (deploymentId) => {
    if (deploymentId) {
      const deployment = deployments.get(deploymentId);
      if (deployment) {
        deployment.logs = [];
      }
    } else if (currentDeploymentId.value) {
      // 如果没有指定 deploymentId，则清空当前部署的日志
      const deployment = deployments.get(currentDeploymentId.value);
      if (deployment) {
        deployment.logs = [];
      }
    }
  };  // 更新部署进度
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
    
    // 检查当前页面，如果不在下载页面，则需要更新Toast
    const currentTab = window.currentActiveTab || 'unknown';
    console.log('更新部署进度:', { 
      deploymentId, 
      progress, 
      currentTab, 
      instanceName: deployment.config?.instance_name,
      activeToastId: downloadPageState.activeToastId,
      activeInstanceName: downloadPageState.activeInstanceName
    });    if (currentTab !== 'downloads' && deployment.config?.instance_name) {
      console.log('检测到非下载页面，尝试更新Toast进度:', { 
        instanceName: deployment.config.instance_name, 
        progress,
        activeToastId: downloadPageState.activeToastId,
        activeInstanceName: downloadPageState.activeInstanceName
      });
      
      // 构造状态消息
      let statusMessage = '安装中...';
      if (servicesProgress && Array.isArray(servicesProgress)) {
        const activeService = servicesProgress.find(s => s.status === 'installing' || s.status === 'downloading');
        if (activeService) {
          statusMessage = `正在安装 ${activeService.name}...`;
        }
      }
      
      // 动态导入Toast服务，避免循环依赖
      import('../services/enhancedToastService.js').then(({ default: enhancedToastService }) => {
        let toastUpdated = false;
        
        // 优先使用注册的Toast ID
        if (downloadPageState.activeToastId && 
            downloadPageState.activeInstanceName === deployment.config.instance_name) {
          
          console.log('使用注册的Toast更新进度:', { 
            toastId: downloadPageState.activeToastId, 
            progress,
            statusMessage
          });
          
          enhancedToastService.updateDeploymentProgress(
            downloadPageState.activeToastId,
            progress,
            statusMessage,
            servicesProgress || []
          );
          
          toastUpdated = true;
        }
        
        // 回退方案：尝试通过实例名查找Toast
        if (!toastUpdated) {
          const deploymentToast = enhancedToastService.getDeploymentToast(deployment.config.instance_name);
          if (deploymentToast) {
            console.log('通过实例名找到Toast，更新进度:', { 
              toastId: deploymentToast.id, 
              progress,
              statusMessage
            });
            
            enhancedToastService.updateDeploymentProgress(
              deploymentToast.id,
              progress,
              statusMessage,
              servicesProgress || []
            );
            
            toastUpdated = true;
          }
        }
        
        if (!toastUpdated) {
          console.log('未找到对应的Toast，跳过更新');
        }
      }).catch(error => {
        console.warn('无法导入enhancedToastService:', error);
      });
    }
  };

  // 设置部署状态
  const setDeploymentStatus = (deploymentId, installing, installComplete = null) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    deployment.installing = installing;
    if (installComplete !== null) {
      deployment.installComplete = installComplete;
    }
  };  // 检查安装状态（轮询方案）
  const checkInstallStatus = async (deploymentId) => {
    const deployment = deployments.get(deploymentId);
    if (!deployment || !deployment.instanceId) {
      console.log('❌ checkInstallStatus: 部署或实例ID不存在', { deploymentId, deployment });
      return;
    }

    try {
      console.log(
        `🔍 [调试] 检查部署 ${deploymentId} 的安装状态，实例ID: ${deployment.instanceId}`
      );
        // 检查是否首次调用，避免重复的"正在检查安装状态"日志
      if (!deployment.statusCheckStarted) {
        const currentTime = new Date().toLocaleTimeString();
        addLog(deploymentId, `🔍 [${currentTime}] 开始检查安装状态...`, "info");
        deployment.statusCheckStarted = true;
      }
      
      const response = await deployApi.checkInstallStatus(
        deployment.instanceId
      );      console.log(`📥 [调试] 收到安装状态响应:`, response);

      // 修复响应解析逻辑 - 处理嵌套的 data 字段
      let statusData = response;
      if (response && response.data) {
        statusData = response.data;
      }      if (statusData) {
        console.log(`解析后的状态数据:`, statusData);

        // 更新总体安装进度
        const progress =
          statusData.progress || statusData.install_progress || 0;
        const servicesProgress = statusData.services_install_status || statusData.services || [];
        
        // 检查进度是否有显著变化（大于2%或状态改变）
        const lastProgress = deployment.lastProgress || 0;
        const progressChanged = Math.abs(progress - lastProgress) >= 2;
        
        if (progressChanged && progress > 0) {
          addLog(deploymentId, `📊 安装进度更新: ${progress}%`, "info");
          deployment.lastProgress = progress;
        }
        
        updateDeploymentProgress(
          deploymentId,
          progress,
          servicesProgress
        );

        // 处理服务级别的详细日志
        if (servicesProgress && Array.isArray(servicesProgress)) {
          servicesProgress.forEach((service) => {
            if (service.message && service.message !== deployment.lastServiceMessage?.[service.name]) {
              // 避免重复日志，只有当服务消息改变时才添加
              let serviceLogLevel = "info";
              if (service.status === "failed" || service.status === "error") {
                serviceLogLevel = "error";
              } else if (service.status === "completed" || service.status === "installed") {
                serviceLogLevel = "success";
              }
              
              addLog(deploymentId, `🔧 ${service.name}: ${service.message} (${service.progress}%)`, serviceLogLevel);
              console.log('添加服务消息到日志:', { 
                service: service.name, 
                message: service.message, 
                progress: service.progress,
                level: serviceLogLevel 
              });
              
              // 记录最后一次服务消息，避免重复
              if (!deployment.lastServiceMessage) deployment.lastServiceMessage = {};
              deployment.lastServiceMessage[service.name] = service.message;
            }
          });
        }        // 如果有消息，添加到日志（避免重复相同消息）
        if (statusData.message && statusData.message !== deployment.lastStatusMessage) {
          // 根据进度和状态决定日志级别
          let logLevel = "info";
          if (statusData.status === "failed") {
            logLevel = "error";
          } else if (statusData.status === "completed") {
            logLevel = "success";
          } else if (statusData.message.includes("错误") || statusData.message.includes("失败")) {
            logLevel = "error";
          } else if (statusData.message.includes("完成") || statusData.message.includes("成功")) {
            logLevel = "success";
          }
          
          addLog(deploymentId, `📋 ${statusData.message}`, logLevel);
          console.log('添加状态消息到日志:', { message: statusData.message, level: logLevel, progress });
          
          // 记录最后一次状态消息
          deployment.lastStatusMessage = statusData.message;
        }        // 如果有详细日志，智能处理（批量过滤和分类）
        if (statusData.logs && Array.isArray(statusData.logs)) {
          console.log('🔍 后端返回logs数组:', statusData.logs.length, '条日志');
          console.log('🔍 当前lastLogOffset:', deployment.lastLogOffset || 0);
          
          // 初始化日志偏移量，确保不重复显示已处理的日志
          if (!deployment.lastLogOffset) {
            deployment.lastLogOffset = 0;
          }
          
          // 只处理新增的日志
          const newLogs = statusData.logs.slice(deployment.lastLogOffset);
          console.log('🔍 新增日志数量:', newLogs.length);
          
          // 智能分类和过滤新日志
          const importantLogs = [];
          const categories = {
            git: [],
            python: [],
            progress: [],
            error: [],
            success: []
          };
          
          newLogs.forEach((log) => {
            if (!log || (!log.message && typeof log !== 'string')) return;
            
            const logMessage = log.message || log;
            const logLevel = log.level || "info";
            
            // 过滤掉过于详细的日志
            if (shouldFilterLog(logMessage)) {
              return; // 跳过这条日志
            }
            
            // 分类日志
            const msg = logMessage.toLowerCase();
            if (msg.includes('git') || msg.includes('clone') || msg.includes('克隆')) {
              categories.git.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            } else if (msg.includes('python') || msg.includes('pip') || msg.includes('依赖')) {
              categories.python.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            } else if (msg.includes('progress') || msg.includes('进度') || msg.includes('%')) {
              categories.progress.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            } else if (msg.includes('error') || msg.includes('failed') || msg.includes('错误') || msg.includes('失败')) {
              categories.error.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            } else if (msg.includes('success') || msg.includes('completed') || msg.includes('成功') || msg.includes('完成')) {
              categories.success.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            } else {
              // 其他重要日志
              importantLogs.push({ message: logMessage, level: logLevel, timestamp: log.timestamp });
            }
          });
          
          // 对每个分类进行合并处理
          Object.entries(categories).forEach(([category, logs]) => {
            if (logs.length === 0) return;
            
            if (category === 'git' && logs.length > 3) {
              // Git日志合并显示
              const firstLog = logs[0];
              const lastLog = logs[logs.length - 1];
              addLog(deploymentId, `🔄 Git操作: ${firstLog.message}`, firstLog.level);
              if (logs.length > 1) {
                addLog(deploymentId, `� Git进度: ${logs.length}个步骤完成`, "info");
              }
              addLog(deploymentId, `✅ Git操作完成: ${lastLog.message}`, lastLog.level);
            } else if (category === 'python' && logs.length > 5) {
              // Python依赖安装日志合并
              addLog(deploymentId, `🐍 Python依赖安装开始`, "info");
              addLog(deploymentId, `📦 正在安装 ${logs.length} 个依赖包...`, "info");
              // 只显示重要的Python日志
              logs.filter(log => 
                log.message.includes('成功') || 
                log.message.includes('完成') || 
                log.message.includes('错误') ||
                log.message.includes('失败')
              ).forEach(log => {
                const timestamp = log.timestamp ? `[${log.timestamp}] ` : '';
                addLog(deploymentId, `${timestamp}${log.message}`, log.level);
              });
            } else {
              // 其他分类正常显示，但限制数量
              const logsToShow = logs.slice(0, 3); // 最多显示3条
              logsToShow.forEach(log => {
                const timestamp = log.timestamp ? `[${log.timestamp}] ` : '';
                addLog(deploymentId, `${timestamp}${log.message}`, log.level);
              });
              
              if (logs.length > 3) {
                addLog(deploymentId, `📋 ${category}分类还有${logs.length - 3}条日志...`, "info");
              }
            }
          });
          
          // 显示其他重要日志
          importantLogs.forEach(log => {
            const timestamp = log.timestamp ? `[${log.timestamp}] ` : '';
            addLog(deploymentId, `${timestamp}${log.message}`, log.level);
          });
          
          // 更新日志偏移量
          deployment.lastLogOffset = statusData.logs.length;
          console.log('🔍 更新lastLogOffset为:', deployment.lastLogOffset);
          console.log('🔍 当前deployment.logs长度:', deployment.logs.length);
        }// 检查是否已安装完成
        const status = statusData.status || statusData.install_status;
        if (status === "completed" || progress >= 100) {
          deployment.installComplete = true;
          deployment.installing = false;
          deployment.endTime = new Date();
          addLog(deploymentId, "✅ 安装已完成！", "success");          // 检查用户是否启用了部署完成通知
          const notificationsEnabled =
            localStorage.getItem("deploymentNotifications") !== "false";

          if (notificationsEnabled) {
            // 检查当前页面，只在非下载页面显示成功通知
            const currentTab = window.currentActiveTab || 'unknown';
            console.log('安装完成，当前页面:', currentTab);
            
            if (currentTab !== 'downloads') {
              // 显示成功通知
              toastService.success(
                `MaiBot ${deployment.config.version} 安装成功！实例名称: ${deployment.config.instance_name}`,
                { duration: 8000 }
              );
            } else {
              console.log('当前在下载页面，不显示安装成功Toast');
            }

            // 如果支持系统通知，也发送系统通知（无论在哪个页面）
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("MaiBot 部署完成", {
                body: `实例 "${deployment.config.instance_name}" (${deployment.config.version}) 已成功安装`,
                icon: "/assets/icon.ico",
              });
            }
          } else {
            // 即使通知被禁用，也要检查当前页面
            const currentTab = window.currentActiveTab || 'unknown';
            if (currentTab !== 'downloads') {
              // 即使通知被禁用，仍然显示简单的成功消息
              toastService.success(
                `MaiBot ${deployment.config.version} 安装成功！`
              );            }
          }

          // 关闭部署Toast（如果存在）
          try {
            const { default: enhancedToastService } = await import('../services/enhancedToastService.js');
            if (downloadPageState.activeToastId && 
                downloadPageState.activeInstanceName === deployment.config.instance_name) {
              console.log('安装完成，关闭部署Toast，ID:', downloadPageState.activeToastId);
              enhancedToastService.completeDeployment(downloadPageState.activeToastId, true, '安装完成！');
              // 清理Toast状态
              clearPageSwitchToast();
            }
          } catch (error) {
            console.warn('无法导入enhancedToastService关闭Toast:', error);
          }

          // 停止轮询
          pollingStore.stopPolling(`deploy_status_${deploymentId}`);

          console.log(`部署 ${deploymentId} 安装完成，停止轮询`);
        } else if (status === "failed" || status === "error") {
          // 处理安装失败的情况
          deployment.installing = false;
          deployment.error = statusData.message || "安装失败";
          deployment.endTime = new Date();

          // 构建详细的错误信息
          let errorDetails = deployment.error;
          if (statusData.detail && statusData.detail !== statusData.message) {
            errorDetails += ` (详细: ${statusData.detail})`;
          }          addLog(deploymentId, `❌ 安装失败: ${errorDetails}`, "error");

          // 检查当前页面，只在非下载页面显示错误Toast
          const currentTab = window.currentActiveTab || 'unknown';
          console.log('安装失败，当前页面:', currentTab);
          
          if (currentTab !== 'downloads') {
            // 显示详细的错误Toast，持续时间更长
            toastService.error(`安装失败: ${errorDetails}`, { duration: 10000 });          } else {
            console.log('当前在下载页面，不显示安装失败Toast');
          }

          // 关闭部署Toast（如果存在）
          try {
            const { default: enhancedToastService } = await import('../services/enhancedToastService.js');
            if (downloadPageState.activeToastId && 
                downloadPageState.activeInstanceName === deployment.config.instance_name) {
              console.log('安装失败，关闭部署Toast，ID:', downloadPageState.activeToastId);
              enhancedToastService.completeDeployment(downloadPageState.activeToastId, false, errorDetails);
              // 清理Toast状态
              clearPageSwitchToast();
            }
          } catch (error) {
            console.warn('无法导入enhancedToastService关闭Toast:', error);
          }

          // 停止轮询
          pollingStore.stopPolling(`deploy_status_${deploymentId}`);

          console.log(`部署 ${deploymentId} 安装失败，停止轮询`);
        } else {
          // 继续轮询，添加当前状态日志
          const statusText = status || "进行中";
          console.log(
            `部署 ${deploymentId} 状态: ${statusText} (${progress}%)`
          );
        }
      } else {
        console.warn(`部署 ${deploymentId} 收到空的状态数据`);
      }
    } catch (error) {
      console.error("检查安装状态失败:", error);

      // 构建详细的错误信息
      let errorMessage = error.message || "未知错误";
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.detail) {
          errorMessage += ` (详细: ${errorData.detail})`;
        } else if (errorData.message && errorData.message !== error.message) {
          errorMessage += ` (后端: ${errorData.message})`;
        }
      }

      addLog(deploymentId, `检查安装状态失败: ${errorMessage}`, "error");

      // 如果连续失败多次，停止轮询
      deployment.errorCount = (deployment.errorCount || 0) + 1;
      if (deployment.errorCount >= 5) {
        console.warn(
          `部署 ${deploymentId} 连续失败 ${deployment.errorCount} 次，停止轮询`
        );
        pollingStore.stopPolling(`deploy_status_${deploymentId}`);
        deployment.installing = false;
        deployment.error = "状态检查失败";
        deployment.endTime = new Date();

        // 显示最终失败的详细Toast
        toastService.error(`部署失败: 状态检查连续失败，${errorMessage}`, {
          duration: 12000,
        });
      }
    }
  };  // **修复3: 优化部署启动逻辑，避免重复轮询**
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

    // 准备部署数据用于Toast显示
    const deploymentData = {
      instanceName: config.instance_name,
      version: config.version,
      image: `maimai:${config.version}`,
      port: config.port || "8000",
      napcatPort: "8095", // 默认napcat端口
      installPath: config.install_path,
      webPort: config.port || "8000",
    };

    // 动态导入enhancedToastService来显示部署Toast
    let deploymentToastId = null;
    try {
      const { default: enhancedToastService } = await import('../services/enhancedToastService.js');
      deploymentToastId = enhancedToastService.showDeploymentToast(deploymentData);
      console.log('创建部署Toast，ID:', deploymentToastId);
      
      // 如果Toast ID有效（不是-1，即不在下载页面），注册到downloadPageState
      if (deploymentToastId && deploymentToastId !== -1) {
        downloadPageState.activeToastId = deploymentToastId;
        downloadPageState.activeInstanceName = config.instance_name;
        console.log('注册部署Toast到downloadPageState:', { 
          toastId: deploymentToastId, 
          instanceName: config.instance_name 
        });
      }
    } catch (error) {
      console.warn('无法导入enhancedToastService:', error);
    }

    // 如果启用了通知且支持系统通知，请求权限
    const notificationsEnabled =
      localStorage.getItem("deploymentNotifications") !== "false";
    if (
      notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.log("通知权限请求失败:", error);
      }
    }

    try {
      // 准备部署配置
      addLog(deploymentId, "⚙️ 步骤 1/2: 准备部署配置...", "info");

      const deployConfig = { ...config };

      console.log("发送部署请求，配置:", deployConfig);
      addLog(
        deploymentId,
        `📋 部署配置: 实例名="${config.instance_name}", 版本="${config.version}", 路径="${config.install_path}"`,
        "info"
      );

      // 发送部署请求
      addLog(deploymentId, "🚀 步骤 2/2: 发送部署请求...", "info");
      addLog(deploymentId, "📤 使用HTTP请求发送部署配置...", "info");
      const deployResponse = await deployApi.deploy(deployConfig);

      console.log("部署响应详情:", deployResponse);
      addLog(
        deploymentId,
        `📤 收到部署响应: ${JSON.stringify(deployResponse)}`,
        "info"
      );

      // 修复响应检查逻辑 - 处理嵌套的 data 字段和多种成功判断条件
      const responseData = deployResponse?.data || deployResponse;
      console.log("解析后的响应数据:", responseData);
      
      // 检查成功标志 - 支持多种成功指示，修复对"部署任务已启动"消息的判断
      const isSuccess = responseData && (
        responseData.success === true || 
        responseData.success === "true" ||
        (responseData.message && responseData.message.includes("部署任务已启动")) ||
        (responseData.message && responseData.message.includes("已启动") && responseData.instance_id)
      );
      
      console.log(`部署成功判断: isSuccess=${isSuccess}, success=${responseData?.success}, message=${responseData?.message}, instance_id=${responseData?.instance_id}`);
      
      if (!isSuccess) {
        const errorMessage =
          responseData?.message || responseData?.detail || "部署失败";
        const detailMessage = responseData?.detail
          ? ` (详细: ${responseData.detail})`
          : "";
        const fullErrorMessage = `${errorMessage}${detailMessage}`;
        addLog(deploymentId, `❌ 部署失败: ${fullErrorMessage}`, "error");

        // 显示详细的错误Toast，持续时间更长
        toastService.error(fullErrorMessage, { duration: 8000 });
        throw new Error(fullErrorMessage);
      }

      // 检查是否有 instance_id
      if (!responseData.instance_id) {
        addLog(
          deploymentId,
          "⚠️ 警告: 响应中没有实例ID，但部署可能成功",
          "warning"
        );
      }

      deployment.instanceId = responseData.instance_id;
      
      // 修复日志级别：根据消息内容决定日志级别
      const logLevel = responseData.message && responseData.message.includes("部署任务已启动") ? 'info' : 'success';
      addLog(
        deploymentId,
        `✅ 部署任务已提交，实例ID: ${deployment.instanceId || "未知"}`,
        logLevel
      );
      addLog(deploymentId, `📝 后端响应: ${responseData.message}`, "info");
      addLog(deploymentId, "🔄 启动状态轮询检查...", "info");      // **修复4: 统一轮询管理，避免重复轮询**
      const pollingTaskName = `deploy_status_${deploymentId}`;
      console.log(
        `🔄 [调试] 准备注册轮询任务: ${pollingTaskName}，部署ID: ${deploymentId}`
      );
      
      // 调试信息：检查 pollingStore 对象
      console.log('🔄 [调试] pollingStore 对象:', pollingStore);
      console.log('🔄 [调试] pollingStore.pollingTasks:', pollingStore.pollingTasks);
      console.log('🔄 [调试] pollingTasks 类型:', typeof pollingStore.pollingTasks);
      
      // 确保不会重复注册轮询 - 使用正确的API检查轮询任务是否存在
      if (pollingStore.pollingTasks.has(pollingTaskName)) {
        console.log(`⚠️ [调试] 轮询任务 ${pollingTaskName} 已存在，跳过注册`);
      } else {
        console.log(`🆕 [调试] 开始注册新的轮询任务: ${pollingTaskName}`);
        
        // 先注册轮询任务
        pollingStore.registerPollingTask(pollingTaskName, async () => {
          console.log(`🔄 [调试] 执行轮询回调: ${pollingTaskName}`);
          await checkInstallStatus(deploymentId);
        }, {
          interval: 5000, // 每5秒检查一次，减少重复日志
          enabled: true,
          priority: "high"
        });
        
        // 然后启动轮询
        const startResult = pollingStore.startPolling(pollingTaskName);
        console.log(`✅ [调试] 轮询任务注册和启动结果: ${startResult}`);
      }return {
        success: true,
        deploymentId,
        instanceId: deployment.instanceId,
        message: responseData.message || "部署已启动",
      };    } catch (error) {
      console.error("部署失败:", error);
      deployment.installing = false;
      deployment.error = error.message;
      deployment.endTime = new Date();

      addLog(deploymentId, `❌ 部署启动失败: ${error.message}`, "error");
      
      // 关闭部署Toast（如果存在）
      try {
        const { default: enhancedToastService } = await import('../services/enhancedToastService.js');
        if (deploymentToastId && deploymentToastId !== -1) {
          console.log('部署启动失败，关闭部署Toast，ID:', deploymentToastId);
          enhancedToastService.completeDeployment(deploymentToastId, false, error.message);
        }
        // 清理Toast状态
        clearPageSwitchToast();
      } catch (toastError) {
        console.warn('无法导入enhancedToastService关闭Toast:', toastError);
      }
      
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
  // 切换自动滚动
  const toggleAutoScroll = () => {
    autoScrollEnabled.value = !autoScrollEnabled.value;
    if (autoScrollEnabled.value) {
      // 如果启用自动滚动，立即触发一次滚动
      scrollTrigger.value++;
    }
  };

  // 手动滚动到底部
  const scrollToBottom = () => {
    scrollTrigger.value++;
  };

  // 清理所有连接和轮询
  const cleanup = () => {
    // 停止所有轮询
    deployments.forEach((_, id) => {
      pollingStore.stopPolling(`deploy_status_${id}`);
    });

    // 清空状态
    deployments.clear();
    currentDeploymentId.value = null;
  };  // Toast管理方法
  const registerPageSwitchToast = (instanceName, toastId) => {
    console.log('注册页面切换Toast:', { instanceName, toastId });
    downloadPageState.activeToastId = toastId;
    downloadPageState.activeInstanceName = instanceName;
  };

  const clearPageSwitchToast = () => {
    console.log('清理页面切换Toast:', { 
      toastId: downloadPageState.activeToastId, 
      instanceName: downloadPageState.activeInstanceName 
    });
    downloadPageState.activeToastId = null;
    downloadPageState.activeInstanceName = null;
  };
  
  return {
    // 状态
    availableVersions,
    availableServices,
    deployments,
    currentDeploymentId,
    currentDeployment,
    isDeploying,
    autoScrollEnabled,
    scrollTrigger,
    downloadPageState, // 暴露下载页状态管理
    
    // 方法
    fetchVersions,
    fetchServices,
    createDeployment,
    startDeployment,
    cancelDeployment,
    addLog,
    clearLogs,
    updateDeploymentProgress,
    setDeploymentStatus,
    cleanupDeployments,
    getDeploymentHistory,
    cleanup,
    toggleAutoScroll,
    scrollToBottom,
    
    // Toast管理方法
    registerPageSwitchToast,
    clearPageSwitchToast,
  };
});

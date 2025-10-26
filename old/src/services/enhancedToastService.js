import { h, createApp } from "vue";
import EnhancedToast from "../components/common/EnhancedToast.vue";

/**
 * 增强的Toast服务
 * 支持小、中、大三种尺寸
 * 支持部署进度显示和详细信息展开
 */

class EnhancedToastService {
  constructor() {
    this.container = null;
    this.toastId = 0;
    this.toasts = new Map(); // 使用Map管理Toast实例
    this.initialized = false;
  }

  /**
   * 显示Toast消息
   * @param {string} message 显示的消息
   * @param {Object} options 配置选项
   * @returns {number} toast ID
   */
  show(message, options = {}) {
    this.init();

    const {
      type = "info",
      duration = 3000,
      size = "small", // small, medium, large
      closable = true,
      autoClose = true,
      deploymentData = null, // 部署相关数据
      errorDetails = null, // 错误详情数据
      expandable = false, // 是否可展开
      onClose = null,
      onExpand = null,
    } = options;

    const id = ++this.toastId;

    try {
      // 创建Vue应用实例
      const toastApp = createApp(EnhancedToast, {
        id,
        message,
        type,
        duration,
        size,
        closable,
        autoClose,
        deploymentData,
        errorDetails,
        expandable,
        onClose: (toastId) => {
          this.close(toastId);
          if (onClose) onClose(toastId);
        },
        onExpand: (toastId, expanded) => {
          const toast = this.toasts.get(toastId);
          if (toast) {
            toast.expanded = expanded;
          }
          if (onExpand) onExpand(toastId, expanded);
        },        onProgressUpdate: (toastId, progress) => {
          // 这里不需要再次调用updateProgress，避免递归
          console.log(`Toast ${toastId} 进度更新回调: ${progress}%`);
        }
      });

      // 创建容器元素
      const toastElement = document.createElement("div");
      toastElement.id = `enhanced-toast-${id}`;
      
      // 挂载Vue应用
      const instance = toastApp.mount(toastElement);
      
      // 添加到容器
      this.container.appendChild(toastElement);

      // 保存Toast实例信息
      const toastObj = {
        id,
        element: toastElement,
        instance,
        app: toastApp,
        type,
        size,
        expanded: false,
        deploymentData,
        startTime: Date.now(),
        duration,
        autoClose,
        updateProgress: (progress) => {
          if (instance && instance.updateProgress) {
            instance.updateProgress(progress);
          }
        },
        updateDeploymentData: (data) => {
          if (instance && instance.updateDeploymentData) {
            instance.updateDeploymentData(data);
          }
        }
      };

      this.toasts.set(id, toastObj);

      console.log(`创建增强Toast [${id}] - 类型: ${type}, 尺寸: ${size}`);
      return id;

    } catch (error) {
      console.error("创建增强Toast失败:", error);
      return -1;
    }
  }  /**
   * 显示部署Toast
   * @param {Object} deploymentData 部署数据
   * @param {Object} options 额外选项
   * @returns {number} toast ID，如果在下载页面返回-1
   */
  showDeploymentToast(deploymentData, options = {}) {
    const { instanceName, port, image, targetPage = null } = deploymentData;
    
    // 检查当前页面，如果在下载页则不显示Toast
    const currentTab = this.getCurrentActiveTab();
    console.log('showDeploymentToast - 当前页面:', currentTab);
    
    if (currentTab === 'downloads') {
      console.log('当前在下载页，不显示部署Toast，使用页面内安装界面');
      // 触发自定义事件，通知下载页面组件开始显示安装进度
      window.dispatchEvent(new CustomEvent('deployment-started-in-downloads', {
        detail: { deploymentData, isInDownloadPage: true }
      }));
      return -1; // 特殊返回值，表示在下载页面
    }

    // 完整的部署数据
    const fullDeploymentData = {
      instanceName,
      port,
      image,
      progress: 0,
      status: '准备开始安装...',
      lastUpdate: new Date().toLocaleTimeString(),
      servicesProgress: [],
      ...deploymentData
    };

    const defaultOptions = {
      type: "info",
      size: "medium",
      duration: 0, // 不自动关闭
      autoClose: false,
      expandable: true,
      deploymentData: fullDeploymentData,
    };

    console.log('在非下载页面显示部署Toast');
    return this.show(
      `正在安装实例 "${instanceName}"...`,
      { ...defaultOptions, ...options }
    );
  }  /**
   * 当用户从下载页面切换到其他页面时，显示部署Toast
   * @param {Object} deploymentData 部署数据
   * @param {number} currentProgress 当前进度
   * @param {string} currentStatus 当前状态
   * @returns {number} toast ID
   */
  showDeploymentToastOnPageSwitch(deploymentData, currentProgress = 0, currentStatus = '安装中...') {
    const { instanceName } = deploymentData;
    
    // 检查是否已经有相同实例的部署Toast存在
    const existingToast = this.getDeploymentToast(instanceName);
    if (existingToast) {
      console.log(`实例 "${instanceName}" 的部署Toast已存在，ID: ${existingToast.id}，更新进度而不是创建新的`);
      
      // 更新现有Toast的进度
      this.updateDeploymentProgress(existingToast.id, currentProgress, currentStatus);
      return existingToast.id;
    }
    
    // 完整的部署数据
    const fullDeploymentData = {
      progress: currentProgress,
      status: currentStatus,
      lastUpdate: new Date().toLocaleTimeString(),
      servicesProgress: [],
      ...deploymentData
    };

    const options = {
      type: "info",
      size: "medium",
      duration: 0, // 不自动关闭
      autoClose: false,
      expandable: true,
      deploymentData: fullDeploymentData,
    };

    console.log('用户切换页面，显示部署Toast，当前进度:', currentProgress);
    const toastId = this.show(
      `正在安装实例 "${instanceName}"... (${currentProgress}%)`,
      options
    );

    // 如果有当前进度，立即更新
    if (currentProgress > 0) {
      setTimeout(() => {
        this.updateDeploymentProgress(toastId, currentProgress, currentStatus);
      }, 100);
    }

    return toastId;
  }

  /**
   * 获取当前活跃的标签页
   * @returns {string} 当前标签页名称
   */
  getCurrentActiveTab() {
    // 优先从window.currentActiveTab获取
    if (window.currentActiveTab) {
      console.log('从 window.currentActiveTab 获取当前页面:', window.currentActiveTab);
      return window.currentActiveTab;
    }
    
    // 尝试从Vue应用实例获取
    if (window.__VUE_APP__ && window.__VUE_APP__.activeTab) {
      console.log('从 Vue应用实例 获取当前页面:', window.__VUE_APP__.activeTab);
      return window.__VUE_APP__.activeTab;
    }
    
    // 尝试从DOM获取侧边栏活跃状态
    const activeElement = document.querySelector('.sidebar .menu li a.active');
    if (activeElement) {
      // 通过href或其他属性推断页面
      const href = activeElement.getAttribute('href');
      const onclick = activeElement.getAttribute('onclick');
      
      // 根据菜单项文本内容推断页面
      const text = activeElement.textContent?.trim();
      if (text?.includes('下载中心')) return 'downloads';
      if (text?.includes('实例管理')) return 'instances';
      if (text?.includes('仪表盘')) return 'home';
      if (text?.includes('聊天室')) return 'chat';
      if (text?.includes('插件')) return 'plugins';
    }
    
    // 尝试从URL路径推断
    const path = window.location.pathname;
    if (path.includes('downloads')) return 'downloads';
    if (path.includes('instances')) return 'instances';
    if (path.includes('chat')) return 'chat';
    if (path.includes('plugins')) return 'plugins';
    
    // 默认返回home
    console.warn('无法获取当前活跃标签，默认为home');
    return 'home';
  }
  /**
   * 更新部署进度
   * @param {number} toastId Toast ID
   * @param {number} progress 进度百分比 (0-100)
   * @param {string} status 当前状态
   * @param {Array} servicesProgress 服务进度列表
   */
  updateDeploymentProgress(toastId, progress, status = "", servicesProgress = []) {
    const toast = this.toasts.get(toastId);
    if (!toast) {
      console.warn(`Toast ${toastId} 不存在，无法更新进度`);
      return;
    }

    console.log(`更新Toast ${toastId} 进度:`, { progress, status, servicesProgress });

    // 更新进度
    if (toast.updateProgress) {
      toast.updateProgress(progress);
    }

    // 构建完整的部署数据
    const updatedData = {
      ...toast.deploymentData,
      progress,
      status,
      servicesProgress,
      lastUpdate: new Date().toLocaleTimeString()
    };

    // 更新部署数据
    if (toast.updateDeploymentData) {
      toast.updateDeploymentData(updatedData);
    }

    // 同步更新存储的部署数据
    toast.deploymentData = updatedData;
    
    console.log(`Toast ${toastId} 进度更新完成:`, updatedData);
  }

  /**
   * 完成部署
   * @param {number} toastId Toast ID
   * @param {boolean} success 是否成功
   * @param {string} message 完成消息
   */
  completeDeployment(toastId, success = true, message = "") {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    const finalMessage = message || (success ? "安装完成！" : "安装失败");
    const finalType = success ? "success" : "error";

    // 更新Toast状态
    if (toast.instance && toast.instance.complete) {
      toast.instance.complete(finalType, finalMessage);
    }

    // 成功后3秒自动关闭，失败后需要手动关闭
    if (success) {
      setTimeout(() => {
        this.close(toastId);
      }, 3000);
    }
  }

  /**
   * 关闭Toast
   * @param {number} id Toast ID
   */
  close(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    console.log(`关闭增强Toast [${id}]`);

    try {
      // 卸载Vue应用
      if (toast.app) {
        toast.app.unmount();
      }

      // 移除DOM元素
      if (toast.element && toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }

      // 从Map中移除
      this.toasts.delete(id);
    } catch (error) {
      console.error(`关闭Toast [${id}] 时出错:`, error);
    }
  }

  /**
   * 关闭所有Toast
   */
  closeAll() {
    const toastIds = Array.from(this.toasts.keys());
    toastIds.forEach(id => this.close(id));
  }

  /**
   * 获取指定部署的Toast
   * @param {string} instanceName 实例名称
   * @returns {Object|null} Toast对象
   */
  getDeploymentToast(instanceName) {
    for (const [id, toast] of this.toasts) {
      if (toast.deploymentData && toast.deploymentData.instanceName === instanceName) {
        return { id, ...toast };
      }
    }
    return null;
  }

  /**
   * 快捷方法：显示小尺寸Toast
   */
  small(message, options = {}) {
    return this.show(message, { ...options, size: "small" });
  }

  /**
   * 快捷方法：显示中尺寸Toast
   */
  medium(message, options = {}) {
    return this.show(message, { ...options, size: "medium" });
  }

  /**
   * 快捷方法：显示大尺寸Toast
   */
  large(message, options = {}) {
    return this.show(message, { ...options, size: "large" });
  }

  /**
   * 快捷方法: 显示成功消息
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: "success" });
  }

  /**
   * 快捷方法: 显示错误消息
   */
  error(message, options = {}) {
    const defaultOptions = {
      type: "error",
      duration: options.duration || 8000,
    };
    return this.show(message, { ...defaultOptions, ...options });
  }

  /**
   * 快捷方法: 显示警告消息
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: "warning" });
  }

  /**
   * 快捷方法: 显示信息消息
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: "info" });
  }

  /**
   * 显示错误信息的便捷方法
   * @param {string} message 错误消息
   * @param {Error|Object} error 错误对象或错误详情
   * @param {Object} options 额外选项
   * @returns {number} toast ID
   */
  showError(message, error = null, options = {}) {
    let errorDetails = null;

    // 处理错误对象
    if (error) {
      if (error instanceof Error) {
        // 标准 Error 对象
        errorDetails = {
          stack: error.stack,
          context: {
            name: error.name,
            message: error.message,
            fileName: error.fileName,
            lineNumber: error.lineNumber,
            columnNumber: error.columnNumber
          },
          suggestions: this.getErrorSuggestions(error)
        };
      } else if (typeof error === 'object') {
        // 自定义错误详情对象
        errorDetails = error;
      } else if (typeof error === 'string') {
        // 简单字符串错误
        errorDetails = {
          context: { details: error }
        };
      }
    }

    const defaultOptions = {
      type: 'error',
      size: 'medium',
      duration: 8000, // 错误消息显示更久
      autoClose: true,
      expandable: !!errorDetails,
      errorDetails
    };

    return this.show(message, { ...defaultOptions, ...options });
  }

  /**
   * 根据错误类型生成建议解决方案
   * @param {Error} error 错误对象
   * @returns {Array} 建议列表
   */
  getErrorSuggestions(error) {
    const suggestions = [];

    if (error.name === 'ReferenceError') {
      suggestions.push('检查变量是否已正确定义和导入');
      suggestions.push('确认函数或模块是否已正确引入');
    } else if (error.name === 'TypeError') {
      suggestions.push('检查变量类型是否正确');
      suggestions.push('确认对象或数组是否已正确初始化');
    } else if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      suggestions.push('检查网络连接是否正常');
      suggestions.push('确认后端服务是否运行');
      suggestions.push('检查API地址是否正确');
    } else if (error.message?.includes('path') || error.message?.includes('Path')) {
      suggestions.push('检查文件路径是否正确');
      suggestions.push('确认文件或目录是否存在');
      suggestions.push('检查路径格式是否符合操作系统要求');
    }

    // 通用建议
    if (suggestions.length === 0) {
      suggestions.push('刷新页面重试');
      suggestions.push('检查控制台是否有更多错误信息');
      suggestions.push('如果问题持续存在，请联系技术支持');
    }

    return suggestions;
  }

  /**
   * 初始化Toast容器
   */
  init() {
    if (this.initialized) return;

    try {
      // 创建增强toast容器
      this.container = document.createElement("div");
      this.container.id = "enhanced-toast-container";
      this.container.style.position = "fixed";
      this.container.style.bottom = "20px";
      this.container.style.right = "20px";
      this.container.style.zIndex = "10000"; // 比普通toast更高
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column-reverse";
      this.container.style.maxWidth = "480px"; // 限制最大宽度
      this.container.style.gap = "12px";
      
      document.body.appendChild(this.container);
      this.initialized = true;
      console.log("增强Toast服务初始化成功");
    } catch (error) {
      console.error("初始化增强Toast容器失败:", error);
    }
  }

  /**
   * 关闭指定实例的部署Toast
   * @param {string} instanceName 实例名称
   * @returns {boolean} 是否找到并关闭了Toast
   */
  closeDeploymentToast(instanceName) {
    const deploymentToast = this.getDeploymentToast(instanceName);
    if (deploymentToast) {
      console.log(`关闭实例 "${instanceName}" 的部署Toast，ID: ${deploymentToast.id}`);
      this.close(deploymentToast.id);
      return true;
    }
    return false;
  }

  /**
   * 确保Toast进度更新，如果Toast不存在则尝试查找或创建
   * @param {string} instanceName 实例名称
   * @param {number} progress 进度百分比
   * @param {string} status 当前状态
   * @param {Array} servicesProgress 服务进度列表
   * @returns {boolean} 是否成功更新
   */
  ensureDeploymentProgressUpdate(instanceName, progress, status = "", servicesProgress = []) {
    // 先尝试通过实例名查找现有Toast
    const existingToast = this.getDeploymentToast(instanceName);
    
    if (existingToast) {
      console.log(`找到实例 "${instanceName}" 的Toast，更新进度:`, { toastId: existingToast.id, progress });
      this.updateDeploymentProgress(existingToast.id, progress, status, servicesProgress);
      return true;
    }
    
    console.log(`未找到实例 "${instanceName}" 的Toast，无法更新进度`);
    return false;
  }
}

// 导出单例
const enhancedToastService = new EnhancedToastService();
export default enhancedToastService;

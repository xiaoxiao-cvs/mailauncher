import { h, createApp } from "vue";
import ToastMessage from "../components/common/ToastMessage.vue";

/**
 * 提供Toast提示功能的服务
 * 更简单直接的实现，避免渲染问题
 */

class ToastService {
  constructor() {
    this.container = null;
    this.toastId = 0;
    this.toasts = [];
    this.initialized = false;
  }

  /**
   * 显示Toast消息
   * @param {string} message 显示的消息
   * @param {Object} options 配置选项
   * @returns {number} toast ID
   */
  show(message, options = {}) {
    // 确保容器初始化
    this.init();

    const type = options.type || "info";
    const duration = options.duration || 3000;
    const id = ++this.toastId;

    try {
      // 创建toast元素
      const toast = document.createElement("div");
      toast.id = `toast-${id}`;
      toast.className = `toast-item toast-${type}`;

      // 检测暗色模式并应用相应的背景和文字颜色
      const isDarkMode =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.classList.contains("dark-mode");

      if (isDarkMode) {
        toast.style.backgroundColor = "#2a2e37"; // 暗色背景
        toast.style.color = "#ffffff"; // 白色文字
      } else {
        toast.style.backgroundColor = "white"; // 浅色背景
        toast.style.color = "#333"; // 深色文字
      }
      toast.style.borderRadius = "8px";

      // 根据暗色模式调整阴影效果
      toast.style.boxShadow = isDarkMode
        ? "0 4px 12px rgba(0, 0, 0, 0.3)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)";

      toast.style.padding = "12px 36px 12px 16px";
      toast.style.marginBottom = "10px";
      toast.style.position = "relative";
      toast.style.minWidth = "320px"; // 增加最小宽度
      toast.style.maxWidth = "500px"; // 增加最大宽度以容纳更多文本
      toast.style.overflow = "hidden";
      toast.style.animation = "toastInBottom 0.3s ease forwards";
      toast.style.display = "flex";
      toast.style.alignItems = "center";
      toast.style.cursor = "default"; // 默认鼠标样式      // 创建关闭按钮 - 在左侧且垂直居中
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = "×"; // 使用innerHTML以便可以放入更复杂的图标
      closeBtn.className = "toast-close-btn";
      closeBtn.style.position = "absolute";
      closeBtn.style.left = "12px"; // 放在左侧
      closeBtn.style.top = "50%"; // 垂直居中
      closeBtn.style.transform = "translateY(-50%)"; // 确保完全垂直居中
      closeBtn.style.background = "transparent";
      closeBtn.style.border = "none";
      closeBtn.style.fontSize = "20px";
      closeBtn.style.fontWeight = "bold";
      closeBtn.style.cursor = "pointer";

      // 根据暗色模式设置关闭按钮颜色
      closeBtn.style.color = isDarkMode ? "#ffffff" : "#666";

      closeBtn.style.padding = "0";
      closeBtn.style.margin = "0";
      closeBtn.style.width = "24px";
      closeBtn.style.height = "24px";
      closeBtn.style.display = "flex";
      closeBtn.style.alignItems = "center";
      closeBtn.style.justifyContent = "center";
      closeBtn.style.borderRadius = "50%"; // 圆形按钮
      closeBtn.style.transition = "all 0.2s ease"; // 添加过渡效果
      closeBtn.style.opacity = "0.7"; // 默认半透明

      // 悬停效果
      closeBtn.onmouseenter = () => {
        closeBtn.style.backgroundColor = isDarkMode
          ? "rgba(255,255,255,0.1)"
          : "rgba(0,0,0,0.1)";
        closeBtn.style.opacity = "1";
        closeBtn.style.transform = "translateY(-50%) scale(1.1)";
      };
      closeBtn.onmouseleave = () => {
        closeBtn.style.backgroundColor = "transparent";
        closeBtn.style.opacity = "0.7";
        closeBtn.style.transform = "translateY(-50%) scale(1)";
      };

      // 点击关闭效果
      closeBtn.onmousedown = () => {
        closeBtn.style.transform = "translateY(-50%) scale(0.95)";
      };
      closeBtn.onmouseup = () => {
        closeBtn.style.transform = "translateY(-50%) scale(1.1)";
      };

      closeBtn.onclick = () => {
        // 添加关闭动画并延迟关闭
        toast.style.animation = "toastOutBottom 0.3s ease forwards";
        setTimeout(() => this.close(id), 300);
      };

      toast.appendChild(closeBtn); // 创建消息内容容器
      const messageEl = document.createElement("div");
      messageEl.className = "toast-message";
      messageEl.textContent = message;
      messageEl.style.marginLeft = "24px"; // 为左侧关闭按钮留出空间
      messageEl.style.flex = "1";
      messageEl.style.wordWrap = "break-word"; // 长文本换行
      messageEl.style.wordBreak = "break-word"; // 强制换行长单词
      messageEl.style.lineHeight = "1.4"; // 增加行高提高可读性
      messageEl.style.maxHeight = "120px"; // 限制最大高度
      messageEl.style.overflowY = "auto"; // 超出时显示滚动条
      toast.appendChild(messageEl); // 添加进度条容器
      const progressContainer = document.createElement("div");
      progressContainer.style.position = "absolute";
      progressContainer.style.bottom = "0";
      progressContainer.style.left = "0";
      progressContainer.style.width = "100%";
      progressContainer.style.height = "3px";

      // 根据暗色模式调整进度条容器背景色
      progressContainer.style.backgroundColor = isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)";

      toast.appendChild(progressContainer);

      // 创建进度条元素
      const progressBar = document.createElement("div");
      progressBar.id = `toast-progress-${id}`;
      progressBar.className = "toast-progress";
      progressBar.style.height = "100%";
      progressBar.style.width = "100%"; // 初始宽度为100%
      progressBar.style.backgroundColor = this.getColorForType(type);
      progressContainer.appendChild(progressBar);

      // 添加到容器
      this.container.appendChild(toast);

      // 保存toast实例
      const toastObj = {
        id,
        el: toast,
        progressBar,
        timeoutId: null,
        startTime: Date.now(),
        duration,
        remainingTime: duration, // 记录剩余时间
        isPaused: false, // 暂停状态标志
      };
      this.toasts.push(toastObj);

      // 开始进度条动画
      this.startProgressAnimation(toastObj);

      // 设置自动关闭
      toastObj.timeoutId = setTimeout(() => {
        toast.style.animation = "toastOutBottom 0.3s ease forwards";
        setTimeout(() => this.close(id), 300);
      }, duration);

      // 鼠标悬停暂停 & 离开恢复
      toast.addEventListener("mouseenter", () => {
        this.pauseToast(toastObj);
      });

      toast.addEventListener("mouseleave", () => {
        this.resumeToast(toastObj);
      });

      // 添加动画样式
      this.ensureAnimationStylesExist();

      return id;
    } catch (e) {
      console.error("创建Toast失败:", e);
      return -1;
    }
  }

  /**
   * 暂停Toast
   * @param {Object} toastObj Toast对象
   */
  pauseToast(toastObj) {
    if (!toastObj || toastObj.isPaused) return;

    // 标记为暂停状态
    toastObj.isPaused = true;

    // 清除自动关闭定时器
    if (toastObj.timeoutId) {
      clearTimeout(toastObj.timeoutId);
      toastObj.timeoutId = null;

      // 计算剩余时间
      const elapsedTime = Date.now() - toastObj.startTime;
      toastObj.remainingTime = Math.max(0, toastObj.duration - elapsedTime);
    }

    // 暂停进度条动画
    if (toastObj.progressBar) {
      // 获取当前进度
      const computedStyle = getComputedStyle(toastObj.progressBar);
      const currentWidth = computedStyle.width;
      const parentWidth = toastObj.progressBar.parentElement.offsetWidth;
      const widthPercent = (parseFloat(currentWidth) / parentWidth) * 100;

      // 暂停动画
      toastObj.progressBar.style.transition = "none";
      toastObj.progressBar.style.width = `${widthPercent}%`;
    }

    // 视觉反馈 - 轻微放大，添加微光效果
    toastObj.el.style.transform = "scale(1.02)";
    toastObj.el.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
    toastObj.el.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
  }

  /**
   * 恢复Toast
   * @param {Object} toastObj Toast对象
   */
  resumeToast(toastObj) {
    if (!toastObj || !toastObj.isPaused) return;

    // 更新开始时间
    toastObj.startTime = Date.now();
    toastObj.isPaused = false;

    // 恢复视觉状态
    toastObj.el.style.transform = "scale(1)";
    toastObj.el.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";

    // 恢复进度条动画
    if (toastObj.progressBar && toastObj.remainingTime > 0) {
      // 获取当前宽度百分比
      const computedStyle = getComputedStyle(toastObj.progressBar);
      const currentWidth = computedStyle.width;
      const parentWidth = toastObj.progressBar.parentElement.offsetWidth;
      const widthPercent = (parseFloat(currentWidth) / parentWidth) * 100;

      // 使用剩余时间重新设置过渡动画
      void toastObj.progressBar.offsetWidth; // 强制重排
      toastObj.progressBar.style.transition = `width ${toastObj.remainingTime}ms linear`;
      toastObj.progressBar.style.width = "0";
    }

    // 重新设置自动关闭
    if (toastObj.remainingTime > 0) {
      toastObj.timeoutId = setTimeout(() => {
        toastObj.el.style.animation = "toastOutBottom 0.3s ease forwards";
        setTimeout(() => this.close(toastObj.id), 300);
      }, toastObj.remainingTime);
    }
  }

  /**
   * 确保动画样式已添加到文档
   */
  ensureAnimationStylesExist() {
    if (!document.getElementById("toast-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "toast-styles";
      styleEl.textContent = `
        @keyframes toastInBottom {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastOutBottom {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
        .toast-close-btn:hover {
          background-color: rgba(0,0,0,0.1);
          opacity: 1;
          transform: translateY(-50%) scale(1.1);
        }
        .toast-close-btn:active {
          transform: translateY(-50%) scale(0.95);
        }
        .toast-progress {
          transition: width linear;
        }
        /* 悬停提示效果 */
        .toast-item:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  /**
   * 开始进度条动画
   * @param {Object} toastObj Toast对象
   */
  startProgressAnimation(toastObj) {
    if (!toastObj || !toastObj.progressBar) return;

    const duration = toastObj.duration;

    // 强制重排，确保浏览器应用初始状态
    void toastObj.progressBar.offsetWidth;

    // 设置CSS过渡
    toastObj.progressBar.style.transition = `width ${duration}ms linear`;

    // 设置宽度为0，触发动画
    requestAnimationFrame(() => {
      toastObj.progressBar.style.width = "0";
    });
  }

  /**
   * 获取指定类型的颜色
   * @param {string} type 提示类型
   * @returns {string} 颜色值
   */
  getColorForType(type) {
    // 使用固定颜色，避免HSL变量在某些情况下不生效
    const colors = {
      success: "#10B981", // 绿色
      error: "#EF4444", // 红色
      warning: "#F59E0B", // 黄色
      info: "#3B82F6", // 蓝色
    };
    return colors[type] || colors.info;
  }

  /**
   * 关闭Toast
   * @param {number} id Toast ID
   */
  close(id) {
    const index = this.toasts.findIndex((t) => t.id === id);
    if (index !== -1) {
      const toast = this.toasts[index];

      // 清除定时器
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }

      // 移除DOM元素
      if (toast.el.parentNode) {
        toast.el.parentNode.removeChild(toast.el);
      }

      // 从数组中移除
      this.toasts.splice(index, 1);
    }
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
    // 错误消息默认显示更长时间
    const defaultOptions = {
      type: "error",
      duration: options.duration || 8000, // 默认8秒，比普通消息更长
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
   * 初始化Toast容器
   */
  init() {
    if (this.initialized) return;

    try {
      // 创建toast容器 - 位置改为右下角
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.style.position = "fixed";
      this.container.style.bottom = "20px"; // 改为底部
      this.container.style.right = "20px"; // 保持在右侧
      this.container.style.zIndex = "9999";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column-reverse"; // 新消息在底部
      document.body.appendChild(this.container);
      this.initialized = true;
      console.log("Toast服务初始化成功");
    } catch (e) {
      console.error("初始化Toast容器失败:", e);
    }
  }
}

// 导出单例
const toastService = new ToastService();
export default toastService;

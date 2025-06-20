/**
 * 图表状态监控工具
 * 用于调试和监控ECharts图表的状态
 */

class ChartMonitor {
  constructor() {
    this.charts = new Map(); // 存储图表实例
    this.errors = []; // 存储错误记录
    // 检查是否为开发环境
    this.isEnabled = import.meta.env?.MODE === 'development' || 
                     (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
                     false;
  }

  /**
   * 注册图表实例
   * @param {string} id - 图表ID
   * @param {echarts.ECharts} chart - 图表实例
   * @param {Object} metadata - 元数据
   */
  register(id, chart, metadata = {}) {
    if (!this.isEnabled) return;
    
    this.charts.set(id, {
      chart,
      metadata,
      createdAt: new Date(),
      lastUpdate: new Date(),
      errorCount: 0
    });
    
    console.log(`📊 Chart registered: ${id}`, metadata);
  }

  /**
   * 取消注册图表实例
   * @param {string} id - 图表ID
   */
  unregister(id) {
    if (!this.isEnabled) return;
    
    if (this.charts.has(id)) {
      this.charts.delete(id);
      console.log(`🗑️ Chart unregistered: ${id}`);
    }
  }

  /**
   * 记录图表错误
   * @param {string} id - 图表ID
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  reportError(id, error, context = {}) {
    if (!this.isEnabled) return;
    
    const errorRecord = {
      id,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    };
    
    this.errors.push(errorRecord);
    
    // 更新图表错误计数
    if (this.charts.has(id)) {
      const chartInfo = this.charts.get(id);
      chartInfo.errorCount++;
      chartInfo.lastError = errorRecord;
    }
    
    console.error(`❌ Chart error in ${id}:`, error);
    console.warn('Context:', context);
  }

  /**
   * 验证图表健康状态
   * @param {string} id - 图表ID
   * @returns {Object} 健康状态报告
   */
  checkHealth(id) {
    if (!this.isEnabled) return { healthy: true };
    
    if (!this.charts.has(id)) {
      return { healthy: false, reason: 'Chart not registered' };
    }
    
    const chartInfo = this.charts.get(id);
    const { chart } = chartInfo;
    
    // 检查图表实例
    if (!chart || typeof chart.getOption !== 'function') {
      return { healthy: false, reason: 'Invalid chart instance' };
    }
    
    try {
      const option = chart.getOption();
      
      // 检查配置完整性
      if (!option.series || !Array.isArray(option.series) || option.series.length === 0) {
        return { healthy: false, reason: 'No series configured' };
      }
      
      // 检查series类型
      for (let i = 0; i < option.series.length; i++) {
        const series = option.series[i];
        if (!series.type) {
          return { healthy: false, reason: `Series[${i}] missing type` };
        }
      }
      
      return { 
        healthy: true, 
        errorCount: chartInfo.errorCount,
        lastUpdate: chartInfo.lastUpdate
      };
    } catch (error) {
      this.reportError(id, error, { action: 'health check' });
      return { healthy: false, reason: error.message };
    }
  }

  /**
   * 获取所有图表的状态概览
   * @returns {Object} 状态概览
   */
  getOverview() {
    if (!this.isEnabled) return {};
    
    const overview = {
      totalCharts: this.charts.size,
      totalErrors: this.errors.length,
      charts: {},
      recentErrors: this.errors.slice(-5) // 最近5个错误
    };
    
    this.charts.forEach((chartInfo, id) => {
      overview.charts[id] = {
        errorCount: chartInfo.errorCount,
        createdAt: chartInfo.createdAt,
        lastUpdate: chartInfo.lastUpdate,
        metadata: chartInfo.metadata
      };
    });
    
    return overview;
  }

  /**
   * 强制更新图表
   * @param {string} id - 图表ID
   * @param {Object} option - 新的配置选项
   */
  forceUpdate(id, option) {
    if (!this.isEnabled) return;
    
    if (!this.charts.has(id)) {
      console.warn(`Chart ${id} not found for force update`);
      return;
    }
    
    const chartInfo = this.charts.get(id);
    const { chart } = chartInfo;
    
    try {
      chart.setOption(option, true);
      chartInfo.lastUpdate = new Date();
      console.log(`🔄 Chart ${id} force updated`);
    } catch (error) {
      this.reportError(id, error, { action: 'force update', option });
    }
  }

  /**
   * 清除所有错误记录
   */
  clearErrors() {
    this.errors = [];
    this.charts.forEach((chartInfo) => {
      chartInfo.errorCount = 0;
      delete chartInfo.lastError;
    });
    console.log('🧹 Chart error records cleared');
  }

  /**
   * 导出调试信息
   * @returns {Object} 调试信息
   */
  exportDebugInfo() {
    if (!this.isEnabled) return {};
    
    return {
      overview: this.getOverview(),
      detailedErrors: this.errors,
      chartConfigs: Array.from(this.charts.entries()).map(([id, info]) => {
        try {
          return {
            id,
            option: info.chart.getOption(),
            metadata: info.metadata
          };
        } catch (error) {
          return {
            id,
            error: error.message,
            metadata: info.metadata
          };
        }
      })
    };
  }
}

// 创建全局实例
const chartMonitor = new ChartMonitor();

// 在开发环境中暴露到全局对象，方便调试
if (typeof window !== 'undefined' && 
    (import.meta.env?.MODE === 'development' || 
     (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'))) {
  window.chartMonitor = chartMonitor;
  console.log('📊 Chart Monitor enabled. Use window.chartMonitor to access debugging tools.');
}

export default chartMonitor;

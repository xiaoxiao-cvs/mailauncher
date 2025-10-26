/**
 * 图表调试工具
 * 提供在浏览器控制台中使用的调试功能
 */

// 导出调试工具函数到全局对象
if (typeof window !== 'undefined') {
  window.debugChart = {
    /**
     * 检查图表状态
     */
    checkChartStatus() {
      if (window.chartMonitor) {
        console.log('📊 Chart Monitor Overview:');
        console.table(window.chartMonitor.getOverview());
      } else {
        console.warn('Chart Monitor not available');
      }
    },

    /**
     * 导出调试信息
     */
    exportDebugInfo() {
      if (window.chartMonitor) {
        const info = window.chartMonitor.exportDebugInfo();
        console.log('🔍 Full Debug Info:', info);
        return info;
      } else {
        console.warn('Chart Monitor not available');
        return null;
      }
    },

    /**
     * 清除错误记录
     */
    clearErrors() {
      if (window.chartMonitor) {
        window.chartMonitor.clearErrors();
        console.log('🧹 Chart errors cleared');
      } else {
        console.warn('Chart Monitor not available');
      }
    },

    /**
     * 手动触发图表健康检查
     */
    checkHealth(chartId = 'homeMessageChart') {
      if (window.chartMonitor) {
        const health = window.chartMonitor.checkHealth(chartId);
        console.log(`🏥 Health check for ${chartId}:`, health);
        return health;
      } else {
        console.warn('Chart Monitor not available');
        return null;
      }
    },

    /**
     * 获取图表配置
     */
    getChartOption(chartId = 'homeMessageChart') {
      if (window.chartMonitor && window.chartMonitor.charts.has(chartId)) {
        const chartInfo = window.chartMonitor.charts.get(chartId);
        try {
          const option = chartInfo.chart.getOption();
          console.log(`⚙️ Chart option for ${chartId}:`, option);
          return option;
        } catch (error) {
          console.error(`❌ Failed to get option for ${chartId}:`, error);
          return null;
        }
      } else {
        console.warn(`Chart ${chartId} not found`);
        return null;
      }
    },

    /**
     * 测试图表数据
     */
    testChartData() {
      const testData = [10, 20, 30, 40, 50];
      const testLabels = ['A', 'B', 'C', 'D', 'E'];
      
      if (window.chartMonitor && window.chartMonitor.charts.has('homeMessageChart')) {
        const chartInfo = window.chartMonitor.charts.get('homeMessageChart');
        const testOption = {
          xAxis: { data: testLabels },
          series: [{
            data: testData,
            type: 'bar',
            name: 'Test Data'
          }]
        };
        
        try {
          chartInfo.chart.setOption(testOption);
          console.log('✅ Test data applied successfully');
          return true;
        } catch (error) {
          console.error('❌ Failed to apply test data:', error);
          return false;
        }
      } else {
        console.warn('Chart not available for testing');
        return false;
      }
    },

    /**
     * 显示帮助信息
     */
    help() {
      console.log(`
🔧 Chart Debug Tools Help:

• debugChart.checkChartStatus()     - 查看所有图表状态概览
• debugChart.exportDebugInfo()      - 导出详细调试信息
• debugChart.clearErrors()          - 清除错误记录
• debugChart.checkHealth(chartId)   - 检查指定图表健康状态
• debugChart.getChartOption(chartId) - 获取图表配置
• debugChart.testChartData()        - 应用测试数据
• debugChart.help()                 - 显示此帮助信息

默认图表ID: 'homeMessageChart'
      `);
    }
  };

  console.log('🔧 Chart debug tools loaded. Type debugChart.help() for available commands.');
}

export default {};

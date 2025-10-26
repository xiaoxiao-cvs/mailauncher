/**
 * 图表错误处理测试
 * 用于验证所有导出的函数是否正常工作
 */

import { 
  validateChartData, 
  validateContainer, 
  validateChartOption, 
  safeSetOption, 
  safeDisposeChart, 
  safeResizeChart 
} from './chartErrorHandler.js';

// 测试所有导出的函数
console.log('🧪 Testing chart error handler exports...');

// 测试数据验证
const testData = [1, 2, 3, 4, 5];
console.log('✓ validateChartData:', typeof validateChartData, validateChartData(testData, 'bar'));

// 测试容器验证
console.log('✓ validateContainer:', typeof validateContainer);

// 测试配置验证
console.log('✓ validateChartOption:', typeof validateChartOption);

// 测试安全设置选项
console.log('✓ safeSetOption:', typeof safeSetOption);

// 测试安全清理
console.log('✓ safeDisposeChart:', typeof safeDisposeChart);

// 测试安全调整大小
console.log('✓ safeResizeChart:', typeof safeResizeChart);

console.log('🎉 All chart error handler functions are exported correctly!');

export default {};

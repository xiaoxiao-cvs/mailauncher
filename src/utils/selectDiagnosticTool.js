/**
 * 下拉框显示问题诊断工具
 */

class SelectDiagnosticTool {
  /**
   * 诊断当前页面的所有选择框
   */
  static diagnose() {
    console.group('🔍 下拉框显示问题诊断报告');
    
    const selects = document.querySelectorAll('select, .select');
    const report = {
      totalSelects: selects.length,
      visibleSelects: 0,
      hiddenSelects: 0,
      transparentSelects: 0,
      problems: []
    };

    selects.forEach((select, index) => {
      const computedStyle = getComputedStyle(select);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      const display = computedStyle.display;
      const visibility = computedStyle.visibility;
      const opacity = computedStyle.opacity;

      console.log(`选择框 #${index + 1}:`, {
        element: select,
        color,
        backgroundColor,
        display,
        visibility,
        opacity,
        textContent: select.textContent || '空'
      });

      // 检查是否可见
      if (display === 'none' || visibility === 'hidden' || opacity === '0') {
        report.hiddenSelects++;
        report.problems.push(`选择框 #${index + 1}: 元素被隐藏`);
      } else if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
        report.transparentSelects++;
        report.problems.push(`选择框 #${index + 1}: 文字颜色透明`);
      } else if (color === backgroundColor) {
        report.transparentSelects++;
        report.problems.push(`选择框 #${index + 1}: 文字颜色与背景色相同`);
      } else {
        report.visibleSelects++;
      }
    });

    console.log('📊 诊断结果:', report);
    
    if (report.problems.length > 0) {
      console.warn('⚠️ 发现的问题:');
      report.problems.forEach(problem => console.warn(`  - ${problem}`));
    } else {
      console.log('✅ 未发现显示问题');
    }

    console.groupEnd();
    return report;
  }

  /**
   * 应用紧急修复
   */
  static emergencyFix() {
    console.log('🚑 应用紧急修复...');
    
    const selects = document.querySelectorAll('select, .select');
    let fixedCount = 0;

    selects.forEach((select, index) => {
      const computedStyle = getComputedStyle(select);
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      // 应用强制样式
      if (currentTheme && currentTheme.includes('dark')) {
        select.style.setProperty('color', '#ffffff', 'important');
        select.style.setProperty('background-color', '#2a2e37', 'important');
      } else {
        select.style.setProperty('color', '#000000', 'important');
        select.style.setProperty('background-color', '#ffffff', 'important');
      }
      
      // 修复选项
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        if (currentTheme && currentTheme.includes('dark')) {
          option.style.setProperty('color', '#ffffff', 'important');
          option.style.setProperty('background-color', '#2a2e37', 'important');
        } else {
          option.style.setProperty('color', '#000000', 'important');
          option.style.setProperty('background-color', '#ffffff', 'important');
        }
      });

      fixedCount++;
    });

    console.log(`✅ 紧急修复完成，共修复 ${fixedCount} 个选择框`);
    return fixedCount;
  }

  /**
   * 获取CSS变量值
   */
  static getCssVariables() {
    const rootStyles = getComputedStyle(document.documentElement);
    const variables = {};
    
    ['--bc', '--b1', '--b2', '--b3', '--p', '--s', '--a'].forEach(varName => {
      variables[varName] = rootStyles.getPropertyValue(varName).trim();
    });

    console.log('📋 当前CSS变量值:', variables);
    return variables;
  }

  /**
   * 显示修复建议
   */
  static showFixSuggestions() {
    console.group('💡 修复建议');
    console.log('1. 检查主题CSS变量是否正确设置');
    console.log('2. 验证DaisyUI主题配置');
    console.log('3. 检查是否有覆盖样式');
    console.log('4. 尝试手动运行: selectDiagnostic.emergencyFix()');
    console.log('5. 检查浏览器开发者工具中的计算样式');
    console.groupEnd();
  }
}

// 全局暴露诊断工具
if (typeof window !== 'undefined') {
  window.selectDiagnostic = SelectDiagnosticTool;
  
  // 添加快捷命令
  window.diagnoseSele‌cts = () => SelectDiagnosticTool.diagnose();
  window.fixSelects = () => SelectDiagnosticTool.emergencyFix();
  window.showSelectVars = () => SelectDiagnosticTool.getCssVariables();
}

export default SelectDiagnosticTool;

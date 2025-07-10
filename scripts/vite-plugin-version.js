/**
 * Vite插件：注入版本信息
 * 在构建时安全地将package.json版本信息注入到应用中
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * 创建版本注入插件
 * @param {object} options 插件选项
 * @returns {object} Vite插件
 */
export function versionInjectionPlugin(options = {}) {
  const {
    packagePath = './package.json',
    globalVarName = '__PACKAGE_VERSION__',
    buildType = process.env.VITE_BUILD_TYPE || 'production'
  } = options;

  let packageInfo;
  let finalVersion;

  return {
    name: 'version-injection',
    config(config, { command }) {
      try {
        // 读取package.json
        const packageJsonPath = resolve(packagePath);
        const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
        packageInfo = JSON.parse(packageJsonContent);
        
        const baseVersion = packageInfo.version || '0.1.0';
        const buildTime = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
        
        // 根据构建类型生成最终版本号
        if (command === 'serve') {
          // 开发环境
          finalVersion = `${baseVersion}-dev.${buildTime}`;
        } else {
          // 构建环境
          switch (buildType) {
            case 'preview':
              finalVersion = baseVersion.includes('preview') 
                ? baseVersion 
                : `${baseVersion}-preview`;
              break;
            case 'development':
            case 'dev':
              finalVersion = `${baseVersion}-dev.${buildTime}`;
              break;
            case 'production':
            default:
              // 生产环境移除预发布标识
              finalVersion = baseVersion.split('-')[0];
              break;
          }
        }

        console.log(`🔖 版本注入: ${baseVersion} -> ${finalVersion} (${buildType})`);

        // 注入环境变量
        config.define = config.define || {};
        config.define[globalVarName] = JSON.stringify(finalVersion);
        config.define['__BUILD_TYPE__'] = JSON.stringify(buildType);
        config.define['__BUILD_TIME__'] = JSON.stringify(new Date().toISOString());
        
      } catch (error) {
        console.warn('⚠️  版本注入失败，使用默认版本:', error.message);
        finalVersion = '0.1.0';
        
        config.define = config.define || {};
        config.define[globalVarName] = JSON.stringify(finalVersion);
        config.define['__BUILD_TYPE__'] = JSON.stringify('unknown');
        config.define['__BUILD_TIME__'] = JSON.stringify(new Date().toISOString());
      }
    },
    
    generateBundle(options, bundle) {
      // 在构建时替换版本信息
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        if (file.type === 'chunk' && file.code) {
          // 替换版本占位符
          file.code = file.code.replace(
            /PACKAGE_VERSION_PLACEHOLDER/g, 
            finalVersion
          );
        }
      });
    },

    transformIndexHtml(html) {
      // 在HTML中注入版本信息
      return html.replace(
        /<title>(.*?)<\/title>/,
        `<title>$1 v${finalVersion}</title>`
      ).replace(
        /<head>/,
        `<head>\n  <script>window.${globalVarName} = "${finalVersion}";</script>`
      );
    }
  };
}

export default versionInjectionPlugin;

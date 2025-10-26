#!/usr/bin/env node

/**
 * WebUI 资源检查脚本
 * 用于验证构建后的 WebUI 资源是否正确嵌入
 */

const fs = require("fs");
const path = require("path");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

console.log(`${colors.blue}🔍 WebUI 资源检查工具${colors.reset}\n`);

// 检查项目结构
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const srcTauriDir = path.join(rootDir, "src-tauri");
const webuiRsPath = path.join(srcTauriDir, "src", "webui.rs");

console.log(`📁 项目根目录: ${rootDir}`);
console.log(`📁 前端构建目录: ${distDir}`);
console.log(`📁 Tauri 目录: ${srcTauriDir}`);

// 检查 dist 目录
console.log("\n1️⃣ 检查前端构建目录...");
if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir);
  console.log(`${colors.green}✅ dist 目录存在${colors.reset}`);
  console.log(`📄 包含文件: ${distFiles.join(", ")}`);

  // 检查关键文件
  const requiredFiles = ["index.html"];
  for (const file of requiredFiles) {
    if (distFiles.includes(file)) {
      console.log(`${colors.green}✅ ${file} 存在${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${file} 缺失${colors.reset}`);
    }
  }
} else {
  console.log(
    `${colors.yellow}⚠️  dist 目录不存在 - 这在生产环境下是正常的${colors.reset}`
  );
}

// 检查 webui.rs 配置
console.log("\n2️⃣ 检查 WebUI Rust 配置...");
if (fs.existsSync(webuiRsPath)) {
  const webuiContent = fs.readFileSync(webuiRsPath, "utf8");

  // 检查 RustEmbed 配置
  const embedMatch = webuiContent.match(/#\[folder = "([^"]+)"\]/);
  if (embedMatch) {
    const embedPath = embedMatch[1];
    console.log(
      `${colors.green}✅ RustEmbed 路径配置: ${embedPath}${colors.reset}`
    );

    // 检查相对路径是否正确
    const absoluteEmbedPath = path.resolve(srcTauriDir, embedPath);
    if (absoluteEmbedPath === distDir) {
      console.log(`${colors.green}✅ 嵌入路径配置正确${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  嵌入路径可能不正确${colors.reset}`);
      console.log(`   期望: ${distDir}`);
      console.log(`   实际: ${absoluteEmbedPath}`);
    }
  } else {
    console.log(`${colors.red}❌ 未找到 RustEmbed 配置${colors.reset}`);
  }

  // 检查启动逻辑
  if (webuiContent.includes("cfg!(debug_assertions)")) {
    console.log(`${colors.green}✅ 包含开发/生产模式切换逻辑${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  未找到模式切换逻辑${colors.reset}`);
  }

  if (
    webuiContent.includes("start_server_prod") &&
    webuiContent.includes("start_server_dev")
  ) {
    console.log(`${colors.green}✅ 包含开发和生产模式启动方法${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  启动方法可能不完整${colors.reset}`);
  }
} else {
  console.log(`${colors.red}❌ webui.rs 文件不存在${colors.reset}`);
}

// 检查 Tauri 配置
console.log("\n3️⃣ 检查 Tauri 配置...");
const tauriConfigPath = path.join(srcTauriDir, "tauri.conf.json");
if (fs.existsSync(tauriConfigPath)) {
  try {
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));

    if (tauriConfig.build && tauriConfig.build.frontendDist) {
      console.log(
        `${colors.green}✅ frontendDist 配置: ${tauriConfig.build.frontendDist}${colors.reset}`
      );
    } else {
      console.log(`${colors.red}❌ frontendDist 配置缺失${colors.reset}`);
    }

    if (tauriConfig.build && tauriConfig.build.beforeBuildCommand) {
      console.log(
        `${colors.green}✅ beforeBuildCommand: ${tauriConfig.build.beforeBuildCommand}${colors.reset}`
      );
    } else {
      console.log(
        `${colors.yellow}⚠️  beforeBuildCommand 未配置${colors.reset}`
      );
    }
  } catch (error) {
    console.log(
      `${colors.red}❌ Tauri 配置文件解析失败: ${error.message}${colors.reset}`
    );
  }
} else {
  console.log(`${colors.red}❌ tauri.conf.json 文件不存在${colors.reset}`);
}

// 检查 GitHub Actions 配置
console.log("\n4️⃣ 检查 GitHub Actions 配置...");
const workflowPath = path.join(
  rootDir,
  ".github",
  "workflows",
  "build-and-release.yml"
);
if (fs.existsSync(workflowPath)) {
  const workflowContent = fs.readFileSync(workflowPath, "utf8");

  if (workflowContent.includes("Build frontend")) {
    console.log(
      `${colors.green}✅ GitHub Actions 包含前端构建步骤${colors.reset}`
    );
  } else {
    console.log(
      `${colors.red}❌ GitHub Actions 缺少前端构建步骤${colors.reset}`
    );
  }

  if (workflowContent.includes("Verify frontend build")) {
    console.log(
      `${colors.green}✅ GitHub Actions 包含前端构建验证${colors.reset}`
    );
  } else {
    console.log(
      `${colors.yellow}⚠️  GitHub Actions 缺少前端构建验证${colors.reset}`
    );
  }

  if (workflowContent.includes("Verify WebUI embed configuration")) {
    console.log(
      `${colors.green}✅ GitHub Actions 包含 WebUI 嵌入配置验证${colors.reset}`
    );
  } else {
    console.log(
      `${colors.yellow}⚠️  GitHub Actions 缺少 WebUI 嵌入配置验证${colors.reset}`
    );
  }
} else {
  console.log(`${colors.red}❌ GitHub Actions 工作流文件不存在${colors.reset}`);
}

// 提供建议
console.log("\n💡 建议:");
console.log(
  `${colors.cyan}1. 如果在开发环境下，运行 'pnpm build' 来生成 dist 目录${colors.reset}`
);
console.log(
  `${colors.cyan}2. 如果在生产环境下，确保 GitHub Actions 正确构建了前端资源${colors.reset}`
);
console.log(
  `${colors.cyan}3. 使用 'pnpm tauri build' 进行完整构建测试${colors.reset}`
);
console.log(`${colors.cyan}4. 检查构建日志确保没有错误${colors.reset}`);

console.log(`\n${colors.green}🎉 WebUI 资源检查完成${colors.reset}`);

#!/usr/bin/env node

/**
 * 跨平台后端构建脚本
 * 支持 macOS、Windows 和 Linux
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const rootDir = resolve(import.meta.dirname, '../..');
const frontendDir = resolve(import.meta.dirname, '..');

console.log('🔧 Building backend with PyInstaller...');
console.log(`   Platform: ${platform()}`);
console.log(`   Root directory: ${rootDir}`);

// 确定 Python 虚拟环境路径
const venvPath = join(rootDir, '.venv');
let pyinstallerPath;

if (isWindows) {
  pyinstallerPath = join(venvPath, 'Scripts', 'pyinstaller.exe');
} else {
  pyinstallerPath = join(venvPath, 'bin', 'pyinstaller');
}

// 检查 PyInstaller 是否存在
if (!existsSync(pyinstallerPath)) {
  console.error(`❌ PyInstaller not found at: ${pyinstallerPath}`);
  console.error('   Please ensure the virtual environment is set up correctly.');
  process.exit(1);
}

// 构建命令
const specFile = join(rootDir, 'backend', 'mai-backend.spec');
const distPath = join(frontendDir, 'src-tauri', 'backend-dist');

const command = [
  `"${pyinstallerPath}"`,
  `"${specFile}"`,
  '--clean',
  '--noconfirm',
  '--distpath',
  `"${distPath}"`
].join(' ');

console.log(`   Running: ${command}`);

try {
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  console.log('✅ Backend built successfully!');
} catch (error) {
  console.error('❌ Backend build failed!');
  process.exit(1);
}

#!/bin/bash

# MAI Launcher 构建脚本
# 该脚本将后端和前端打包成一个独立的应用程序

set -e  # 遇到错误立即退出

echo "======================================"
echo "MAI Launcher Build Script"
echo "======================================"

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. 打包后端
echo ""
echo "Step 1: Building backend with PyInstaller..."
cd backend
echo "  -> Running PyInstaller..."
../.venv/bin/pyinstaller mai-backend.spec --clean --noconfirm --distpath ../frontend/src-tauri/backend-dist

if [ ! -f "../frontend/src-tauri/backend-dist/mai-backend/mai-backend" ]; then
    echo "Error: Backend executable not found!"
    exit 1
fi
echo "  ✓ Backend built successfully"

# 2. 打包前端
echo ""
echo "Step 2: Building frontend..."
cd ../frontend
echo "  -> Installing dependencies..."
pnpm install

echo "  -> Building frontend..."
pnpm build

if [ ! -d "dist" ]; then
    echo "Error: Frontend dist folder not found!"
    exit 1
fi
echo "  ✓ Frontend built successfully"

# 3. 使用 Tauri 打包整个应用
echo ""
echo "Step 3: Building Tauri app..."
echo "  -> Running Tauri build..."
pnpm tauri build

# 4. 完成
echo ""
echo "======================================"
echo "Build completed successfully!"
echo "======================================"
echo ""
echo "You can find the built application in:"
echo "  frontend/src-tauri/target/release/bundle/"
echo ""

# 列出生成的文件
if [ -d "src-tauri/target/release/bundle" ]; then
    echo "Generated bundles:"
    find src-tauri/target/release/bundle -type f -name "*.dmg" -o -name "*.app" -o -name "*.exe" -o -name "*.deb" -o -name "*.AppImage"
fi

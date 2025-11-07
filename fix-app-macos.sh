#!/bin/bash

# macOS App 修复脚本
# 用于移除 Gatekeeper 隔离属性

set -e

APP_PATH="/Applications/MAI Launcher.app"
BUILD_PATH="$(pwd)/frontend/src-tauri/target/release/bundle/macos/MAI Launcher.app"

echo "正在检查 MAI Launcher..."

# 检查应用是否存在
if [ -d "$BUILD_PATH" ]; then
    echo "找到构建的应用: $BUILD_PATH"
    TARGET="$BUILD_PATH"
elif [ -d "$APP_PATH" ]; then
    echo "找到已安装的应用: $APP_PATH"
    TARGET="$APP_PATH"
else
    echo "错误: 未找到 MAI Launcher.app"
    echo "请确保应用已构建或已安装到 /Applications"
    exit 1
fi

echo ""
echo "正在移除隔离属性..."
xattr -cr "$TARGET"

echo ""
echo "正在应用 ad-hoc 签名..."
codesign --force --deep --sign - "$TARGET"

echo ""
echo "✅ 修复完成！"
echo "现在可以正常打开应用了。"

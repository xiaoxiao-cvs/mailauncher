#!/bin/bash

# NapCat macOS 安装脚本
# 适用于 MAI Launcher

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 安装路径配置 - 支持自定义安装目录
INSTALL_BASE_DIR="${1:-${HOME}/Napcat}"
QQ_BASE_PATH="${INSTALL_BASE_DIR}/opt/QQ"
TARGET_FOLDER="${QQ_BASE_PATH}/resources/app/app_launcher"
QQ_EXECUTABLE="${QQ_BASE_PATH}/qq"
QQ_PACKAGE_JSON_PATH="${QQ_BASE_PATH}/resources/app/package.json"

# 日志函数
log() {
    local message="$1"
    local level="${2:-info}"
    
    case "$level" in
        error)
            echo -e "${RED}[错误] ${message}${NC}"
            ;;
        success)
            echo -e "${GREEN}[成功] ${message}${NC}"
            ;;
        warning)
            echo -e "${YELLOW}[警告] ${message}${NC}"
            ;;
        *)
            echo -e "${BLUE}[信息] ${message}${NC}"
            ;;
    esac
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log "$1 未安装" "error"
        return 1
    fi
    return 0
}

# 检查并安装依赖
check_dependencies() {
    log "检查系统依赖..."
    
    local missing_deps=()
    
    # 检查必需的命令
    if ! check_command curl; then
        missing_deps+=("curl")
    fi
    
    if ! check_command unzip; then
        missing_deps+=("unzip")
    fi
    
    if ! check_command jq; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "缺少以下依赖: ${missing_deps[*]}" "warning"
        
        # 检查 Homebrew
        if check_command brew; then
            log "使用 Homebrew 安装依赖..."
            for dep in "${missing_deps[@]}"; do
                brew install "$dep"
            done
        else
            log "请先安装 Homebrew: https://brew.sh/" "error"
            log "或手动安装: ${missing_deps[*]}" "error"
            return 1
        fi
    fi
    
    log "依赖检查完成" "success"
    return 0
}

# 下载 NapCat
download_napcat() {
    log "开始下载 NapCat..."
    
    local download_url="https://github.com/NapNeko/NapCatQQ/releases/latest/download/NapCat.Shell.zip"
    local download_file="NapCat.Shell.zip"
    
    # 如果已存在，先删除
    if [ -f "$download_file" ]; then
        rm -f "$download_file"
    fi
    
    # 下载文件
    if ! curl -L -# "$download_url" -o "$download_file"; then
        log "下载失败" "error"
        return 1
    fi
    
    # 验证文件
    if ! unzip -t "$download_file" > /dev/null 2>&1; then
        log "下载的文件损坏" "error"
        rm -f "$download_file"
        return 1
    fi
    
    log "下载完成" "success"
    return 0
}

# 获取 QQ 版本
get_qq_version() {
    echo "3.2.20-40990"
}

# 下载并解压 QQ (macOS 版本)
install_qq_macos() {
    log "开始安装 QQ for macOS..."
    
    # 注意: macOS 通常使用 .dmg 或 .app，这里需要适配
    # 如果用户已经安装了 QQ.app，可以跳过此步骤
    
    log "检查 QQ 安装状态..."
    
    # 检查是否已存在安装
    if [ -d "$QQ_BASE_PATH" ]; then
        log "检测到已安装的 QQ" "warning"
        return 0
    fi
    
    # 创建安装目录
    mkdir -p "$INSTALL_BASE_DIR"
    
    log "macOS 版本的 QQ 安装需要特殊处理" "warning"
    log "请确保您已经安装了 QQ for macOS" "warning"
    log "或者提供 Linux QQ 的安装包路径" "warning"
    
    # 这里可以添加从 Linux 版本提取的逻辑
    # 或者提示用户手动操作
    
    return 0
}

# 安装 NapCat
install_napcat() {
    log "开始安装 NapCat..."
    
    local temp_dir="./NapCat_temp"
    
    # 创建临时目录
    mkdir -p "$temp_dir"
    
    # 解压
    if ! unzip -q -o -d "$temp_dir" NapCat.Shell.zip; then
        log "解压失败" "error"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # 创建目标目录
    mkdir -p "$TARGET_FOLDER/napcat"
    
    # 复制文件
    cp -rf "$temp_dir"/* "$TARGET_FOLDER/napcat/"
    
    # 设置权限
    chmod -R +x "$TARGET_FOLDER/napcat/"
    
    # 创建启动文件
    echo "(async () => {await import('file://${TARGET_FOLDER}/napcat/napcat.mjs');})();" > "${QQ_BASE_PATH}/resources/app/loadNapCat.js"
    
    # 修改 package.json
    if [ -f "$QQ_PACKAGE_JSON_PATH" ]; then
        jq '.main = "./loadNapCat.js"' "$QQ_PACKAGE_JSON_PATH" > "${QQ_PACKAGE_JSON_PATH}.tmp"
        mv "${QQ_PACKAGE_JSON_PATH}.tmp" "$QQ_PACKAGE_JSON_PATH"
    fi
    
    # 清理
    rm -rf "$temp_dir"
    rm -f NapCat.Shell.zip
    
    log "NapCat 安装完成" "success"
    return 0
}

# 显示安装信息
show_info() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}NapCat 安装完成！${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "${BLUE}安装位置:${NC} ${INSTALL_BASE_DIR}"
    echo ""
    echo -e "${BLUE}配置文件:${NC} ${TARGET_FOLDER}/napcat/config"
    echo ""
    echo -e "${BLUE}WebUI Token:${NC} 查看 ${TARGET_FOLDER}/napcat/config/webui.json"
    echo ""
    echo -e "${YELLOW}注意: macOS 上运行可能需要额外配置${NC}"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "================================"
    echo "  NapCat macOS 安装脚本"
    echo "  for MAI Launcher"
    echo "================================"
    echo -e "${NC}"
    
    # 检查系统
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log "此脚本仅适用于 macOS" "error"
        exit 1
    fi
    
    # 检查依赖
    if ! check_dependencies; then
        log "依赖检查失败" "error"
        exit 1
    fi
    
    # 下载 NapCat
    if ! download_napcat; then
        log "NapCat 下载失败" "error"
        exit 1
    fi
    
    # 安装 QQ (可选)
    # install_qq_macos
    
    # 安装 NapCat
    if ! install_napcat; then
        log "NapCat 安装失败" "error"
        exit 1
    fi
    
    # 显示信息
    show_info
    
    log "安装流程完成！" "success"
    exit 0
}

# 执行主函数
main "$@"

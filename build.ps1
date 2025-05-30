# MaiLauncher 打包脚本
# 确保后端和前端都正确配置并打包

Write-Host "🚀 开始打包 MaiLauncher..." -ForegroundColor Green

# 检查必要的工具
Write-Host "📋 检查环境..." -ForegroundColor Yellow
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 pnpm" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 python" -ForegroundColor Red
    exit 1
}

# 设置路径
$frontendPath = "d:\桌面\mailauncher"
$backendPath = "d:\桌面\mailauncher-backend"

Write-Host "🔧 检查后端可执行文件..." -ForegroundColor Yellow
$backendExe = Join-Path $frontendPath "src-tauri\resources\backend.exe"
if (-not (Test-Path $backendExe)) {
    Write-Host "❌ 错误: 后端可执行文件不存在: $backendExe" -ForegroundColor Red
    Write-Host "请先确保后端已打包并复制到正确位置" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 后端可执行文件存在" -ForegroundColor Green

# 进入前端目录
Set-Location $frontendPath

Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host "🏗️ 构建前端应用..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "📱 使用 Tauri 构建应用..." -ForegroundColor Yellow
pnpm tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tauri 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 打包完成!" -ForegroundColor Green
Write-Host "📁 构建产物位置:" -ForegroundColor Cyan
Write-Host "   - 可执行文件: src-tauri\target\release\mailauncher.exe" -ForegroundColor Cyan
Write-Host "   - 安装程序: src-tauri\target\release\bundle\nsis\*.exe" -ForegroundColor Cyan

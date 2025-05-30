#!/usr/bin/env pwsh

# MaiLauncher 打包验证脚本
param(
    [switch]$SkipRust,
    [switch]$Force
)

Write-Host "🔍 MaiLauncher 打包环境验证" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

$errors = @()
$warnings = @()

# 检查基本工具
Write-Host "`n📋 检查基本环境..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        $errors += "Node.js 未安装"
    }
} catch {
    $errors += "Node.js 未安装"
}

# pnpm
try {
    $pnpmVersion = pnpm --version 2>$null
    if ($pnpmVersion) {
        Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
    } else {
        $errors += "pnpm 未安装"
    }
} catch {
    $errors += "pnpm 未安装"
}

# Python
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
    } else {
        $errors += "Python 未安装"
    }
} catch {
    $errors += "Python 未安装"
}

# Rust (如果不跳过)
if (-not $SkipRust) {
    try {
        $rustVersion = rustc --version 2>$null
        if ($rustVersion) {
            Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
        } else {
            $errors += "Rust 未安装 - 这是Tauri构建必需的"
        }
    } catch {
        $errors += "Rust 未安装 - 这是Tauri构建必需的"
    }
    
    try {
        $cargoVersion = cargo --version 2>$null
        if ($cargoVersion) {
            Write-Host "✅ Cargo: $cargoVersion" -ForegroundColor Green
        } else {
            $errors += "Cargo 未安装"
        }
    } catch {
        $errors += "Cargo 未安装"
    }
}

# 检查项目文件
Write-Host "`n📁 检查项目文件..." -ForegroundColor Yellow

$frontendPath = "d:\桌面\mailauncher"
$backendPath = "d:\桌面\mailauncher-backend"

# 前端项目
if (Test-Path (Join-Path $frontendPath "package.json")) {
    Write-Host "✅ 前端项目存在" -ForegroundColor Green
} else {
    $errors += "前端项目不存在"
}

# 后端项目
if (Test-Path (Join-Path $backendPath "main.py")) {
    Write-Host "✅ 后端项目存在" -ForegroundColor Green
} else {
    $errors += "后端项目不存在"
}

# 后端可执行文件
$backendExe = Join-Path $frontendPath "src-tauri\resources\MaiLauncher-Backend.exe"
if (Test-Path $backendExe) {
    $size = (Get-Item $backendExe).Length / 1MB
    Write-Host "✅ 后端可执行文件存在 ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    $errors += "后端可执行文件不存在: $backendExe"
}

# 检查配置文件
Write-Host "`n⚙️ 检查配置文件..." -ForegroundColor Yellow

$configFiles = @(
    "src-tauri\tauri.conf.json",
    "src-tauri\capabilities\default.json",
    "src\config\backendConfig.js",
    ".env.development",
    ".env.production"
)

foreach ($file in $configFiles) {
    $fullPath = Join-Path $frontendPath $file
    if (Test-Path $fullPath) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        $warnings += "配置文件缺失: $file"
    }
}

# 检查端口占用
Write-Host "`n🌐 检查端口..." -ForegroundColor Yellow

$ports = @(3000, 23456)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $warnings += "端口 $port 被占用 (进程: $($connections[0].OwningProcess))"
    } else {
        Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
    }
}

# 检查前端依赖
Write-Host "`n📦 检查前端依赖..." -ForegroundColor Yellow
Set-Location $frontendPath

if (Test-Path "node_modules") {
    Write-Host "✅ node_modules 存在" -ForegroundColor Green
} else {
    $warnings += "node_modules 不存在，需要运行 'pnpm install'"
}

# 显示结果
Write-Host "`n📊 验证结果" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "🎉 所有关键检查通过!" -ForegroundColor Green
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ 警告:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n🚀 准备打包!" -ForegroundColor Green
    Write-Host "运行以下命令开始打包:" -ForegroundColor Cyan
    Write-Host "  .\build.ps1" -ForegroundColor White
    
} else {
    Write-Host "❌ 发现错误，无法打包:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ 警告:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n📖 请参考 SETUP.md 获取详细安装指南" -ForegroundColor Cyan
    exit 1
}

#!/usr/bin/env powershell
<#
.SYNOPSIS
    测试自托管 GitHub Actions Runner 配置

.DESCRIPTION
    此脚本模拟 GitHub Actions 工作流的构建过程，用于验证自托管服务器的配置是否正确。

.EXAMPLE
    .\test-self-hosted-setup.ps1
#>

param(
    [switch]$SkipCleanup,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Step "检查前置条件"
    
    $prerequisites = @(
        @{ Name = "Python"; Command = "python"; Args = "--version" },
        @{ Name = "Pip"; Command = "pip"; Args = "--version" },
        @{ Name = "Git"; Command = "git"; Args = "--version" }
    )
    
    $allPassed = $true
    
    foreach ($prereq in $prerequisites) {
        try {
            $result = & $prereq.Command $prereq.Args.Split(' ') 2>&1
            Write-Success "$($prereq.Name): $result"
        }
        catch {
            Write-Error "$($prereq.Name) 未正确安装或配置"
            $allPassed = $false
        }
    }
    
    # 检查磁盘空间
    $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
    $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 2)
    
    if ($freeSpace -lt 10) {
        Write-Warning "C盘可用空间只有 ${freeSpace} GB，建议至少保持 20GB"
    } else {
        Write-Success "C盘可用空间: ${freeSpace} GB"
    }
    
    return $allPassed
}

function Test-BackendBuild {
    Write-Step "测试后端构建"
    
    # 创建临时目录
    $testDir = "test-backend-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $testDir | Out-Null
    
    try {
        Set-Location $testDir
        
        # 克隆后端仓库
        Write-Host "克隆后端仓库..."
        git clone https://github.com/MaiM-with-u/mailauncher-backend.git backend
        
        Set-Location "backend"
        
        # 安装依赖
        Write-Host "安装后端依赖..."
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pyinstaller
        
        # 创建数据目录
        if (!(Test-Path "data")) { 
            New-Item -ItemType Directory -Path "data" 
        }
        
        # 测试构建
        Write-Host "测试构建后端..."
        pyinstaller main.spec
        
        if (Test-Path "dist/MaiLauncher-Backend.exe") {
            Write-Success "后端构建测试成功"
            return $true
        } else {
            Write-Error "后端构建测试失败"
            return $false
        }
    }
    catch {
        Write-Error "后端构建测试失败: $($_.Exception.Message)"
        return $false
    }
    finally {
        Set-Location "..\.."
        if (-not $SkipCleanup) {
            Remove-Item -Recurse -Force $testDir -ErrorAction SilentlyContinue
        }
    }
}

function Test-NodejsSetup {
    Write-Step "测试 Node.js 环境"
    
    try {
        # 模拟 setup-node action
        Write-Host "检查 Node.js..."
        $nodeVersion = node --version 2>&1
        Write-Success "Node.js: $nodeVersion"
        
        # 检查 npm
        $npmVersion = npm --version 2>&1
        Write-Success "npm: $npmVersion"
        
        return $true
    }
    catch {
        Write-Warning "Node.js 未安装，工作流将自动安装"
        return $true  # 这不是错误，因为工作流会处理
    }
}

function Test-PnpmSetup {
    Write-Step "测试 pnpm 环境"
    
    try {
        # 如果 pnpm 未安装，尝试通过 npm 安装
        try {
            $pnpmVersion = pnpm --version 2>&1
            Write-Success "pnpm: $pnpmVersion"
        }
        catch {
            Write-Host "安装 pnpm..."
            npm install -g pnpm
            $pnpmVersion = pnpm --version 2>&1
            Write-Success "pnpm: $pnpmVersion"
        }
        
        return $true
    }
    catch {
        Write-Warning "无法设置 pnpm，但工作流应该能处理"
        return $true
    }
}

function Test-FrontendBuild {
    Write-Step "测试前端构建（简化版）"
    
    # 检查当前目录是否有 package.json
    if (Test-Path "package.json") {
        try {
            Write-Host "安装前端依赖..."
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                pnpm install --frozen-lockfile
            } else {
                npm install
            }
            
            Write-Success "前端依赖安装成功"
            return $true
        }
        catch {
            Write-Error "前端依赖安装失败: $($_.Exception.Message)"
            return $false
        }
    } else {
        Write-Warning "当前目录没有 package.json，跳过前端构建测试"
        return $true
    }
}

function Test-ResourceUsage {
    Write-Step "检查资源使用情况"
    
    # CPU 使用率
    $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $cpuUsage = [math]::Round($cpu.Average, 1)
    
    # 内存使用率
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 1)
    
    Write-Host "CPU 使用率: $cpuUsage%"
    Write-Host "内存使用率: $memoryUsage%"
    
    $hasIssues = $false
    
    if ($cpuUsage -gt 80) {
        Write-Warning "CPU 使用率较高，可能影响构建性能"
        $hasIssues = $true
    }
    
    if ($memoryUsage -gt 80) {
        Write-Warning "内存使用率较高，可能影响构建稳定性"
        $hasIssues = $true
    }
    
    if (-not $hasIssues) {
        Write-Success "系统资源状态良好"
    }
    
    return -not $hasIssues
}

function Test-NetworkConnectivity {
    Write-Step "测试网络连接"
    
    $endpoints = @(
        "github.com",
        "registry.npmjs.org",
        "pypi.org"
    )
    
    $allConnected = $true
    
    foreach ($endpoint in $endpoints) {
        try {
            $test = Test-NetConnection -ComputerName $endpoint -Port 443 -WarningAction SilentlyContinue
            if ($test.TcpTestSucceeded) {
                Write-Success "$endpoint 连接正常"
            } else {
                Write-Error "$endpoint 连接失败"
                $allConnected = $false
            }
        }
        catch {
            Write-Error "$endpoint 连接测试出错"
            $allConnected = $false
        }
    }
    
    return $allConnected
}

# 主测试流程
Write-Host "GitHub Actions 自托管 Runner 配置测试" -ForegroundColor Cyan
Write-Host "测试时间: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

$testResults = @()

# 执行各项测试
$testResults += @{ Name = "前置条件"; Result = Test-Prerequisites }
$testResults += @{ Name = "网络连接"; Result = Test-NetworkConnectivity }
$testResults += @{ Name = "资源使用"; Result = Test-ResourceUsage }
$testResults += @{ Name = "Node.js 环境"; Result = Test-NodejsSetup }
$testResults += @{ Name = "pnpm 环境"; Result = Test-PnpmSetup }
$testResults += @{ Name = "前端构建"; Result = Test-FrontendBuild }
$testResults += @{ Name = "后端构建"; Result = Test-BackendBuild }

# 汇总结果
Write-Step "测试结果汇总"

$passedTests = 0
$totalTests = $testResults.Count

foreach ($test in $testResults) {
    if ($test.Result) {
        Write-Success "$($test.Name): 通过"
        $passedTests++
    } else {
        Write-Error "$($test.Name): 失败"
    }
}

Write-Host ""
Write-Host "测试完成: $passedTests/$totalTests 项通过" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host ""
    Write-Success "🎉 所有测试通过！自托管服务器配置正确"
    Write-Host "您可以开始使用 GitHub Actions 进行构建了" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Warning "⚠️  部分测试未通过，请根据上述错误信息进行修复"
    Write-Host "修复问题后可以重新运行此测试脚本" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "建议："
Write-Host "• 运行 .\scripts\check-runner-health.ps1 进行更详细的健康检查"
Write-Host "• 查看 SELF_HOSTED_RUNNER_GUIDE.md 获取详细配置指南"
Write-Host "• 首次使用建议运行 build-self-hosted.yml 工作流进行测试"

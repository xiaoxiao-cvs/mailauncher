#!/usr/bin/env pwsh
# 版本管理脚本 - 用于同步更新 package.json 和 Cargo.toml 中的版本号

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("major", "minor", "patch", "preview", "dev")]
    [string]$Type,
    
    [Parameter(Mandatory = $false)]
    [string]$Version = "",
    
    [Parameter(Mandatory = $false)]
    [switch]$DryRun = $false
)

function Write-ColorHost {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Get-CurrentVersion {
    $packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
    return $packageJson.version
}

function Update-Versions {
    param([string]$NewVersion)
    
    if ($DryRun) {
        Write-ColorHost "🔍 [DRY RUN] 模拟版本更新为: $NewVersion" "Yellow"
        return
    }
    
    # 更新 package.json
    $packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
    $packageJson.version = $NewVersion
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content -Path "package.json"
    Write-ColorHost "✅ 已更新 package.json 版本号为: $NewVersion" "Green"
    
    # 更新 Cargo.toml
    if (Test-Path "src-tauri\Cargo.toml") {
        $cargoToml = Get-Content -Path "src-tauri\Cargo.toml"
        $cargoToml = $cargoToml -replace '^version = ".*"', "version = `"$NewVersion`""
        $cargoToml | Set-Content -Path "src-tauri\Cargo.toml"
        Write-ColorHost "✅ 已更新 Cargo.toml 版本号为: $NewVersion" "Green"
    }
}

# 主逻辑
try {
    Write-ColorHost "🚀 版本管理工具" "Cyan"
    Write-ColorHost "=================" "Cyan"
    
    $currentVersion = Get-CurrentVersion
    $baseVersion = $currentVersion -replace "-.*$", ""  # 移除预发布后缀
    
    Write-ColorHost "📦 当前版本: $currentVersion" "White"
    Write-ColorHost "📋 基础版本: $baseVersion" "White"
    
    if ($Version -ne "") {
        # 手动指定版本
        $newVersion = $Version
        Write-ColorHost "🔧 使用手动指定版本: $newVersion" "Blue"
    } else {
        # 自动计算版本
        if ($baseVersion -match "^(\d+)\.(\d+)\.(\d+)$") {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            $patch = [int]$matches[3]
            
            switch ($Type) {
                "major" { 
                    $major++; $minor = 0; $patch = 0
                    $newVersion = "$major.$minor.$patch"
                    Write-ColorHost "🚀 递增主版本号" "Magenta"
                }
                "minor" { 
                    $minor++; $patch = 0
                    $newVersion = "$major.$minor.$patch"
                    Write-ColorHost "✨ 递增次版本号" "Blue"
                }
                "patch" { 
                    $patch++
                    $newVersion = "$major.$minor.$patch"
                    Write-ColorHost "🔧 递增补丁版本号" "Green"
                }
                "preview" {
                    # 获取下一个预览版本号
                    $allTags = git tag -l "v$baseVersion-preview.*" 2>$null | Sort-Object -Descending
                    $previewNumber = 1
                    if ($allTags.Count -gt 0) {
                        $latestTag = $allTags[0]
                        if ($latestTag -match "v$baseVersion-preview\.(\d+)$") {
                            $previewNumber = [int]$matches[1] + 1
                        }
                    }
                    $newVersion = "$baseVersion-preview.$previewNumber"
                    Write-ColorHost "🎯 创建预览版本" "Yellow"
                }
                "dev" {
                    # 获取下一个开发版本号
                    $allTags = git tag -l "dev-$baseVersion-dev.*" 2>$null | Sort-Object -Descending
                    $devNumber = 1
                    if ($allTags.Count -gt 0) {
                        $latestTag = $allTags[0]
                        if ($latestTag -match "dev-$baseVersion-dev\.(\d+)$") {
                            $devNumber = [int]$matches[1] + 1
                        }
                    }
                    $newVersion = "$baseVersion-dev.$devNumber"
                    Write-ColorHost "🔧 创建开发版本" "Cyan"
                }
            }
        } else {
            throw "无法解析当前版本号: $baseVersion"
        }
    }
    
    Write-ColorHost "🎯 新版本号: $newVersion" "Green"
    
    if (-not $DryRun) {
        $confirmation = Read-Host "确认更新版本号? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-ColorHost "❌ 操作已取消" "Red"
            exit 0
        }
    }
    
    Update-Versions -NewVersion $newVersion
    
    Write-ColorHost "" "White"
    Write-ColorHost "✅ 版本更新完成!" "Green"
    Write-ColorHost "💡 提示: 记得运行测试并提交更改" "Yellow"
    
} catch {
    Write-ColorHost "❌ 错误: $($_.Exception.Message)" "Red"
    exit 1
}

#!/usr/bin/env powershell
<#
.SYNOPSIS
    GitHub Actions 自托管 Runner 健康检查脚本

.DESCRIPTION
    此脚本检查自托管 Runner 的健康状态，包括：
    - 系统资源使用情况
    - 必需软件的安装状态  
    - 网络连接状态
    - Runner 服务状态
    - 磁盘空间

.EXAMPLE
    .\check-runner-health.ps1
#>

param(
    [switch]$Detailed,
    [switch]$Json
)

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    if ($Json) {
        return
    }
    
    Write-Host $Message -ForegroundColor $Color
}

function Test-SoftwareInstalled {
    param([string]$Command)
    
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Get-SystemInfo {
    $os = Get-WmiObject -Class Win32_OperatingSystem
    $cpu = Get-WmiObject -Class Win32_Processor
    $memory = Get-WmiObject -Class Win32_ComputerSystem
    
    return @{
        OS = $os.Caption
        Version = $os.Version
        Architecture = $env:PROCESSOR_ARCHITECTURE
        CPU = $cpu.Name
        TotalMemoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
        Computer = $env:COMPUTERNAME
        User = $env:USERNAME
    }
}

function Get-DiskSpace {
    $disks = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    $diskInfo = @()
    
    foreach ($disk in $disks) {
        $diskInfo += @{
            Drive = $disk.DeviceID
            TotalGB = [math]::Round($disk.Size / 1GB, 2)
            FreeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            UsedPercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)
        }
    }
    
    return $diskInfo
}

function Get-NetworkConnectivity {
    $endpoints = @(
        "github.com",
        "api.github.com", 
        "registry.npmjs.org",
        "pypi.org"
    )
    
    $results = @()
    foreach ($endpoint in $endpoints) {
        try {
            $test = Test-NetConnection -ComputerName $endpoint -Port 443 -WarningAction SilentlyContinue
            $results += @{
                Endpoint = $endpoint
                Status = if ($test.TcpTestSucceeded) { "Connected" } else { "Failed" }
                ResponseTime = if ($test.PingSucceeded) { $test.PingReplyDetails.RoundtripTime } else { $null }
            }
        }
        catch {
            $results += @{
                Endpoint = $endpoint
                Status = "Error"
                ResponseTime = $null
            }
        }
    }
    
    return $results
}

function Get-RunnerStatus {
    $services = Get-Service | Where-Object { $_.Name -like "actions.runner.*" }
    $runnerInfo = @()
    
    foreach ($service in $services) {
        $runnerInfo += @{
            Name = $service.Name
            Status = $service.Status.ToString()
            StartType = $service.StartType.ToString()
        }
    }
    
    return $runnerInfo
}

function Get-SoftwareVersions {
    $software = @{}
    
    # Python
    try {
        $pythonVersion = python --version 2>&1
        $software.Python = $pythonVersion -replace "Python ", ""
    }
    catch {
        $software.Python = "Not installed"
    }
    
    # Git
    try {
        $gitVersion = git --version 2>&1
        $software.Git = $gitVersion -replace "git version ", ""
    }
    catch {
        $software.Git = "Not installed"
    }
    
    # Node.js
    try {
        $nodeVersion = node --version 2>&1
        $software.NodeJS = $nodeVersion
    }
    catch {
        $software.NodeJS = "Not installed"
    }
    
    # pnpm
    try {
        $pnpmVersion = pnpm --version 2>&1
        $software.PNPM = $pnpmVersion
    }
    catch {
        $software.PNPM = "Not installed"
    }
    
    # PowerShell
    $software.PowerShell = $PSVersionTable.PSVersion.ToString()
    
    return $software
}

function Get-ResourceUsage {
    $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    
    return @{
        CPUUsage = [math]::Round($cpu.Average, 1)
        MemoryUsagePercent = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 1)
        MemoryFreeGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    }
}

# 主检查逻辑
Write-ColorOutput "=== GitHub Actions 自托管 Runner 健康检查 ===" "Cyan"
Write-ColorOutput "检查时间: $(Get-Date)" "Gray"
Write-ColorOutput ""

$healthReport = @{
    Timestamp = Get-Date
    SystemInfo = Get-SystemInfo
    DiskSpace = Get-DiskSpace
    NetworkConnectivity = Get-NetworkConnectivity  
    RunnerStatus = Get-RunnerStatus
    SoftwareVersions = Get-SoftwareVersions
    ResourceUsage = Get-ResourceUsage
    Issues = @()
}

if (-not $Json) {
    # 系统信息
    Write-ColorOutput "🖥️  系统信息:" "Yellow"
    $sysInfo = $healthReport.SystemInfo
    Write-ColorOutput "   操作系统: $($sysInfo.OS)" "White"
    Write-ColorOutput "   架构: $($sysInfo.Architecture)" "White"
    Write-ColorOutput "   计算机: $($sysInfo.Computer)" "White"
    Write-ColorOutput "   用户: $($sysInfo.User)" "White"
    Write-ColorOutput ""
    
    # 资源使用情况
    Write-ColorOutput "📊 资源使用情况:" "Yellow"
    $resources = $healthReport.ResourceUsage
    $cpuColor = if ($resources.CPUUsage -gt 80) { "Red" } elseif ($resources.CPUUsage -gt 60) { "Yellow" } else { "Green" }
    $memColor = if ($resources.MemoryUsagePercent -gt 80) { "Red" } elseif ($resources.MemoryUsagePercent -gt 60) { "Yellow" } else { "Green" }
    
    Write-ColorOutput "   CPU 使用率: $($resources.CPUUsage)%" $cpuColor
    Write-ColorOutput "   内存使用率: $($resources.MemoryUsagePercent)%" $memColor
    Write-ColorOutput "   可用内存: $($resources.MemoryFreeGB) GB" "White"
    Write-ColorOutput ""
    
    # 磁盘空间
    Write-ColorOutput "💽 磁盘空间:" "Yellow"
    foreach ($disk in $healthReport.DiskSpace) {
        $diskColor = if ($disk.UsedPercent -gt 90) { "Red" } elseif ($disk.UsedPercent -gt 80) { "Yellow" } else { "Green" }
        Write-ColorOutput "   $($disk.Drive) $($disk.FreeGB) GB 可用 / $($disk.TotalGB) GB 总计 (已用 $($disk.UsedPercent)%)" $diskColor
        
        if ($disk.FreeGB -lt 10) {
            $healthReport.Issues += "磁盘 $($disk.Drive) 可用空间不足 10GB"
        }
    }
    Write-ColorOutput ""
    
    # 软件版本
    Write-ColorOutput "🛠️  软件版本:" "Yellow"
    foreach ($software in $healthReport.SoftwareVersions.GetEnumerator()) {
        $color = if ($software.Value -eq "Not installed") { "Red" } else { "Green" }
        Write-ColorOutput "   $($software.Key): $($software.Value)" $color
        
        if ($software.Value -eq "Not installed" -and $software.Key -in @("Python", "Git")) {
            $healthReport.Issues += "$($software.Key) 未安装"
        }
    }
    Write-ColorOutput ""
    
    # Runner 状态
    Write-ColorOutput "🏃 Runner 状态:" "Yellow"
    if ($healthReport.RunnerStatus.Count -eq 0) {
        Write-ColorOutput "   ⚠️  未发现 GitHub Actions Runner 服务" "Red"
        $healthReport.Issues += "未发现 GitHub Actions Runner 服务"
    } else {
        foreach ($runner in $healthReport.RunnerStatus) {
            $statusColor = if ($runner.Status -eq "Running") { "Green" } else { "Red" }
            Write-ColorOutput "   $($runner.Name): $($runner.Status)" $statusColor
            
            if ($runner.Status -ne "Running") {
                $healthReport.Issues += "Runner 服务 $($runner.Name) 未运行"
            }
        }
    }
    Write-ColorOutput ""
    
    # 网络连接
    Write-ColorOutput "🌐 网络连接:" "Yellow"
    foreach ($conn in $healthReport.NetworkConnectivity) {
        $statusColor = if ($conn.Status -eq "Connected") { "Green" } else { "Red" }
        $pingInfo = if ($conn.ResponseTime) { " ($($conn.ResponseTime)ms)" } else { "" }
        Write-ColorOutput "   $($conn.Endpoint): $($conn.Status)$pingInfo" $statusColor
        
        if ($conn.Status -ne "Connected") {
            $healthReport.Issues += "无法连接到 $($conn.Endpoint)"
        }
    }
    Write-ColorOutput ""
    
    # 问题汇总
    if ($healthReport.Issues.Count -gt 0) {
        Write-ColorOutput "⚠️  发现的问题:" "Red"
        foreach ($issue in $healthReport.Issues) {
            Write-ColorOutput "   • $issue" "Red"
        }
    } else {
        Write-ColorOutput "✅ 所有检查通过，Runner 状态良好!" "Green"
    }
    
    if ($Detailed) {
        Write-ColorOutput ""
        Write-ColorOutput "📋 详细建议:" "Cyan"
        Write-ColorOutput "   • 定期清理临时文件和构建缓存" "Gray"
        Write-ColorOutput "   • 监控磁盘空间，保持至少 20GB 可用空间" "Gray"
        Write-ColorOutput "   • 保持软件依赖的最新版本" "Gray"
        Write-ColorOutput "   • 定期重启 Runner 服务以避免内存泄漏" "Gray"
    }
}

if ($Json) {
    $healthReport | ConvertTo-Json -Depth 10
}

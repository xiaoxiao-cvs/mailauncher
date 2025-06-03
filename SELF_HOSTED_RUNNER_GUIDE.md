# 自托管 GitHub Actions Runner 配置指南

## 概述

本指南将帮助您配置和优化自托管的 GitHub Actions Runner (`XIAOXIAOSERVER`)，用于构建 MaiLauncher 项目。

## 服务器要求

### 硬件要求

- **CPU**: 推荐 4 核心以上
- **内存**: 推荐 8GB 以上
- **存储**: 推荐 50GB 以上可用空间（构建过程会产生大量临时文件）
- **网络**: 稳定的网络连接

### 软件环境

以下软件需要在自托管服务器上预安装：

1. **Windows 10/11** (64-bit)
2. **Git** (最新版本)
3. **Python 3.12**
4. **Node.js 22** (可选，工作流会自动安装)
5. **PowerShell 5.1+**

## 安装依赖

### 1. 安装 Python 3.12

```powershell
# 下载并安装 Python 3.12
# 确保勾选 "Add Python to PATH"
winget install Python.Python.3.12
```

### 2. 安装 Git

```powershell
winget install Git.Git
```

### 3. 验证安装

```powershell
python --version  # 应该显示 Python 3.12.x
git --version     # 应该显示 Git 版本
pip --version     # 应该显示 pip 版本
```

## Runner 配置

### 1. 下载 GitHub Actions Runner

1. 在 GitHub 仓库设置中，转到 `Settings` > `Actions` > `Runners`
2. 点击 "New self-hosted runner"
3. 选择 Windows x64
4. 按照提供的命令下载和配置 runner

### 2. 配置 Runner 标签

确保您的 runner 具有以下标签：

- `self-hosted`
- `windows`
- `x64`

### 3. 安装为 Windows 服务

```powershell
# 在 runner 目录中执行
.\svc.cmd install
.\svc.cmd start
```

## 性能优化

### 1. 磁盘空间管理

```powershell
# 创建定期清理脚本
$script = @"
# 清理临时文件
Get-ChildItem -Path $env:TEMP -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path "C:\Windows\Temp" -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue

# 清理构建缓存
if (Test-Path "C:\actions-runner\_work") {
    Get-ChildItem -Path "C:\actions-runner\_work" -Recurse -Include "node_modules","target","dist" | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
}
"@

$script | Out-File -FilePath "C:\cleanup.ps1" -Encoding UTF8

# 创建计划任务，每天清理
schtasks /create /tn "GitHub Runner Cleanup" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\cleanup.ps1" /sc daily /st 02:00
```

### 2. 环境变量设置

```powershell
# 设置构建相关环境变量
[System.Environment]::SetEnvironmentVariable("PYTHONUNBUFFERED", "1", "Machine")
[System.Environment]::SetEnvironmentVariable("RUST_BACKTRACE", "1", "Machine")
```

### 3. 网络配置

确保以下域名可以访问：

- `github.com`
- `api.github.com`
- `codeload.github.com`
- `objects.githubusercontent.com`
- `registry.npmjs.org`
- `pypi.org`

## 监控和维护

### 1. 检查 Runner 状态

```powershell
# 检查服务状态
Get-Service "actions.runner.*"

# 检查日志
Get-Content "C:\actions-runner\_diag\Runner_*.log" -Tail 50
```

### 2. 重启 Runner

```powershell
# 停止服务
.\svc.cmd stop

# 启动服务
.\svc.cmd start
```

### 3. 更新 Runner

定期检查并更新 GitHub Actions Runner 到最新版本。

## 故障排除

### 常见问题

1. **构建失败 - Python 找不到**

   ```powershell
   # 检查 Python 路径
   where python
   # 如果没有输出，重新安装 Python 并确保添加到 PATH
   ```

2. **构建失败 - 磁盘空间不足**

   ```powershell
   # 检查磁盘空间
   Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object Size,FreeSpace
   ```

3. **构建失败 - 网络问题**

   ```powershell
   # 测试网络连接
   Test-NetConnection github.com -Port 443
   Test-NetConnection registry.npmjs.org -Port 443
   ```

4. **Runner 离线**

   ```powershell
   # 检查 Runner 服务
   Get-Service "actions.runner.*"

   # 重启服务
   Restart-Service "actions.runner.*"
   ```

## 工作流配置

我已经为您配置了两个工作流：

1. **`build.yml`** - 包含所有平台的构建，Windows 部分使用自托管 runner
2. **`build-self-hosted.yml`** - 专门用于自托管服务器的独立工作流

### 使用建议

- 使用 `build-self-hosted.yml` 进行快速测试和开发构建
- 使用 `build.yml` 进行完整的多平台发布构建

## 安全注意事项

1. **网络安全**: 确保 runner 在安全的网络环境中运行
2. **访问控制**: 限制对 runner 服务器的物理和远程访问
3. **定期更新**: 保持操作系统和软件依赖的最新状态
4. **监控**: 定期检查 runner 日志，监控异常活动

## 联系支持

如果遇到问题，可以：

1. 查看 GitHub Actions Runner 官方文档
2. 检查 GitHub 仓库的 Issues
3. 联系项目维护者

---

**注意**: 这是一个自托管环境，需要您自己维护和管理。请确保定期备份重要数据和配置。

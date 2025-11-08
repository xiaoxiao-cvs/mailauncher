# NapCat 安装脚本说明

## 概述

本目录包含 NapCat 的自动安装脚本，用于在 macOS 系统上快速部署 NapCat。

## 脚本文件

### `install_napcat_macos.sh`

macOS 专用的 NapCat 自动安装脚本。

**功能特性:**
- ✅ 自动检查和安装依赖（curl, unzip, jq）
- ✅ 从 GitHub 下载最新版本的 NapCat
- ✅ 自动解压和配置
- ✅ 设置正确的文件权限
- ✅ 彩色日志输出

**依赖要求:**
- macOS 系统
- Homebrew (用于安装依赖)
- curl
- unzip
- jq

**使用方法:**

```bash
# 手动执行
cd /path/to/instance
bash /path/to/install_napcat_macos.sh

# 或者通过 MAI Launcher 自动调用
```

**安装位置:**
- 默认安装目录: `~/Napcat`
- QQ 路径: `~/Napcat/opt/QQ`
- NapCat 插件: `~/Napcat/opt/QQ/resources/app/app_launcher/napcat`

## 原理说明

### 安装流程

1. **依赖检查**
   - 检查系统是否为 macOS
   - 验证必需命令是否存在
   - 如果缺少依赖，使用 Homebrew 自动安装

2. **下载 NapCat**
   - 从 GitHub Releases 下载最新的 `NapCat.Shell.zip`
   - 验证下载文件的完整性

3. **安装 NapCat**
   - 解压到临时目录
   - 复制文件到目标位置
   - 创建 `loadNapCat.js` 启动文件
   - 修改 QQ 的 `package.json` 配置

4. **清理和收尾**
   - 删除临时文件
   - 设置正确的权限
   - 显示安装信息

### 技术细节

**为什么选择 Shell 脚本?**
- macOS 是 Unix 系统，完美支持 bash
- NapCat 官方提供的 Linux 脚本在 macOS 上大部分可用
- 可以直接集成到 Python 后端中调用

**与 Linux 版本的差异:**
- 移除了包管理器检测（apt-get/dnf）
- 使用 Homebrew 作为包管理器
- 简化了 QQ 安装流程（macOS 通常手动安装）
- 保留了核心的文件操作逻辑

## 集成到 MAI Launcher

脚本已集成到 `download_service.py` 中：

```python
async def download_napcat(
    self,
    instance_dir: Path,
    progress_callback: Optional[Callable[[str, str], Any]] = None,
) -> bool:
    """执行 NapCat 安装脚本"""
    # 执行 install_napcat_macos.sh
    # 实时显示安装进度
    # 返回安装结果
```

**调用流程:**
1. 用户在界面上选择"安装 NapCat"
2. 后端调用 `download_napcat()`
3. 执行 shell 脚本进行安装
4. 实时回传日志到前端
5. 完成后显示结果

## 故障排查

### 常见问题

**1. 依赖缺失**
```bash
# 手动安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装依赖
brew install curl unzip jq
```

**2. 权限问题**
```bash
# 确保脚本有执行权限
chmod +x install_napcat_macos.sh
```

**3. 网络问题**
如果 GitHub 下载失败，可以：
- 使用代理
- 手动下载 `NapCat.Shell.zip` 放到执行目录
- 修改脚本使用镜像地址

**4. macOS 安全限制**
```bash
# 移除隔离属性
xattr -cr ~/Napcat

# 允许运行未签名的程序
# 系统偏好设置 > 安全性与隐私 > 允许任何来源
```

## 未来优化

- [ ] 支持版本选择（当前为 latest）
- [ ] 添加更新功能
- [ ] 集成 QQ 自动下载（目前需要手动）
- [ ] 支持配置文件备份和恢复
- [ ] 添加卸载脚本

## 参考资料

- [NapCat 官方文档](https://napneko.github.io/)
- [NapCat GitHub](https://github.com/NapNeko/NapCatQQ)
- [Linux 安装脚本](https://github.com/NapNeko/NapCat-Installer)

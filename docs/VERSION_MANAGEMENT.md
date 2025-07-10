# 版本管理指南

本项目已实现了完整的语义化版本管理机制，支持自动递增和手动指定版本号。

## 版本命名规则

### 1. 生产版本 (Production)
- **格式**: `x.y.z` (严格遵循语义化版本)
- **示例**: `1.0.0`, `1.2.3`, `2.0.0`
- **标签**: `v1.0.0`

### 2. 预览版本 (Preview)
- **格式**: `x.y.z-preview.n`
- **示例**: `0.1.0-preview.1`, `1.0.0-preview.2`
- **标签**: `v0.1.0-preview.1`

### 3. 开发版本 (Development)
- **格式**: `x.y.z-dev.n`
- **示例**: `0.1.0-dev.1`, `0.1.0-dev.2`
- **标签**: `dev-0.1.0-dev.1`

## GitHub Actions 工作流

### 1. 开发版本自动构建 (`dev-build.yml`)
- **触发**: 推送到 `main` 分支
- **版本生成**: 自动递增构建号
- **发布**: 自动创建预发布版本
- **清理**: 自动清理超过 5 个的旧开发版本

### 2. 预览版本手动构建 (`preview-build.yml`)
- **触发**: 手动执行
- **版本生成**: 自动递增预览版本号或手动指定
- **发布**: 可选择是否创建 GitHub Release

### 3. 生产版本发布 (`production-release.yml`)
- **触发**: 手动执行
- **版本模式**: 
  - `manual`: 手动指定版本号
  - `patch`: 自动递增补丁版本 (0.1.0 → 0.1.1)
  - `minor`: 自动递增次版本 (0.1.0 → 0.2.0)
  - `major`: 自动递增主版本 (0.1.0 → 1.0.0)
- **同步**: 自动更新 `package.json` 和 `Cargo.toml`

## 本地版本管理

### 使用 npm 脚本

```bash
# 递增补丁版本 (推荐用于 bug 修复)
npm run version:patch

# 递增次版本 (推荐用于新功能)
npm run version:minor

# 递增主版本 (推荐用于重大更改)
npm run version:major

# 创建预览版本
npm run version:preview

# 创建开发版本
npm run version:dev

# 模拟运行 (不实际修改文件)
npm run version:dry-run
```

### 使用版本管理脚本

```powershell
# 自动递增
.\scripts\version-manager.ps1 -Type patch
.\scripts\version-manager.ps1 -Type minor
.\scripts\version-manager.ps1 -Type major

# 手动指定版本
.\scripts\version-manager.ps1 -Type patch -Version "1.2.3"

# 模拟运行
.\scripts\version-manager.ps1 -Type patch -DryRun
```

## 版本发布流程

### 开发版本 (自动)
1. 推送代码到 `main` 分支
2. GitHub Actions 自动构建并发布开发版本
3. 版本号自动递增: `0.1.0-dev.1` → `0.1.0-dev.2`

### 预览版本 (手动)
1. 在 GitHub Actions 中手动触发 "构建预览版本"
2. 选择自动递增或手动指定版本号
3. 系统会自动构建并发布预览版本

### 生产版本 (手动)
1. 在 GitHub Actions 中手动触发 "构建生产版本发布"
2. 选择版本递增模式:
   - `patch`: 用于 bug 修复
   - `minor`: 用于新功能
   - `major`: 用于重大更改
   - `manual`: 手动指定版本号
3. 系统会自动:
   - 更新 `package.json` 和 `Cargo.toml`
   - 创建版本标签
   - 构建发布包
   - 创建 GitHub Release

## 版本同步

所有版本更新操作都会自动同步以下文件中的版本号:
- `package.json`
- `src-tauri/Cargo.toml`

这确保了前端和后端的版本号始终保持一致。

## 最佳实践

1. **开发阶段**: 使用自动构建的开发版本
2. **测试阶段**: 手动创建预览版本
3. **发布阶段**: 根据更改类型选择合适的版本递增模式
4. **遵循语义化版本**: 
   - 主版本号: 不兼容的 API 修改
   - 次版本号: 向下兼容的功能性新增
   - 修订号: 向下兼容的问题修正

## 故障排除

### 版本冲突
如果遇到版本标签已存在的错误:
1. 检查现有的 git 标签: `git tag -l`
2. 删除冲突的标签: `git tag -d <tag-name>`
3. 删除远程标签: `git push --delete origin <tag-name>`

### 版本不同步
如果 `package.json` 和 `Cargo.toml` 版本不一致:
1. 使用版本管理脚本重新同步
2. 或手动修改确保一致性

## 版本历史查看

```bash
# 查看所有版本标签
git tag -l --sort=-version:refname

# 查看生产版本
git tag -l "v*.*.*" --sort=-version:refname

# 查看预览版本
git tag -l "v*-preview*" --sort=-version:refname

# 查看开发版本
git tag -l "dev-*" --sort=-version:refname
```

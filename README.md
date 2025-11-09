# MAI Launcher

麦麦启动器 - 为 MaiBot、NapCat 和适配器提供可视化管理的新手友好工具

## 项目结构

```
mailauncher/
├── frontend/          # 前端项目 (React + TypeScript + Vite)
├── backend/           # 后端服务 (待开发)
├── docs/             # 项目文档
└── old/              # 旧版本代码备份
```

## 快速开始

### 前端开发

```bash
cd frontend
pnpm install
pnpm dev
```

访问 http://localhost:3000

### 构建应用

```bash
cd frontend
pnpm tauri build
```

#### macOS 用户注意

如果构建后提示"App 已损坏"，运行修复脚本：

```bash
./fix-app-macos.sh
```

或手动执行：

```bash
# 移除隔离属性
xattr -cr "/Applications/MAI Launcher.app"

# 应用 ad-hoc 签名
codesign --force --deep --sign - "/Applications/MAI Launcher.app"
```

### 后端开发

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 6
- Tailwind CSS + Origin UI
- React Router v6
- Zustand

### 后端
- 待定

## 开发规范

请查看 [架构文档](./docs/ARCHITECTURE.md) 了解详细的开发规范和项目架构。

## 第三方集成说明

本项目集成了以下第三方软件，它们各自遵循独立的开源协议：

### NapCat
- **协议**: Limited Redistribution License
- **版权**: Copyright © 2024 Mlikiowa
- **项目地址**: https://github.com/NapNeko/NapCatQQ
- **使用方式**: 本启动器仅下载和启动官方发布的 NapCat 包，不包含、修改或再分发 NapCat 源代码
- **重要说明**: 
  - NapCat 禁止商业使用
  - 未经授权不得基于 NapCat 代码进行二次开发
  - 使用者需自行遵守 NapCat 的许可证条款

### MaiBot (如有集成)
- 请遵循 MaiBot 的相应协议

## License

本项目（MAI Launcher 启动器本身的代码）采用 **GNU General Public License v3.0**

- ✅ 允许自由使用、修改、分发
- ✅ 允许商业使用（需开源）
- ⚠️ 修改后的版本必须同样开源
- ⚠️ 需保留原作者版权信息

**重要提示**:
1. 本启动器的 GPL-3.0 协议仅适用于启动器本身的代码
2. 通过本启动器下载/管理的第三方软件（如 NapCat）各自遵循其独立协议
3. 使用者需自行确保遵守所有相关软件的许可证条款
4. 若计划商业使用本启动器，请注意 NapCat 禁止商业使用的限制

详见 [LICENSE](./LICENSE) 文件

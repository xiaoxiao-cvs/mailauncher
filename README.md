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

## License

MIT

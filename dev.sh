#!/bin/bash

# MAI Launcher 开发模式启动脚本
# 该脚本将同时启动后端和前端开发服务器

set -e

echo "======================================"
echo "MAI Launcher Development Mode"
echo "======================================"

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 确保日志目录存在
mkdir -p backend/data/Log/backend
mkdir -p backend/data/Log/frontend

# 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo "Error: Virtual environment not found. Please run:"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r backend/requirements.txt"
    exit 1
fi

# 启动后端
echo ""
echo "Starting backend server on http://localhost:11111..."
cd backend
../.venv/bin/python main.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "Waiting for backend to start..."
sleep 3

# 检查后端是否启动成功
if ! curl -s http://localhost:11111/api/v1/health > /dev/null 2>&1; then
    echo "Warning: Backend may not be running properly"
fi

# 启动前端
echo ""
echo "Starting frontend development server..."
cd frontend
pnpm dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 3

echo ""
echo "======================================"
echo "Development servers started!"
echo "======================================"
echo ""
echo "Backend:  http://localhost:11111"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# 捕获 Ctrl+C 信号
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# 等待进程
wait

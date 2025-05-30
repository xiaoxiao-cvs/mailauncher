// src/utils/api.js

// 固定后端端口号
const BACKEND_PORT = 23456;

// WebSocket 连接
export async function connectWebSocket() {
  const socket = new WebSocket(`ws://127.0.0.1:${BACKEND_PORT}/ws`);

  // 连接状态检查
  const checkConnection = () => {
    if (socket.readyState === WebSocket.CONNECTING) {
      setTimeout(checkConnection, 100);
    } else if (socket.readyState === WebSocket.OPEN) {
      console.log("WebSocket连接成功");
    } else {
      console.error("WebSocket连接失败");
    }
  };

  socket.onopen = () => {
    console.log("WebSocket连接成功");
    // 发送初始握手消息
    socket.send(JSON.stringify({ type: "connection_established" }));
  };

  socket.onmessage = (event) => {
    console.log("收到消息:", event.data);
    // 处理消息逻辑...
  };

  socket.onerror = (error) => {
    console.error("WebSocket错误:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket连接关闭");
  };

  // 启动连接检查
  setTimeout(checkConnection, 500);

  return socket;
}

// HTTP请求函数
export async function apiRequest(endpoint, method = "GET", data = null) {
  const url = `http://127.0.0.1:${BACKEND_PORT}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : null,
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API请求失败:", error);
    return { error: true, message: error.message };
  }
}

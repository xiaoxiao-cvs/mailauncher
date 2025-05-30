// 测试连接
import { apiRequest, connectWebSocket } from './src/utils/api.js';

console.log("开始测试后端连接...");

// 测试HTTP API
async function testHttpApi() {
    console.log("测试HTTP API...");
    const result = await apiRequest('/api/test');
    console.log("HTTP API结果:", result);
}

// 测试WebSocket
async function testWebSocket() {
    console.log("测试WebSocket...");
    try {
        const socket = await connectWebSocket();
        
        socket.onopen = () => {
            console.log("WebSocket连接成功");
            socket.send(JSON.stringify({ type: "test", message: "Hello from test!" }));
        };
        
        socket.onmessage = (event) => {
            console.log("收到WebSocket消息:", event.data);
            socket.close();
        };
        
        socket.onerror = (error) => {
            console.error("WebSocket错误:", error);
        };
        
    } catch (error) {
        console.error("WebSocket测试失败:", error);
    }
}

// 运行测试
testHttpApi();
setTimeout(testWebSocket, 1000);

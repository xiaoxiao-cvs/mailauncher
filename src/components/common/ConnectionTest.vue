<!-- src/components/common/ConnectionTest.vue -->
<template>
    <div class="connection-test">
        <h3>后端连接测试</h3>
        <div class="test-section">
            <h4>HTTP API 测试</h4>
            <button @click="testHttpApi" :disabled="testing">
                {{ testing ? '测试中...' : '测试 HTTP API' }}
            </button>
            <div v-if="httpResult" class="result" :class="httpResult.success ? 'success' : 'error'">
                {{ httpResult.message }}
            </div>
        </div>

        <div class="test-section">
            <h4>WebSocket 测试</h4>
            <button @click="testWebSocket" :disabled="wsConnected">
                {{ wsConnected ? 'WebSocket 已连接' : '测试 WebSocket' }}
            </button>
            <button v-if="wsConnected" @click="sendTestMessage">发送测试消息</button>
            <button v-if="wsConnected" @click="disconnectWebSocket">断开连接</button>
            <div v-if="wsResult" class="result" :class="wsResult.success ? 'success' : 'error'">
                {{ wsResult.message }}
            </div>
            <div v-if="wsMessages.length" class="messages">
                <h5>WebSocket 消息：</h5>
                <div v-for="(msg, index) in wsMessages" :key="index" class="message">
                    {{ msg }}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { apiRequest, connectWebSocket } from '@/utils/api.js'

export default {
    name: 'ConnectionTest',
    data() {
        return {
            testing: false,
            httpResult: null,
            wsResult: null,
            wsConnected: false,
            wsSocket: null,
            wsMessages: []
        }
    },
    methods: {
        async testHttpApi() {
            this.testing = true
            this.httpResult = null

            try {
                const result = await apiRequest('/api/test')
                if (result.error) {
                    this.httpResult = {
                        success: false,
                        message: `HTTP API 连接失败: ${result.message}`
                    }
                } else {
                    this.httpResult = {
                        success: true,
                        message: `HTTP API 连接成功: ${result.message} (端口: ${result.port})`
                    }
                }
            } catch (error) {
                this.httpResult = {
                    success: false,
                    message: `HTTP API 测试异常: ${error.message}`
                }
            } finally {
                this.testing = false
            }
        },

        async testWebSocket() {
            this.wsResult = null
            this.wsMessages = []

            try {
                this.wsSocket = await connectWebSocket()

                this.wsSocket.onopen = () => {
                    this.wsConnected = true
                    this.wsResult = {
                        success: true,
                        message: 'WebSocket 连接成功'
                    }
                }

                this.wsSocket.onmessage = (event) => {
                    this.wsMessages.push(`收到: ${event.data}`)
                }

                this.wsSocket.onclose = () => {
                    this.wsConnected = false
                    this.wsResult = {
                        success: false,
                        message: 'WebSocket 连接已关闭'
                    }
                }

                this.wsSocket.onerror = (error) => {
                    this.wsConnected = false
                    this.wsResult = {
                        success: false,
                        message: `WebSocket 连接错误: ${error.message || '未知错误'}`
                    }
                }

            } catch (error) {
                this.wsResult = {
                    success: false,
                    message: `WebSocket 测试异常: ${error.message}`
                }
            }
        },

        sendTestMessage() {
            if (this.wsSocket && this.wsConnected) {
                const message = JSON.stringify({
                    type: 'test',
                    content: `测试消息 - ${new Date().toLocaleTimeString()}`,
                    timestamp: Date.now()
                })
                this.wsSocket.send(message)
                this.wsMessages.push(`发送: ${message}`)
            }
        },

        disconnectWebSocket() {
            if (this.wsSocket) {
                this.wsSocket.close()
                this.wsSocket = null
                this.wsConnected = false
            }
        }
    },

    beforeUnmount() {
        this.disconnectWebSocket()
    }
}
</script>

<style scoped>
.connection-test {
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.test-section {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
}

.test-section h4 {
    margin-top: 0;
    color: #333;
}

button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 10px;
}

button:hover:not(:disabled) {
    background: #0056b3;
}

button:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

.result {
    margin-top: 10px;
    padding: 10px;
    border-radius: 4px;
    font-weight: bold;
}

.result.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.result.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.messages {
    margin-top: 15px;
    max-height: 200px;
    overflow-y: auto;
}

.message {
    padding: 5px;
    margin: 5px 0;
    background: #f8f9fa;
    border-left: 3px solid #007bff;
    font-family: monospace;
    font-size: 12px;
}
</style>

#!/usr/bin/env python3
"""
终端功能测试脚本
测试实例启动和终端 WebSocket 连接
"""
import asyncio
import websockets
import json
from pathlib import Path

API_URL = "http://localhost:23456/api/v1"
WS_URL = "ws://localhost:23456/api/v1"


async def test_terminal():
    """测试终端 WebSocket 连接"""
    instance_id = input("请输入实例 ID: ").strip()
    component = input("请输入组件名称 (main/napcat/napcat-ada): ").strip() or "main"
    
    ws_url = f"{WS_URL}/instances/{instance_id}/component/{component}/terminal"
    print(f"\n连接到: {ws_url}\n")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✓ WebSocket 已连接")
            
            # 接收消息
            async def receive_messages():
                try:
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data['type'] == 'connected':
                            print(f"✓ {data['message']}")
                            print(f"  PID: {data['pid']}\n")
                        elif data['type'] == 'output':
                            print(data['data'], end='', flush=True)
                        elif data['type'] == 'error':
                            print(f"\n✗ 错误: {data['message']}")
                            break
                except websockets.exceptions.ConnectionClosed:
                    print("\n✗ 连接已关闭")
                except Exception as e:
                    print(f"\n✗ 接收消息失败: {e}")
            
            # 发送输入
            async def send_input():
                try:
                    while True:
                        cmd = await asyncio.get_event_loop().run_in_executor(
                            None, input
                        )
                        
                        if cmd.strip().lower() in ['exit', 'quit']:
                            break
                        
                        await websocket.send(json.dumps({
                            'type': 'input',
                            'data': cmd + '\n'
                        }))
                except Exception as e:
                    print(f"\n✗ 发送输入失败: {e}")
            
            # 并发运行接收和发送任务
            receive_task = asyncio.create_task(receive_messages())
            # send_task = asyncio.create_task(send_input())
            
            # 等待接收任务完成（或被中断）
            await receive_task
            
    except websockets.exceptions.InvalidURI:
        print(f"✗ 无效的 WebSocket URL: {ws_url}")
    except websockets.exceptions.WebSocketException as e:
        print(f"✗ WebSocket 连接失败: {e}")
    except Exception as e:
        print(f"✗ 测试失败: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("终端功能测试")
    print("=" * 60)
    print()
    
    asyncio.run(test_terminal())

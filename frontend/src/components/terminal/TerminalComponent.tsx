/**
 * 终端组件
 * 使用 xterm.js 实现的真实终端模拟器
 */

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { getApiBaseUrl } from '@/config/api';

interface TerminalComponentProps {
  instanceId: string;
  component: 'MaiBot' | 'NapCat' | 'MaiBot-Napcat-Adapter';
  className?: string;
  isRunning?: boolean; // 组件是否正在运行
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({
  instanceId,
  component,
  className = '',
  isRunning: _isRunning = false,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // 初始化终端 (只执行一次)
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // 创建终端实例
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Cascadia Mono", "JetBrains Mono", "Fira Code", Consolas, "DejaVu Sans Mono", "Courier New", monospace',
      // 确保字符宽度一致，有助于二维码正确显示
      letterSpacing: 0,
      lineHeight: 1,
      theme: {
        background: '#000000',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      rows: 30,
      cols: 120,  // 增加列数以容纳二维码
      scrollback: 1000,
      convertEol: true,
      // Unicode 支持设置
      allowProposedApi: true,
    });
    
    // 打开终端（必须先打开才能加载插件）
    term.open(terminalRef.current);
    
    // 创建自适应插件
    const fit = new FitAddon();
    fitAddon.current = fit;
    term.loadAddon(fit);
    
    // 创建链接插件
    const webLinks = new WebLinksAddon();
    term.loadAddon(webLinks);
    
    // 加载 Unicode11 插件以支持宽字符（二维码等）
    const unicode11 = new Unicode11Addon();
    term.loadAddon(unicode11);
    term.unicode.activeVersion = '11';
    
    // 适配终端大小
    setTimeout(() => {
      try {
        fit.fit();
      } catch (e) {
        console.warn('初始 fit 失败:', e);
      }
    }, 0);
    
    terminalInstance.current = term;
    
    // 窗口大小改变时重新适配
    const handleResize = () => {
      if (fitAddon.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.error('调整终端大小失败:', error);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // 延迟适配以确保容器尺寸正确
    const resizeTimeout = setTimeout(() => {
      handleResize();
    }, 100);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, []); // 只在挂载时执行一次
  
  // 管理 WebSocket 连接
  useEffect(() => {
    const term = terminalInstance.current;
    if (!term) return;
    
    // 清空终端内容，准备显示新会话
    term.clear();
    
    // 显示新会话的头部信息
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln(`\x1b[1;33m实例:\x1b[0m ${instanceId}`);
    term.writeln(`\x1b[1;33m组件:\x1b[0m ${component}`);
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln('');
    
    // 组件正在运行,建立 WebSocket 连接
    term.writeln('\x1b[1;32m正在连接终端...\x1b[0m');
    
    // 使用统一的 API 配置获取后端地址
    const apiBaseUrl = getApiBaseUrl();
    const wsUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    // 添加查询参数请求历史日志 (500条)
    const ws = new WebSocket(`${wsUrl}/api/v1/instances/${instanceId}/component/${component}/terminal?history=500`);
    
    wsRef.current = ws;
    
    ws.onopen = () => {
      term.writeln('\x1b[1;32m✓ 终端已连接\x1b[0m');
      term.writeln('');
      
      // 发送终端尺寸
      if (fitAddon.current) {
        const { rows, cols } = term;
        ws.send(JSON.stringify({
          type: 'resize',
          rows: rows,
          cols: cols
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            term.writeln(`\x1b[1;32m${message.message}\x1b[0m`);
            if (message.pid) {
              term.writeln(`\x1b[90mPID: ${message.pid}\x1b[0m`);
            }
            term.writeln('');
            break;
            
          case 'history':
            // 显示历史日志
            if (message.lines && message.lines.length > 0) {
              term.writeln(`\x1b[90m--- 历史日志 (${message.lines.length} 条) ---\x1b[0m`);
              message.lines.forEach((line: string) => {
                term.write(line);
              });
              term.writeln('\x1b[90m--- 实时日志 ---\x1b[0m');
              term.writeln('');
            }
            break;
            
          case 'output':
            term.write(message.data);
            break;
            
          case 'error':
            term.writeln('');
            term.writeln(`\x1b[1;31m错误: ${message.message}\x1b[0m`);
            break;
            
          default:
            console.warn('未知消息类型:', message);
        }
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };
    
    ws.onerror = (error) => {
      // 只在 WebSocket 已经打开过的情况下显示错误
      // 忽略在 CONNECTING 状态下的错误(通常是组件卸载导致的)
      if (ws.readyState !== WebSocket.CONNECTING && wsRef.current === ws) {
        term.writeln('');
        term.writeln('\x1b[1;31m✗ 终端连接错误\x1b[0m');
        console.error('WebSocket 错误:', error);
      }
    };
    
    ws.onclose = (event) => {
      // 只在正常连接后关闭时显示消息（避免开发模式重复挂载产生的噪音）
      if (event.wasClean && wsRef.current === ws) {
        term.writeln('');
        term.writeln('\x1b[1;33m○ 终端连接已关闭\x1b[0m');
      }
    };
    
    // 发送用户输入到 WebSocket
    const onDataHandler = (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    };
    
    term.onData(onDataHandler);
    
    // 监听终端大小变化
    const onResizeHandler = ({ rows, cols }: { rows: number; cols: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          rows: rows,
          cols: cols
        }));
      }
    };
    
    term.onResize(onResizeHandler);
    
    // 清理
    return () => {
      if (wsRef.current) {
        // 标记为已清理,避免 onclose 回调显示消息
        const currentWs = wsRef.current;
        wsRef.current = null;
        
        // 只在连接已建立时关闭
        if (currentWs.readyState === WebSocket.OPEN || 
            currentWs.readyState === WebSocket.CONNECTING) {
          currentWs.close();
        }
      }
    };
  }, [instanceId, component]);
  
  return (
    <div className={`terminal-container ${className} px-4 py-3`}>
      <div 
        ref={terminalRef} 
        className="h-full w-full rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: '#000000',
        }}
      />
      <style>{`
        /* 隐藏 xterm.js 滚动条 */
        .terminal-container .xterm-viewport {
          overflow-y: scroll !important;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .terminal-container .xterm-viewport::-webkit-scrollbar {
          display: none; /* Chrome/Safari/Opera */
        }
      `}</style>
    </div>
  );
};

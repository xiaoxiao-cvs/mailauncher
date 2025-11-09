/**
 * 终端组件
 * 使用 xterm.js 实现的真实终端模拟器
 */

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
  instanceId: string;
  component: 'main' | 'napcat' | 'napcat-ada';
  className?: string;
  isRunning?: boolean; // 组件是否正在运行
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({
  instanceId,
  component,
  className = '',
  isRunning = false,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // 创建终端实例
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
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
      cols: 100,
      scrollback: 1000,
      convertEol: true,
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
    
    // 适配终端大小
    setTimeout(() => {
      try {
        fit.fit();
      } catch (e) {
        console.warn('初始 fit 失败:', e);
      }
    }, 0);
    
    terminalInstance.current = term;
    
    // 显示欢迎信息
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln(`\x1b[1;33m实例:\x1b[0m ${instanceId}`);
    term.writeln(`\x1b[1;33m组件:\x1b[0m ${component}`);
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[1;32m正在连接终端...\x1b[0m');
    term.writeln('');
    
    // 连接 WebSocket（仅当组件运行时）
    if (!isRunning) {
      term.writeln('\x1b[1;33m组件未运行\x1b[0m');
      term.writeln('');
      term.writeln('\x1b[90m请先启动组件才能查看终端输出\x1b[0m');
      return; // 不连接 WebSocket
    }
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:23456/api/v1';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${wsUrl}/instances/${instanceId}/component/${component}/terminal`);
    
    wsRef.current = ws;
    
    ws.onopen = () => {
      term.writeln('\x1b[1;32m终端已连接\x1b[0m');
      term.writeln('');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            term.writeln(`\x1b[1;32m${message.message}\x1b[0m`);
            term.writeln(`\x1b[90mPID: ${message.pid}\x1b[0m`);
            term.writeln('');
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
      term.writeln('');
      term.writeln('\x1b[1;31m终端连接错误\x1b[0m');
      console.error('WebSocket 错误:', error);
    };
    
    ws.onclose = () => {
      term.writeln('');
      term.writeln('\x1b[1;33m终端连接已关闭\x1b[0m');
    };
    
    // 发送用户输入到 WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });
    
    // 监听终端大小变化
    term.onResize(({ rows, cols }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          rows: rows,
          cols: cols
        }));
      }
    });
    
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
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, [instanceId, component]);
  
  return (
    <div className={`terminal-container ${className}`}>
      <div 
        ref={terminalRef} 
        className="h-full w-full rounded-lg overflow-hidden"
        style={{ backgroundColor: '#1e1e1e' }}
      />
    </div>
  );
};

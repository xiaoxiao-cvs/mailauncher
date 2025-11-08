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
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({
  instanceId,
  component,
  className = '',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
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
    
    // 创建自适应插件
    const fit = new FitAddon();
    fitAddon.current = fit;
    term.loadAddon(fit);
    
    // 创建链接插件
    const webLinks = new WebLinksAddon();
    term.loadAddon(webLinks);
    
    // 打开终端
    term.open(terminalRef.current);
    fit.fit();
    
    terminalInstance.current = term;
    
    // 显示欢迎信息
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln(`\x1b[1;33m实例:\x1b[0m ${instanceId}`);
    term.writeln(`\x1b[1;33m组件:\x1b[0m ${component}`);
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[1;32m正在连接终端...\x1b[0m');
    term.writeln('');
    
    // 连接 WebSocket
    // TODO: 实现 WebSocket 连接到后端
    // const ws = new WebSocket(`ws://localhost:23456/api/v1/instances/${instanceId}/component/${component}/terminal`);
    
    // wsRef.current = ws;
    
    // ws.onopen = () => {
    //   term.writeln('\x1b[1;32m终端已连接\x1b[0m');
    //   term.writeln('');
    // };
    
    // ws.onmessage = (event) => {
    //   term.write(event.data);
    // };
    
    // ws.onerror = () => {
    //   term.writeln('');
    //   term.writeln('\x1b[1;31m终端连接错误\x1b[0m');
    // };
    
    // ws.onclose = () => {
    //   term.writeln('');
    //   term.writeln('\x1b[1;33m终端连接已关闭\x1b[0m');
    // };
    
    // // 发送用户输入到 WebSocket
    // term.onData((data) => {
    //   if (ws.readyState === WebSocket.OPEN) {
    //     ws.send(data);
    //   }
    // });
    
    // 模拟输出（临时）
    setTimeout(() => {
      term.writeln('\x1b[1;33m[注意] WebSocket 连接功能待实现\x1b[0m');
      term.writeln('');
      term.writeln('\x1b[90m这是一个终端模拟器演示\x1b[0m');
      term.writeln('\x1b[90m实际输出将通过 WebSocket 从后端获取\x1b[0m');
      term.writeln('');
      term.write('$ ');
    }, 500);
    
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

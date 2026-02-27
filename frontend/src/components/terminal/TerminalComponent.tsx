/**
 * 终端组件
 * 使用 xterm.js 实现的真实终端模拟器
 *
 * 通过 Tauri 事件接收进程输出，通过 invoke 发送终端输入和调整大小。
 * 事件名: `terminal-output-{instanceId}_{component}`
 * 命令: `terminal_write`, `terminal_get_history`, `terminal_resize`
 */

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { tauriInvoke } from '@/services/tauriInvoke';
import { terminalOutputEvent } from '@/types/tauriEvents';

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
  
  // 管理 Tauri 事件监听 + invoke 交互
  useEffect(() => {
    const term = terminalInstance.current;
    if (!term) return;
    
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;
    
    // 清空终端内容，准备显示新会话
    term.clear();
    
    // 显示新会话的头部信息
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln(`\x1b[1;33m实例:\x1b[0m ${instanceId}`);
    term.writeln(`\x1b[1;33m组件:\x1b[0m ${component}`);
    term.writeln('\x1b[1;36m========================================\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[1;32m正在连接终端...\x1b[0m');
    
    const setup = async () => {
      try {
        // 1. 获取历史输出
        const history = await tauriInvoke<string[]>('terminal_get_history', {
          instanceId,
          component,
          lines: 500,
        });
        
        if (cancelled) return;
        
        term.writeln('\x1b[1;32m✓ 终端已连接\x1b[0m');
        term.writeln('');
        
        if (history && history.length > 0) {
          term.writeln(`\x1b[90m--- 历史日志 (${history.length} 条) ---\x1b[0m`);
          history.forEach((line: string) => {
            term.write(line);
          });
          term.writeln('\x1b[90m--- 实时日志 ---\x1b[0m');
          term.writeln('');
        }
        
        // 2. 监听实时输出事件
        const eventName = terminalOutputEvent(instanceId, component);
        unlisten = await listen<string>(eventName, (event) => {
          if (!cancelled) {
            term.write(event.payload);
          }
        });
        
        // 3. 发送初始终端尺寸
        const { rows, cols } = term;
        await tauriInvoke('terminal_resize', {
          instanceId,
          component,
          rows,
          cols,
        });
      } catch (error) {
        if (!cancelled) {
          term.writeln('');
          term.writeln(`\x1b[1;31m✗ 终端连接失败: ${error}\x1b[0m`);
          console.error('终端连接失败:', error);
        }
      }
    };
    
    setup();
    
    // 发送用户输入到 Rust 后端
    const onDataDisposable = term.onData((data: string) => {
      tauriInvoke('terminal_write', {
        instanceId,
        component,
        data,
      }).catch((err) => {
        console.error('终端输入发送失败:', err);
      });
    });
    
    // 监听终端大小变化
    const onResizeDisposable = term.onResize(({ rows, cols }: { rows: number; cols: number }) => {
      tauriInvoke('terminal_resize', {
        instanceId,
        component,
        rows,
        cols,
      }).catch((err) => {
        console.error('终端调整大小失败:', err);
      });
    });
    
    // 清理
    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
    };
  }, [instanceId, component]);
  
  return (
    <div className={`terminal-container ${className} px-4 py-3`}>
      <div 
        ref={terminalRef} 
        className="h-full w-full rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: '#1e1e1e',
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

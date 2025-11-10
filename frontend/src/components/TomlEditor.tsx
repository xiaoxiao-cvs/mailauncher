import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, Diagnostic } from '@codemirror/lint';
import { StreamLanguage } from '@codemirror/language';
import { toml } from '@codemirror/legacy-modes/mode/toml';

interface TomlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// TOML 语法检查器
const tomlLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const text = view.state.doc.toString();
  const lines = text.split('\n');

  // 简单的 TOML 语法检查
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i;
    const from = view.state.doc.line(lineNumber + 1).from;
    const to = view.state.doc.line(lineNumber + 1).to;

    // 跳过空行和注释
    if (!line || line.startsWith('#')) continue;

    // 检查未闭合的引号
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    const tripleDoubleQuotes = (line.match(/"""/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: '未闭合的单引号',
      });
    }

    // 检查双引号(排除三引号的情况)
    if ((doubleQuotes - tripleDoubleQuotes * 3) % 2 !== 0) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: '未闭合的双引号',
      });
    }

    // 检查未闭合的方括号
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: '方括号不匹配',
      });
    }

    // 检查未闭合的大括号
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: '大括号不匹配',
      });
    }

    // 检查键值对格式
    if (line.includes('=') && !line.startsWith('[')) {
      const parts = line.split('=');
      const key = parts[0].trim();
      
      // 检查键名是否为空
      if (!key) {
        diagnostics.push({
          from,
          to,
          severity: 'error',
          message: '键名不能为空',
        });
      }

      // 检查键名是否包含非法字符(未被引号包围的情况)
      if (!key.startsWith('"') && !key.startsWith("'")) {
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          diagnostics.push({
            from,
            to,
            severity: 'warning',
            message: '键名包含特殊字符,建议使用引号包围',
          });
        }
      }
    }
  }

  // 检查多行字符串
  let inMultilineString = false;
  let multilineStringStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"""')) {
      const count = (line.match(/"""/g) || []).length;
      if (count % 2 === 1) {
        if (!inMultilineString) {
          inMultilineString = true;
          multilineStringStart = i;
        } else {
          inMultilineString = false;
        }
      }
    }
  }

  if (inMultilineString) {
    const from = view.state.doc.line(multilineStringStart + 1).from;
    const to = view.state.doc.line(multilineStringStart + 1).to;
    diagnostics.push({
      from,
      to,
      severity: 'error',
      message: '未闭合的多行字符串',
    });
  }

  return diagnostics;
});

export function TomlEditor({ value, onChange, className }: TomlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        StreamLanguage.define(toml),
        oneDark,
        tomlLinter,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
          },
          '.cm-gutters': {
            backgroundColor: '#282c34',
            color: '#5c6370',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#2c313c',
          },
          '.cm-activeLine': {
            backgroundColor: '#2c313c',
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // 当外部 value 改变时更新编辑器内容
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return <div ref={editorRef} className={className} />;
}

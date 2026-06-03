import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { linter, Diagnostic } from "@codemirror/lint";
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { tags } from "@lezer/highlight";

import { useTheme } from "@/hooks/useTheme";

interface TomlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Living Surfaces 编辑器配色。
 *
 * CodeMirror 主题在 JS 里构造、装进 EditorState,无法直接消费 var(--ls-*)
 * 运行时变量(CSS 变量只在样式计算阶段解析,主题对象求值时拿不到)。
 * 因此这里按明/暗各落一套与 tokens.css 对齐的字面值,由 resolvedTheme 选取,
 * 主题切换时通过 Compartment 热替换,既随明暗自适配又保留光标/滚动位置。
 */
interface LsEditorPalette {
  bg: string; // 编辑面底 —— 对齐 --ls-bg-2(凹陷面)
  ink: string; // 主文字 —— --ls-ink
  inkSoft: string; // 次要文字 —— --ls-ink-soft
  inkFaint: string; // 行号/最弱 —— --ls-ink-faint
  hairline: string; // 发丝边/装订线分隔 —— --ls-hairline
  life: string; // 生命色:光标/选区 —— --ls-life
  lifeSoft: string; // 生命色低浓度:选区底/活动行 —— --ls-life-soft
  warn: string; // 警示 —— --ls-warn
  danger: string; // 危险/lint error —— --ls-danger
  number: string; // 数值字面量
  atom: string; // 布尔/字符串值
}

const LS_PALETTE_LIGHT: LsEditorPalette = {
  bg: "#ece7df",
  ink: "#2b2722",
  inkSoft: "#79716a",
  inkFaint: "#a89f95",
  hairline: "rgba(43, 39, 34, 0.08)",
  life: "#45a079",
  lifeSoft: "rgba(69, 160, 121, 0.16)",
  warn: "#cf9442",
  danger: "#c5563e",
  number: "#b07a2e",
  atom: "#45a079",
};

const LS_PALETTE_DARK: LsEditorPalette = {
  bg: "#120f0b",
  ink: "#efe8dd",
  inkSoft: "#a99e90",
  inkFaint: "#6e655a",
  hairline: "rgba(239, 232, 221, 0.09)",
  life: "#5fbf92",
  lifeSoft: "rgba(95, 191, 146, 0.18)",
  warn: "#e0a65a",
  danger: "#d9694f",
  number: "#d6a45c",
  atom: "#5fbf92",
};

/**
 * 构造与主题绑定的编辑器外观:外壳 .cm-* 选择器 + 语法高亮。
 * 旧实现写死 one-dark(#282c34 等)只有暗色;这里改为按生息字面值生成明/暗双套。
 * legacy TOML 流式 mode 仅吐出 bracket/atom/number/comment 这几类 token,
 * 键名(property)无对应标准 tag,自然落到基础 --ls-ink 字面值,不臆造映射。
 */
function buildEditorTheme(palette: LsEditorPalette, dark: boolean): Extension {
  const view = EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "14px",
        color: palette.ink,
        backgroundColor: palette.bg,
      },
      ".cm-content": {
        caretColor: palette.life,
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "JetBrains Mono, Monaco, Consolas, monospace",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: palette.life,
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: palette.lifeSoft,
        },
      ".cm-gutters": {
        backgroundColor: palette.bg,
        color: palette.inkFaint,
        border: "none",
        borderRight: `1px solid ${palette.hairline}`,
      },
      ".cm-lineNumbers .cm-gutterElement": {
        color: palette.inkFaint,
      },
      ".cm-activeLineGutter": {
        backgroundColor: palette.lifeSoft,
        color: palette.ink,
      },
      ".cm-activeLine": {
        backgroundColor: palette.lifeSoft,
      },
      ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: palette.inkFaint,
      },
      ".cm-tooltip": {
        backgroundColor: palette.bg,
        border: `1px solid ${palette.hairline}`,
        borderRadius: "12px",
        color: palette.ink,
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: palette.lifeSoft,
        color: palette.ink,
      },
      ".cm-lintRange-error": {
        textDecorationColor: palette.danger,
      },
      ".cm-lintRange-warning": {
        textDecorationColor: palette.warn,
      },
      ".cm-diagnostic-error": {
        borderLeftColor: palette.danger,
      },
      ".cm-diagnostic-warning": {
        borderLeftColor: palette.warn,
      },
    },
    { dark },
  );

  const highlight = HighlightStyle.define([
    { tag: tags.comment, color: palette.inkFaint, fontStyle: "italic" },
    { tag: tags.propertyName, color: palette.ink },
    { tag: tags.atom, color: palette.atom },
    { tag: tags.string, color: palette.atom },
    { tag: tags.number, color: palette.number },
    { tag: tags.bool, color: palette.life },
    { tag: tags.bracket, color: palette.inkSoft },
    { tag: tags.keyword, color: palette.life },
    { tag: tags.operator, color: palette.inkSoft },
  ]);

  return [view, syntaxHighlighting(highlight)];
}

// TOML 语法检查器
const tomlLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const text = view.state.doc.toString();
  const lines = text.split("\n");

  // 简单的 TOML 语法检查
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i;
    const from = view.state.doc.line(lineNumber + 1).from;
    const to = view.state.doc.line(lineNumber + 1).to;

    // 跳过空行和注释
    if (!line || line.startsWith("#")) continue;

    // 检查未闭合的引号
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    const tripleDoubleQuotes = (line.match(/"""/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      diagnostics.push({
        from,
        to,
        severity: "error",
        message: "未闭合的单引号",
      });
    }

    // 检查双引号(排除三引号的情况)
    if ((doubleQuotes - tripleDoubleQuotes * 3) % 2 !== 0) {
      diagnostics.push({
        from,
        to,
        severity: "error",
        message: "未闭合的双引号",
      });
    }

    // 检查未闭合的方括号
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      diagnostics.push({
        from,
        to,
        severity: "error",
        message: "方括号不匹配",
      });
    }

    // 检查未闭合的大括号
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      diagnostics.push({
        from,
        to,
        severity: "error",
        message: "大括号不匹配",
      });
    }

    // 检查键值对格式
    if (line.includes("=") && !line.startsWith("[")) {
      const parts = line.split("=");
      const key = parts[0].trim();

      // 检查键名是否为空
      if (!key) {
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: "键名不能为空",
        });
      }

      // 检查键名是否包含非法字符(未被引号包围的情况)
      if (!key.startsWith('"') && !key.startsWith("'")) {
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          diagnostics.push({
            from,
            to,
            severity: "warning",
            message: "键名包含特殊字符,建议使用引号包围",
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
      severity: "error",
      message: "未闭合的多行字符串",
    });
  }

  return diagnostics;
});

export function TomlEditor({ value, onChange, className }: TomlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!editorRef.current) return;

    const palette =
      resolvedTheme === "dark" ? LS_PALETTE_DARK : LS_PALETTE_LIGHT;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        StreamLanguage.define(toml),
        themeCompartment.current.of(
          buildEditorTheme(palette, resolvedTheme === "dark"),
        ),
        tomlLinter,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
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
    // 编辑器仅在挂载时构建一次，value/onChange/resolvedTheme 加入依赖会每次变更重建编辑器；
    // value 同步与主题切换分别由下方两个独立 effect 处理(主题走 Compartment 热替换,保留光标/滚动)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 明暗主题切换时,通过 Compartment 热替换编辑器配色,不重建编辑器
  useEffect(() => {
    if (!viewRef.current) return;
    const palette =
      resolvedTheme === "dark" ? LS_PALETTE_DARK : LS_PALETTE_LIGHT;
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(
        buildEditorTheme(palette, resolvedTheme === "dark"),
      ),
    });
  }, [resolvedTheme]);

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

import * as React from "react";

import { Modal, TactileButton } from "@/components/ls";

/**
 * 全局确认对话框 —— 替代浏览器原生 window.confirm(),统一为 Living Surfaces 风格。
 *
 * 用法:在组件里 `const confirm = useConfirm()`,事件处理里
 * `const ok = await confirm({ description: "确定删除吗?", destructive: true }); if (!ok) return;`。
 * 用户点"确定"resolve(true);点"取消"、按 Esc、点遮罩、点关闭按钮都 resolve(false)。
 *
 * 设计意图:原生 confirm() 会阻塞主线程且样式不可控(与全站暖哑光风格割裂),这里用
 * @/components/ls 的 Modal(实色面板 + 半透明纯暗遮罩 + springPop)承载,交互与动效同源。
 */

export interface ConfirmOptions {
  /** 对话框标题,省略时用"请确认" */
  title?: React.ReactNode;
  /** 主体说明文案(即原生 confirm 的提示语) */
  description: React.ReactNode;
  /** 确认按钮文案,默认"确定" */
  confirmText?: string;
  /** 取消按钮文案,默认"取消" */
  cancelText?: string;
  /** 是否高危操作:确认按钮走 danger 配色以警示,默认 false */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * useConfirm —— 取用全局确认对话框,返回 confirm(options) => Promise<boolean>。
 * 必须在 <ConfirmProvider> 内部使用,否则抛错(而非静默退化,便于第一时间暴露漏挂 Provider)。
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm 必须在 <ConfirmProvider> 内部使用");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  // 承诺的 resolve 存 ref,避免把副作用塞进 setState 更新函数里。
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // 若上一次确认尚未结算(极端场景:编程式连续调用 confirm()),先以取消收尾旧承诺再接管,
      // 否则 resolverRef 被覆盖会让旧 Promise 永不结算而泄漏。新的确认取代旧的,语义上等于取消旧的。
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  // 结算:先取出并清空 resolver(保证同一次调用只结算一次),再关面、回传结果。
  const settle = React.useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    if (resolve) resolve(result);
  }, []);

  const open = options !== null;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onOpenChange={(next) => {
          // Esc / 点遮罩 / 关闭按钮触发的关闭都视为取消。
          if (!next) settle(false);
        }}
        title={options?.title ?? "请确认"}
        description={options?.description}
        footer={
          <>
            <TactileButton variant="ghost" onClick={() => settle(false)}>
              {options?.cancelText ?? "取消"}
            </TactileButton>
            <TactileButton
              variant="solid"
              onClick={() => settle(true)}
              style={
                options?.destructive
                  ? {
                      background: "var(--ls-danger)",
                      color: "#fff",
                      borderColor: "var(--ls-danger)",
                    }
                  : undefined
              }
            >
              {options?.confirmText ?? "确定"}
            </TactileButton>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

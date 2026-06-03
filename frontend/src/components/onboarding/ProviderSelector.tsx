import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDownIcon,
  CheckCircle2Icon,
  XIcon,
  PlusIcon,
} from "lucide-react";
import { Label } from "@/components/ls";
import { springSettle } from "@/design/motion";
import { ApiProvider } from "@/hooks/useApiProviderConfig";
// Note: 类型也可以从 '@/hooks/queries/useApiProviderQueries' 导入

interface ProviderSelectorProps {
  providers: ApiProvider[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAddCustom: () => void;
  onRemove: (index: number) => void;
  stepColor: string;
}

/**
 * 供应商选择下拉组件
 *
 * 保留 bespoke 下拉(而非 LS Select):行内含「删除」按钮 + 底部「添加自定义」操作,
 * Radix Select 的纯选项模型无法承载行内动作。仅换皮为生息面/控件 + 弹簧入场。
 */
export function ProviderSelector({
  providers,
  selectedIndex,
  onSelect,
  onAddCustom,
  onRemove,
  // stepColor 由步骤数据透传(数据流保留);生息只用克制生命色,不再渲染原蓝色强调
  stepColor: _stepColor,
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentProvider = providers[selectedIndex];

  return (
    <div className="mb-4 space-y-2">
      <Label>选择供应商</Label>
      <div className="relative">
        {/* 触发器:凹陷控件面 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 text-left flex items-center justify-between outline-none"
          style={{
            background: "var(--ls-bg-2)",
            border: "1px solid var(--ls-hairline)",
            borderRadius: "var(--ls-r-control)",
            color: "var(--ls-ink)",
          }}
        >
          <span
            style={{
              color: currentProvider ? "var(--ls-ink)" : "var(--ls-ink-faint)",
            }}
          >
            {currentProvider?.name || "选择供应商"}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={springSettle}
            className="inline-flex"
          >
            <ChevronDownIcon
              className="w-4 h-4"
              style={{ color: "var(--ls-ink-faint)" }}
            />
          </motion.span>
        </button>

        {/* 下拉菜单:实色面板弹层 + 弹簧入场 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springSettle}
              className="absolute z-10 w-full mt-1 overflow-hidden"
              style={{
                background: "var(--ls-surface)",
                border: "1px solid var(--ls-hairline)",
                borderRadius: "var(--ls-r-card)",
                boxShadow:
                  "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)",
              }}
            >
              {/* 供应商列表 */}
              <div className="max-h-60 overflow-y-auto p-1">
                {providers.map((provider, index) => (
                  <div
                    key={index}
                    className="ls-item flex items-center justify-between px-3 py-2.5"
                    style={{
                      borderRadius: 10,
                      background:
                        selectedIndex === index
                          ? "var(--ls-bg-2)"
                          : "transparent",
                    }}
                  >
                    <button
                      onClick={() => {
                        onSelect(index);
                        setIsOpen(false);
                      }}
                      className="flex-1 text-left outline-none"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {provider.name}
                      {provider.isValid && (
                        <CheckCircle2Icon
                          className="inline-block w-4 h-4 ml-2"
                          style={{ color: "var(--ls-life)" }}
                        />
                      )}
                    </button>
                    {/* 删除按钮 - 所有供应商都可删除,但至少保留一个 */}
                    {providers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(index);
                          if (selectedIndex === index) {
                            setIsOpen(false);
                          }
                        }}
                        className="ls-item p-1.5 group outline-none [color:var(--ls-ink-faint)] hover:[color:var(--ls-danger)] transition-colors"
                        style={{ borderRadius: 8 }}
                        title="删除供应商"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 添加自定义供应商按钮 */}
              <button
                onClick={() => {
                  onAddCustom();
                  setIsOpen(false);
                }}
                className="ls-item w-full px-4 py-2.5 flex items-center justify-center gap-2 outline-none"
                style={{
                  borderTop: "1px solid var(--ls-hairline)",
                  color: "var(--ls-life)",
                }}
              >
                <PlusIcon className="w-4 h-4" />
                <span className="font-medium">添加自定义供应商</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

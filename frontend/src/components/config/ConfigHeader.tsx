import React from "react";
import { Settings, X } from "lucide-react";
import { SegmentControl, Select, TactileButton } from "@/components/ls";
import { ConfigHeaderProps, ConfigType } from "./types";

/** 配置类型的展示标签;SegmentControl 以标签字面量为互斥项,故需在标签与 ConfigType 间双向映射。 */
const CONFIG_LABEL: Record<ConfigType, string> = {
  bot: "Bot",
  model: "Model",
  adapter: "Adapter",
  napcat: "NapCat",
};
const CONFIG_OPTIONS = ["Bot", "Model", "Adapter", "NapCat"] as const;
const LABEL_TO_CONFIG: Record<string, ConfigType> = {
  Bot: "bot",
  Model: "model",
  Adapter: "adapter",
  NapCat: "napcat",
};

const CONFIG_SUBTITLE: Record<ConfigType, string> = {
  bot: "Bot Configuration",
  model: "Model Configuration",
  adapter: "Adapter Configuration",
  napcat: "NapCat Configuration",
};

/** 编辑模式展示标签,SegmentControl 同理以标签字面量驱动。 */
const EDIT_OPTIONS = ["可视化", "源文件"] as const;
const EDIT_TO_MODE: Record<string, "tree" | "text"> = {
  可视化: "tree",
  源文件: "text",
};

export const ConfigHeader: React.FC<ConfigHeaderProps> = ({
  activeConfig,
  editMode,
  isCompact,
  isMobile,
  onConfigChange,
  onEditModeChange,
  onClose,
}) => {
  return (
    <div
      className="flex items-center justify-between px-4 md:px-6 h-16 shrink-0 select-none"
      style={{
        background: "var(--ls-surface)",
        borderBottom: "1px solid var(--ls-hairline)",
      }}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 md:w-10 md:h-10 rounded-card flex items-center justify-center shrink-0"
            style={{
              background: "var(--ls-surface-hi)",
              border: "1px solid var(--ls-hairline)",
              boxShadow:
                "var(--ls-shadow-soft), inset 0 1px 0 var(--ls-top-hi)",
            }}
          >
            <Settings
              className="w-4 h-4 md:w-5 md:h-5"
              style={{ color: "var(--ls-life)" }}
            />
          </div>
          <div className="min-w-0">
            <h2
              className="text-base md:text-lg font-bold tracking-tight truncate"
              style={{ color: "var(--ls-ink)" }}
            >
              配置管理
            </h2>
            {!isMobile && (
              <p
                className="text-xs font-medium hidden sm:block"
                style={{ color: "var(--ls-ink-soft)" }}
              >
                {CONFIG_SUBTITLE[activeConfig]}
              </p>
            )}
          </div>
        </div>

        {/* 配置类型切换 */}
        {!isCompact ? (
          <SegmentControl
            options={CONFIG_OPTIONS}
            value={CONFIG_LABEL[activeConfig]}
            onChange={(label) => onConfigChange(LABEL_TO_CONFIG[label])}
          />
        ) : (
          <Select
            value={activeConfig}
            onValueChange={(v) => onConfigChange(v as ConfigType)}
            options={[
              { value: "bot", label: "Bot Config" },
              { value: "model", label: "Model Config" },
              { value: "adapter", label: "Adapter Config" },
              { value: "napcat", label: "NapCat" },
            ]}
            className="w-40"
          />
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* 编辑模式切换 - 只在非 NapCat 配置时显示 */}
        {activeConfig !== "napcat" && (
          <SegmentControl
            options={EDIT_OPTIONS}
            value={editMode === "tree" ? "可视化" : "源文件"}
            onChange={(label) => onEditModeChange(EDIT_TO_MODE[label])}
          />
        )}

        {activeConfig !== "napcat" && (
          <div
            className="h-6 w-px mx-1 md:mx-2"
            style={{ background: "var(--ls-hairline)" }}
          />
        )}

        <TactileButton
          variant="ghost"
          onClick={onClose}
          title="关闭"
          className="px-2"
        >
          <X className="w-5 h-5" style={{ color: "var(--ls-ink-soft)" }} />
        </TactileButton>
      </div>
    </div>
  );
};

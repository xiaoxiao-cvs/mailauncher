import React from "react";
import { Loader2, Save } from "lucide-react";
import { TactileButton } from "@/components/ls";
import { TomlEditor } from "@/components/TomlEditor";

export interface ConfigTextEditorProps {
  rawText: string;
  hasChanges: boolean;
  saving: boolean;
  editMode: "tree" | "text";
  onRawTextChange: (value: string) => void;
  onResetChanges: () => void;
  onSave: () => void;
}

export const ConfigTextEditor: React.FC<ConfigTextEditorProps> = ({
  rawText,
  hasChanges,
  saving,
  editMode,
  onRawTextChange,
  onResetChanges,
  onSave,
}) => {
  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden transition-transform duration-500 ease-in-out ${
        editMode === "text" ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex-1 overflow-hidden relative">
        <TomlEditor
          value={rawText}
          onChange={(value) => {
            onRawTextChange(value);
          }}
          className="w-full h-full"
        />
      </div>

      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          borderTop: "1px solid var(--ls-hairline)",
          background: "var(--ls-surface)",
        }}
      >
        <div
          className="ls-num text-xs font-mono hidden sm:block"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          {rawText.length} characters
        </div>
        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <TactileButton
            variant="ghost"
            onClick={onResetChanges}
            disabled={!hasChanges}
          >
            重置更改
          </TactileButton>
          <TactileButton
            variant="life"
            onClick={onSave}
            disabled={!hasChanges || saving}
            className="min-w-[100px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存
              </>
            )}
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

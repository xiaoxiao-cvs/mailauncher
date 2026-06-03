import React from "react";
import { Info, Save, Loader2, Plus, XIcon, Check } from "lucide-react";
import {
  Surface,
  TactileButton,
  Input,
  Label,
  Textarea,
  Switch,
} from "@/components/ls";
import { ConfigEditorProps } from "./types";
import { getConfigHint } from "./constants";

const getValueType = (value: any): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

export const ConfigItemEditor: React.FC<ConfigEditorProps> = ({
  node,
  level: _level,
  selectedPath,
  editValue,
  hasChanges,
  saving,
  activeConfig,
  botConfig,
  modelConfig,
  adapterConfig,
  addingTagPath,
  newTagValue,
  onPathSelect,
  onValueChange,
  onSave,
  onCancel,
  onAddTag,
  onNewTagValueChange,
  onCancelAddTag,
}) => {
  const path = node.data.path;
  const value = node.data.value;
  const valueType = getValueType(value);
  const currentConfig =
    activeConfig === "bot"
      ? botConfig
      : activeConfig === "model"
        ? modelConfig
        : adapterConfig;
  const comment = currentConfig?.comments[path];
  const hint = path ? getConfigHint(path, currentConfig?.comments || {}) : "";

  return (
    <Surface
      variant="card"
      key={node.id}
      className="group relative p-5 space-y-3"
    >
      {/* 配置项标题 */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <Label
            className="text-base font-medium tracking-tight"
            style={{ color: "var(--ls-ink)" }}
          >
            {node.name}
          </Label>
          <p
            className="text-xs font-mono select-all ls-num"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            {path}
          </p>
        </div>
        {comment && hint && (
          <div className="relative group/info ml-2">
            <Info
              className="w-4 h-4 cursor-help"
              style={{ color: "var(--ls-ink-soft)" }}
            />
            <div
              className="pointer-events-none absolute z-20 right-0 mt-2 hidden group-hover/info:block text-xs rounded-card px-4 py-3 max-w-[300px] whitespace-normal break-words"
              style={{
                background: "var(--ls-surface)",
                color: "var(--ls-ink-soft)",
                border: "1px solid var(--ls-hairline)",
                boxShadow:
                  "var(--ls-shadow-lift), inset 0 1px 0 var(--ls-top-hi)",
              }}
            >
              {comment.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ")}
            </div>
          </div>
        )}
      </div>

      {/* 提示信息 */}
      {comment && hint && (
        <Surface
          variant="inset"
          className="px-3 py-2 text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          {hint}
        </Surface>
      )}

      {/* 值编辑器 */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <Label
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            {valueType}
          </Label>
        </div>

        {valueType === "string" &&
          (value && value.length > 50 ? (
            <Textarea
              value={editValue && selectedPath === path ? editValue : value}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                onPathSelect(path);
                onValueChange(e.target.value);
              }}
              className="mt-1 min-h-[120px] font-mono text-sm"
              placeholder="输入字符串值"
            />
          ) : (
            <Input
              type="text"
              value={
                editValue && selectedPath === path ? editValue : value || ""
              }
              onChange={(e) => {
                onPathSelect(path);
                onValueChange(e.target.value);
              }}
              className="mt-1 h-10"
              placeholder="输入字符串值"
            />
          ))}

        {valueType === "number" && (
          <Input
            type="number"
            value={
              editValue && selectedPath === path ? editValue : (value ?? "")
            }
            onChange={(e) => {
              onPathSelect(path);
              onValueChange(Number(e.target.value));
            }}
            className="mt-1 h-10 font-mono"
            placeholder="输入数字"
          />
        )}

        {valueType === "boolean" && (
          <Surface
            variant="inset"
            className="flex items-center justify-between p-3"
          >
            <Label
              className="cursor-pointer"
              style={{ color: "var(--ls-ink)" }}
              onClick={() => {
                onPathSelect(path);
                onValueChange(
                  !(editValue && selectedPath === path ? editValue : value),
                );
              }}
            >
              {(editValue && selectedPath === path ? editValue : value)
                ? "已启用"
                : "已禁用"}
            </Label>
            <Switch
              checked={editValue && selectedPath === path ? editValue : value}
              onCheckedChange={(checked: boolean) => {
                onPathSelect(path);
                onValueChange(checked);
              }}
            />
          </Surface>
        )}

        {valueType === "array" && (
          <>
            {Array.isArray(value) &&
            value.every((v: any) => typeof v === "string") ? (
              <Surface variant="inset" className="mt-2 p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  {(editValue && selectedPath === path ? editValue : value).map(
                    (item: string, idx: number) => (
                      <div
                        key={idx}
                        className="group/tag flex items-center gap-1.5 px-3 py-1.5 rounded-control text-sm"
                        style={{
                          background: "var(--ls-life-soft)",
                          color: "var(--ls-life)",
                        }}
                      >
                        <span>{item}</span>
                        <button
                          onClick={() => {
                            const currentArray =
                              editValue && selectedPath === path
                                ? editValue
                                : value;
                            const newArray = currentArray.filter(
                              (_: any, i: number) => i !== idx,
                            );
                            onPathSelect(path);
                            onValueChange(newArray);
                          }}
                          className="rounded-md p-0.5 transition-colors"
                          style={{ color: "var(--ls-life)" }}
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ),
                  )}

                  {addingTagPath === path ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        autoFocus
                        value={newTagValue}
                        onChange={(e) => onNewTagValueChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagValue.trim()) {
                            const currentArray =
                              editValue && selectedPath === path
                                ? editValue
                                : value;
                            const newArray = [
                              ...currentArray,
                              newTagValue.trim(),
                            ];
                            onPathSelect(path);
                            onValueChange(newArray);
                            onNewTagValueChange("");
                            onCancelAddTag();
                          } else if (e.key === "Escape") {
                            onNewTagValueChange("");
                            onCancelAddTag();
                          }
                        }}
                        className="h-9 w-40 text-sm"
                        placeholder="输入内容..."
                      />
                      <TactileButton
                        variant="life"
                        onClick={() => {
                          if (newTagValue.trim()) {
                            const currentArray =
                              editValue && selectedPath === path
                                ? editValue
                                : value;
                            const newArray = [
                              ...currentArray,
                              newTagValue.trim(),
                            ];
                            onPathSelect(path);
                            onValueChange(newArray);
                            onNewTagValueChange("");
                            onCancelAddTag();
                          }
                        }}
                        className="w-9 h-9 justify-center px-0 shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </TactileButton>
                      <TactileButton
                        variant="ghost"
                        onClick={() => {
                          onNewTagValueChange("");
                          onCancelAddTag();
                        }}
                        className="w-9 h-9 justify-center px-0 shrink-0"
                      >
                        <XIcon
                          className="w-4 h-4"
                          style={{ color: "var(--ls-ink-soft)" }}
                        />
                      </TactileButton>
                    </div>
                  ) : (
                    <TactileButton
                      variant="ghost"
                      onClick={() => {
                        onAddTag(path);
                        onNewTagValueChange("");
                      }}
                      className="w-9 h-9 justify-center px-0 shrink-0"
                      style={{ borderStyle: "dashed" }}
                    >
                      <Plus
                        className="w-4 h-4"
                        style={{ color: "var(--ls-ink-soft)" }}
                      />
                    </TactileButton>
                  )}
                </div>
              </Surface>
            ) : (
              <Textarea
                value={
                  editValue && selectedPath === path
                    ? JSON.stringify(editValue, null, 2)
                    : JSON.stringify(value, null, 2)
                }
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onPathSelect(path);
                    onValueChange(parsed);
                  } catch {
                    // 保持原值
                  }
                }}
                className="mt-1 min-h-[200px] font-mono text-sm"
                placeholder="JSON 数组格式"
              />
            )}
          </>
        )}

        {valueType === "object" && (
          <Textarea
            value={
              editValue && selectedPath === path
                ? JSON.stringify(editValue, null, 2)
                : JSON.stringify(value, null, 2)
            }
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onPathSelect(path);
                onValueChange(parsed);
              } catch {
                // 保持原值
              }
            }}
            className="mt-1 min-h-[200px] font-mono text-sm"
            placeholder="JSON 对象格式"
          />
        )}
      </div>

      {/* 单项保存按钮 */}
      {selectedPath === path && hasChanges && (
        <div className="flex gap-2 pt-2">
          <TactileButton variant="life" onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                保存更改
              </>
            )}
          </TactileButton>
          <TactileButton variant="ghost" onClick={onCancel}>
            取消
          </TactileButton>
        </div>
      )}
    </Surface>
  );
};

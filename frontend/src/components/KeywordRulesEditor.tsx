/**
 * 关键词规则编辑器
 * 专门用于编辑 keyword_reaction.keyword_rules 的组件
 * 提供更友好的界面来管理关键词触发规则
 */
import React, { useState } from "react";
import { Plus, XIcon, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Surface,
  TactileButton,
  Input,
  Label,
  Textarea,
  Modal,
} from "@/components/ls";

interface KeywordRule {
  keywords: string[];
  reaction: string;
}

interface KeywordRulesEditorProps {
  rules: KeywordRule[];
  onChange: (rules: KeywordRule[]) => void;
  readOnly?: boolean;
}

export const KeywordRulesEditor: React.FC<KeywordRulesEditorProps> = ({
  rules = [],
  onChange,
  readOnly = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [tempRule, setTempRule] = useState<KeywordRule>({
    keywords: [],
    reaction: "",
  });
  const [keywordInput, setKeywordInput] = useState("");

  // 开始编辑规则
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setTempRule({ ...rules[index] });
    setKeywordInput("");
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setTempRule({ keywords: [], reaction: "" });
    setKeywordInput("");
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    if (tempRule.keywords.length === 0) {
      toast.error("请至少添加一个关键词");
      return;
    }

    if (!tempRule.reaction.trim()) {
      toast.error("请填写触发反应内容");
      return;
    }

    const newRules = [...rules];
    newRules[editingIndex] = tempRule;
    onChange(newRules);
    handleCancelEdit();
    toast.success("规则已更新");
  };

  // 添加新规则
  const handleAddNew = () => {
    const newRule: KeywordRule = {
      keywords: [],
      reaction: "",
    };
    onChange([...rules, newRule]);
    setEditingIndex(rules.length);
    setTempRule(newRule);
    setKeywordInput("");
  };

  // 删除规则
  const handleDelete = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    onChange(newRules);
    setDeleteIndex(null);
    toast.success("规则已删除");
  };

  // 添加关键词
  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (!keyword) return;

    if (tempRule.keywords.includes(keyword)) {
      toast.error("关键词已存在");
      return;
    }

    setTempRule({
      ...tempRule,
      keywords: [...tempRule.keywords, keyword],
    });
    setKeywordInput("");
  };

  // 删除关键词
  const handleRemoveKeyword = (keyword: string) => {
    setTempRule({
      ...tempRule,
      keywords: tempRule.keywords.filter((k) => k !== keyword),
    });
  };

  // 处理键盘事件
  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--ls-ink)" }}
          >
            关键词触发规则
          </h3>
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            当消息中包含指定关键词时，触发特定的回复行为
          </p>
        </div>
        {!readOnly && (
          <TactileButton variant="solid" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            添加规则
          </TactileButton>
        )}
      </div>

      {/* 规则列表 */}
      <div className="h-[500px] overflow-y-auto scrollbar-thin">
        <div className="space-y-3 pr-4">
          {rules.length === 0 ? (
            <div
              className="text-center py-12"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <p>暂无规则</p>
              {!readOnly && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--ls-ink-faint)" }}
                >
                  点击上方“添加规则”按钮创建第一条规则
                </p>
              )}
            </div>
          ) : (
            rules.map((rule, index) => (
              <Surface variant="card" key={index} className="relative p-4">
                <div className="flex items-start justify-between pb-3">
                  <div className="flex-1">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      规则 <span className="ls-num">{index + 1}</span>
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      <span className="ls-num">{rule.keywords.length}</span>{" "}
                      个关键词
                    </div>
                  </div>
                  {!readOnly && editingIndex !== index && (
                    <div className="flex gap-1">
                      <TactileButton
                        variant="ghost"
                        onClick={() => handleEdit(index)}
                        className="px-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </TactileButton>
                      <TactileButton
                        variant="ghost"
                        onClick={() => setDeleteIndex(index)}
                        className="px-2"
                      >
                        <Trash2
                          className="h-4 w-4"
                          style={{ color: "var(--ls-danger)" }}
                        />
                      </TactileButton>
                    </div>
                  )}
                </div>

                {editingIndex === index ? (
                  // 编辑模式
                  <div className="space-y-4">
                    {/* 关键词编辑 */}
                    <div className="space-y-2">
                      <Label>关键词</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="输入关键词后按回车添加"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={handleKeywordInputKeyDown}
                        />
                        <TactileButton
                          variant="ghost"
                          type="button"
                          onClick={handleAddKeyword}
                          className="px-3 shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </TactileButton>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tempRule.keywords.map((keyword) => (
                          <button
                            key={keyword}
                            type="button"
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-sm"
                            style={{
                              background: "var(--ls-life-soft)",
                              color: "var(--ls-life)",
                            }}
                          >
                            {keyword}
                            <XIcon className="h-3 w-3 opacity-70" />
                          </button>
                        ))}
                        {tempRule.keywords.length === 0 && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--ls-ink-faint)" }}
                          >
                            请添加至少一个关键词
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 触发反应编辑 */}
                    <div className="space-y-2">
                      <Label>触发反应</Label>
                      <Textarea
                        placeholder="描述当关键词被触发时，机器人应该如何回应..."
                        value={tempRule.reaction}
                        onChange={(e) =>
                          setTempRule({ ...tempRule, reaction: e.target.value })
                        }
                        rows={4}
                      />
                      <p
                        className="text-xs"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        这段文字会作为额外的提示词注入到对话中，引导机器人的回复行为
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 justify-end pt-2">
                      <TactileButton variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                        取消
                      </TactileButton>
                      <TactileButton variant="life" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                        保存
                      </TactileButton>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="space-y-3">
                    {/* 关键词显示 */}
                    <div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        关键词：
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: "var(--ls-life-soft)",
                              color: "var(--ls-life)",
                            }}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 触发反应显示 */}
                    <div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--ls-ink-soft)" }}
                      >
                        触发反应：
                      </span>
                      <p
                        className="text-sm mt-1 whitespace-pre-wrap"
                        style={{ color: "var(--ls-ink)" }}
                      >
                        {rule.reaction}
                      </p>
                    </div>
                  </div>
                )}
              </Surface>
            ))
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Modal
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null);
        }}
        title="确认删除"
        description={
          <>
            确定要删除规则{" "}
            <span className="ls-num">
              {deleteIndex !== null ? deleteIndex + 1 : ""}
            </span>{" "}
            吗？此操作无法撤销。
          </>
        }
        footer={
          <>
            <TactileButton variant="ghost" onClick={() => setDeleteIndex(null)}>
              取消
            </TactileButton>
            <TactileButton
              variant="solid"
              onClick={() => deleteIndex !== null && handleDelete(deleteIndex)}
              style={{ background: "var(--ls-danger)", color: "#fff" }}
            >
              删除
            </TactileButton>
          </>
        }
      />
    </div>
  );
};

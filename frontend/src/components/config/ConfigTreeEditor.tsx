import React from "react";
import { Loader2, Save } from "lucide-react";
import { TactileButton } from "@/components/ls";
import { ConfigSidebar } from "./ConfigSidebar";
import { ConfigItemsRenderer } from "./ConfigItemsRenderer";
import { NapCatAccounts } from "./NapCatAccounts";
import { TreeNode, ConfigType } from "./types";
import { ConfigWithComments } from "@/services/configApi";

export interface ConfigTreeEditorProps {
  editMode: "tree" | "text";
  isCompact: boolean;
  treeData: TreeNode[];
  selectedGroupId: string | null;
  selectedGroup: TreeNode | null;
  activeConfig: ConfigType;
  selectedPath: string | null;
  editValue: any;
  hasChanges: boolean;
  saving: boolean;
  botConfig: ConfigWithComments | null;
  modelConfig: ConfigWithComments | null;
  adapterConfig: ConfigWithComments | null;
  addingTagPath: string | null;
  newTagValue: string;
  napCatAccounts: Array<{ account: string; nickname: string }>;
  selectedQQAccount: string | null;
  originalQQAccount: string | null;
  loadingAccounts: boolean;
  onSelectGroup: (groupId: string) => void;
  onPathSelect: (path: string) => void;
  onValueChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddTag: (path: string) => void;
  onNewTagValueChange: (value: string) => void;
  onCancelAddTag: () => void;
  onLoadNapCatAccounts: () => void;
  onSelectQQAccount: (account: string) => void;
  onResetQQAccount: () => void;
  onSaveQQAccount: () => void;
}

export const ConfigTreeEditor: React.FC<ConfigTreeEditorProps> = ({
  editMode,
  isCompact,
  treeData,
  selectedGroupId,
  selectedGroup,
  activeConfig,
  selectedPath,
  editValue,
  hasChanges,
  saving,
  botConfig,
  modelConfig,
  adapterConfig,
  addingTagPath,
  newTagValue,
  napCatAccounts,
  selectedQQAccount,
  originalQQAccount,
  loadingAccounts,
  onSelectGroup,
  onPathSelect,
  onValueChange,
  onSave,
  onCancel,
  onAddTag,
  onNewTagValueChange,
  onCancelAddTag,
  onLoadNapCatAccounts,
  onSelectQQAccount,
  onResetQQAccount,
  onSaveQQAccount,
}) => {
  const renderNapCatContent = (group: TreeNode) => {
    if (group.id === "napcat-accounts") {
      return (
        <div>
          <div className="mb-6">
            <h3
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--ls-ink)" }}
            >
              {group.name}
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--ls-ink-soft)" }}>
              配置 NapCat 使用的 QQ 账号
            </p>
          </div>
          <NapCatAccounts
            napCatAccounts={napCatAccounts}
            selectedQQAccount={selectedQQAccount}
            originalQQAccount={originalQQAccount}
            loadingAccounts={loadingAccounts}
            onLoadAccounts={onLoadNapCatAccounts}
            onSelectAccount={onSelectQQAccount}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`absolute inset-0 flex overflow-hidden transition-transform duration-500 ease-in-out ${
        editMode === "tree" ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {!isCompact && (
        <ConfigSidebar
          treeData={treeData}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
        />
      )}

      <div
        className="flex-1 overflow-hidden relative flex flex-col"
        style={{ background: "var(--ls-bg)" }}
      >
        {isCompact && (
          <div
            className="p-3 overflow-x-auto no-scrollbar"
            style={{
              background: "var(--ls-surface)",
              borderBottom: "1px solid var(--ls-hairline)",
            }}
          >
            <div className="flex gap-2">
              {treeData.map((group) => {
                const active = selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => onSelectGroup(group.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{
                      background: active
                        ? "var(--ls-life)"
                        : "var(--ls-surface-hi)",
                      color: active ? "#fff" : "var(--ls-ink-soft)",
                      border: "1px solid var(--ls-hairline)",
                      boxShadow: active ? "var(--ls-shadow-soft)" : "none",
                    }}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            className={`p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pb-20 ${isCompact ? "px-4" : ""}`}
          >
            {selectedGroup ? (
              activeConfig === "napcat" ? (
                renderNapCatContent(selectedGroup)
              ) : (
                <div>
                  <div className="mb-6">
                    <h3
                      className="text-2xl font-bold tracking-tight"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {selectedGroup.name}
                    </h3>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      配置 {selectedGroup.name} 的相关参数
                    </p>
                  </div>
                  <div className="space-y-6">
                    <ConfigItemsRenderer
                      nodes={selectedGroup.children}
                      selectedPath={selectedPath}
                      editValue={editValue}
                      hasChanges={hasChanges}
                      saving={saving}
                      activeConfig={activeConfig}
                      botConfig={botConfig}
                      modelConfig={modelConfig}
                      adapterConfig={adapterConfig}
                      addingTagPath={addingTagPath}
                      newTagValue={newTagValue}
                      onPathSelect={onPathSelect}
                      onValueChange={onValueChange}
                      onSave={onSave}
                      onCancel={onCancel}
                      onAddTag={onAddTag}
                      onNewTagValueChange={onNewTagValueChange}
                      onCancelAddTag={onCancelAddTag}
                    />
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      {activeConfig === "napcat" && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-end px-6 py-4"
          style={{
            background: "var(--ls-surface)",
            borderTop: "1px solid var(--ls-hairline)",
          }}
        >
          <div className="flex gap-3">
            <TactileButton
              variant="ghost"
              onClick={onResetQQAccount}
              disabled={selectedQQAccount === originalQQAccount}
            >
              重置
            </TactileButton>
            <TactileButton
              variant="life"
              onClick={onSaveQQAccount}
              disabled={selectedQQAccount === originalQQAccount || saving}
              className="min-w-[100px] justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存
                </>
              )}
            </TactileButton>
          </div>
        </div>
      )}
    </div>
  );
};

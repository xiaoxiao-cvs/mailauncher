/**
 * 配置模块的类型定义
 */
import type { ReactNode } from "react";

export type ConfigType = "bot" | "model" | "adapter" | "napcat";

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  data?: any;
}

export interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId?: string;
  defaultActive?: "bot" | "model" | "adapter";
}

export interface ConfigEditorProps {
  node: TreeNode;
  level: number;
  selectedPath: string | null;
  editValue: any;
  hasChanges: boolean;
  saving: boolean;
  activeConfig: ConfigType;
  botConfig: any;
  modelConfig: any;
  adapterConfig: any;
  addingTagPath: string | null;
  newTagValue: string;
  onPathSelect: (path: string) => void;
  onValueChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddTag: (path: string) => void;
  onNewTagValueChange: (value: string) => void;
  onCancelAddTag: () => void;
}

export interface NapCatAccountsProps {
  napCatAccounts: Array<{ account: string; nickname: string }>;
  selectedQQAccount: string | null;
  originalQQAccount: string | null;
  loadingAccounts: boolean;
  onLoadAccounts: () => void;
  onSelectAccount: (account: string) => void;
}

export interface ConfigHeaderProps {
  activeConfig: ConfigType;
  editMode: "tree" | "text";
  isCompact: boolean;
  isMobile: boolean;
  onConfigChange: (config: ConfigType) => void;
  onEditModeChange: (mode: "tree" | "text") => void;
  onClose: () => void;
  /** 右侧按钮簇的额外插槽(如"从文件导入"),由调用方按需组装,ConfigHeader 本身不关心其内容 */
  extraActions?: ReactNode;
}

export interface ConfigSidebarProps {
  treeData: TreeNode[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

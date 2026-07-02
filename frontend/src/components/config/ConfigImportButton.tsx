/**
 * "从文件导入" 入口 —— 用 tauri-plugin-dialog 选源文件，覆盖写入实例的 Bot/Model 配置或 MaiBot 数据库。
 * 后端 import_external_file 会先校验实例已停止，再对已存在的目标文件打时间戳备份后覆盖。
 */
import React, { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  TactileButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ls";
import { importExternalFile, ImportConfigTarget } from "@/services/configApi";

export interface ConfigImportButtonProps {
  instanceId?: string;
  /** 导入成功后回调，携带导入的目标类型，供上层刷新对应配置视图 */
  onImported: (target: ImportConfigTarget) => void;
}

const TARGET_OPTIONS: Array<{
  target: ImportConfigTarget;
  label: string;
  extensions: string[];
  filterName: string;
}> = [
  {
    target: "BotConfig",
    label: "导入 Bot 配置",
    extensions: ["toml"],
    filterName: "TOML 配置",
  },
  {
    target: "ModelConfig",
    label: "导入 Model 配置",
    extensions: ["toml"],
    filterName: "TOML 配置",
  },
  {
    target: "MaibotDb",
    label: "导入 MaiBot 数据库",
    extensions: ["db", "sqlite", "sqlite3"],
    filterName: "SQLite 数据库",
  },
];

export const ConfigImportButton: React.FC<ConfigImportButtonProps> = ({
  instanceId,
  onImported,
}) => {
  const [importing, setImporting] = useState(false);

  const handleImport = async (option: (typeof TARGET_OPTIONS)[number]) => {
    if (!instanceId) {
      toast.error("请先选择实例");
      return;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: option.filterName, extensions: option.extensions }],
    });
    if (!selected || typeof selected !== "string") return;

    setImporting(true);
    try {
      const result = await importExternalFile(
        instanceId,
        option.target,
        selected,
      );
      toast.success(result.message || "导入成功");
      onImported(option.target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TactileButton variant="ghost" disabled={importing} title="从文件导入">
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload
              className="w-4 h-4"
              style={{ color: "var(--ls-ink-soft)" }}
            />
          )}
          <span className="hidden sm:inline">从文件导入</span>
        </TactileButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>覆盖前自动备份原文件</DropdownMenuLabel>
        {TARGET_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.target}
            onSelect={() => handleImport(option)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

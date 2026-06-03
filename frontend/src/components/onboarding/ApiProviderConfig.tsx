import { LoaderIcon, AlertCircleIcon } from "lucide-react";
import { useApiProviderConfig } from "@/hooks/useApiProviderConfig";
import { ProviderSelector } from "./ProviderSelector";
import { ProviderForm } from "./ProviderForm";

// Note: ApiProviderConfig 使用了复杂的状态管理逻辑,保留原有 hook 以避免重大重构
// 可以后续逐步迁移到 useApiProviderQueries

interface ApiProviderConfigProps {
  stepColor: string;
}

/**
 * API 供应商配置组件
 * 职责：配置 AI 模型供应商的 API 端点和密钥
 */
export function ApiProviderConfig({ stepColor }: ApiProviderConfigProps) {
  const {
    providers,
    selectedProviderIndex,
    setSelectedProviderIndex,
    isLoading,
    saveStatus,
    addCustomProvider,
    removeProvider,
    updateProvider,
    currentProvider,
  } = useApiProviderConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--ls-life)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 供应商选择下拉菜单 */}
      <ProviderSelector
        providers={providers}
        selectedIndex={selectedProviderIndex}
        onSelect={setSelectedProviderIndex}
        onAddCustom={addCustomProvider}
        onRemove={removeProvider}
        stepColor={stepColor}
      />

      {/* 当前选中的供应商配置 */}
      {currentProvider ? (
        <ProviderForm
          provider={currentProvider}
          providerIndex={selectedProviderIndex}
          onUpdate={updateProvider}
          saveStatus={saveStatus}
        />
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <AlertCircleIcon
            className="w-12 h-12 mb-2"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <p>暂无供应商</p>
          <p className="text-sm mt-1" style={{ color: "var(--ls-ink-faint)" }}>
            请从上方下拉菜单中添加
          </p>
        </div>
      )}
    </div>
  );
}

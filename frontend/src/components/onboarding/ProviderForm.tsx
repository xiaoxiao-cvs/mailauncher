import { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircle2Icon,
  LoaderIcon,
  AlertCircleIcon,
} from "lucide-react";
import { Input, Label, TactileButton } from "@/components/ls";
import { ApiProvider } from "@/hooks/useApiProviderConfig";
// Note: 类型也可以从 '@/hooks/queries/useApiProviderQueries' 导入

interface ProviderFormProps {
  provider: ApiProvider;
  providerIndex: number;
  onUpdate: (
    index: number,
    field: keyof ApiProvider,
    value: string | boolean,
  ) => void;
  saveStatus?: { success: boolean; message: string } | null;
}

/**
 * 供应商配置表单组件
 */
export function ProviderForm({
  provider,
  providerIndex,
  onUpdate,
  saveStatus,
}: ProviderFormProps) {
  const [showKey, setShowKey] = useState(false);

  // API Key 校验态 -> 边框/外环色:有效=生命色,无效=危险色,未知=发丝色
  const keyBorderColor =
    provider.isValid === true
      ? "var(--ls-life)"
      : provider.isValid === false
        ? "var(--ls-danger)"
        : "var(--ls-hairline)";
  const keyFocusRing =
    provider.isValid === true
      ? "0 0 0 3px var(--ls-life-soft)"
      : provider.isValid === false
        ? "0 0 0 3px var(--ls-danger-soft)"
        : undefined;

  return (
    <div className="flex-1 space-y-4">
      {/* 供应商名称 */}
      <div className="space-y-2">
        <Label>供应商名称</Label>
        <Input
          type="text"
          value={provider.name}
          onChange={(e) => onUpdate(providerIndex, "name", e.target.value)}
          placeholder="输入供应商名称"
          className="px-4 py-2.5"
        />
      </div>

      {/* API 端点 URL */}
      <div className="space-y-2">
        <Label>端点地址</Label>
        <Input
          type="text"
          value={provider.base_url}
          onChange={(e) => onUpdate(providerIndex, "base_url", e.target.value)}
          placeholder="https://api.example.com/v1"
          className="px-4 py-2.5"
        />
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>API 密钥</Label>
          {/* 保存状态提示 - 显示在标签右侧 */}
          {saveStatus && (
            <div
              className="flex items-center gap-1 text-xs"
              style={{
                color: saveStatus.success
                  ? "var(--ls-life)"
                  : "var(--ls-danger)",
              }}
            >
              {saveStatus.success ? (
                <CheckCircle2Icon className="w-3.5 h-3.5" />
              ) : (
                <AlertCircleIcon className="w-3.5 h-3.5" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}
        </div>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={provider.api_key}
            onChange={(e) => onUpdate(providerIndex, "api_key", e.target.value)}
            placeholder="sk-..."
            className="px-4 py-2.5 pr-20 font-mono"
            // 校验态边框/外环色由内联 style 覆盖 Input 默认聚焦动画的静止值
            style={{
              borderColor: keyBorderColor,
              boxShadow: keyFocusRing,
            }}
          />

          {/* 右侧图标组 */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* 验证状态图标 */}
            {provider.isValidating ? (
              <LoaderIcon
                className="w-4 h-4 animate-spin"
                style={{ color: "var(--ls-ink-soft)" }}
              />
            ) : provider.isValid ? (
              <div title="API Key 可用">
                <CheckCircle2Icon
                  className="w-4 h-4"
                  style={{ color: "var(--ls-life)" }}
                />
              </div>
            ) : provider.isValid === false ? (
              <div title="API Key 不可用">
                <AlertCircleIcon
                  className="w-4 h-4"
                  style={{ color: "var(--ls-danger)" }}
                />
              </div>
            ) : null}

            {/* 显示/隐藏按钮 */}
            <TactileButton
              variant="ghost"
              onClick={() => setShowKey(!showKey)}
              className="p-1"
              style={{ border: "none" }}
              title={showKey ? "隐藏 API Key" : "显示 API Key"}
            >
              {showKey ? (
                <EyeOffIcon
                  className="w-4 h-4"
                  style={{ color: "var(--ls-ink-soft)" }}
                />
              ) : (
                <EyeIcon
                  className="w-4 h-4"
                  style={{ color: "var(--ls-ink-soft)" }}
                />
              )}
            </TactileButton>
          </div>
        </div>

        {/* 验证提示信息 */}
        {provider.isValid && provider.model_count && (
          <p className="mt-2 text-sm" style={{ color: "var(--ls-life)" }}>
            已找到 <span className="ls-num">{provider.model_count}</span>{" "}
            个可用模型
          </p>
        )}
        {provider.isValid === false && (
          <p className="mt-2 text-sm" style={{ color: "var(--ls-danger)" }}>
            API Key 验证失败，请检查密钥是否正确
          </p>
        )}
      </div>
    </div>
  );
}

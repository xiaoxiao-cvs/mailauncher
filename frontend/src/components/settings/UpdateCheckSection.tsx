import { useId, useState } from "react";
import { RefreshCw, Download } from "lucide-react";

import {
  Surface,
  Badge,
  Label,
  TactileButton,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ls";
import { cn } from "@/lib/utils";
import {
  useCurrentVersionQuery,
  useChannelVersionsQuery,
  useCheckUpdateQuery,
  useInstallTauriUpdateMutation,
  useOpenDownloadPageMutation,
} from "@/hooks/queries/useUpdateQueries";
import { UpdateDialog } from "@/components/update/UpdateDialog";

const PLACEHOLDER = "—";

interface VersionFieldOption {
  value: string;
  label: string;
  desc?: string;
}

/**
 * 通道/版本选择字段:LS 低层 Select 组合,在每个选项里保留主标题 + 描述副行,
 * 沿用原 CustomSelect 的两行选项观感,逻辑(受控 value / onChange)交给 Radix。
 */
function VersionField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: VersionFieldOption[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <SelectRoot value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{opt.label}</span>
                {opt.desc && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    {opt.desc}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </div>
  );
}

export function UpdateCheckSection() {
  const [selectedChannel, setSelectedChannel] = useState("stable");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const { data: currentVersion } = useCurrentVersionQuery();
  const { data: channelVersions } = useChannelVersionsQuery(selectedChannel);
  const {
    data: updateInfo,
    isLoading: isChecking,
    refetch: checkForUpdates,
  } = useCheckUpdateQuery(selectedChannel);
  const installTauriUpdateMutation = useInstallTauriUpdateMutation();
  const openDownloadMutation = useOpenDownloadPageMutation();

  const installUpdate = async (_onProgress: (progress: number) => void) => {
    if (updateInfo) {
      await installTauriUpdateMutation.mutateAsync(updateInfo);
    }
  };

  const downloadManually = () => {
    const url = "https://github.com/xiaoxiao-cvs/mailauncher/releases";
    openDownloadMutation.mutate(url);
  };

  const pendingUpdate = updateInfo;

  return (
    <>
      <Surface variant="panel" className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
              style={{
                background: "var(--ls-bg-2)",
                color: "var(--ls-ink-soft)",
              }}
            >
              <RefreshCw size={20} />
            </div>
            <h3 className="text-lg font-semibold">{"检查更新"}</h3>
          </div>
          <Badge tone="neutral" className="ls-num px-3 py-1">
            {"当前版本"}: v{currentVersion ?? PLACEHOLDER}
          </Badge>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full md:w-1/3">
              <VersionField
                label={"更新通道"}
                value={selectedChannel}
                onChange={(val) => {
                  setSelectedChannel(val);
                  setSelectedVersion("latest");
                }}
                options={[
                  {
                    value: "main",
                    label: "Main (Stable)",
                    desc: "稳定版本，适合日常使用",
                  },
                  {
                    value: "beta",
                    label: "Beta (Testing)",
                    desc: "测试版本，体验新功能",
                  },
                  {
                    value: "develop",
                    label: "Develop (Nightly)",
                    desc: "开发版本，更新最快但不稳定",
                  },
                ]}
              />
            </div>
            <div className="w-full md:w-2/3">
              <VersionField
                label={"选择版本"}
                value={selectedVersion}
                onChange={setSelectedVersion}
                options={(channelVersions?.versions || []).map((v: any) => ({
                  value: v.version || v,
                  label: v.version || v,
                  desc: v.date ? `发布于 ${v.date}` : "",
                }))}
              />
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <TactileButton
              variant="solid"
              onClick={() => checkForUpdates()}
              disabled={isChecking}
              className="h-11 px-6"
            >
              <RefreshCw
                className={cn("h-4 w-4", isChecking && "animate-spin")}
              />
              {isChecking ? "检查中..." : "检查更新"}
            </TactileButton>

            {updateInfo?.has_update && (
              <Surface
                variant="inset"
                className="flex items-center justify-between gap-3 px-4 py-0"
                style={{ height: 44 }}
              >
                <span className="ls-num whitespace-nowrap text-sm font-medium">
                  {updateInfo.update_available?.version || selectedVersion}
                </span>

                <TactileButton
                  variant="solid"
                  onClick={() =>
                    pendingUpdate
                      ? setShowUpdateDialog(true)
                      : downloadManually()
                  }
                  className="h-8 whitespace-nowrap px-5 text-sm"
                >
                  {"开始安装"}
                  <Download className="h-3.5 w-3.5" />
                </TactileButton>
              </Surface>
            )}
          </div>
        </div>
      </Surface>

      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        versionInfo={updateInfo?.update_available || null}
        onConfirm={installUpdate}
      />
    </>
  );
}

import {
  CheckCircle,
  Loader2,
  Download,
  GitCommit,
  Shield,
} from "lucide-react";
import {
  Surface,
  Badge,
  Checkbox,
  Label,
  TactileButton,
} from "@/components/ls";
import {
  ComponentVersionInfo,
  ComponentUpdateCheck,
  getComponentDisplayName,
} from "@/services/versionApi";

interface VersionComparisonTabProps {
  components: ComponentVersionInfo[];
  selectedComponent: string | null;
  onSelectComponent: (component: string) => void;
  componentDetail: ComponentUpdateCheck | undefined;
  isLoadingDetail: boolean;
  updateConfirmed: boolean;
  onUpdateConfirmedChange: (confirmed: boolean) => void;
  onUpdate: () => void;
  isUpdating: boolean;
}

export function VersionComparisonTab({
  components,
  selectedComponent,
  onSelectComponent,
  componentDetail,
  isLoadingDetail,
  updateConfirmed,
  onUpdateConfirmedChange,
  onUpdate,
  isUpdating,
}: VersionComparisonTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {components.map((component) => {
          const isSelected = selectedComponent === component.component;
          // 列表项仅展示本地安装快照(version / commit_hash);更新检查在下方选中后按需触发。
          const localLabel =
            component.version || component.commit_hash?.slice(0, 7) || "—";
          return (
            <Surface
              key={component.component}
              variant="inset"
              className="ls-item p-4 cursor-pointer"
              style={
                isSelected
                  ? {
                      borderColor: "var(--ls-life)",
                      boxShadow: "0 0 0 1px var(--ls-life)",
                    }
                  : undefined
              }
              onClick={() => onSelectComponent(component.component)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className="font-semibold"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {getComponentDisplayName(component.component)}
                  </span>
                  <Badge tone="neutral">{component.install_method}</Badge>
                </div>
                <span
                  className="ls-num text-sm font-mono"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {localLabel}
                </span>
              </div>
            </Surface>
          );
        })}
      </div>

      {selectedComponent && (
        <Surface variant="inset" className="mt-6 p-6 space-y-4">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "var(--ls-ink-faint)" }}
              />
            </div>
          ) : componentDetail?.has_update ? (
            <>
              <div className="space-y-3">
                <h4
                  className="font-semibold flex items-center gap-2"
                  style={{ color: "var(--ls-ink)" }}
                >
                  <GitCommit className="w-4 h-4" />
                  版本对比
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Surface variant="card" className="p-3">
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      当前版本
                    </div>
                    <div
                      className="ls-num font-mono text-sm"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      {componentDetail.current_version ||
                        componentDetail.current_commit?.slice(0, 7) ||
                        "—"}
                    </div>
                  </Surface>
                  <Surface variant="card" className="p-3">
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      最新版本
                    </div>
                    <div
                      className="ls-num font-mono text-sm"
                      style={{ color: "var(--ls-life)" }}
                    >
                      {componentDetail.latest_version ||
                        componentDetail.latest_commit?.slice(0, 7) ||
                        "—"}
                    </div>
                  </Surface>
                </div>
              </div>

              {componentDetail.commits_behind ? (
                <div
                  className="ls-num text-sm"
                  style={{ color: "var(--ls-warn)" }}
                >
                  落后 {componentDetail.commits_behind} 个提交
                </div>
              ) : null}

              {componentDetail.update_notes ? (
                <Surface variant="card" className="p-3">
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--ls-ink-soft)" }}
                  >
                    更新说明
                  </div>
                  <p
                    className="text-sm whitespace-pre-line"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {componentDetail.update_notes}
                  </p>
                </Surface>
              ) : null}

              <Surface variant="card" className="p-4">
                <div className="flex items-start gap-3">
                  <Shield
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: "var(--ls-life)" }}
                  />
                  <div className="flex-1">
                    <h5
                      className="font-medium mb-1"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      安全更新说明
                    </h5>
                    <ul
                      className="text-sm space-y-1"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      <li>- 更新前会自动创建完整备份</li>
                      <li>- 数据库和配置文件不会被覆盖</li>
                      <li>- 仅更新代码文件和依赖</li>
                      <li>- 更新失败可从备份快速恢复</li>
                    </ul>
                  </div>
                </div>
              </Surface>

              <div className="space-y-3">
                <Label
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  style={{
                    background: "var(--ls-surface)",
                    border: "1px solid var(--ls-hairline)",
                    borderRadius: "var(--ls-r-control)",
                  }}
                >
                  <Checkbox
                    checked={updateConfirmed}
                    onCheckedChange={(next) =>
                      onUpdateConfirmedChange(next === true)
                    }
                  />
                  <span className="text-sm" style={{ color: "var(--ls-ink)" }}>
                    我已了解：仅更新代码，数据库和配置文件不会被覆盖
                  </span>
                </Label>

                <TactileButton
                  variant="life"
                  onClick={onUpdate}
                  disabled={!updateConfirmed || isUpdating}
                  className="w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      确认更新
                    </>
                  )}
                </TactileButton>
              </div>
            </>
          ) : (
            <div
              className="text-center py-8"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <CheckCircle
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: "var(--ls-life)" }}
              />
              <p>已是最新版本</p>
            </div>
          )}
        </Surface>
      )}

      {!selectedComponent && (
        <div
          className="text-center py-12"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          <GitCommit
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <p
            className="text-lg font-medium mb-2"
            style={{ color: "var(--ls-ink)" }}
          >
            选择组件查看更新
          </p>
          <p className="text-sm">点击上方组件以检查是否有可用更新</p>
        </div>
      )}
    </div>
  );
}

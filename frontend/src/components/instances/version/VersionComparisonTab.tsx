import {
  CheckCircle,
  Loader2,
  Download,
  GitCommit,
  FileText,
  Shield,
} from 'lucide-react';
import {
  ComponentVersionInfo,
  UpdateCheckResult,
  getComponentDisplayName,
} from '@/services/versionApi';

interface VersionComparisonTabProps {
  components: ComponentVersionInfo[];
  selectedComponent: string | null;
  onSelectComponent: (component: string) => void;
  componentDetail: UpdateCheckResult | undefined;
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
  const hasUpdateAvailable = components.some((c) => c.has_update);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {components.map((component) => (
          <div
            key={component.component}
            className={`p-4 rounded-panel border-2 transition-all cursor-pointer ${
              selectedComponent === component.component
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => onSelectComponent(component.component)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getComponentDisplayName(component.component)}
                </span>
                {component.has_update ? (
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
                    有更新
                  </span>
                ) : component.status === 'up_to_date' ? (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                    最新
                  </span>
                ) : null}
              </div>
              {component.installed && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {component.local_version || component.local_commit}
                </span>
              )}
            </div>

            {component.has_update && component.commits_behind && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                落后 {component.commits_behind} 个提交
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedComponent && (
        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-panel space-y-4">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : componentDetail?.has_update ? (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <GitCommit className="w-4 h-4" />
                  版本对比
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-control">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前版本</div>
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      {componentDetail.local_version || componentDetail.local_commit?.slice(0, 7)}
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-control">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">最新版本</div>
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {componentDetail.github_info?.latest_version ||
                       componentDetail.github_info?.latest_commit?.slice(0, 7)}
                    </div>
                  </div>
                </div>
              </div>

              {componentDetail.comparison && componentDetail.comparison.commits.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    更新内容 ({componentDetail.comparison.total_commits} 个提交)
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {componentDetail.comparison.commits.map((commit, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white dark:bg-gray-800 rounded-control text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <code className="text-xs font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                            {commit.sha}
                          </code>
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 dark:text-white truncate">
                              {commit.message}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {commit.author} · {new Date(commit.date).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-card">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      安全更新说明
                    </h5>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• 更新前会自动创建完整备份</li>
                      <li>• 数据库和配置文件不会被覆盖</li>
                      <li>• 仅更新代码文件和依赖</li>
                      <li>• 更新失败可从备份快速恢复</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-control cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateConfirmed}
                    onChange={(e) => onUpdateConfirmedChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    我已了解：仅更新代码，数据库和配置文件不会被覆盖
                  </span>
                </label>

                <button
                  onClick={onUpdate}
                  disabled={!updateConfirmed || isUpdating}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-card font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>已是最新版本</p>
            </div>
          )}
        </div>
      )}

      {!hasUpdateAvailable && !selectedComponent && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium mb-2">所有组件都是最新版本</p>
          <p className="text-sm">无需更新</p>
        </div>
      )}
    </div>
  );
}

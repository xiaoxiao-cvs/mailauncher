import { useState } from "react"
import { RefreshCw, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  useCurrentVersionQuery,
  useChannelVersionsQuery,
  useCheckUpdateQuery,
  useInstallTauriUpdateMutation,
  useOpenDownloadPageMutation,
} from "@/hooks/queries/useUpdateQueries"
import { UpdateDialog } from "@/components/update/UpdateDialog"
import { CustomSelect } from "./CustomSelect"

export function UpdateCheckSection() {
  const [selectedChannel, setSelectedChannel] = useState('stable')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  const { data: currentVersion } = useCurrentVersionQuery()
  const { data: channelVersions } = useChannelVersionsQuery(selectedChannel)
  const { data: updateInfo, isLoading: isChecking, refetch: checkForUpdates } = useCheckUpdateQuery(selectedChannel)
  const installTauriUpdateMutation = useInstallTauriUpdateMutation()
  const openDownloadMutation = useOpenDownloadPageMutation()

  const installUpdate = async (_onProgress: (progress: number) => void) => {
    if (updateInfo) {
      await installTauriUpdateMutation.mutateAsync(updateInfo)
    }
  }

  const downloadManually = () => {
    const url = 'https://github.com/xiaoxiao-cvs/mailauncher/releases'
    openDownloadMutation.mutate(url)
  }

  const pendingUpdate = updateInfo

  return (
    <>
      <div className="group relative overflow-hidden rounded-panel border border-border/50 bg-card/30 p-6 shadow-panel transition-all hover:shadow-panel-hover hover:bg-card/50 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-panel bg-green-500/10 text-green-600 dark:text-green-400">
              <RefreshCw size={20} />
            </div>
            <h3 className="text-lg font-semibold">{'\u68c0\u67e5\u66f4\u65b0'}</h3>
          </div>
          <Badge variant="secondary" className="font-mono px-3 py-1 rounded-full bg-muted/50">
            {'\u5f53\u524d\u7248\u672c'}: v{currentVersion}
          </Badge>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <CustomSelect
                label={'\u66f4\u65b0\u901a\u9053'}
                value={selectedChannel}
                onChange={(val) => { setSelectedChannel(val); setSelectedVersion("latest"); }}
                options={[
                  { value: "main", label: "Main (Stable)", desc: "\u7a33\u5b9a\u7248\u672c\uff0c\u9002\u5408\u65e5\u5e38\u4f7f\u7528" },
                  { value: "beta", label: "Beta (Testing)", desc: "\u6d4b\u8bd5\u7248\u672c\uff0c\u4f53\u9a8c\u65b0\u529f\u80fd" },
                  { value: "develop", label: "Develop (Nightly)", desc: "\u5f00\u53d1\u7248\u672c\uff0c\u66f4\u65b0\u6700\u5feb\u4f46\u4e0d\u7a33\u5b9a" },
                ]}
              />
            </div>
            <div className="w-full md:w-2/3">
              <CustomSelect
                label={'\u9009\u62e9\u7248\u672c'}
                value={selectedVersion}
                onChange={setSelectedVersion}
                options={(channelVersions?.versions || []).map((v: any) => ({
                  value: v.version || v,
                  label: v.version || v,
                  desc: v.date ? `\u53d1\u5e03\u4e8e ${v.date}` : ''
                }))}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={() => checkForUpdates()}
              disabled={isChecking}
              className="rounded-full h-11 px-6 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50 shadow-panel transition-all duration-200 hover:shadow-panel-hover"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isChecking && "animate-spin")} />
              {isChecking ? '\u68c0\u67e5\u4e2d...' : '\u68c0\u67e5\u66f4\u65b0'}
            </Button>

            {updateInfo?.has_update && (
              <div className="flex items-center justify-between gap-3 px-4 h-11 bg-white dark:bg-gray-800/50 rounded-full shadow-panel border border-gray-200/50 dark:border-gray-700/50">
                <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {updateInfo.update_available?.version || selectedVersion}
                </span>

                <Button
                  onClick={() => pendingUpdate ? setShowUpdateDialog(true) : downloadManually()}
                  className="rounded-full h-8 px-5 text-sm bg-gray-900 hover:bg-black dark:bg-gray-900 dark:hover:bg-black text-white border-0 shadow-panel transition-all duration-200 active:scale-95 whitespace-nowrap"
                >
                  {'\u5f00\u59cb\u5b89\u88c5'}
                  <Download className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        versionInfo={updateInfo?.update_available || null}
        onConfirm={installUpdate}
      />
    </>
  )
}

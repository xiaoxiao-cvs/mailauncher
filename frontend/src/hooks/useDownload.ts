import { useDownloadInit } from './download/useDownloadInit'
import { useDownloadActions } from './download/useDownloadActions'

export function useDownload() {
  const init = useDownloadInit()

  const actions = useDownloadActions({
    deploymentPath: init.deploymentPath,
    instanceName: init.instanceName,
    selectedMaibotVersion: init.selectedMaibotVersion,
    pythonPath: init.pythonPath,
  })

  return {
    deploymentPath: init.deploymentPath,
    instanceName: init.instanceName,
    selectedMaibotVersion: init.selectedMaibotVersion,
    maibotVersions: init.maibotVersions,
    isLoadingPath: init.isLoadingPath,
    setDeploymentPath: init.setDeploymentPath,
    setInstanceName: init.setInstanceName,
    selectDeploymentPath: init.selectDeploymentPath,
    setSelectedMaibotVersion: init.setSelectedMaibotVersion,
    downloadItems: actions.downloadItems,
    isDownloading: actions.isDownloading,
    selectedItems: actions.selectedItems,
    downloadItem: actions.downloadItem,
    downloadAll: actions.downloadAll,
    retryDownload: actions.retryDownload,
    updateItemStatus: actions.updateItemStatus,
    toggleItemSelection: actions.toggleItemSelection,
  }
}

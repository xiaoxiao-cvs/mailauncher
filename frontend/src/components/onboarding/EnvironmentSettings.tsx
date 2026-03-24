import { LoaderIcon, AlertCircleIcon, ChevronDownIcon, CheckCircle2Icon } from 'lucide-react'
import {
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation,
} from '@/hooks/queries/useEnvironmentQueries'
import { useState, useEffect } from 'react'

interface EnvironmentSettingsProps {
  stepColor?: string
}

/**
 * 环境配置组件
 * 职责：选择默认 Python 版本
 */
export function EnvironmentSettings(_props: EnvironmentSettingsProps) {
  const { data: pythonVersions = [], isLoading: isLoadingPython, error: pythonErrorObj } = usePythonVersionsQuery()
  const { data: selectedPython } = usePythonDefaultQuery()
  const savePythonMutation = useSetPythonDefaultMutation()
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null

  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [localSelectedPython, setLocalSelectedPython] = useState(selectedPython?.path || '')

  useEffect(() => {
    if (selectedPython?.path) {
      setLocalSelectedPython(selectedPython.path)
    }
  }, [selectedPython])

  return (
    <div className="space-y-6">
      {/* Python 版本 */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          默认 Python 版本
        </h3>

        {pythonError ? (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{pythonError}</span>
          </div>
        ) : isLoadingPython ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
            <span>检测中…</span>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowPythonDropdown(!showPythonDropdown)}
              disabled={savePythonMutation.isPending}
              className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg bg-gray-100/80 dark:bg-white/[0.06] hover:bg-gray-200/60 dark:hover:bg-white/[0.1] transition-colors disabled:opacity-60 text-left"
            >
              <div className="flex-1 min-w-0">
                {localSelectedPython ? (
                  <>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {pythonVersions.find(v => v.path === localSelectedPython)?.version || '未选择'}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">
                      {localSelectedPython}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">选择 Python 版本</span>
                )}
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ml-2 flex-shrink-0 ${showPythonDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPythonDropdown && (
              <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 shadow-lg max-h-[200px] overflow-y-auto">
                {pythonVersions.map((version) => (
                  <button
                    key={version.path}
                    onClick={() => {
                      setLocalSelectedPython(version.path)
                      setShowPythonDropdown(false)
                      savePythonMutation.mutate(version.path)
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      version.path === localSelectedPython ? 'bg-gray-50 dark:bg-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {version.version}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                          {version.path}
                        </div>
                      </div>
                      {version.path === localSelectedPython && (
                        <CheckCircle2Icon className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            未检测到 Python 环境，请返回上一步安装
          </p>
        )}
      </div>
    </div>
  )
}

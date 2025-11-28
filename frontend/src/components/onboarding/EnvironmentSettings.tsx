import { LoaderIcon, AlertCircleIcon, ChevronDownIcon, CheckCircle2Icon } from 'lucide-react'
import { 
  usePythonVersionsQuery,
  usePythonDefaultQuery,
  useSetPythonDefaultMutation,
  useVenvTypeQuery,
  useSetVenvTypeMutation
} from '@/hooks/queries/useEnvironmentQueries'
import { useState, useEffect } from 'react'

export const VENV_TYPES = [
  { value: 'venv', label: 'venv', desc: 'Python 内置虚拟环境' },
  { value: 'uv', label: 'uv', desc: '快速的 Python 包管理器' },
  { value: 'conda', label: 'conda', desc: 'Conda 环境管理' },
]

interface EnvironmentSettingsProps {
  stepColor: string
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * 环境配置组件
 * 职责：选择默认 Python 版本和虚拟环境类型
 */
export function EnvironmentSettings({ stepColor }: EnvironmentSettingsProps) {
  // Python 版本管理
  const { data: pythonVersions = [], isLoading: isLoadingPython, error: pythonErrorObj } = usePythonVersionsQuery()
  const { data: selectedPython } = usePythonDefaultQuery()
  const savePythonMutation = useSetPythonDefaultMutation()
  const pythonError = pythonErrorObj ? String(pythonErrorObj) : null
  
  // Venv 类型管理
  const { data: venvType = 'venv', isLoading: isLoadingVenv } = useVenvTypeQuery()
  const saveVenvMutation = useSetVenvTypeMutation()
  
  // 本地状态
  const [showPythonDropdown, setShowPythonDropdown] = useState(false)
  const [localSelectedPython, setLocalSelectedPython] = useState(selectedPython || '')
  const [localVenvType, setLocalVenvType] = useState(venvType)
  
  // 同步 selectedPython
  useEffect(() => {
    if (selectedPython && typeof selectedPython === 'string') {
      setLocalSelectedPython(selectedPython)
    }
  }, [selectedPython])
  
  // 同步 venvType
  useEffect(() => {
    if (typeof venvType === 'string') {
      setLocalVenvType(venvType)
    }
  }, [venvType])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Python 版本选择 */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:bg-[#2e2e2e] dark:shadow-none">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={iconStyle(stepColor)}
          >
            {isLoadingPython ? (
              <LoaderIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : (
              <span className="text-sm sm:text-base font-bold">Py</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              默认 Python 版本
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              新建实例时使用的 Python 版本
            </p>
          </div>
        </div>

        {pythonError ? (
          <div className="flex items-start gap-2 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300 break-words">{pythonError}</p>
          </div>
        ) : isLoadingPython ? (
          <div className="py-6 sm:py-8 text-center">
            <LoaderIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto text-[#007AFF] dark:text-white" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {/* 当前选中的版本 - 下拉选择器 */}
            <div className="relative">
              <button
                onClick={() => setShowPythonDropdown(!showPythonDropdown)}
                disabled={savePythonMutation.isPending}
                className="w-full flex items-center justify-between py-3 sm:py-4 px-4 sm:px-5 rounded-xl bg-gray-50 dark:bg-[#3a3a3a]/50 hover:bg-gray-100 dark:hover:bg-[#3a3a3a]/70 transition-all disabled:opacity-60"
              >
                <div className="flex-1 text-left min-w-0">
                  {localSelectedPython ? (
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-[#023e8a] dark:text-white">
                        {pythonVersions.find(v => v.path === localSelectedPython)?.version || '未选择'}
                      </div>
                      <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                        {typeof localSelectedPython === 'string' ? localSelectedPython : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-[#023e8a]/60 dark:text-white/60">
                      选择 Python 版本
                    </div>
                  )}
                </div>
                <ChevronDownIcon className={`w-4 h-4 sm:w-5 sm:h-5 text-[#023e8a] dark:text-white transition-transform ml-2 flex-shrink-0 ${showPythonDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* 下拉列表 */}
              {showPythonDropdown && (
                <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] shadow-lg max-h-[200px] sm:max-h-[240px] overflow-y-auto">
                  {pythonVersions.map((version) => (
                    <button
                      key={version.path}
                      onClick={() => {
                        setLocalSelectedPython(version.path)
                        setShowPythonDropdown(false)
                        savePythonMutation.mutate(version.path)
                      }}
                      className={`w-full text-left px-3 sm:px-4 py-2 hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors ${
                        version.path === localSelectedPython ? 'bg-[#023e8a]/10 dark:bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-[#023e8a] dark:text-white">
                            {version.version}
                            {version.is_default && (
                              <span className="ml-1 sm:ml-2 text-xs text-[#023e8a]/60 dark:text-white/60">
                                (系统默认)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                            {version.path}
                          </div>
                        </div>
                        {version.path === localSelectedPython && (
                          <CheckCircle2Icon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 共检测到 <span className="font-semibold">{pythonVersions.length}</span> 个 Python 版本可用
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 sm:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
              未检测到 Python 环境，请返回上一步安装
            </p>
          </div>
        )}
      </div>

      {/* 虚拟环境类型选择 */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:bg-[#2e2e2e] dark:shadow-none">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={iconStyle(stepColor)}
          >
            <span className="text-sm sm:text-base font-bold">Env</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              虚拟环境类型
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              新建实例时使用的虚拟环境管理器
            </p>
          </div>
        </div>

        {isLoadingVenv ? (
          <div className="py-6 sm:py-8 text-center">
            <LoaderIcon className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto text-[#007AFF] dark:text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {VENV_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setLocalVenvType(type.value)
                  saveVenvMutation.mutate(type.value)
                }}
                disabled={saveVenvMutation.isPending}
                className={`p-3 sm:p-4 rounded-xl border transition-all text-center ${
                  localVenvType === type.value
                    ? 'bg-[#007AFF]/5 dark:bg-white/10 border-[#007AFF] dark:border-white shadow-sm'
                    : 'bg-gray-50 dark:bg-[#3a3a3a]/50 border-transparent hover:bg-gray-100 dark:hover:bg-[#3a3a3a]/70'
                } disabled:opacity-60`}
              >
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <span className={`text-sm sm:text-base font-semibold ${
                    localVenvType === type.value ? 'text-[#007AFF] dark:text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {type.label}
                  </span>
                  {localVenvType === type.value && (
                    <CheckCircle2Icon className="w-4 h-4 text-[#007AFF] dark:text-white" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2 hidden sm:block">
                  {type.desc}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 说明 */}
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-[#3a3a3a]/30 border border-gray-100 dark:border-[#3a3a3a]">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            推荐使用 <strong>uv</strong> 以获得最快的包安装速度，或使用 <strong>venv</strong> 保持兼容性
          </p>
        </div>
      </div>
    </div>
  )
}

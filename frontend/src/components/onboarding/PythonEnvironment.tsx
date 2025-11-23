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
  { value: 'virtualenv', label: 'virtualenv', desc: '第三方虚拟环境工具' },
  { value: 'conda', label: 'conda', desc: 'Conda 环境管理' },
  { value: 'poetry', label: 'poetry', desc: 'Poetry 依赖管理' },
]

interface PythonEnvironmentProps {
  stepColor: string
}

const iconStyle = (color: string) => ({ backgroundColor: color })

/**
 * Python 环境配置组件
 * 职责：选择默认 Python 版本（优化显示，避免滚动条）
 */
export function PythonEnvironment({ stepColor }: PythonEnvironmentProps) {
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
    <div className="space-y-4 h-full flex flex-col">
      {/* Python 版本选择 - 优化布局，不超出区域 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
          >
            {isLoadingPython ? (
              <LoaderIcon className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <span className="text-xs font-bold">Py</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              默认 Python 版本
            </h3>
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
              新建实例时使用的 Python 版本
            </p>
          </div>
        </div>

        {pythonError ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{pythonError}</p>
          </div>
        ) : isLoadingPython ? (
          <div className="py-6 text-center">
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-[#023e8a] dark:text-white" />
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70 mt-2">加载中...</p>
          </div>
        ) : pythonVersions.length > 0 ? (
          <div className="space-y-3">
            {/* 当前选中的版本 */}
            <div className="relative">
              <button
                onClick={() => setShowPythonDropdown(!showPythonDropdown)}
                disabled={savePythonMutation.isPending}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/40 dark:bg-[#3a3a3a]/50 hover:bg-white/60 dark:hover:bg-[#3a3a3a]/70 transition-all disabled:opacity-60 border border-[#023e8a]/10 dark:border-[#3a3a3a]"
              >
                <div className="flex-1 text-left">
                  {localSelectedPython ? (
                    <div>
                      <div className="text-sm font-medium text-[#023e8a] dark:text-white">
                        {pythonVersions.find(v => v.path === localSelectedPython)?.version || '未选择'}
                      </div>
                      <div className="text-xs text-[#023e8a]/60 dark:text-white/60 font-mono truncate max-w-md">
                        {typeof localSelectedPython === 'string' ? localSelectedPython : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#023e8a]/60 dark:text-white/60">
                      选择 Python 版本
                    </div>
                  )}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-[#023e8a] dark:text-white transition-transform ml-2 flex-shrink-0 ${showPythonDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* 下拉列表 - 优化高度，限制在 200px 内 */}
              {showPythonDropdown && (
                <div className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-white dark:bg-[#2e2e2e] border border-[#023e8a]/20 dark:border-[#3a3a3a] shadow-lg max-h-[200px] overflow-y-auto">
                  {pythonVersions.map((version) => (
                    <button
                      key={version.path}
                      onClick={() => {
                        setLocalSelectedPython(version.path)
                        setShowPythonDropdown(false)
                        savePythonMutation.mutate(version.path)
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-[#023e8a]/5 dark:hover:bg-white/5 transition-colors ${
                        version.path === localSelectedPython ? 'bg-[#023e8a]/10 dark:bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#023e8a] dark:text-white">
                            {version.version}
                            {version.is_default && (
                              <span className="ml-2 text-[10px] text-[#023e8a]/60 dark:text-white/60">
                                (默认)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#023e8a]/60 dark:text-white/60 font-mono truncate">
                            {version.path}
                          </div>
                        </div>
                        {version.path === localSelectedPython && (
                          <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 提示信息 - 简化 */}
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 共 <span className="font-semibold">{pythonVersions.length}</span> 个版本可用
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              未检测到 Python 环境
            </p>
          </div>
        )}
      </div>

      {/* 虚拟环境类型选择 */}
      <div className="p-3.5 rounded-xl bg-white/60 dark:bg-[#2e2e2e] border border-[#023e8a]/10 dark:border-[#3a3a3a]">
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={iconStyle(stepColor)}
          >
            <span className="text-xs font-bold">Env</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#023e8a] dark:text-white">
              虚拟环境类型
            </h3>
            <p className="text-xs text-[#023e8a]/70 dark:text-white/70">
              新建实例时使用的虚拟环境管理器
            </p>
          </div>
        </div>

        {isLoadingVenv ? (
          <div className="py-4 text-center">
            <LoaderIcon className="w-5 h-5 animate-spin mx-auto text-[#023e8a] dark:text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {VENV_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setLocalVenvType(type.value)
                  saveVenvMutation.mutate(type.value)
                }}
                disabled={saveVenvMutation.isPending}
                className={`p-2.5 rounded-lg border transition-all text-left ${
                  localVenvType === type.value
                    ? 'bg-[#023e8a]/10 dark:bg-white/10 border-[#023e8a] dark:border-white'
                    : 'bg-white/40 dark:bg-[#3a3a3a]/50 border-[#023e8a]/10 dark:border-[#3a3a3a] hover:bg-white/60 dark:hover:bg-[#3a3a3a]/70'
                } disabled:opacity-60`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#023e8a] dark:text-white">
                    {type.label}
                  </span>
                  {localVenvType === type.value && (
                    <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <p className="text-[10px] text-[#023e8a]/60 dark:text-white/60">
                  {type.desc}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

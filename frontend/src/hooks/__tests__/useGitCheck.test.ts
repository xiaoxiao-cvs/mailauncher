import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { tauriInvoke } from '@/services/tauriInvoke'
import { useGitCheck, GitInfo } from '../useGitCheck'

vi.mock('@/services/tauriInvoke', () => ({
  tauriInvoke: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  environmentLogger: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockTauriInvoke = vi.mocked(tauriInvoke)

const GIT_AVAILABLE: GitInfo = {
  is_available: true,
  path: '/usr/bin/git',
  version: '2.42.0',
}

const GIT_UNAVAILABLE: GitInfo = {
  is_available: false,
  path: '',
  version: '',
}

const PYTHON_ENVS = [
  { path: '/usr/bin/python3', version: '3.11.5', is_selected: true, is_default: true },
  { path: '/usr/local/bin/python3.10', version: '3.10.12', is_selected: false, is_default: false },
]

describe('useGitCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks(overrides: {
    gitInfo?: GitInfo | Error
    discoverPython?: unknown | Error
    pythonEnvs?: typeof PYTHON_ENVS | Error
  } = {}) {
    const { gitInfo = GIT_AVAILABLE, discoverPython = null, pythonEnvs = PYTHON_ENVS } = overrides

    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'check_git_environment') {
        if (gitInfo instanceof Error) throw gitInfo
        return gitInfo
      }
      if (command === 'discover_python') {
        if (discoverPython instanceof Error) throw discoverPython
        return discoverPython
      }
      if (command === 'get_python_environments') {
        if (pythonEnvs instanceof Error) throw pythonEnvs
        return pythonEnvs
      }
      if (command === 'select_python') {
        return null
      }
      throw new Error(`Unexpected command: ${command}`)
    })
  }

  it('loads git info and python versions on mount', async () => {
    setupMocks()

    const { result } = renderHook(() => useGitCheck())

    expect(result.current.isCheckingGit).toBe(true)
    expect(result.current.isLoadingPython).toBe(true)

    await waitFor(() => {
      expect(result.current.isCheckingGit).toBe(false)
    })

    expect(result.current.gitInfo).toEqual(GIT_AVAILABLE)
    expect(result.current.gitInfo!.is_available).toBe(true)
    expect(result.current.gitInfo!.version).toBe('2.42.0')
    expect(result.current.gitInfo!.path).toBe('/usr/bin/git')
    expect(result.current.gitError).toBe('')
  })

  it('loads python versions with correct selection', async () => {
    setupMocks()

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.pythonVersions).toHaveLength(2)
    expect(result.current.pythonVersions[0].version).toBe('3.11.5')
    expect(result.current.pythonVersions[0].is_selected).toBe(true)
    expect(result.current.pythonVersions[1].version).toBe('3.10.12')
    expect(result.current.selectedPython).toBe('/usr/bin/python3')
    expect(result.current.pythonError).toBe('')
  })

  it('reports git unavailable when backend returns is_available=false', async () => {
    const onGitStatusChange = vi.fn()
    setupMocks({ gitInfo: GIT_UNAVAILABLE })

    const { result } = renderHook(() => useGitCheck({ onGitStatusChange }))

    await waitFor(() => {
      expect(result.current.isCheckingGit).toBe(false)
    })

    expect(result.current.gitInfo!.is_available).toBe(false)
    expect(result.current.gitInfo!.path).toBe('')
    expect(result.current.gitInfo!.version).toBe('')
    expect(onGitStatusChange).toHaveBeenCalledWith(false)
  })

  it('calls onGitStatusChange with true when git is available', async () => {
    const onGitStatusChange = vi.fn()
    setupMocks({ gitInfo: GIT_AVAILABLE })

    renderHook(() => useGitCheck({ onGitStatusChange }))

    await waitFor(() => {
      expect(onGitStatusChange).toHaveBeenCalledWith(true)
    })
  })

  it('sets gitError when check_git_environment fails', async () => {
    const onGitStatusChange = vi.fn()
    setupMocks({ gitInfo: new Error('git not found') })

    const { result } = renderHook(() => useGitCheck({ onGitStatusChange }))

    await waitFor(() => {
      expect(result.current.isCheckingGit).toBe(false)
    })

    expect(result.current.gitError).toBe('检查 Git 环境失败')
    expect(result.current.gitInfo).toBeNull()
    expect(onGitStatusChange).toHaveBeenCalledWith(false)
  })

  it('sets pythonError when discover_python fails', async () => {
    setupMocks({ discoverPython: new Error('discovery failed') })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.pythonError).toBe('获取 Python 版本失败')
    expect(result.current.pythonVersions).toEqual([])
  })

  it('sets pythonError when get_python_environments fails', async () => {
    setupMocks({ pythonEnvs: new Error('db read failed') })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.pythonError).toBe('获取 Python 版本失败')
    expect(result.current.pythonVersions).toEqual([])
  })

  it('selects default python when no is_selected entry exists', async () => {
    const envs = [
      { path: '/usr/bin/python3', version: '3.11.5', is_selected: false, is_default: true },
      { path: '/usr/local/bin/python3.10', version: '3.10.12', is_selected: false, is_default: false },
    ]
    setupMocks({ pythonEnvs: envs })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.selectedPython).toBe('/usr/bin/python3')
  })

  it('leaves selectedPython empty when no selected or default version exists', async () => {
    const envs = [
      { path: '/usr/bin/python3', version: '3.11.5', is_selected: false, is_default: false },
    ]
    setupMocks({ pythonEnvs: envs })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.selectedPython).toBe('')
  })

  it('checkGitEnvironment can be called manually to re-check', async () => {
    setupMocks({ gitInfo: GIT_UNAVAILABLE })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isCheckingGit).toBe(false)
    })
    expect(result.current.gitInfo!.is_available).toBe(false)

    // Now git becomes available
    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'check_git_environment') return GIT_AVAILABLE
      if (command === 'discover_python') return null
      if (command === 'get_python_environments') return PYTHON_ENVS
      return null
    })

    await act(async () => {
      await result.current.checkGitEnvironment()
    })

    expect(result.current.gitInfo!.is_available).toBe(true)
    expect(result.current.gitInfo!.version).toBe('2.42.0')
    expect(result.current.gitError).toBe('')
  })

  it('savePythonDefault calls select_python and reloads versions', async () => {
    setupMocks()

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    await act(async () => {
      await result.current.savePythonDefault('/usr/local/bin/python3.10')
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith('select_python', { path: '/usr/local/bin/python3.10' })
    expect(result.current.isSavingPython).toBe(false)
    expect(result.current.showPythonDropdown).toBe(false)
  })

  it('savePythonDefault handles errors gracefully', async () => {
    setupMocks()

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'select_python') throw new Error('permission denied')
      if (command === 'discover_python') return null
      if (command === 'get_python_environments') return PYTHON_ENVS
      return null
    })

    await act(async () => {
      await result.current.savePythonDefault('/bad/path')
    })

    expect(result.current.isSavingPython).toBe(false)
    expect(result.current.showPythonDropdown).toBe(false)
  })

  it('handles empty python environments list', async () => {
    setupMocks({ pythonEnvs: [] })

    const { result } = renderHook(() => useGitCheck())

    await waitFor(() => {
      expect(result.current.isLoadingPython).toBe(false)
    })

    expect(result.current.pythonVersions).toEqual([])
    expect(result.current.selectedPython).toBe('')
    expect(result.current.pythonError).toBe('')
  })
})

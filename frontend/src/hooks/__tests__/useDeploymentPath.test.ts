import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { tauriInvoke } from '@/services/tauriInvoke'
import { useDeploymentPath } from '../useDeploymentPath'

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

describe('useDeploymentPath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupGetPath(response: { path: string } | null | Error = null) {
    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_path') {
        if (response instanceof Error) throw response
        return response
      }
      if (command === 'set_path') {
        return null
      }
      throw new Error(`Unexpected command: ${command}`)
    })
  }

  it('loads deployment path from backend on mount', async () => {
    setupGetPath({ path: '/home/user/bots' })

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(result.current.deploymentPath).toBe('/home/user/bots')
    })

    expect(result.current.pathError).toBe('')
    expect(result.current.pathSuccess).toBe('')
  })

  it('handles null response from get_path (no path configured)', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledWith('get_path', { name: 'instances_dir' })
    })

    expect(result.current.deploymentPath).toBe('')
    expect(result.current.pathError).toBe('')
  })

  it('handles get_path backend error silently', async () => {
    setupGetPath(new Error('database connection lost'))

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledWith('get_path', { name: 'instances_dir' })
    })

    expect(result.current.deploymentPath).toBe('')
  })

  it('saveDeploymentPath sends correct payload to set_path', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.saveDeploymentPath('/opt/mai/instances')
    })

    expect(mockTauriInvoke).toHaveBeenCalledWith('set_path', {
      name: 'instances_dir',
      path: '/opt/mai/instances',
      pathType: 'directory',
      isVerified: false,
      description: 'Bot 实例部署目录',
    })
    expect(result.current.pathSuccess).toBe('✓ 路径已保存')
    expect(result.current.pathError).toBe('')
    expect(result.current.isSavingPath).toBe(false)
  })

  it('saveDeploymentPath sets pathError on failure', async () => {
    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_path') return null
      if (command === 'set_path') throw new Error('disk full')
      throw new Error(`Unexpected command: ${command}`)
    })

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.saveDeploymentPath('/opt/mai/instances')
    })

    expect(result.current.pathError).toBe('保存路径失败')
    expect(result.current.pathSuccess).toBe('')
    expect(result.current.isSavingPath).toBe(false)
  })

  it('handlePathChange rejects relative paths (no leading slash or drive letter)', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handlePathChange('relative/path/here')
    })

    expect(result.current.pathError).toBe('请输入有效的绝对路径')
    expect(result.current.deploymentPath).toBe('relative/path/here')
  })

  it('handlePathChange accepts Unix absolute paths and triggers save', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      result.current.handlePathChange('/home/user/bots')
    })

    expect(result.current.pathError).toBe('')
    expect(result.current.deploymentPath).toBe('/home/user/bots')
    expect(mockTauriInvoke).toHaveBeenCalledWith('set_path', expect.objectContaining({
      path: '/home/user/bots',
    }))
  })

  it('handlePathChange accepts Windows absolute paths (drive letter)', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      result.current.handlePathChange('C:\\Users\\bot\\deploy')
    })

    expect(result.current.pathError).toBe('')
    expect(result.current.deploymentPath).toBe('C:\\Users\\bot\\deploy')
    expect(mockTauriInvoke).toHaveBeenCalledWith('set_path', expect.objectContaining({
      path: 'C:\\Users\\bot\\deploy',
    }))
  })

  it('handlePathChange does not save empty string', async () => {
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handlePathChange('')
    })

    expect(result.current.deploymentPath).toBe('')
    expect(result.current.pathError).toBe('')
    // Only the initial get_path call, no set_path
    expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
  })

  it('handlePathChange clears previous error and success states', async () => {
    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_path') return null
      if (command === 'set_path') throw new Error('fail')
      throw new Error(`Unexpected command: ${command}`)
    })

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    // Trigger an error first
    await act(async () => {
      result.current.handlePathChange('bad-path')
    })
    expect(result.current.pathError).toBe('请输入有效的绝对路径')

    // Now clear by entering a new valid path (even though save fails, error is cleared first)
    await act(async () => {
      result.current.handlePathChange('/valid/path')
    })

    // pathError should now be the save failure, not the validation error
    expect(result.current.pathError).toBe('保存路径失败')
  })

  it('pathSuccess message clears after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setupGetPath(null)

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.saveDeploymentPath('/home/user/deploy')
    })

    expect(result.current.pathSuccess).toBe('✓ 路径已保存')

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.pathSuccess).toBe('')
    vi.useRealTimers()
  })

  it('loadDeploymentPath can be called manually to refresh', async () => {
    setupGetPath({ path: '/initial/path' })

    const { result } = renderHook(() => useDeploymentPath())

    await waitFor(() => {
      expect(result.current.deploymentPath).toBe('/initial/path')
    })

    mockTauriInvoke.mockImplementation(async (command: string) => {
      if (command === 'get_path') return { path: '/updated/path' }
      if (command === 'set_path') return null
      throw new Error(`Unexpected command: ${command}`)
    })

    await act(async () => {
      await result.current.loadDeploymentPath()
    })

    expect(result.current.deploymentPath).toBe('/updated/path')
  })
})

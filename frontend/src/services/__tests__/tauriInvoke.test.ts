import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { tauriInvoke } from '../tauriInvoke'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('tauriInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call invoke with correct command and args', async () => {
    const mockData = { total: 0, instances: [] }
    vi.mocked(invoke).mockResolvedValue(mockData)

    const result = await tauriInvoke('get_all_instances')
    expect(invoke).toHaveBeenCalledWith('get_all_instances', undefined)
    expect(result).toEqual(mockData)
  })

  it('should pass args to invoke', async () => {
    const mockInstance = { id: 'inst_abc123', name: 'test' }
    vi.mocked(invoke).mockResolvedValue(mockInstance)

    const result = await tauriInvoke('get_instance', { instanceId: 'inst_abc123' })
    expect(invoke).toHaveBeenCalledWith('get_instance', { instanceId: 'inst_abc123' })
    expect(result).toEqual(mockInstance)
  })

  it('should convert string errors to Error', async () => {
    vi.mocked(invoke).mockRejectedValue('Command failed')

    await expect(tauriInvoke('bad_command')).rejects.toThrow('Command failed')
  })

  it('should convert Error objects', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Something went wrong'))

    await expect(tauriInvoke('bad_command')).rejects.toThrow('Something went wrong')
  })

  it('should convert unknown error objects to JSON string', async () => {
    vi.mocked(invoke).mockRejectedValue({ code: 404, detail: 'not found' })

    await expect(tauriInvoke('bad_command')).rejects.toThrow()
  })
})

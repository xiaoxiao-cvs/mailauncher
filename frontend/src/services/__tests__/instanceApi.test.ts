import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { instanceApi } from '../instanceApi'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('instanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAllInstances should invoke get_all_instances', async () => {
    const mockData = { total: 1, instances: [{ id: 'inst_abc', name: 'Test' }] }
    vi.mocked(invoke).mockResolvedValue(mockData)

    const result = await instanceApi.getAllInstances()
    expect(invoke).toHaveBeenCalledWith('get_all_instances', undefined)
    expect(result).toEqual(mockData)
  })

  it('getInstance should invoke get_instance with instanceId', async () => {
    const mockInstance = { id: 'inst_abc', name: 'Test' }
    vi.mocked(invoke).mockResolvedValue(mockInstance)

    const result = await instanceApi.getInstance('inst_abc')
    expect(invoke).toHaveBeenCalledWith('get_instance', { instanceId: 'inst_abc' })
    expect(result).toEqual(mockInstance)
  })

  it('getInstance should throw when instance is null', async () => {
    vi.mocked(invoke).mockResolvedValue(null)

    await expect(instanceApi.getInstance('inst_missing')).rejects.toThrow('inst_missing')
  })

  it('createInstance should invoke create_instance with data', async () => {
    const createData = { name: 'New Instance', bot_type: 'maibot' as const }
    const mockResult = { id: 'inst_new', ...createData }
    vi.mocked(invoke).mockResolvedValue(mockResult)

    const result = await instanceApi.createInstance(createData)
    expect(invoke).toHaveBeenCalledWith('create_instance', {
      data: {
        name: 'New Instance',
        bot_type: 'maibot',
        bot_version: undefined,
        description: undefined,
        python_path: undefined,
        config_path: undefined,
      },
    })
    expect(result).toEqual(mockResult)
  })

  it('deleteInstance should invoke delete_instance', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, message: 'deleted' })

    const result = await instanceApi.deleteInstance('inst_abc')
    expect(invoke).toHaveBeenCalledWith('delete_instance', { instanceId: 'inst_abc' })
    expect(result).toEqual({ success: true, message: 'deleted' })
  })

  it('getInstanceStatus should invoke get_instance_status', async () => {
    const mockStatus = { id: 'inst_abc', status: 'running', component_states: [] }
    vi.mocked(invoke).mockResolvedValue(mockStatus)

    const result = await instanceApi.getInstanceStatus('inst_abc')
    expect(invoke).toHaveBeenCalledWith('get_instance_status', { instanceId: 'inst_abc' })
    expect(result).toEqual(mockStatus)
  })

  it('getNapCatAccounts should invoke get_napcat_accounts', async () => {
    const mockAccounts = { accounts: [{ account: '123456', nickname: '123456' }] }
    vi.mocked(invoke).mockResolvedValue(mockAccounts)

    const result = await instanceApi.getNapCatAccounts('inst_abc')
    expect(invoke).toHaveBeenCalledWith('get_napcat_accounts', { instanceId: 'inst_abc' })
    expect(result).toEqual({ success: true, accounts: mockAccounts.accounts, message: '' })
  })

  it('startInstance should invoke start_instance', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, message: 'started' })

    const result = await instanceApi.startInstance('inst_abc')
    expect(invoke).toHaveBeenCalledWith('start_instance', { instanceId: 'inst_abc' })
    expect(result.success).toBe(true)
  })

  it('stopInstance should invoke stop_instance', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, message: 'stopped' })

    const result = await instanceApi.stopInstance('inst_abc')
    expect(invoke).toHaveBeenCalledWith('stop_instance', { instanceId: 'inst_abc' })
    expect(result.success).toBe(true)
  })

  it('restartInstance should invoke restart_instance', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, message: 'restarted' })

    const result = await instanceApi.restartInstance('inst_abc')
    expect(invoke).toHaveBeenCalledWith('restart_instance', { instanceId: 'inst_abc' })
    expect(result.success).toBe(true)
  })
})

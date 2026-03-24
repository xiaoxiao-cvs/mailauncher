import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  getBotConfig,
  getBotConfigRaw,
  saveBotConfigRaw,
  updateBotConfig,
  deleteBotConfigKey,
  addBotConfigArrayItem,
  getModelConfig,
  getModelConfigRaw,
  saveModelConfigRaw,
  updateModelConfig,
  deleteModelConfigKey,
  addModelConfigArrayItem,
  getAdapterConfig,
  updateAdapterConfig,
  getAdapterConfigRaw,
  saveAdapterConfigRaw,
} from '../configApi'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('configApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== Bot Config ====================

  describe('getBotConfig', () => {
    it('should invoke get_toml_config with bot configType and wrap result', async () => {
      const mockData = { personality: { name: 'TestBot' }, behavior: { reply_speed: 5 } }
      vi.mocked(invoke).mockResolvedValue(mockData)

      const result = await getBotConfig('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
      })
      expect(result).toEqual({
        data: mockData,
        comments: {},
        file_path: '',
      })
    })

    it('should pass null instanceId when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue({})

      const result = await getBotConfig()

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: null,
        configType: 'bot',
        filename: 'bot_config.toml',
      })
      expect(result).toEqual({ data: {}, comments: {}, file_path: '' })
    })

    it('should propagate errors from invoke', async () => {
      vi.mocked(invoke).mockRejectedValue('Config file not found')

      await expect(getBotConfig('inst_missing')).rejects.toThrow('Config file not found')
    })
  })

  describe('getBotConfigRaw', () => {
    it('should return raw TOML string', async () => {
      const rawToml = '[personality]\nname = "TestBot"\n'
      vi.mocked(invoke).mockResolvedValue(rawToml)

      const result = await getBotConfigRaw('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
      })
      expect(result).toBe(rawToml)
    })

    it('should return empty string for empty config', async () => {
      vi.mocked(invoke).mockResolvedValue('')

      const result = await getBotConfigRaw('inst_001')
      expect(result).toBe('')
    })
  })

  describe('saveBotConfigRaw', () => {
    it('should invoke save_toml_config_raw with content', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)
      const content = '[personality]\nname = "UpdatedBot"\n'

      await saveBotConfigRaw(content, 'inst_001')

      expect(invoke).toHaveBeenCalledWith('save_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
        content,
      })
    })

    it('should pass null instanceId when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)

      await saveBotConfigRaw('content')

      expect(invoke).toHaveBeenCalledWith('save_toml_config_raw', {
        instanceId: null,
        configType: 'bot',
        filename: 'bot_config.toml',
        content: 'content',
      })
    })

    it('should propagate write errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Permission denied')

      await expect(saveBotConfigRaw('content', 'inst_001')).rejects.toThrow('Permission denied')
    })
  })

  describe('updateBotConfig', () => {
    it('should invoke update_toml_config_value and wrap result', async () => {
      const updatedData = { personality: { name: 'NewName' } }
      vi.mocked(invoke).mockResolvedValue(updatedData)

      const result = await updateBotConfig(
        { key_path: 'personality.name', value: 'NewName' },
        'inst_001'
      )

      expect(invoke).toHaveBeenCalledWith('update_toml_config_value', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
        keyPath: 'personality.name',
        value: 'NewName',
      })
      expect(result).toEqual({ data: updatedData, comments: {}, file_path: '' })
    })

    it('should handle numeric value updates', async () => {
      vi.mocked(invoke).mockResolvedValue({ behavior: { reply_speed: 10 } })

      const result = await updateBotConfig(
        { key_path: 'behavior.reply_speed', value: 10 },
        'inst_002'
      )

      expect(result.data).toEqual({ behavior: { reply_speed: 10 } })
    })
  })

  describe('deleteBotConfigKey', () => {
    it('should invoke delete_toml_config_key and wrap result', async () => {
      const afterDelete = { personality: {} }
      vi.mocked(invoke).mockResolvedValue(afterDelete)

      const result = await deleteBotConfigKey({ key_path: 'personality.name' }, 'inst_001')

      expect(invoke).toHaveBeenCalledWith('delete_toml_config_key', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
        keyPath: 'personality.name',
      })
      expect(result).toEqual({ data: afterDelete, comments: {}, file_path: '' })
    })
  })

  describe('addBotConfigArrayItem', () => {
    it('should invoke add_toml_array_item and wrap result', async () => {
      const afterAdd = { plugins: [{ name: 'new_plugin', enabled: true }] }
      vi.mocked(invoke).mockResolvedValue(afterAdd)

      const result = await addBotConfigArrayItem(
        { array_path: 'plugins', item: { name: 'new_plugin', enabled: true } },
        'inst_001'
      )

      expect(invoke).toHaveBeenCalledWith('add_toml_array_item', {
        instanceId: 'inst_001',
        configType: 'bot',
        filename: 'bot_config.toml',
        arrayPath: 'plugins',
        item: { name: 'new_plugin', enabled: true },
      })
      expect(result).toEqual({ data: afterAdd, comments: {}, file_path: '' })
    })
  })

  // ==================== Model Config ====================

  describe('getModelConfig', () => {
    it('should invoke get_toml_config with model configType', async () => {
      const mockData = { model: { provider: 'openai', name: 'gpt-4' } }
      vi.mocked(invoke).mockResolvedValue(mockData)

      const result = await getModelConfig('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
      })
      expect(result).toEqual({ data: mockData, comments: {}, file_path: '' })
    })

    it('should pass null instanceId when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue({ model: {} })

      await getModelConfig()

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: null,
        configType: 'model',
        filename: 'model_config.toml',
      })
    })
  })

  describe('getModelConfigRaw', () => {
    it('should return raw TOML string for model config', async () => {
      const rawToml = '[model]\nprovider = "openai"\n'
      vi.mocked(invoke).mockResolvedValue(rawToml)

      const result = await getModelConfigRaw('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
      })
      expect(result).toBe(rawToml)
    })
  })

  describe('saveModelConfigRaw', () => {
    it('should invoke save_toml_config_raw for model config', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)
      const content = '[model]\nprovider = "anthropic"\n'

      await saveModelConfigRaw(content, 'inst_001')

      expect(invoke).toHaveBeenCalledWith('save_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
        content,
      })
    })
  })

  describe('updateModelConfig', () => {
    it('should invoke update_toml_config_value for model config', async () => {
      const updatedData = { model: { provider: 'anthropic' } }
      vi.mocked(invoke).mockResolvedValue(updatedData)

      const result = await updateModelConfig(
        { key_path: 'model.provider', value: 'anthropic' },
        'inst_001'
      )

      expect(invoke).toHaveBeenCalledWith('update_toml_config_value', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
        keyPath: 'model.provider',
        value: 'anthropic',
      })
      expect(result).toEqual({ data: updatedData, comments: {}, file_path: '' })
    })
  })

  describe('deleteModelConfigKey', () => {
    it('should invoke delete_toml_config_key for model config', async () => {
      const afterDelete = { model: {} }
      vi.mocked(invoke).mockResolvedValue(afterDelete)

      const result = await deleteModelConfigKey({ key_path: 'model.provider' }, 'inst_001')

      expect(invoke).toHaveBeenCalledWith('delete_toml_config_key', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
        keyPath: 'model.provider',
      })
      expect(result).toEqual({ data: afterDelete, comments: {}, file_path: '' })
    })
  })

  describe('addModelConfigArrayItem', () => {
    it('should invoke add_toml_array_item for model config', async () => {
      const afterAdd = { endpoints: [{ url: 'https://api.example.com', priority: 1 }] }
      vi.mocked(invoke).mockResolvedValue(afterAdd)

      const result = await addModelConfigArrayItem(
        { array_path: 'endpoints', item: { url: 'https://api.example.com', priority: 1 } },
        'inst_001'
      )

      expect(invoke).toHaveBeenCalledWith('add_toml_array_item', {
        instanceId: 'inst_001',
        configType: 'model',
        filename: 'model_config.toml',
        arrayPath: 'endpoints',
        item: { url: 'https://api.example.com', priority: 1 },
      })
      expect(result).toEqual({ data: afterAdd, comments: {}, file_path: '' })
    })
  })

  // ==================== Adapter Config ====================

  describe('getAdapterConfig', () => {
    it('should invoke get_toml_config with adapter configType', async () => {
      const mockData = { adapter: { port: 8080, host: '127.0.0.1' } }
      vi.mocked(invoke).mockResolvedValue(mockData)

      const result = await getAdapterConfig('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: 'inst_001',
        configType: 'adapter',
        filename: 'config.toml',
      })
      expect(result).toEqual({ data: mockData, comments: {}, file_path: '' })
    })

    it('should pass null instanceId when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue({})

      await getAdapterConfig()

      expect(invoke).toHaveBeenCalledWith('get_toml_config', {
        instanceId: null,
        configType: 'adapter',
        filename: 'config.toml',
      })
    })
  })

  describe('updateAdapterConfig', () => {
    it('should invoke update_toml_config_value for adapter config', async () => {
      const updatedData = { adapter: { port: 9090 } }
      vi.mocked(invoke).mockResolvedValue(updatedData)

      const result = await updateAdapterConfig(
        { key_path: 'adapter.port', value: 9090 },
        'inst_001'
      )

      expect(invoke).toHaveBeenCalledWith('update_toml_config_value', {
        instanceId: 'inst_001',
        configType: 'adapter',
        filename: 'config.toml',
        keyPath: 'adapter.port',
        value: 9090,
      })
      expect(result).toEqual({ data: updatedData, comments: {}, file_path: '' })
    })
  })

  describe('getAdapterConfigRaw', () => {
    it('should return raw TOML string for adapter config', async () => {
      const rawToml = '[adapter]\nport = 8080\n'
      vi.mocked(invoke).mockResolvedValue(rawToml)

      const result = await getAdapterConfigRaw('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'adapter',
        filename: 'config.toml',
      })
      expect(result).toBe(rawToml)
    })
  })

  describe('saveAdapterConfigRaw', () => {
    it('should invoke save_toml_config_raw for adapter config', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)
      const content = '[adapter]\nport = 9090\n'

      await saveAdapterConfigRaw(content, 'inst_001')

      expect(invoke).toHaveBeenCalledWith('save_toml_config_raw', {
        instanceId: 'inst_001',
        configType: 'adapter',
        filename: 'config.toml',
        content,
      })
    })

    it('should propagate write errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Disk full')

      await expect(saveAdapterConfigRaw('content', 'inst_001')).rejects.toThrow('Disk full')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { messageQueueApi } from '../messageQueueApi'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('messageQueueApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInstanceQueue', () => {
    it('should invoke get_instance_message_queue and return full response', async () => {
      const mockResponse = {
        instance_id: 'inst_001',
        instance_name: 'TestBot',
        connected: true,
        messages: [
          {
            id: 'msg_001',
            stream_id: 'stream_abc',
            group_name: 'group_1',
            status: 'pending',
            cycle_count: 1,
            retry_count: 0,
            retry_reason: null,
            action_type: 'text',
            start_time: 1711267200,
            sent_time: null,
            message_preview: 'Hello world',
          },
          {
            id: 'msg_002',
            stream_id: 'stream_def',
            group_name: null,
            status: 'sent',
            cycle_count: 2,
            retry_count: 1,
            retry_reason: 'timeout',
            action_type: 'image',
            start_time: 1711267100,
            sent_time: 1711267150,
            message_preview: null,
          },
        ],
        total_processed: 42,
        error: null,
      }
      vi.mocked(invoke).mockResolvedValue(mockResponse)

      const result = await messageQueueApi.getInstanceQueue('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_instance_message_queue', { instanceId: 'inst_001' })
      expect(result.instance_id).toBe('inst_001')
      expect(result.instance_name).toBe('TestBot')
      expect(result.connected).toBe(true)
      expect(result.total_processed).toBe(42)
      expect(result.error).toBeNull()
      expect(result.messages).toHaveLength(2)

      expect(result.messages[0].id).toBe('msg_001')
      expect(result.messages[0].status).toBe('pending')
      expect(result.messages[0].group_name).toBe('group_1')
      expect(result.messages[0].retry_count).toBe(0)
      expect(result.messages[0].message_preview).toBe('Hello world')

      expect(result.messages[1].id).toBe('msg_002')
      expect(result.messages[1].status).toBe('sent')
      expect(result.messages[1].group_name).toBeNull()
      expect(result.messages[1].retry_count).toBe(1)
      expect(result.messages[1].retry_reason).toBe('timeout')
      expect(result.messages[1].sent_time).toBe(1711267150)
    })

    it('should handle disconnected instance with error', async () => {
      const mockResponse = {
        instance_id: 'inst_002',
        instance_name: 'OfflineBot',
        connected: false,
        messages: [],
        total_processed: 0,
        error: 'Connection refused',
      }
      vi.mocked(invoke).mockResolvedValue(mockResponse)

      const result = await messageQueueApi.getInstanceQueue('inst_002')

      expect(result.connected).toBe(false)
      expect(result.messages).toEqual([])
      expect(result.total_processed).toBe(0)
      expect(result.error).toBe('Connection refused')
    })

    it('should propagate invoke errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Instance not found')

      await expect(messageQueueApi.getInstanceQueue('inst_bad')).rejects.toThrow('Instance not found')
    })
  })

  describe('getAllQueues', () => {
    it('should invoke get_all_message_queues and return array of responses', async () => {
      const mockQueues = [
        {
          instance_id: 'inst_001',
          instance_name: 'Bot1',
          connected: true,
          messages: [
            {
              id: 'msg_a',
              stream_id: 's1',
              group_name: 'g1',
              status: 'sending',
              cycle_count: 0,
              retry_count: 0,
              retry_reason: null,
              action_type: 'text',
              start_time: 1711267200,
              sent_time: null,
              message_preview: 'test',
            },
          ],
          total_processed: 100,
          error: null,
        },
        {
          instance_id: 'inst_002',
          instance_name: 'Bot2',
          connected: false,
          messages: [],
          total_processed: 0,
          error: 'Not running',
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockQueues)

      const result = await messageQueueApi.getAllQueues()

      expect(invoke).toHaveBeenCalledWith('get_all_message_queues', undefined)
      expect(result).toHaveLength(2)
      expect(result[0].instance_id).toBe('inst_001')
      expect(result[0].connected).toBe(true)
      expect(result[0].messages).toHaveLength(1)
      expect(result[0].total_processed).toBe(100)
      expect(result[1].instance_id).toBe('inst_002')
      expect(result[1].connected).toBe(false)
      expect(result[1].error).toBe('Not running')
    })

    it('should return empty array when no instances exist', async () => {
      vi.mocked(invoke).mockResolvedValue([])

      const result = await messageQueueApi.getAllQueues()

      expect(result).toEqual([])
    })

    it('should propagate errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Internal error')

      await expect(messageQueueApi.getAllQueues()).rejects.toThrow('Internal error')
    })
  })
})

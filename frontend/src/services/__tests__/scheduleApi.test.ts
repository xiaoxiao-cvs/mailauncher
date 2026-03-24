import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { scheduleApi } from '../scheduleApi'
import type { ScheduleCreate, ScheduleUpdate } from '../scheduleApi'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('scheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSchedules', () => {
    it('should invoke list_schedules with instanceId', async () => {
      const mockSchedules = [
        {
          id: 'sched_001',
          instance_id: 'inst_001',
          name: 'Daily restart',
          action: 'restart',
          schedule_type: 'daily',
          schedule_config: { hour: 3, minute: 0 },
          enabled: true,
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockSchedules)

      const result = await scheduleApi.getSchedules('inst_001')

      expect(invoke).toHaveBeenCalledWith('list_schedules', { instanceId: 'inst_001' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('sched_001')
      expect(result[0].name).toBe('Daily restart')
      expect(result[0].action).toBe('restart')
      expect(result[0].schedule_type).toBe('daily')
      expect(result[0].enabled).toBe(true)
    })

    it('should pass null instanceId when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue([])

      const result = await scheduleApi.getSchedules()

      expect(invoke).toHaveBeenCalledWith('list_schedules', { instanceId: null })
      expect(result).toEqual([])
    })

    it('should propagate errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Database error')

      await expect(scheduleApi.getSchedules('inst_001')).rejects.toThrow('Database error')
    })
  })

  describe('getSchedule', () => {
    it('should invoke get_schedule with scheduleId', async () => {
      const mockSchedule = {
        id: 'sched_001',
        instance_id: 'inst_001',
        name: 'Weekly stop',
        action: 'stop',
        schedule_type: 'weekly',
        schedule_config: { hour: 22, minute: 30, weekdays: [5, 6] },
        enabled: false,
        next_run: '2026-03-28T22:30:00Z',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      }
      vi.mocked(invoke).mockResolvedValue(mockSchedule)

      const result = await scheduleApi.getSchedule('sched_001')

      expect(invoke).toHaveBeenCalledWith('get_schedule', { scheduleId: 'sched_001' })
      expect(result.id).toBe('sched_001')
      expect(result.action).toBe('stop')
      expect(result.schedule_type).toBe('weekly')
      expect(result.schedule_config.weekdays).toEqual([5, 6])
      expect(result.enabled).toBe(false)
    })

    it('should propagate not-found errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Schedule not found')

      await expect(scheduleApi.getSchedule('sched_nonexistent')).rejects.toThrow('Schedule not found')
    })
  })

  describe('createSchedule', () => {
    it('should invoke create_schedule with mapped fields', async () => {
      const createData: ScheduleCreate = {
        instance_id: 'inst_001',
        name: 'Once start',
        action: 'start',
        schedule_type: 'once',
        schedule_config: { date: '2026-04-01', hour: 8, minute: 0 },
        enabled: true,
      }
      const mockSchedule = {
        id: 'sched_new',
        ...createData,
        created_at: '2026-03-24T00:00:00Z',
        updated_at: '2026-03-24T00:00:00Z',
      }
      vi.mocked(invoke).mockResolvedValue(mockSchedule)

      const result = await scheduleApi.createSchedule(createData)

      expect(invoke).toHaveBeenCalledWith('create_schedule', {
        instanceId: 'inst_001',
        name: 'Once start',
        action: 'start',
        scheduleType: 'once',
        scheduleConfig: { date: '2026-04-01', hour: 8, minute: 0 },
        enabled: true,
      })
      expect(result.id).toBe('sched_new')
      expect(result.name).toBe('Once start')
      expect(result.action).toBe('start')
    })

    it('should default enabled to true when omitted', async () => {
      const createData: ScheduleCreate = {
        instance_id: 'inst_001',
        name: 'Monitor',
        action: 'restart',
        schedule_type: 'monitor',
        schedule_config: {},
      }
      vi.mocked(invoke).mockResolvedValue({ id: 'sched_mon', ...createData, enabled: true })

      await scheduleApi.createSchedule(createData)

      expect(invoke).toHaveBeenCalledWith('create_schedule', {
        instanceId: 'inst_001',
        name: 'Monitor',
        action: 'restart',
        scheduleType: 'monitor',
        scheduleConfig: {},
        enabled: true,
      })
    })

    it('should respect enabled=false', async () => {
      const createData: ScheduleCreate = {
        instance_id: 'inst_002',
        name: 'Disabled task',
        action: 'stop',
        schedule_type: 'daily',
        schedule_config: { hour: 0, minute: 0 },
        enabled: false,
      }
      vi.mocked(invoke).mockResolvedValue({ id: 'sched_dis', ...createData })

      await scheduleApi.createSchedule(createData)

      expect(invoke).toHaveBeenCalledWith('create_schedule', expect.objectContaining({
        enabled: false,
      }))
    })
  })

  describe('updateSchedule', () => {
    it('should invoke update_schedule with mapped fields', async () => {
      const updateData: ScheduleUpdate = {
        name: 'Updated name',
        action: 'stop',
        schedule_type: 'daily',
        schedule_config: { hour: 5, minute: 30 },
        enabled: false,
      }
      const mockUpdated = {
        id: 'sched_001',
        instance_id: 'inst_001',
        ...updateData,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-24T00:00:00Z',
      }
      vi.mocked(invoke).mockResolvedValue(mockUpdated)

      const result = await scheduleApi.updateSchedule('sched_001', updateData)

      expect(invoke).toHaveBeenCalledWith('update_schedule', {
        scheduleId: 'sched_001',
        name: 'Updated name',
        action: 'stop',
        scheduleType: 'daily',
        scheduleConfig: { hour: 5, minute: 30 },
        enabled: false,
      })
      expect(result.id).toBe('sched_001')
      expect(result.name).toBe('Updated name')
    })

    it('should pass null for omitted optional fields', async () => {
      const updateData: ScheduleUpdate = { name: 'Only name change' }
      vi.mocked(invoke).mockResolvedValue({ id: 'sched_001', name: 'Only name change' })

      await scheduleApi.updateSchedule('sched_001', updateData)

      expect(invoke).toHaveBeenCalledWith('update_schedule', {
        scheduleId: 'sched_001',
        name: 'Only name change',
        action: null,
        scheduleType: null,
        scheduleConfig: null,
        enabled: null,
      })
    })
  })

  describe('deleteSchedule', () => {
    it('should invoke delete_schedule and return success response', async () => {
      vi.mocked(invoke).mockResolvedValue({ message: 'Schedule deleted' })

      const result = await scheduleApi.deleteSchedule('sched_001')

      expect(invoke).toHaveBeenCalledWith('delete_schedule', { scheduleId: 'sched_001' })
      expect(result.message).toBe('Schedule deleted')
    })

    it('should propagate deletion errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Schedule in use')

      await expect(scheduleApi.deleteSchedule('sched_active')).rejects.toThrow('Schedule in use')
    })
  })

  describe('toggleSchedule', () => {
    it('should invoke toggle_schedule to enable', async () => {
      const mockSchedule = {
        id: 'sched_001',
        instance_id: 'inst_001',
        name: 'Test',
        action: 'start',
        schedule_type: 'daily',
        schedule_config: { hour: 8, minute: 0 },
        enabled: true,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-24T00:00:00Z',
      }
      vi.mocked(invoke).mockResolvedValue(mockSchedule)

      const result = await scheduleApi.toggleSchedule('sched_001', true)

      expect(invoke).toHaveBeenCalledWith('toggle_schedule', {
        scheduleId: 'sched_001',
        enabled: true,
      })
      expect(result.enabled).toBe(true)
    })

    it('should invoke toggle_schedule to disable', async () => {
      vi.mocked(invoke).mockResolvedValue({
        id: 'sched_001',
        enabled: false,
      })

      const result = await scheduleApi.toggleSchedule('sched_001', false)

      expect(invoke).toHaveBeenCalledWith('toggle_schedule', {
        scheduleId: 'sched_001',
        enabled: false,
      })
      expect(result.enabled).toBe(false)
    })
  })
})

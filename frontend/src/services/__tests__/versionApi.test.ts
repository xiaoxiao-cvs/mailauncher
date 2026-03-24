import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  getInstanceComponentsVersion,
  checkComponentUpdate,
  updateComponent,
  getBackups,
  restoreBackup,
  getUpdateHistory,
  getComponentReleases,
  formatFileSize,
  getComponentDisplayName,
} from '../versionApi'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('versionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInstanceComponentsVersion', () => {
    it('should invoke get_instance_components_version and return component list', async () => {
      const mockVersions = [
        {
          component: 'MaiBot',
          installed: true,
          local_version: '1.2.0',
          status: 'up_to_date',
          has_update: false,
        },
        {
          component: 'NapCat',
          installed: false,
          status: 'not_installed',
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockVersions)

      const result = await getInstanceComponentsVersion('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_instance_components_version', { instanceId: 'inst_001' })
      expect(result).toHaveLength(2)
      expect(result[0].component).toBe('MaiBot')
      expect(result[0].installed).toBe(true)
      expect(result[0].local_version).toBe('1.2.0')
      expect(result[0].status).toBe('up_to_date')
      expect(result[1].component).toBe('NapCat')
      expect(result[1].installed).toBe(false)
      expect(result[1].status).toBe('not_installed')
    })

    it('should propagate errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Instance not found')

      await expect(getInstanceComponentsVersion('inst_missing')).rejects.toThrow('Instance not found')
    })
  })

  describe('checkComponentUpdate', () => {
    it('should invoke check_component_update and return update check result', async () => {
      const mockResult = {
        component: 'MaiBot',
        local_version: '1.2.0',
        local_commit: 'abc1234',
        github_info: {
          latest_version: '1.3.0',
          latest_commit: 'def5678',
          commit_message: 'feat: new feature',
        },
        has_update: true,
        comparison: {
          ahead_by: 0,
          behind_by: 5,
          total_commits: 5,
          commits: [],
          files_changed: 12,
          files: [],
        },
      }
      vi.mocked(invoke).mockResolvedValue(mockResult)

      const result = await checkComponentUpdate('inst_001', 'MaiBot')

      expect(invoke).toHaveBeenCalledWith('check_component_update', {
        instanceId: 'inst_001',
        component: 'MaiBot',
      })
      expect(result.has_update).toBe(true)
      expect(result.component).toBe('MaiBot')
      expect(result.local_version).toBe('1.2.0')
      expect(result.github_info.latest_version).toBe('1.3.0')
      expect(result.comparison!.behind_by).toBe(5)
      expect(result.comparison!.files_changed).toBe(12)
    })

    it('should return result with no update available', async () => {
      const mockResult = {
        component: 'NapCat',
        local_commit: 'abc1234',
        github_info: { latest_commit: 'abc1234' },
        has_update: false,
      }
      vi.mocked(invoke).mockResolvedValue(mockResult)

      const result = await checkComponentUpdate('inst_001', 'NapCat')
      expect(result.has_update).toBe(false)
      expect(result.component).toBe('NapCat')
    })
  })

  describe('updateComponent', () => {
    it('should invoke update_component and return empty object', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: 'updated' })

      const result = await updateComponent('inst_001', 'MaiBot', true)

      expect(invoke).toHaveBeenCalledWith('update_component', {
        instanceId: 'inst_001',
        component: 'MaiBot',
        createBackup: true,
      })
      expect(result).toEqual({})
    })

    it('should default createBackup to true', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true })

      await updateComponent('inst_001', 'NapCat')

      expect(invoke).toHaveBeenCalledWith('update_component', {
        instanceId: 'inst_001',
        component: 'NapCat',
        createBackup: true,
      })
    })

    it('should propagate update errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Git pull failed')

      await expect(updateComponent('inst_001', 'MaiBot')).rejects.toThrow('Git pull failed')
    })
  })

  describe('getBackups', () => {
    it('should invoke get_backups and return backup list', async () => {
      const mockBackups = [
        {
          id: 'bak_001',
          component: 'MaiBot',
          version: '1.2.0',
          commit_hash: 'abc1234',
          backup_size: 1048576,
          created_at: '2026-03-20T10:00:00Z',
          description: 'Pre-update backup',
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockBackups)

      const result = await getBackups('inst_001', 'MaiBot')

      expect(invoke).toHaveBeenCalledWith('get_backups', {
        instanceId: 'inst_001',
        component: 'MaiBot',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bak_001')
      expect(result[0].backup_size).toBe(1048576)
      expect(result[0].created_at).toBe('2026-03-20T10:00:00Z')
    })

    it('should pass null component when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue([])

      const result = await getBackups('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_backups', {
        instanceId: 'inst_001',
        component: null,
      })
      expect(result).toEqual([])
    })
  })

  describe('restoreBackup', () => {
    it('should invoke restore_backup and return fixed shape', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: 'restored' })

      const result = await restoreBackup('inst_001', 'bak_001')

      expect(invoke).toHaveBeenCalledWith('restore_backup', {
        instanceId: 'inst_001',
        backupId: 'bak_001',
      })
      expect(result).toEqual({ backup_id: 'bak_001', component: '' })
    })

    it('should propagate restore errors', async () => {
      vi.mocked(invoke).mockRejectedValue('Backup corrupted')

      await expect(restoreBackup('inst_001', 'bak_bad')).rejects.toThrow('Backup corrupted')
    })
  })

  describe('getUpdateHistory', () => {
    it('should invoke get_update_history with all params', async () => {
      const mockHistory = [
        {
          id: 1,
          component: 'MaiBot',
          from_version: '1.2.0',
          to_version: '1.3.0',
          status: 'success',
          updated_at: '2026-03-21T12:00:00Z',
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockHistory)

      const result = await getUpdateHistory('inst_001', 'MaiBot', 10)

      expect(invoke).toHaveBeenCalledWith('get_update_history', {
        instanceId: 'inst_001',
        component: 'MaiBot',
        limit: 10,
      })
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('success')
      expect(result[0].from_version).toBe('1.2.0')
      expect(result[0].to_version).toBe('1.3.0')
    })

    it('should use default limit of 20 and null component when omitted', async () => {
      vi.mocked(invoke).mockResolvedValue([])

      await getUpdateHistory('inst_001')

      expect(invoke).toHaveBeenCalledWith('get_update_history', {
        instanceId: 'inst_001',
        component: null,
        limit: 20,
      })
    })
  })

  describe('getComponentReleases', () => {
    it('should invoke get_component_releases and return releases', async () => {
      const mockReleases = [
        {
          tag_name: 'v1.3.0',
          name: 'Release 1.3.0',
          published_at: '2026-03-15T00:00:00Z',
          body: 'Changelog content',
          html_url: 'https://github.com/org/repo/releases/v1.3.0',
          prerelease: false,
        },
        {
          tag_name: 'v1.4.0-beta',
          name: 'Beta Release',
          published_at: '2026-03-20T00:00:00Z',
          body: 'Beta notes',
          html_url: 'https://github.com/org/repo/releases/v1.4.0-beta',
          prerelease: true,
        },
      ]
      vi.mocked(invoke).mockResolvedValue(mockReleases)

      const result = await getComponentReleases('MaiBot', 5)

      expect(invoke).toHaveBeenCalledWith('get_component_releases', {
        component: 'MaiBot',
        limit: 5,
      })
      expect(result).toHaveLength(2)
      expect(result[0].tag_name).toBe('v1.3.0')
      expect(result[0].prerelease).toBe(false)
      expect(result[1].prerelease).toBe(true)
    })

    it('should use default limit of 10', async () => {
      vi.mocked(invoke).mockResolvedValue([])

      await getComponentReleases('NapCat')

      expect(invoke).toHaveBeenCalledWith('get_component_releases', {
        component: 'NapCat',
        limit: 10,
      })
    })
  })

  // ==================== Pure utility functions ====================

  describe('formatFileSize', () => {
    it('should return "0 B" for zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(2621440)).toBe('2.5 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })
  })

  describe('getComponentDisplayName', () => {
    it('should return "MaiBot" for MaiBot component', () => {
      expect(getComponentDisplayName('MaiBot')).toBe('MaiBot')
    })

    it('should return "NapCat" for NapCat component', () => {
      expect(getComponentDisplayName('NapCat')).toBe('NapCat')
    })

    it('should return "Adapter" for MaiBot-Napcat-Adapter', () => {
      expect(getComponentDisplayName('MaiBot-Napcat-Adapter')).toBe('Adapter')
    })

    it('should return the original string for unknown components', () => {
      expect(getComponentDisplayName('UnknownPlugin')).toBe('UnknownPlugin')
    })

    it('should return empty string for empty input', () => {
      expect(getComponentDisplayName('')).toBe('')
    })
  })
})

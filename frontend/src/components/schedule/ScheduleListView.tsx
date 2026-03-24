import React from 'react'
import { Clock, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Schedule, ScheduleAction } from '@/services/scheduleApi'

interface ScheduleListViewProps {
  schedules: Schedule[]
  isLoading: boolean
  actionIcons: Record<ScheduleAction, React.ReactNode>
  actionColors: Record<ScheduleAction, string>
  onEdit: (schedule: Schedule) => void
  onDelete: (scheduleId: string) => void
  onToggle: (scheduleId: string, enabled: boolean) => void
}

export const ScheduleListView: React.FC<ScheduleListViewProps> = ({
  schedules,
  isLoading,
  actionIcons,
  actionColors,
  onEdit,
  onDelete,
  onToggle,
}) => {
  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">暂无计划任务</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            点击"新建任务"创建第一个计划任务
          </p>
        </div>
      ) : (
        schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${actionColors[schedule.action]}`}>
                    {actionIcons[schedule.action]}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {schedule.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {schedule.schedule_type === 'once' && '单次'}
                    {schedule.schedule_type === 'daily' && '每天'}
                    {schedule.schedule_type === 'weekly' && '每周'}
                    {schedule.schedule_type === 'monitor' && '监控'}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {schedule.next_run && (
                    <div>下次执行: {new Date(schedule.next_run).toLocaleString('zh-CN')}</div>
                  )}
                  {schedule.last_run && (
                    <div>上次执行: {new Date(schedule.last_run).toLocaleString('zh-CN')}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={schedule.enabled}
                  onCheckedChange={(checked) => onToggle(schedule.id, checked)}
                />
                <Button
                  onClick={() => onEdit(schedule)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => onDelete(schedule.id)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

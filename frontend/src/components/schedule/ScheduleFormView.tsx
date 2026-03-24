import React from 'react'
import { Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { ScheduleCreate, ScheduleAction, ScheduleType } from '@/services/scheduleApi'

type FormMode = 'create' | 'edit'

interface ScheduleFormViewProps {
  formMode: FormMode
  formData: ScheduleCreate
  selectedDate: Date | undefined
  selectedTime: string
  selectedWeekdays: number[]
  actionIcons: Record<ScheduleAction, React.ReactNode>
  actionColors: Record<ScheduleAction, string>
  isPending: boolean
  onFormDataChange: (data: ScheduleCreate) => void
  onSelectedDateChange: (date: Date | undefined) => void
  onSelectedTimeChange: (time: string) => void
  onToggleWeekday: (day: number) => void
  onResetWeekdays: () => void
  onSubmit: () => void
  onCancel: () => void
}

const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export const ScheduleFormView: React.FC<ScheduleFormViewProps> = ({
  formMode,
  formData,
  selectedDate,
  selectedTime,
  selectedWeekdays,
  actionIcons,
  actionColors,
  isPending,
  onFormDataChange,
  onSelectedDateChange,
  onSelectedTimeChange,
  onToggleWeekday,
  onResetWeekdays,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">任务名称</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
          placeholder="例如：每日自动重启"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>执行动作</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {(['start', 'stop', 'restart'] as ScheduleAction[]).map((action) => (
            <button
              key={action}
              onClick={() => onFormDataChange({ ...formData, action })}
              className={`p-3 rounded-card border-2 transition-all text-left ${
                formData.action === action
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={actionColors[action]}>
                  {actionIcons[action]}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {action === 'start' && '启动'}
                  {action === 'stop' && '停止'}
                  {action === 'restart' && '重启'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>触发条件</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {(['once', 'daily', 'weekly', 'monitor'] as ScheduleType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                onFormDataChange({ ...formData, schedule_type: type })
                if (type === 'weekly') onResetWeekdays()
              }}
              className={`p-3 rounded-card border-2 transition-all text-left ${
                formData.schedule_type === type
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {type === 'once' && '单次执行'}
                {type === 'daily' && '每天执行'}
                {type === 'weekly' && '每周执行'}
                {type === 'monitor' && '进程监控'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {type === 'once' && '指定时间执行一次'}
                {type === 'daily' && '每天固定时间'}
                {type === 'weekly' && '每周特定日期'}
                {type === 'monitor' && '停止时自动启动'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {formData.schedule_type === 'once' && (
        <div className="p-4 rounded-card border border-gray-200 dark:border-gray-700">
          <Label className="mb-2 block">选择日期和时间</Label>
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onSelectedDateChange}
              className="rounded-card border border-gray-200 dark:border-gray-700 p-3 mx-auto"
            />
            <div>
              <Label htmlFor="time" className="text-xs">时间</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => onSelectedTimeChange(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {(formData.schedule_type === 'daily' || formData.schedule_type === 'weekly') && (
        <div className="p-4 rounded-card border border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <Label htmlFor="time">执行时间</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => onSelectedTimeChange(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {formData.schedule_type === 'weekly' && (
            <div>
              <Label>选择星期几</Label>
              <div className="grid grid-cols-7 gap-2 mt-1.5">
                {weekdayNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => onToggleWeekday(index)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedWeekdays.includes(index)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {formData.schedule_type === 'monitor' && (
        <div className="p-4 rounded-card border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <Power className="w-4 h-4 inline mr-2" />
            进程监控模式：当检测到实例进程停止时，将自动执行选择的动作（通常选择"启动"）
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onCancel} variant="outline">
          取消
        </Button>
        <Button
          onClick={onSubmit}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!formData.name || isPending}
        >
          {formMode === 'create' ? '创建' : '保存'}
        </Button>
      </div>
    </div>
  )
}

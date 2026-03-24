/**
 * 计划任务模态框
 * 用于管理实例的计划任务
 */
import React, { useState } from 'react'
import { X, Plus, Clock, PlayCircle, StopCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
} from '@/hooks/queries/useScheduleQueries'
import { Schedule, ScheduleCreate, ScheduleUpdate } from '@/services/scheduleApi'
import { ScheduleListView, ScheduleFormView } from '@/components/schedule'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  instanceId: string
}

type FormMode = 'create' | 'edit' | 'view'

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  instanceId,
}) => {
  const [formMode, setFormMode] = useState<FormMode>('view')
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  // 表单状态
  const [formData, setFormData] = useState<ScheduleCreate>({
    instance_id: instanceId,
    name: '',
    action: 'start',
    schedule_type: 'once',
    schedule_config: {},
    enabled: true,
  })

  // 日期时间选择
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('12:00')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])

  // API hooks
  const { data: schedules = [], isLoading, refetch } = useSchedulesQuery(instanceId)
  const createMutation = useCreateScheduleMutation()
  const updateMutation = useUpdateScheduleMutation()
  const deleteMutation = useDeleteScheduleMutation()
  const toggleMutation = useToggleScheduleMutation()

  // 重置表单
  const resetForm = () => {
    setFormData({
      instance_id: instanceId,
      name: '',
      action: 'start',
      schedule_type: 'once',
      schedule_config: {},
      enabled: true,
    })
    setSelectedDate(new Date())
    setSelectedTime('12:00')
    setSelectedWeekdays([])
    setEditingSchedule(null)
  }

  // 切换到创建模式
  const handleCreate = () => {
    resetForm()
    setFormMode('create')
  }

  // 切换到编辑模式
  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      instance_id: schedule.instance_id,
      name: schedule.name,
      action: schedule.action,
      schedule_type: schedule.schedule_type,
      schedule_config: schedule.schedule_config,
      enabled: schedule.enabled,
    })

    // 恢复时间配置
    if (schedule.schedule_type === 'once' && schedule.schedule_config.date) {
      const date = new Date(schedule.schedule_config.date)
      setSelectedDate(date)
      setSelectedTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`)
    } else if (schedule.schedule_type === 'daily' || schedule.schedule_type === 'weekly') {
      setSelectedTime(
        `${(schedule.schedule_config.hour || 0).toString().padStart(2, '0')}:${(schedule.schedule_config.minute || 0).toString().padStart(2, '0')}`
      )
      if (schedule.schedule_type === 'weekly' && schedule.schedule_config.weekdays) {
        setSelectedWeekdays(schedule.schedule_config.weekdays)
      }
    }

    setFormMode('edit')
  }

  // 取消编辑
  const handleCancel = () => {
    resetForm()
    setFormMode('view')
  }

  // 提交表单
  const handleSubmit = async () => {
    // 构建 schedule_config
    let schedule_config: any = {}

    if (formData.schedule_type === 'once') {
      if (!selectedDate) {
        toast.error('请选择日期')
        return
      }
      const [hour, minute] = selectedTime.split(':').map(Number)
      const datetime = new Date(selectedDate)
      datetime.setHours(hour, minute, 0, 0)
      schedule_config.date = datetime.toISOString()
    } else if (formData.schedule_type === 'daily') {
      const [hour, minute] = selectedTime.split(':').map(Number)
      schedule_config.hour = hour
      schedule_config.minute = minute
    } else if (formData.schedule_type === 'weekly') {
      if (selectedWeekdays.length === 0) {
        toast.error('请至少选择一个星期几')
        return
      }
      const [hour, minute] = selectedTime.split(':').map(Number)
      schedule_config.hour = hour
      schedule_config.minute = minute
      schedule_config.weekdays = selectedWeekdays
    }

    const submitData = {
      ...formData,
      schedule_config,
    }

    try {
      if (formMode === 'create') {
        await createMutation.mutateAsync(submitData)
      } else if (formMode === 'edit' && editingSchedule) {
        const updateData: ScheduleUpdate = {
          name: submitData.name,
          action: submitData.action,
          schedule_type: submitData.schedule_type,
          schedule_config: submitData.schedule_config,
          enabled: submitData.enabled,
        }
        await updateMutation.mutateAsync({ scheduleId: editingSchedule.id, data: updateData })
      }

      handleCancel()
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  // 删除任务
  const handleDelete = async (scheduleId: string) => {
    if (confirm('确定要删除这个计划任务吗？')) {
      try {
        await deleteMutation.mutateAsync(scheduleId)
        refetch()
      } catch (error) {
        // Error handled by mutation
      }
    }
  }

  // 切换启用状态
  const handleToggle = async (scheduleId: string, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ scheduleId, enabled })
      refetch()
    } catch (error) {
      // Error handled by mutation
    }
  }

  // 切换星期几
  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  if (!isOpen) return null

  const actionIcons = {
    start: <PlayCircle className="w-4 h-4" />,
    stop: <StopCircle className="w-4 h-4" />,
    restart: <RotateCw className="w-4 h-4" />,
  }

  const actionColors = {
    start: 'text-green-600 dark:text-green-400',
    stop: 'text-red-600 dark:text-red-400',
    restart: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal 容器 */}
      <div className="absolute top-0 right-0 bottom-0 left-0 md:left-[272px] flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div className="relative w-full max-w-3xl h-[75vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-panel shadow-overlay border border-white/20 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  计划任务管理
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  定时执行实例操作
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {formMode === 'view' && (
                <Button
                  onClick={handleCreate}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  新建任务
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/20">
            {formMode === 'view' ? (
              <ScheduleListView
                schedules={schedules}
                isLoading={isLoading}
                actionIcons={actionIcons}
                actionColors={actionColors}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ) : (
              <ScheduleFormView
                formMode={formMode}
                formData={formData}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                selectedWeekdays={selectedWeekdays}
                actionIcons={actionIcons}
                actionColors={actionColors}
                isPending={createMutation.isPending || updateMutation.isPending}
                onFormDataChange={setFormData}
                onSelectedDateChange={setSelectedDate}
                onSelectedTimeChange={setSelectedTime}
                onToggleWeekday={toggleWeekday}
                onResetWeekdays={() => setSelectedWeekdays([])}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

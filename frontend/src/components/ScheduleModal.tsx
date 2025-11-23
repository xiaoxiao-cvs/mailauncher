/**
 * 计划任务模态框
 * 用于管理实例的计划任务
 */
import React, { useState } from 'react'
import { X, Plus, Clock, Trash2, Edit2, Power, PlayCircle, StopCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import {
  useSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
} from '@/hooks/queries/useScheduleQueries'
import { Schedule, ScheduleCreate, ScheduleUpdate, ScheduleAction, ScheduleType } from '@/services/scheduleApi'

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

  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-200">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal 容器 */}
      <div className="absolute top-0 right-0 bottom-0 left-0 md:left-[272px] flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div className="relative w-full max-w-3xl h-[75vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5 pointer-events-auto">
          
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
              /* 任务列表 */
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
                            onCheckedChange={(checked) => handleToggle(schedule.id, checked)}
                          />
                          <Button
                            onClick={() => handleEdit(schedule)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(schedule.id)}
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
            ) : (
              /* 创建/编辑表单 */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">任务名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                        onClick={() => setFormData({ ...formData, action })}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
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
                          setFormData({ ...formData, schedule_type: type })
                          if (type === 'weekly') setSelectedWeekdays([])
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
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

                {/* 时间配置 */}
                {formData.schedule_type === 'once' && (
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Label className="mb-2 block">选择日期和时间</Label>
                    <div className="flex flex-col gap-3">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 mx-auto"
                      />
                      <div>
                        <Label htmlFor="time" className="text-xs">时间</Label>
                        <Input
                          id="time"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(formData.schedule_type === 'daily' || formData.schedule_type === 'weekly') && (
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <div>
                      <Label htmlFor="time">执行时间</Label>
                      <Input
                        id="time"
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
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
                              onClick={() => toggleWeekday(index)}
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
                  <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <Power className="w-4 h-4 inline mr-2" />
                      进程监控模式：当检测到实例进程停止时，将自动执行选择的动作（通常选择"启动"）
                    </p>
                  </div>
                )}

                {/* 按钮 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={handleCancel} variant="outline">
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                  >
                    {formMode === 'create' ? '创建' : '保存'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

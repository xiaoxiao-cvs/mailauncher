/**
 * 计划任务模态框
 * 用于管理实例的计划任务
 */
import React, { useState } from "react";
import { X, Plus, Clock, PlayCircle, StopCircle, RotateCw } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ModalRoot,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  TactileButton,
} from "@/components/ls";
import {
  useSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
} from "@/hooks/queries/useScheduleQueries";
import {
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
} from "@/services/scheduleApi";
import { ScheduleListView, ScheduleFormView } from "@/components/schedule";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
}

type FormMode = "create" | "edit" | "view";

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  instanceId,
}) => {
  const [formMode, setFormMode] = useState<FormMode>("view");
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<ScheduleCreate>({
    instance_id: instanceId,
    name: "",
    action: "start",
    schedule_type: "once",
    schedule_config: {},
    enabled: true,
  });

  // 日期时间选择
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  // API hooks
  const {
    data: schedules = [],
    isLoading,
    refetch,
  } = useSchedulesQuery(instanceId);
  const createMutation = useCreateScheduleMutation();
  const updateMutation = useUpdateScheduleMutation();
  const deleteMutation = useDeleteScheduleMutation();
  const toggleMutation = useToggleScheduleMutation();

  // 重置表单
  const resetForm = () => {
    setFormData({
      instance_id: instanceId,
      name: "",
      action: "start",
      schedule_type: "once",
      schedule_config: {},
      enabled: true,
    });
    setSelectedDate(new Date());
    setSelectedTime("12:00");
    setSelectedWeekdays([]);
    setEditingSchedule(null);
  };

  // 切换到创建模式
  const handleCreate = () => {
    resetForm();
    setFormMode("create");
  };

  // 切换到编辑模式
  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      instance_id: schedule.instance_id,
      name: schedule.name,
      action: schedule.action,
      schedule_type: schedule.schedule_type,
      schedule_config: schedule.schedule_config,
      enabled: schedule.enabled,
    });

    // 恢复时间配置
    if (schedule.schedule_type === "once" && schedule.schedule_config.date) {
      const date = new Date(schedule.schedule_config.date);
      setSelectedDate(date);
      setSelectedTime(
        `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
      );
    } else if (
      schedule.schedule_type === "daily" ||
      schedule.schedule_type === "weekly"
    ) {
      setSelectedTime(
        `${(schedule.schedule_config.hour || 0).toString().padStart(2, "0")}:${(schedule.schedule_config.minute || 0).toString().padStart(2, "0")}`,
      );
      if (
        schedule.schedule_type === "weekly" &&
        schedule.schedule_config.weekdays
      ) {
        setSelectedWeekdays(schedule.schedule_config.weekdays);
      }
    }

    setFormMode("edit");
  };

  // 取消编辑
  const handleCancel = () => {
    resetForm();
    setFormMode("view");
  };

  // 提交表单
  const handleSubmit = async () => {
    // 构建 schedule_config
    const schedule_config: any = {};

    if (formData.schedule_type === "once") {
      if (!selectedDate) {
        toast.error("请选择日期");
        return;
      }
      const [hour, minute] = selectedTime.split(":").map(Number);
      const datetime = new Date(selectedDate);
      datetime.setHours(hour, minute, 0, 0);
      schedule_config.date = datetime.toISOString();
    } else if (formData.schedule_type === "daily") {
      const [hour, minute] = selectedTime.split(":").map(Number);
      schedule_config.hour = hour;
      schedule_config.minute = minute;
    } else if (formData.schedule_type === "weekly") {
      if (selectedWeekdays.length === 0) {
        toast.error("请至少选择一个星期几");
        return;
      }
      const [hour, minute] = selectedTime.split(":").map(Number);
      schedule_config.hour = hour;
      schedule_config.minute = minute;
      schedule_config.weekdays = selectedWeekdays;
    }

    const submitData = {
      ...formData,
      schedule_config,
    };

    try {
      if (formMode === "create") {
        await createMutation.mutateAsync(submitData);
      } else if (formMode === "edit" && editingSchedule) {
        const updateData: ScheduleUpdate = {
          name: submitData.name,
          action: submitData.action,
          schedule_type: submitData.schedule_type,
          schedule_config: submitData.schedule_config,
          enabled: submitData.enabled,
        };
        await updateMutation.mutateAsync({
          scheduleId: editingSchedule.id,
          data: updateData,
        });
      }

      handleCancel();
      refetch();
    } catch {
      // Error handled by mutation
    }
  };

  // 删除任务
  const handleDelete = async (scheduleId: string) => {
    if (confirm("确定要删除这个计划任务吗？")) {
      try {
        await deleteMutation.mutateAsync(scheduleId);
        refetch();
      } catch {
        // Error handled by mutation
      }
    }
  };

  // 切换启用状态
  const handleToggle = async (scheduleId: string, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ scheduleId, enabled });
      refetch();
    } catch {
      // Error handled by mutation
    }
  };

  // 切换星期几
  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const actionIcons = {
    start: <PlayCircle className="w-4 h-4" />,
    stop: <StopCircle className="w-4 h-4" />,
    restart: <RotateCw className="w-4 h-4" />,
  };

  // 动作 -> 语义色值(CSS var token):启动=生命色、停止=危险色、重启=次墨中性。
  // 生息无蓝色,且 restart 非破坏性,用中性墨而非原蓝。子视图经 style 应用。
  const actionColors = {
    start: "var(--ls-life)",
    stop: "var(--ls-danger)",
    restart: "var(--ls-ink-soft)",
  };

  return (
    <ModalRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <ModalPortal forceMount>
            <ModalOverlay />
            <ModalContent className="flex h-[75vh] max-w-3xl flex-col overflow-hidden p-0">
              {/* Header */}
              <div
                className="flex h-16 shrink-0 items-center justify-between border-b px-6"
                style={{ borderColor: "var(--ls-hairline)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--ls-surface-hi)",
                      boxShadow: "var(--ls-shadow-soft)",
                      color: "var(--ls-life)",
                    }}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      计划任务管理
                    </h2>
                    <p
                      className="text-xs"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      定时执行实例操作
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {formMode === "view" && (
                    <TactileButton variant="solid" onClick={handleCreate}>
                      <Plus className="h-4 w-4" />
                      新建任务
                    </TactileButton>
                  )}
                  <button
                    onClick={onClose}
                    className="ls-item rounded-full p-2"
                    style={{ color: "var(--ls-ink-soft)" }}
                    aria-label="关闭"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {formMode === "view" ? (
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
                    isPending={
                      createMutation.isPending || updateMutation.isPending
                    }
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
            </ModalContent>
          </ModalPortal>
        )}
      </AnimatePresence>
    </ModalRoot>
  );
};

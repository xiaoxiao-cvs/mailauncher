import React from "react";
import { Power } from "lucide-react";
import { motion } from "motion/react";
import { Input, Label, TactileButton } from "@/components/ls";
import { Calendar } from "@/components/ui/calendar";
import { springTap } from "@/design/motion";
import {
  ScheduleCreate,
  ScheduleAction,
  ScheduleType,
} from "@/services/scheduleApi";

type FormMode = "create" | "edit";

interface ScheduleFormViewProps {
  formMode: FormMode;
  formData: ScheduleCreate;
  selectedDate: Date | undefined;
  selectedTime: string;
  selectedWeekdays: number[];
  actionIcons: Record<ScheduleAction, React.ReactNode>;
  /** 动作 -> 语义色值(CSS var token 字符串),经 style 应用,随明暗自适配 */
  actionColors: Record<ScheduleAction, string>;
  isPending: boolean;
  onFormDataChange: (data: ScheduleCreate) => void;
  onSelectedDateChange: (date: Date | undefined) => void;
  onSelectedTimeChange: (time: string) => void;
  onToggleWeekday: (day: number) => void;
  onResetWeekdays: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const weekdayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const actionLabels: Record<ScheduleAction, string> = {
  start: "启动",
  stop: "停止",
  restart: "重启",
};

const scheduleTypeMeta: Record<ScheduleType, { title: string; desc: string }> =
  {
    once: { title: "单次执行", desc: "指定时间执行一次" },
    daily: { title: "每天执行", desc: "每天固定时间" },
    weekly: { title: "每周执行", desc: "每周特定日期" },
    monitor: { title: "进程监控", desc: "停止时自动启动" },
  };

/** 嵌入式凹陷格统一样式(替代裸 border + rounded-card) */
const insetTile: React.CSSProperties = {
  background: "var(--ls-bg-2)",
  border: "1px solid var(--ls-hairline)",
  borderRadius: "var(--ls-r-card)",
};

/** 可选瓦片:选中时套生命色发丝边 + 低浓度生命底,未选时凹陷面 */
function tileStyle(selected: boolean): React.CSSProperties {
  return {
    border: `1px solid ${selected ? "var(--ls-life)" : "var(--ls-hairline)"}`,
    borderRadius: "var(--ls-r-card)",
    background: selected ? "var(--ls-life-soft)" : "var(--ls-bg-2)",
  };
}

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
          onChange={(e) =>
            onFormDataChange({ ...formData, name: e.target.value })
          }
          placeholder="例如:每日自动重启"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>执行动作</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["start", "stop", "restart"] as ScheduleAction[]).map((action) => (
            <motion.button
              key={action}
              type="button"
              onClick={() => onFormDataChange({ ...formData, action })}
              className="p-3 text-left"
              style={tileStyle(formData.action === action)}
              whileTap={{ scale: 0.97 }}
              transition={springTap}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: actionColors[action] }}>
                  {actionIcons[action]}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {actionLabels[action]}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <Label>触发条件</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["once", "daily", "weekly", "monitor"] as ScheduleType[]).map(
            (type) => (
              <motion.button
                key={type}
                type="button"
                onClick={() => {
                  onFormDataChange({ ...formData, schedule_type: type });
                  if (type === "weekly") onResetWeekdays();
                }}
                className="p-3 text-left"
                style={tileStyle(formData.schedule_type === type)}
                whileTap={{ scale: 0.97 }}
                transition={springTap}
              >
                <div
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--ls-ink)" }}
                >
                  {scheduleTypeMeta[type].title}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {scheduleTypeMeta[type].desc}
                </div>
              </motion.button>
            ),
          )}
        </div>
      </div>

      {formData.schedule_type === "once" && (
        <div className="p-4" style={insetTile}>
          <Label className="mb-2 block">选择日期和时间</Label>
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onSelectedDateChange}
              className="mx-auto p-3"
              style={insetTile}
            />
            <div>
              <Label htmlFor="time">时间</Label>
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

      {(formData.schedule_type === "daily" ||
        formData.schedule_type === "weekly") && (
        <div className="space-y-3 p-4" style={insetTile}>
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

          {formData.schedule_type === "weekly" && (
            <div>
              <Label>选择星期几</Label>
              <div className="mt-1.5 grid grid-cols-7 gap-2">
                {weekdayNames.map((name, index) => {
                  const active = selectedWeekdays.includes(index);
                  return (
                    <motion.button
                      key={index}
                      type="button"
                      onClick={() => onToggleWeekday(index)}
                      className="py-2 text-xs font-medium"
                      style={{
                        borderRadius: "var(--ls-r-control)",
                        background: active
                          ? "var(--ls-life)"
                          : "var(--ls-surface-hi)",
                        color: active ? "#fff" : "var(--ls-ink-soft)",
                        border: "1px solid var(--ls-hairline)",
                        boxShadow: active ? "var(--ls-shadow-soft)" : "none",
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={springTap}
                    >
                      {name}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {formData.schedule_type === "monitor" && (
        <div
          className="p-4"
          style={{
            border:
              "1px solid color-mix(in srgb, var(--ls-warn) 40%, transparent)",
            borderRadius: "var(--ls-r-card)",
            background: "color-mix(in srgb, var(--ls-warn) 12%, transparent)",
          }}
        >
          <p
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--ls-warn)" }}
          >
            <Power className="h-4 w-4 shrink-0" />
            进程监控模式:当检测到实例进程停止时,将自动执行选择的动作(通常选择「启动」)
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <TactileButton variant="ghost" onClick={onCancel}>
          取消
        </TactileButton>
        <TactileButton
          variant="solid"
          onClick={onSubmit}
          disabled={!formData.name || isPending}
          style={
            !formData.name || isPending
              ? { opacity: 0.5, cursor: "not-allowed" }
              : undefined
          }
        >
          {formMode === "create" ? "创建" : "保存"}
        </TactileButton>
      </div>
    </div>
  );
};

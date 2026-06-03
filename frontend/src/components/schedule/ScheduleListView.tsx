import React from "react";
import { Clock, Edit2, Trash2 } from "lucide-react";
import { TactileButton, Switch, Badge } from "@/components/ls";
import { Schedule, ScheduleAction, ScheduleType } from "@/services/scheduleApi";

interface ScheduleListViewProps {
  schedules: Schedule[];
  isLoading: boolean;
  actionIcons: Record<ScheduleAction, React.ReactNode>;
  /** 动作 -> 语义色值(CSS var token 字符串),经 style 应用,随明暗自适配 */
  actionColors: Record<ScheduleAction, string>;
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
  onToggle: (scheduleId: string, enabled: boolean) => void;
}

const scheduleTypeLabel: Record<ScheduleType, string> = {
  once: "单次",
  daily: "每天",
  weekly: "每周",
  monitor: "监控",
};

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
        <div
          className="py-12 text-center text-sm"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          加载中...
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-12 text-center">
          <Clock
            className="mx-auto mb-3 h-12 w-12"
            style={{ color: "var(--ls-ink-faint)" }}
          />
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            暂无计划任务
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-faint)" }}>
            点击「新建任务」创建第一个计划任务
          </p>
        </div>
      ) : (
        schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="ls-item p-4"
            style={{
              border: "1px solid var(--ls-hairline)",
              borderRadius: "var(--ls-r-card)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span style={{ color: actionColors[schedule.action] }}>
                    {actionIcons[schedule.action]}
                  </span>
                  <h3
                    className="truncate font-semibold"
                    style={{ color: "var(--ls-ink)" }}
                  >
                    {schedule.name}
                  </h3>
                  <Badge tone="neutral">
                    {scheduleTypeLabel[schedule.schedule_type]}
                  </Badge>
                </div>

                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--ls-ink-soft)" }}
                >
                  {schedule.next_run && (
                    <div>
                      下次执行:{" "}
                      <span className="ls-num">
                        {new Date(schedule.next_run).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  )}
                  {schedule.last_run && (
                    <div>
                      上次执行:{" "}
                      <span className="ls-num">
                        {new Date(schedule.last_run).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={schedule.enabled}
                  onCheckedChange={(checked) => onToggle(schedule.id, checked)}
                />
                <TactileButton
                  variant="ghost"
                  onClick={() => onEdit(schedule)}
                  className="h-8 w-8 justify-center px-0"
                  aria-label="编辑"
                >
                  <Edit2 className="h-4 w-4" />
                </TactileButton>
                <TactileButton
                  variant="ghost"
                  onClick={() => onDelete(schedule.id)}
                  className="h-8 w-8 justify-center px-0"
                  style={{ color: "var(--ls-danger)" }}
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </TactileButton>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

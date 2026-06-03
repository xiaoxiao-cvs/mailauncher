import { motion } from "motion/react";
import { BotIcon, CheckCircle2Icon } from "lucide-react";
import { StatusDot } from "@/components/ls";
import { springTap } from "@/design/motion";
import type { OnboardingStep } from "@/types/onboarding";

interface OnboardingSidebarProps {
  steps: OnboardingStep[];
  currentStep: number;
  maxReachedStep: number;
  isAnimating: boolean;
  onStepClick: (index: number) => void;
}

/**
 * 引导页侧边栏组件
 * 职责：展示步骤列表和 Logo
 */
export function OnboardingSidebar({
  steps,
  currentStep,
  maxReachedStep,
  isAnimating,
  onStepClick,
}: OnboardingSidebarProps) {
  return (
    <div className="h-full flex flex-col p-4">
      {/* Logo 区域 */}
      <div className="flex items-center gap-3 px-3 py-6 mb-2 select-none">
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{
            borderRadius: 8,
            background: "var(--ls-surface-hi)",
            border: "1px solid var(--ls-hairline)",
            boxShadow: "var(--ls-shadow-soft)",
            color: "var(--ls-ink)",
          }}
        >
          <BotIcon className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-[15px] font-semibold tracking-tight leading-none"
            style={{ color: "var(--ls-ink)" }}
          >
            MAI Launcher
          </h1>
          <p
            className="text-[11px] mt-0.5 font-medium"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            Setup Guide
          </p>
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-none px-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isAccessible = index <= maxReachedStep;

          return (
            <motion.button
              key={step.id}
              onClick={() => onStepClick(index)}
              disabled={isAnimating || !isAccessible}
              whileTap={isAccessible ? { scale: 0.98 } : undefined}
              transition={springTap}
              className="w-full text-left px-4 py-3 flex items-center gap-3.5 select-none outline-none"
              style={{
                borderRadius: "var(--ls-r-card)",
                background: isCurrent ? "var(--ls-surface-hi)" : "transparent",
                border: `1px solid ${isCurrent ? "var(--ls-hairline)" : "transparent"}`,
                boxShadow: isCurrent ? "var(--ls-shadow-soft)" : "none",
                color: isCurrent ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                fontWeight: isCurrent ? 500 : 400,
                opacity: isAccessible ? 1 : 0.5,
                cursor: isAccessible ? "pointer" : "not-allowed",
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  color: isCurrent
                    ? "var(--ls-ink)"
                    : isCompleted
                      ? "var(--ls-life)"
                      : "var(--ls-ink-faint)",
                }}
              >
                {isCompleted ? (
                  <CheckCircle2Icon className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="scale-75 transform origin-center">
                      {step.icon}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[13px] truncate flex-1">{step.title}</span>

              {/* 当前步骤标记:生息运行点(无循环呼吸,刻意安静) */}
              {isCurrent && <StatusDot running />}
            </motion.button>
          );
        })}
      </div>

      {/* 底部版本号或其他信息 */}
      <div
        className="px-3 py-4 mt-auto"
        style={{ borderTop: "1px solid var(--ls-hairline)" }}
      >
        <p
          className="text-[10px] text-center font-medium"
          style={{ color: "var(--ls-ink-soft)" }}
        >
          MAI Launcher
        </p>
      </div>
    </div>
  );
}

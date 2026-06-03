import { RefObject } from "react";
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import { Surface, TactileButton } from "@/components/ls";
import type { OnboardingStep } from "@/types/onboarding";

interface OnboardingContentProps {
  steps: OnboardingStep[];
  currentStep: number;
  currentStepData: OnboardingStep;
  isAnimating: boolean;
  contentRef: RefObject<HTMLDivElement>;
  onNext: () => void;
  onPrevious: () => void;
  canProceed?: boolean;
  buttonLabel?: string | null;
}

/**
 * 引导页内容区组件
 * 职责：展示当前步骤的详细内容和操作按钮
 *
 * 注意:本组件内的 data-animate 标记与 title 容器内的 <h2> 是 useOnboardingAnimation
 * 逐层交错入场 + 逐字标题揭示的 DOM 契约,迁移时保留不动,仅替换观感。
 */
export function OnboardingContent({
  steps,
  currentStep,
  currentStepData,
  isAnimating,
  contentRef,
  onNext,
  onPrevious,
  canProceed = true,
  buttonLabel = null,
}: OnboardingContentProps) {
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16 overflow-hidden">
      {/* 内容区域 - 包含移动端指示器以确保动画一致 */}
      <div ref={contentRef} className="flex flex-col w-full flex-1 min-h-0">
        {/* 移动端步骤指示器 */}
        <div className="md:hidden flex justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentStep ? "w-8" : "w-2"
              }`}
              style={{
                background:
                  index === currentStep
                    ? "var(--ls-life)"
                    : index < currentStep
                      ? "var(--ls-life-soft)"
                      : "var(--ls-hairline)",
              }}
            />
          ))}
        </div>

        {/* 标题区域 */}
        <div className="mb-8 sm:mb-10 text-center md:text-left flex-shrink-0">
          <p
            data-animate="step-label"
            className="ls-num text-[13px] font-semibold mb-4 tracking-wide uppercase"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            Step {currentStep + 1} of {steps.length}
          </p>
          <div data-animate="title">
            <h2
              className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight leading-tight"
              style={{ color: "var(--ls-ink)" }}
            >
              {currentStepData.title}
            </h2>
          </div>
          <p
            data-animate="subtitle"
            className="text-xl font-normal leading-relaxed max-w-xl"
            style={{ color: "var(--ls-ink-soft)" }}
          >
            {currentStepData.subtitle}
          </p>
        </div>

        {/* 内容区域 - 直接渲染步骤组件 */}
        <div
          data-animate="content"
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin min-h-0 mb-6"
        >
          <div className="pr-2">
            {currentStepData.component ? (
              /* 直接渲染步骤组件 */
              currentStepData.component
            ) : currentStepData.description.length > 0 ? (
              /* 特性列表（向后兼容） */
              <div className="space-y-4">
                {currentStepData.description.map((item, index) => (
                  <Surface
                    key={index}
                    variant="inset"
                    className="ls-item flex items-start gap-4 p-5"
                  >
                    <div
                      className="ls-num w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5"
                      style={{
                        background: "var(--ls-life-soft)",
                        color: "var(--ls-life)",
                      }}
                    >
                      {index + 1}
                    </div>
                    <p
                      className="leading-relaxed text-[16px]"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      {item}
                    </p>
                  </Surface>
                ))}
              </div>
            ) : (
              /* 空状态 */
              <div
                className="flex items-center justify-center h-full"
                style={{ color: "var(--ls-ink-faint)" }}
              >
                <p>暂无内容</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div
          data-animate="buttons"
          className="flex items-center justify-between gap-4 pt-6 flex-shrink-0"
          style={{ borderTop: "1px solid var(--ls-hairline)" }}
        >
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <TactileButton
                variant="ghost"
                onClick={onPrevious}
                disabled={isAnimating}
                className="px-6 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: "9999px", borderColor: "transparent" }}
              >
                上一步
              </TactileButton>
            )}
          </div>

          <TactileButton
            variant="life"
            onClick={onNext}
            disabled={isAnimating || !canProceed}
            {...(isLastStep ? { "data-complete-btn": "" } : {})}
            className="px-8 h-12 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: "9999px" }}
          >
            {buttonLabel ? (
              <>{buttonLabel}</>
            ) : isLastStep ? (
              <>
                开始使用
                <CheckCircle2Icon className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                继续
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </>
            )}
          </TactileButton>
        </div>
      </div>
    </div>
  );
}

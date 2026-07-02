import { useState, useEffect, useCallback, useRef } from "react";
import { Surface, TactileButton } from "@/components/ls";
import { OnboardingSidebar } from "./OnboardingSidebar";
import { OnboardingContent } from "./OnboardingContent";
import { useOnboardingAnimation } from "@/hooks/useOnboardingAnimation";
import { useConfetti } from "@/hooks/useConfetti";
import { ONBOARDING_STEPS } from "./constants";
import { EulaContext } from "./EulaContext";
import { routerLogger } from "@/utils/logger";
import type { OnboardingCallbacks } from "@/types/onboarding";

/**
 * 引导页主组件
 * 职责：协调各个子组件，管理引导流程状态
 */
export function OnboardingPage({
  onComplete,
  onSkip,
}: OnboardingCallbacks = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  // 记录用户曾经到达过的最远步骤
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  // EULA 步骤的 canProceed 控制
  const [canProceed, setCanProceed] = useState(true);
  const [buttonLabel, setButtonLabel] = useState<string | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const { contentRef, isAnimating, animateTransition } =
    useOnboardingAnimation();
  const { triggerConfetti } = useConfetti(windowRef);

  // 稳定的回调引用
  const handleCanProceedChange = useCallback(
    (v: boolean) => setCanProceed(v),
    [],
  );
  const handleButtonLabelChange = useCallback(
    (v: string | null) => setButtonLabel(v),
    [],
  );

  // 切换步骤时重置 canProceed（EULA 步骤、环境检测步骤自行通过 EulaContext 上报真实状态，
  // 这里不强制覆盖为 true，避免检测结果出来前出现"下一步"可点的空档）
  useEffect(() => {
    const step = ONBOARDING_STEPS[currentStep];
    if (currentStep !== 0 && !step?.isEnvironmentStep) {
      setCanProceed(true);
      setButtonLabel(null);
    }
  }, [currentStep]);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (isAnimating) return;

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      animateTransition(() => {
        setCurrentStep(nextStep);
        // 更新最远到达步骤
        setMaxReachedStep(Math.max(maxReachedStep, nextStep));
      }, "next");
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (isAnimating || currentStep === 0) return;
    animateTransition(() => setCurrentStep(currentStep - 1), "prev");
  };

  const handleStepClick = (index: number) => {
    // 只允许返回到之前到达过的步骤，不允许跳过未到达的步骤
    if (!isAnimating && index !== currentStep && index <= maxReachedStep) {
      const direction = index > currentStep ? "next" : "prev";
      animateTransition(() => setCurrentStep(index), direction);
    }
  };

  const handleSkip = () => {
    animateTransition(() => {
      onSkip?.();
    }, "next");
  };

  const handleComplete = async () => {
    const btn = document.querySelector<HTMLElement>("[data-complete-btn]");
    if (btn) {
      await triggerConfetti(btn);
    }
    routerLogger.success("引导完成！");
    onComplete?.();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-12 overflow-hidden relative font-sans"
      style={
        {
          background: "var(--ls-bg)",
          // --step-color 由步骤数据透传(数据流保留);生息观感不再消费此蓝色强调
          ["--step-color" as string]: currentStepData.color,
        } as React.CSSProperties
      }
    >
      {/* 主窗口容器:生息面板(实色面 + 发丝边 + lift 浮起影 + 顶高光) */}
      <Surface
        variant="panel"
        ref={windowRef}
        className="relative w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[72vw] max-w-[1100px] h-[82vh] min-h-[580px] max-h-[760px] z-10 flex overflow-hidden"
        style={{ boxShadow: "var(--ls-shadow-lift)" }}
      >
        {/* 左侧：侧边栏 */}
        <div
          className="hidden md:flex w-[220px] lg:w-[240px] flex-shrink-0 flex-col"
          style={{
            borderRight: "1px solid var(--ls-hairline)",
            background: "var(--ls-bg-2)",
          }}
        >
          <OnboardingSidebar
            steps={ONBOARDING_STEPS}
            currentStep={currentStep}
            maxReachedStep={maxReachedStep}
            isAnimating={isAnimating}
            onStepClick={handleStepClick}
          />
        </div>

        {/* 右侧：内容展示区 */}
        <div className="flex-1 relative flex flex-col min-w-0">
          <EulaContext.Provider
            value={{
              onCanProceedChange: handleCanProceedChange,
              onButtonLabelChange: handleButtonLabelChange,
            }}
          >
            <OnboardingContent
              steps={ONBOARDING_STEPS}
              currentStep={currentStep}
              currentStepData={currentStepData}
              isAnimating={isAnimating}
              contentRef={contentRef}
              onNext={handleNext}
              onPrevious={handlePrevious}
              canProceed={canProceed}
              buttonLabel={buttonLabel}
            />
          </EulaContext.Provider>
        </div>
      </Surface>

      {/* 跳过按钮 - EULA 步骤不允许跳过 */}
      {currentStep > 0 && (
        <div className="absolute bottom-8 left-8 hidden md:block">
          <TactileButton
            variant="ghost"
            onClick={handleSkip}
            disabled={isAnimating}
            style={{ borderColor: "transparent" }}
          >
            跳过引导，直接开始
          </TactileButton>
        </div>
      )}
    </div>
  );
}

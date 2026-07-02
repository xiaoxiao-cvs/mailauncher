import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Surface, TactileButton } from "@/components/ls";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * 引导重置区:清除 onboarding_completed 标记并把应用带回引导流程。
 *
 * 用途:用户想要重走一遍引导（例如切到新的部署路径/Python 环境后想重新走一次
 * 环境检测），此前只能靠开发者控制台的 test1() 才能触发，普通用户无从下手。
 */
export function OnboardingResetSection() {
  const { reset } = useOnboardingState();
  const confirm = useConfirm();

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "重置引导流程",
      description:
        "确定要重新开始引导流程吗？应用将跳转到引导页，需要重新走一遍环境检测等步骤。",
      confirmText: "重新引导",
    });
    if (!confirmed) return;

    toast.info("即将重新进入引导流程...");
    reset();
  };

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
          style={{ background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" }}
        >
          <RotateCcw size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">重置引导流程</h3>
          <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
            清除引导完成标记，下次进入将重新走一遍用户协议、环境检测等步骤
          </p>
        </div>
      </div>
      <TactileButton
        variant="ghost"
        onClick={handleReset}
        className="inline-flex items-center gap-2"
        style={{ color: "var(--ls-danger)" }}
      >
        <RotateCcw size={16} />
        重新运行引导
      </TactileButton>
    </Surface>
  );
}

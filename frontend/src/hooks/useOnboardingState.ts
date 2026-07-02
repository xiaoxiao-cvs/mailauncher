import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useOnboardingState() {
  const navigate = useNavigate();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("onboarding_completed");
    if (completed === "true") {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const complete = () => {
    localStorage.setItem("onboarding_completed", "true");
    setHasCompletedOnboarding(true);
    navigate("/home");
  };

  const skip = () => {
    localStorage.setItem("onboarding_completed", "true");
    setHasCompletedOnboarding(true);
    navigate("/home");
  };

  // 清除引导完成标记并重新触发引导流程。用整页跳转（而非 React Router 导航），
  // 是为了让引导页依赖的各步骤本地状态（如 EULA 滚动进度、环境检测缓存）在
  // 重新进入时都是干净的初始状态，与 App.tsx 里 dev 用的 test1() 保持同一套路径。
  const reset = () => {
    localStorage.removeItem("onboarding_completed");
    setHasCompletedOnboarding(false);
    window.location.assign("/onboarding");
  };

  return { hasCompletedOnboarding, complete, skip, reset };
}

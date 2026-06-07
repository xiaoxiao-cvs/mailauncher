import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { OnboardingPage } from "@/components/onboarding";
import { HomePage } from "@/pages/HomePage";
import { InstancesPage } from "@/pages/InstancesPage";
import { InstanceDetailPageWrapper } from "@/pages/InstanceDetailPageWrapper";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import InstallProgressPage from "@/pages/InstallProgressPage";
import { InstallTaskProvider } from "@/contexts/InstallTaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GlobalWebSocketManager } from "@/components/GlobalWebSocketManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/layouts/MainLayout";
import logger, { routerLogger } from "@/utils/logger";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { startMetrics } from "@/services/metrics/timeSeriesStore";
import "./App.css";

/**
 * 路由组件 - 处理引导流程和主页跳转
 */
function AppRoutes() {
  const navigate = useNavigate();
  const { hasCompletedOnboarding, complete, skip } = useOnboardingState();

  // 开发环境:在控制台添加 test1() 命令用于跳转到引导页
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).test1 = () => {
        routerLogger.info("清除引导标记,跳转到引导页...");
        localStorage.removeItem("onboarding_completed");
        // 直接刷新页面，让应用重新加载并进入引导页
        window.location.href = "/onboarding";
      };
      logger.info("开发提示:在控制台执行 test1() 可以跳转到引导页");
    }

    return () => {
      if (import.meta.env.DEV) {
        delete (window as any).test1;
      }
    };
  }, [navigate]);

  const handleOnboardingComplete = () => {
    routerLogger.success("引导完成！");
    complete();
  };

  const handleOnboardingSkip = () => {
    routerLogger.info("跳过引导！");
    skip();
  };

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <OnboardingPage
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
        }
      />

      <Route path="/install-progress" element={<InstallProgressPage />} />

      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/instances" element={<InstancesPage />} />
        <Route path="/instances/:id" element={<InstanceDetailPageWrapper />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to={hasCompletedOnboarding ? "/home" : "/onboarding"}
            replace
          />
        }
      />
    </Routes>
  );
}

/**
 * 应用主组件
 * 职责：路由管理和组件组合
 */
function App() {
  // 应用挂载即启动全局指标累积(CPU/内存/磁盘/网络/负载),跨页面常驻(切到别的页面也持续监测)。
  useEffect(() => {
    startMetrics();
  }, []);

  return (
    // 不跟随系统"减少动态效果"——本启动器以用户明确诉求(要丝滑动画)为准,招牌容器形变/网格重排
    // 始终播放(此前 reducedMotion="user" 会在系统关动画时把动画判没、变瞬切)。日后如需尊重系统
    // 可做成应用内开关。
    <Router>
      <NotificationProvider>
        <InstallTaskProvider>
          {/* 全局 WebSocket 管理器 - 在任何页面都保持连接 */}
          <GlobalWebSocketManager />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </InstallTaskProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;

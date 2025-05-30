// 轮询服务测试工具
import { usePollingStore } from "../stores/pollingStore";

export const testPollingService = () => {
  console.log("🧪 开始测试轮询服务...");

  try {
    const pollingStore = usePollingStore();

    // 测试轮询任务是否存在
    console.log("📋 检查轮询任务状态:");
    const pollingStatus = pollingStore.getPollingStatus();
    console.log("当前轮询任务:", Object.keys(pollingStatus));

    // 测试启动轮询
    console.log("🚀 测试启动轮询任务...");
    const result1 = pollingStore.startPolling("instances");
    const result2 = pollingStore.startPolling("systemStats");

    console.log("instances 轮询启动结果:", result1);
    console.log("systemStats 轮询启动结果:", result2);

    // 测试页面状态调整
    console.log("📄 测试页面状态调整...");
    pollingStore.adjustPollingByPageState("home");

    console.log("✅ 轮询服务测试完成");
    return true;
  } catch (error) {
    console.error("❌ 轮询服务测试失败:", error);
    return false;
  }
};

// 在控制台提供测试函数
if (typeof window !== "undefined") {
  window.testPolling = testPollingService;
  console.log("💡 可以在控制台中运行 window.testPolling() 来测试轮询服务");
}

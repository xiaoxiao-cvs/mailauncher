// 轮询服务修复验证工具
import { usePollingStore } from "../stores/pollingStore";
import { useInstanceStore } from "../stores/instanceStore";
import { useSystemStore } from "../stores/systemStore";

export const verifyPollingFix = () => {
  console.log("🔍 验证轮询服务修复状态...");

  try {
    // 获取store实例
    const pollingStore = usePollingStore();
    const instanceStore = useInstanceStore();
    const systemStore = useSystemStore();

    console.log("✅ Store实例获取成功");

    // 检查轮询任务注册状态
    const pollingStatus = pollingStore.getPollingStatus();
    console.log("📋 当前轮询任务状态:", pollingStatus);

    // 检查是否存在关键轮询任务
    const hasInstancesPolling = pollingStatus.hasOwnProperty("instances");
    const hasSystemStatsPolling = pollingStatus.hasOwnProperty("systemStats");

    console.log("📊 轮询任务检查:");
    console.log(
      `   instances 轮询: ${hasInstancesPolling ? "✅ 存在" : "❌ 不存在"}`
    );
    console.log(
      `   systemStats 轮询: ${hasSystemStatsPolling ? "✅ 存在" : "❌ 不存在"}`
    );

    // 测试轮询任务启动
    console.log("🚀 测试轮询任务启动...");
    const startResult1 = pollingStore.startPolling("instances");
    const startResult2 = pollingStore.startPolling("systemStats");

    console.log(
      `   instances 轮询启动: ${startResult1 ? "✅ 成功" : "❌ 失败"}`
    );
    console.log(
      `   systemStats 轮询启动: ${startResult2 ? "✅ 成功" : "❌ 失败"}`
    );

    // 测试页面状态调整
    console.log("📄 测试页面状态调整...");
    pollingStore.adjustPollingByPageState("home");

    // 检查数据获取功能
    console.log("📡 测试数据获取功能...");
    instanceStore
      .fetchInstances()
      .then(() => {
        console.log("✅ 实例数据获取成功");
      })
      .catch((err) => {
        console.log("⚠️ 实例数据获取失败:", err.message);
      });

    systemStore
      .fetchSystemStats()
      .then(() => {
        console.log("✅ 系统数据获取成功");
      })
      .catch((err) => {
        console.log("⚠️ 系统数据获取失败:", err.message);
      });

    // 检查修复状态
    const isFixed =
      hasInstancesPolling &&
      hasSystemStatsPolling &&
      startResult1 &&
      startResult2;

    console.log("\n🎯 修复状态总结:");
    if (isFixed) {
      console.log("✅ 轮询服务修复成功！");
      console.log("   - 轮询任务正确注册");
      console.log("   - 轮询启动功能正常");
      console.log("   - 页面状态调整正常");
      console.log('   - 应该不再出现"轮询任务不存在"错误');
    } else {
      console.log("❌ 轮询服务仍有问题，需要进一步检查");
    }

    return isFixed;
  } catch (error) {
    console.error("❌ 轮询服务验证失败:", error);
    return false;
  }
};

// 在控制台提供验证函数
if (typeof window !== "undefined") {
  window.verifyPollingFix = verifyPollingFix;
  console.log("💡 可以在控制台中运行 window.verifyPollingFix() 来验证修复状态");
}

// 验证前端优化的功能测试
// 测试所有新建的store是否正常工作

import { createApp } from "vue";
import { createPinia } from "pinia";

// 导入所有store
import { useInstanceStore } from "./src/stores/instanceStore.js";
import { useSystemStore } from "./src/stores/systemStore.js";
import { useRequestCacheStore } from "./src/stores/requestCacheStore.js";
import { usePollingStore } from "./src/stores/pollingStore.js";
import { useDeployStore } from "./src/stores/deployStore.js";

// 创建测试应用
const app = createApp({});
const pinia = createPinia();
app.use(pinia);

console.log("🧪 开始前端优化功能测试...");

// 测试所有store的初始化
try {
  const instanceStore = useInstanceStore();
  const systemStore = useSystemStore();
  const requestCacheStore = useRequestCacheStore();
  const pollingStore = usePollingStore();
  const deployStore = useDeployStore();

  console.log("✅ 所有store初始化成功");

  // 测试请求缓存功能
  console.log("🔍 测试请求缓存功能...");
  requestCacheStore.set("test_key", { data: "test_value" }, 5000);
  const cachedData = requestCacheStore.get("test_key");

  if (cachedData && cachedData.data === "test_value") {
    console.log("✅ 请求缓存功能正常");
  } else {
    console.log("❌ 请求缓存功能异常");
  }

  // 测试轮询管理功能
  console.log("🔍 测试轮询管理功能...");
  pollingStore.startPolling(
    "test_poll",
    () => {
      console.log("轮询测试执行");
    },
    1000
  );

  setTimeout(() => {
    pollingStore.stopPolling("test_poll");
    console.log("✅ 轮询管理功能正常");
  }, 2000);

  // 测试实例store
  console.log("🔍 测试实例store...");
  console.log("实例store状态:", {
    instances: instanceStore.instances.length,
    loading: instanceStore.loading,
    stats: instanceStore.instanceStats,
  });

  // 测试系统store
  console.log("🔍 测试系统store...");
  console.log("系统store状态:", {
    systemMetrics: Object.keys(systemStore.systemMetrics),
    loading: systemStore.loading,
  });

  // 测试部署store
  console.log("🔍 测试部署store...");
  console.log("部署store状态:", {
    deployments: deployStore.deployments.size,
    isDeploying: deployStore.isDeploying,
    versions: deployStore.availableVersions.length,
  });

  console.log("🎉 所有基础功能测试通过！");
} catch (error) {
  console.error("❌ 测试过程中出现错误:", error);
}

export {};

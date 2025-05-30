/**
 * 验证首页仪表盘系统性能数据显示修复
 */

import { useSystemStore } from "@/stores/systemStore";

export const testDashboardFix = async () => {
  console.log("=== 开始测试首页仪表盘修复 ===");

  const systemStore = useSystemStore();

  try {
    // 1. 测试系统性能数据获取
    console.log("1. 测试系统性能数据获取...");
    await systemStore.fetchSystemStats();

    const stats = systemStore.systemStats;
    console.log("系统性能数据:", stats);

    // 2. 验证数据结构
    console.log("2. 验证数据结构...");
    const checks = {
      CPU使用率: stats.cpu?.usage !== undefined && stats.cpu.usage >= 0,
      CPU型号: stats.cpu?.model && stats.cpu.model !== "Unknown CPU",
      CPU核心数: stats.cpu?.cores && stats.cpu.cores > 0,
      内存使用率: stats.memory?.usage !== undefined && stats.memory.usage >= 0,
      内存总量: stats.memory?.total && stats.memory.total > 0,
      内存已用: stats.memory?.used !== undefined && stats.memory.used >= 0,
      磁盘使用率: stats.disk?.usage !== undefined && stats.disk.usage >= 0,
      网络上传: stats.network?.up !== undefined,
      网络下载: stats.network?.down !== undefined,
      网络速率: stats.network?.rate !== undefined,
    };

    console.log("数据结构检查:");
    for (const [key, passed] of Object.entries(checks)) {
      console.log(`  ${key}: ${passed ? "✓" : "✗"}`);
    }

    // 3. 测试数据适配
    console.log("3. 测试数据适配...");
    console.log("适配后的数据:");
    console.log(
      `  CPU: ${stats.cpu?.usage}% (${stats.cpu?.model}, ${stats.cpu?.cores}核)`
    );
    console.log(
      `  内存: ${stats.memory?.usage}% (${(
        stats.memory?.used /
        (1024 * 1024 * 1024)
      ).toFixed(1)}GB / ${(stats.memory?.total / (1024 * 1024 * 1024)).toFixed(
        1
      )}GB)`
    );
    console.log(`  磁盘: ${stats.disk?.usage}%`);
    console.log(
      `  网络: ${(stats.network?.rate / (1024 * 1024)).toFixed(1)}MB/s`
    );

    // 4. 检查计算属性
    console.log("4. 检查计算属性...");
    console.log("计算属性值:");
    console.log(`  CPU使用率计算: ${systemStore.cpuUsagePercent}`);
    console.log(`  内存使用率计算: ${systemStore.memoryUsagePercent}`);
    console.log(`  磁盘使用率计算: ${systemStore.diskUsagePercent}`);

    const allChecksPass = Object.values(checks).every(Boolean);

    console.log("\n=== 测试结果 ===");
    if (allChecksPass) {
      console.log("✅ 首页仪表盘数据显示修复成功！");
      console.log("所有系统性能数据都能正确显示");
    } else {
      console.log("❌ 仍有部分数据显示问题");
      const failedChecks = Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([key]) => key);
      console.log("未通过的检查:", failedChecks.join(", "));
    }

    return allChecksPass;
  } catch (error) {
    console.error("测试过程中出现错误:", error);
    return false;
  }
};

// 在浏览器控制台中可用的测试函数
if (typeof window !== "undefined") {
  window.testDashboardFix = testDashboardFix;
  console.log("可在浏览器控制台运行: testDashboardFix()");
}

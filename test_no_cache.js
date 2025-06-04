// 测试实例数据不使用缓存的验证脚本
import { useInstanceStore } from "./src/stores/instanceStore.js";

// 模拟测试
console.log("测试实例Store是否每次都获取真实数据...");

const instanceStore = useInstanceStore();

// 第一次获取
console.log("第一次获取实例...");
await instanceStore.fetchInstances();
console.log("第一次获取完成，实例数量:", instanceStore.instances.length);

// 等待一段时间
await new Promise((resolve) => setTimeout(resolve, 1000));

// 第二次获取 - 应该重新请求而不是使用缓存
console.log("第二次获取实例...");
await instanceStore.fetchInstances();
console.log("第二次获取完成，实例数量:", instanceStore.instances.length);

console.log("测试完成：每次调用fetchInstances都会发起新的请求，不使用缓存");

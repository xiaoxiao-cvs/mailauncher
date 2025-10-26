/**
 * API测试工具
 * 用于测试API请求的URL构建
 */
import apiService from "../services/apiService";
import { deployApi, instancesApi, systemApi } from "../services/api";
import backendConfig from "../config/backendConfig";

// 测试URL构建
const testUrlConstruction = () => {
  console.group("===== API URL 构建测试 =====");

  const useProxy = import.meta.env.VITE_USE_PROXY === "true";
  console.log(`当前模式: ${useProxy ? "使用代理" : "直接请求"}`);
  console.log(`后端URL: ${backendConfig.getBackendUrl()}`);
  console.log(`API前缀: ${backendConfig.getApiPrefix()}`);

  // 测试不同类型的路径
  const testPaths = [
    "/deploy/versions",
    "deploy/services",
    "/api/v1/instances",
    "api/v1/install-status",
  ];

  console.log("\n测试直接通过apiService发起请求:");
  testPaths.forEach((path) => {
    try {
      console.log(
        `路径 "${path}" => apiService.get 将发送请求到:`,
        `(模拟，未发送实际请求)`
      );
    } catch (err) {
      console.error(`错误: ${err.message}`);
    }
  });

  console.log("\n测试通过API模块发起请求:");
  console.log(
    "deployApi.getVersions() 将发送请求到:",
    "(模拟，未发送实际请求)"
  );
  console.log(
    "instancesApi.getInstances() 将发送请求到:",
    "(模拟，未发送实际请求)"
  );
  console.log(
    "systemApi.healthCheck() 将发送请求到:",
    "(模拟，未发送实际请求)"
  );

  console.groupEnd();
};

// 模拟实际发送请求(仅打印请求信息，不发送)
const testApiRequest = () => {
  console.group("===== API 请求测试 =====");

  console.log("测试 deployApi.getVersions()");
  console.log("测试 instancesApi.getInstances()");
  console.log("测试 systemApi.healthCheck()");

  console.groupEnd();
};

// 导出测试函数
export default {
  testUrlConstruction,
  testApiRequest,
};

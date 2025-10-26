// 调试工具 - 用于测试Toast组件

// 测试Toast服务是否正常工作
export function testToast() {
  const toastService = window.toastService;

  if (!toastService) {
    console.error("找不到Toast服务！");
    alert("Toast测试失败：找不到服务");
    return;
  }

  try {
    console.log("正在测试Toast服务...");
    toastService.info("这是一条信息提示");

    setTimeout(() => {
      toastService.success("操作成功");
    }, 1000);

    setTimeout(() => {
      toastService.warning("这是一条警告");
    }, 2000);

    setTimeout(() => {
      toastService.error("发生了错误");
    }, 3000);

    console.log("Toast测试完成");
  } catch (error) {
    console.error("Toast测试出错:", error);
    alert("Toast测试失败：" + error.message);
  }
}

// 将toast服务暴露为全局对象以便调试
export function exposeToastForDebugging(toastService) {
  window.toastService = toastService;
}

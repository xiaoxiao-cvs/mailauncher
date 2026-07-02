import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmProvider, useConfirm } from "../useConfirm";

/**
 * 触发器:点击后调用 confirm(),把 resolve 的结果透传给 onResult 断言。
 * 直接验证 ConfirmProvider 的承诺结算逻辑(真渲染 Modal,不 mock),而非消费方的调用形态。
 */
function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        const ok = await confirm({
          description: "确定执行此操作吗？",
          confirmText: "执行",
        });
        onResult(ok);
      }}
    >
      触发确认
    </button>
  );
}

function renderHarness(onResult: (v: boolean) => void) {
  return render(
    <ConfirmProvider>
      <Harness onResult={onResult} />
    </ConfirmProvider>,
  );
}

describe("useConfirm / ConfirmProvider", () => {
  it("点击确认按钮时 confirm() resolve(true)", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderHarness(onResult);

    await user.click(screen.getByRole("button", { name: "触发确认" }));
    expect(await screen.findByText("确定执行此操作吗？")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "执行" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("点击取消按钮时 confirm() resolve(false)", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderHarness(onResult);

    await user.click(screen.getByRole("button", { name: "触发确认" }));
    await user.click(await screen.findByRole("button", { name: "取消" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("按 Esc 关闭时 confirm() resolve(false)", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    renderHarness(onResult);

    await user.click(screen.getByRole("button", { name: "触发确认" }));
    expect(await screen.findByText("确定执行此操作吗？")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("useConfirm 在 <ConfirmProvider> 外使用时抛错", () => {
    // 组件渲染期抛错会被 React 打到 console.error,这里抑制噪音后断言抛错信息。
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(
      "useConfirm 必须在 <ConfirmProvider> 内部使用",
    );
    spy.mockRestore();
  });
});

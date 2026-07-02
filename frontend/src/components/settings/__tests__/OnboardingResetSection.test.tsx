import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingResetSection } from "../OnboardingResetSection";

const mockReset = vi.fn();
const mockConfirm = vi.fn();

vi.mock("@/hooks/useOnboardingState", () => ({
  useOnboardingState: () => ({
    hasCompletedOnboarding: true,
    complete: vi.fn(),
    skip: vi.fn(),
    reset: mockReset,
  }),
}));

// 确认对话框已从原生 window.confirm 迁移到全局 useConfirm();这里 mock 掉该 hook,
// 让处理器拿到一个可控 resolve 的 confirm(),无需在测试里挂 ConfirmProvider。
vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => mockConfirm,
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { toast } from "sonner";

describe("OnboardingResetSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("用户确认后调用 reset() 并提示", async () => {
    const user = userEvent.setup();
    mockConfirm.mockResolvedValue(true);

    render(<OnboardingResetSection />);
    await user.click(screen.getByRole("button", { name: /重新运行引导/ }));

    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));
    expect(mockConfirm).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalled();
  });

  it("用户取消确认时不调用 reset()", async () => {
    const user = userEvent.setup();
    mockConfirm.mockResolvedValue(false);

    render(<OnboardingResetSection />);
    await user.click(screen.getByRole("button", { name: /重新运行引导/ }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockReset).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});

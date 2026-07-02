import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingResetSection } from "../OnboardingResetSection";

const mockReset = vi.fn();

vi.mock("@/hooks/useOnboardingState", () => ({
  useOnboardingState: () => ({
    hasCompletedOnboarding: true,
    complete: vi.fn(),
    skip: vi.fn(),
    reset: mockReset,
  }),
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
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OnboardingResetSection />);
    await user.click(screen.getByRole("button", { name: /重新运行引导/ }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalled();
  });

  it("用户取消确认时不调用 reset()", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<OnboardingResetSection />);
    await user.click(screen.getByRole("button", { name: /重新运行引导/ }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useOnboardingState } from "../useOnboardingState";

describe("useOnboardingState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function setup() {
    return renderHook(() => useOnboardingState(), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
  }

  it("reads hasCompletedOnboarding=false when no flag is stored", () => {
    const { result } = setup();
    expect(result.current.hasCompletedOnboarding).toBe(false);
  });

  it("reads hasCompletedOnboarding=true when flag already stored", () => {
    localStorage.setItem("onboarding_completed", "true");
    const { result } = setup();
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  it("complete() persists the flag and flips hasCompletedOnboarding", () => {
    const { result } = setup();

    act(() => {
      result.current.complete();
    });

    expect(localStorage.getItem("onboarding_completed")).toBe("true");
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  it("skip() persists the flag and flips hasCompletedOnboarding", () => {
    const { result } = setup();

    act(() => {
      result.current.skip();
    });

    expect(localStorage.getItem("onboarding_completed")).toBe("true");
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  it("reset() clears the flag, flips hasCompletedOnboarding back to false, and navigates to /onboarding", () => {
    localStorage.setItem("onboarding_completed", "true");
    // jsdom 的 window.location 属性不可 spyOn(非 configurable),改为整体重定义、
    // 用 vi.fn 替换 assign,测后还原,兼容 jsdom。
    const assignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: originalLocation.href, assign: assignSpy },
    });

    const { result } = setup();
    expect(result.current.hasCompletedOnboarding).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(localStorage.getItem("onboarding_completed")).toBeNull();
    expect(result.current.hasCompletedOnboarding).toBe(false);
    expect(assignSpy).toHaveBeenCalledWith("/onboarding");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});

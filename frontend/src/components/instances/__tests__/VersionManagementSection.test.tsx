import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionManagementSection } from "../VersionManagementSection";

vi.mock("@/hooks/queries/useVersionQueries", () => ({
  useComponentsVersionQuery: vi.fn(),
  useCheckComponentUpdateQuery: vi.fn(),
  useUpdateComponentMutation: vi.fn(),
}));

vi.mock("@/services/versionMaintenanceApi", () => ({
  reinstallInstanceDependencies: vi.fn(),
  resetInstanceData: vi.fn(),
  listComponentCommits: vi.fn(),
  rollbackComponent: vi.fn(),
}));

vi.mock("@/hooks/useTransportEvent", () => ({
  useTransportEvent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useComponentsVersionQuery,
  useCheckComponentUpdateQuery,
  useUpdateComponentMutation,
} from "@/hooks/queries/useVersionQueries";
import {
  reinstallInstanceDependencies,
  resetInstanceData,
  listComponentCommits,
} from "@/services/versionMaintenanceApi";
import { toast } from "sonner";

const mockUseComponents = vi.mocked(useComponentsVersionQuery);
const mockUseCheck = vi.mocked(useCheckComponentUpdateQuery);
const mockUseUpdateMutation = vi.mocked(useUpdateComponentMutation);

const localMaibot = {
  component: "MaiBot",
  version: "1.0.0",
  commit_hash: "abcdef1234",
  install_method: "git",
  installed_at: "2026-01-01",
};

function setupDefaultMocks() {
  mockUseComponents.mockReturnValue({
    data: [localMaibot],
    isLoading: false,
  } as unknown as ReturnType<typeof useComponentsVersionQuery>);

  mockUseCheck.mockReturnValue({
    data: undefined,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCheckComponentUpdateQuery>);

  mockUseUpdateMutation.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateComponentMutation>);
}

describe("VersionManagementSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("暂无组件信息时不渲染维护操作入口(重装依赖/重置数据)", () => {
    mockUseComponents.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useComponentsVersionQuery>);

    render(<VersionManagementSection instanceId="inst_001" />);

    expect(screen.getByText("暂无组件信息")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /重装依赖/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /重置数据/ }),
    ).not.toBeInTheDocument();
  });

  it("点击重装依赖调用 reinstallInstanceDependencies 并提示成功", async () => {
    const user = userEvent.setup();
    vi.mocked(reinstallInstanceDependencies).mockResolvedValue(undefined);

    render(<VersionManagementSection instanceId="inst_001" />);

    await user.click(screen.getByRole("button", { name: /重装依赖/ }));

    await waitFor(() => {
      expect(reinstallInstanceDependencies).toHaveBeenCalledWith("inst_001");
    });
    expect(toast.success).toHaveBeenCalledWith("依赖重装完成");
  });

  it("重装依赖失败时提示错误信息而非静默吞掉", async () => {
    const user = userEvent.setup();
    vi.mocked(reinstallInstanceDependencies).mockRejectedValue(
      new Error("虚拟环境创建失败"),
    );

    render(<VersionManagementSection instanceId="inst_001" />);
    await user.click(screen.getByRole("button", { name: /重装依赖/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("虚拟环境创建失败");
    });
  });

  it("点击重置数据时先弹确认框,取消则不调用后端", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<VersionManagementSection instanceId="inst_001" />);
    await user.click(screen.getByRole("button", { name: /重置数据/ }));

    expect(window.confirm).toHaveBeenCalled();
    expect(resetInstanceData).not.toHaveBeenCalled();
  });

  it("确认重置数据后调用 resetInstanceData 并提示成功", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(resetInstanceData).mockResolvedValue(undefined);

    render(<VersionManagementSection instanceId="inst_001" />);
    await user.click(screen.getByRole("button", { name: /重置数据/ }));

    await waitFor(() => {
      expect(resetInstanceData).toHaveBeenCalledWith("inst_001");
    });
    expect(toast.success).toHaveBeenCalledWith("实例数据已重置");
  });

  it("重置数据被后端拒绝(实例运行中)时提示后端返回的错误", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(resetInstanceData).mockRejectedValue(
      new Error("实例正在运行,请先停止实例后再重置数据"),
    );

    render(<VersionManagementSection instanceId="inst_001" />);
    await user.click(screen.getByRole("button", { name: /重置数据/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "实例正在运行,请先停止实例后再重置数据",
      );
    });
  });

  it("打开版本可视化后点击回滚入口会拉取历史 commit 列表", async () => {
    const user = userEvent.setup();
    vi.mocked(listComponentCommits).mockResolvedValue([]);

    render(<VersionManagementSection instanceId="inst_001" />);

    // 点击本地版本快照卡(展示版本号 1.0.0 的那张凹陷面)打开版本可视化弹窗,
    // 点击事件冒泡到 Surface 上绑定的 onClick。
    await user.click(screen.getByText("1.0.0"));
    // 打开后点击"回滚到历史版本"
    await user.click(screen.getByRole("button", { name: /回滚到历史版本/ }));

    await waitFor(() => {
      expect(listComponentCommits).toHaveBeenCalledWith("inst_001", "MaiBot");
    });
    await waitFor(() => {
      expect(screen.getByText("未获取到历史提交")).toBeInTheDocument();
    });
  });
});

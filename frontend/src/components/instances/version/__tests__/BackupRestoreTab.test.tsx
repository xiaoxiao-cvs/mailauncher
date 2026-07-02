import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupRestoreTab } from "../BackupRestoreTab";
import type { VersionBackup } from "@/services/versionApi";

const backup: VersionBackup = {
  id: "databak_abc123",
  component: "MaiBot",
  version: "1.2.0",
  commit_hash: "abcdef1234",
  backup_size: 2048,
  created_at: new Date().toISOString(),
  description: "更新前自动备份: config+data",
};

describe("BackupRestoreTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("渲染备份列表并在点击恢复时回调 onRestore(备份 id)", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();

    render(
      <BackupRestoreTab
        backups={[backup]}
        onRestore={onRestore}
        isRestoring={false}
      />,
    );

    expect(screen.getByText(/更新前自动备份/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /恢复/ }));

    expect(onRestore).toHaveBeenCalledWith("databak_abc123");
  });

  it("未传 component/onManualBackup 时不渲染立即备份入口", () => {
    render(
      <BackupRestoreTab
        backups={[backup]}
        onRestore={vi.fn()}
        isRestoring={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /立即备份/ }),
    ).not.toBeInTheDocument();
  });

  it("同时传入 component 与 onManualBackup 时渲染入口,点击回调组件名", async () => {
    const user = userEvent.setup();
    const onManualBackup = vi.fn();

    render(
      <BackupRestoreTab
        backups={[backup]}
        onRestore={vi.fn()}
        isRestoring={false}
        component="MaiBot"
        onManualBackup={onManualBackup}
        isBackingUp={false}
      />,
    );

    const button = screen.getByRole("button", { name: /立即备份/ });
    await user.click(button);

    expect(onManualBackup).toHaveBeenCalledWith("MaiBot");
  });

  it("isBackingUp 为 true 时禁用立即备份按钮", () => {
    render(
      <BackupRestoreTab
        backups={[backup]}
        onRestore={vi.fn()}
        isRestoring={false}
        component="MaiBot"
        onManualBackup={vi.fn()}
        isBackingUp={true}
      />,
    );

    expect(screen.getByRole("button", { name: /立即备份/ })).toBeDisabled();
  });

  it("空列表下仍展示立即备份入口(便于创建首份备份)", () => {
    render(
      <BackupRestoreTab
        backups={[]}
        onRestore={vi.fn()}
        isRestoring={false}
        component="MaiBot"
        onManualBackup={vi.fn()}
      />,
    );

    expect(screen.getByText("暂无备份")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /立即备份/ }),
    ).toBeInTheDocument();
  });

  it("空列表且未提供手动备份回调时不渲染入口", () => {
    render(
      <BackupRestoreTab backups={[]} onRestore={vi.fn()} isRestoring={false} />,
    );

    expect(screen.getByText("暂无备份")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /立即备份/ }),
    ).not.toBeInTheDocument();
  });
});

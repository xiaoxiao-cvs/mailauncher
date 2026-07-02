import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  reinstallInstanceDependencies,
  listComponentCommits,
  rollbackComponent,
  createManualBackup,
  resetInstanceData,
} from "../versionMaintenanceApi";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("versionMaintenanceApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reinstallInstanceDependencies", () => {
    it("should invoke reinstall_instance_dependencies with null pythonPath when omitted", async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: "ok" });

      await reinstallInstanceDependencies("inst_001");

      expect(invoke).toHaveBeenCalledWith("reinstall_instance_dependencies", {
        instanceId: "inst_001",
        pythonPath: null,
      });
    });

    it("should pass through an explicit pythonPath", async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: "ok" });

      await reinstallInstanceDependencies("inst_001", "/usr/bin/python3.12");

      expect(invoke).toHaveBeenCalledWith("reinstall_instance_dependencies", {
        instanceId: "inst_001",
        pythonPath: "/usr/bin/python3.12",
      });
    });

    it("should propagate errors", async () => {
      vi.mocked(invoke).mockRejectedValue("venv creation failed");

      await expect(reinstallInstanceDependencies("inst_001")).rejects.toThrow(
        "venv creation failed",
      );
    });
  });

  describe("listComponentCommits", () => {
    it("should invoke list_component_commits with default limit", async () => {
      const mockCommits = [
        {
          hash: "aaa1111",
          shortHash: "aaa1111",
          subject: "fix: x",
          date: "2026-01-01",
        },
      ];
      vi.mocked(invoke).mockResolvedValue(mockCommits);

      const result = await listComponentCommits("inst_001", "MaiBot");

      expect(invoke).toHaveBeenCalledWith("list_component_commits", {
        instanceId: "inst_001",
        component: "MaiBot",
        limit: 30,
      });
      expect(result).toEqual(mockCommits);
    });

    it("should respect an explicit limit", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      await listComponentCommits("inst_001", "MaiBot", 5);

      expect(invoke).toHaveBeenCalledWith("list_component_commits", {
        instanceId: "inst_001",
        component: "MaiBot",
        limit: 5,
      });
    });
  });

  describe("rollbackComponent", () => {
    it("should invoke update_component with createBackup and targetVersion set", async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: "ok" });

      await rollbackComponent("inst_001", "MaiBot", "aaa1111");

      expect(invoke).toHaveBeenCalledWith("update_component", {
        instanceId: "inst_001",
        component: "MaiBot",
        createBackup: true,
        targetVersion: "aaa1111",
      });
    });

    it("should propagate rollback errors", async () => {
      vi.mocked(invoke).mockRejectedValue("Git checkout failed");

      await expect(
        rollbackComponent("inst_001", "MaiBot", "deadbee"),
      ).rejects.toThrow("Git checkout failed");
    });
  });

  describe("createManualBackup", () => {
    it("should return the backup id when one was created", async () => {
      vi.mocked(invoke).mockResolvedValue("manualbak_abc123");

      const result = await createManualBackup("inst_001", "MaiBot");

      expect(invoke).toHaveBeenCalledWith("create_manual_backup", {
        instanceId: "inst_001",
        component: "MaiBot",
      });
      expect(result).toBe("manualbak_abc123");
    });

    it("should return undefined when backend reports nothing to back up", async () => {
      vi.mocked(invoke).mockResolvedValue(null);

      const result = await createManualBackup("inst_001", "MaiBot");

      expect(result).toBeUndefined();
    });
  });

  describe("resetInstanceData", () => {
    it("should invoke reset_instance_data", async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true, message: "ok" });

      await resetInstanceData("inst_001");

      expect(invoke).toHaveBeenCalledWith("reset_instance_data", {
        instanceId: "inst_001",
      });
    });

    it("should propagate errors when instance is still running", async () => {
      vi.mocked(invoke).mockRejectedValue(
        "实例正在运行,请先停止实例后再重置数据",
      );

      await expect(resetInstanceData("inst_001")).rejects.toThrow(
        "实例正在运行,请先停止实例后再重置数据",
      );
    });
  });
});

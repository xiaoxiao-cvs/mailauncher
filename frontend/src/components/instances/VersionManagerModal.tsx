import React, { useState } from "react";
import { Package, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import {
  useComponentsVersionQuery,
  useCheckComponentUpdateQuery,
  useUpdateComponentMutation,
  useBackupsQuery,
  useRestoreBackupMutation,
} from "@/hooks/queries/useVersionQueries";
import {
  ModalRoot,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalTitle,
  ModalClose,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ls";
import { VersionComparisonTab, BackupRestoreTab } from "./version";

interface VersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
}

export const VersionManagerModal: React.FC<VersionManagerModalProps> = ({
  isOpen,
  onClose,
  instanceId,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [updateConfirmed, setUpdateConfirmed] = useState(false);
  const [updateMethod] = useState<"git" | "release">("git");
  const [showBackups, setShowBackups] = useState(false);

  const { data: components = [] } = useComponentsVersionQuery(instanceId, {
    enabled: isOpen,
  });

  const { data: componentDetail, isLoading: isLoadingDetail } =
    useCheckComponentUpdateQuery(instanceId, selectedComponent || undefined, {
      enabled: !!selectedComponent,
    });

  const { data: backups = [] } = useBackupsQuery(
    instanceId,
    selectedComponent || undefined,
    {
      enabled: isOpen && showBackups,
    },
  );

  const updateMutation = useUpdateComponentMutation();
  const restoreMutation = useRestoreBackupMutation();

  const handleUpdate = async () => {
    if (!selectedComponent || !updateConfirmed) return;

    try {
      await updateMutation.mutateAsync({
        instanceId,
        component: selectedComponent,
        createBackup: true,
        updateMethod,
      });

      setUpdateConfirmed(false);
      setSelectedComponent(null);
    } catch (error) {
      console.error("更新失败:", error);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm("确定要恢复到此备份吗？当前代码将被替换。")) return;

    try {
      await restoreMutation.mutateAsync({ instanceId, backupId });
      setShowBackups(false);
    } catch (error) {
      console.error("恢复失败:", error);
    }
  };

  return (
    <ModalRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <ModalPortal forceMount>
            <ModalOverlay />
            <ModalContent className="flex max-w-4xl max-h-[90vh] flex-col overflow-hidden p-0">
              <div
                className="flex items-center justify-between p-6 border-b"
                style={{ borderColor: "var(--ls-hairline)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      background: "var(--ls-surface-hi)",
                      borderRadius: "var(--ls-r-card)",
                      boxShadow: "var(--ls-shadow-soft)",
                      color: "var(--ls-life)",
                    }}
                  >
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <ModalTitle
                      className="text-xl font-bold"
                      style={{ color: "var(--ls-ink)" }}
                    >
                      版本管理
                    </ModalTitle>
                    <p
                      className="text-sm"
                      style={{ color: "var(--ls-ink-soft)" }}
                    >
                      管理组件版本、更新和备份
                    </p>
                  </div>
                </div>
                <ModalClose
                  className="ls-item p-2 rounded-full"
                  style={{ color: "var(--ls-ink-soft)" }}
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </ModalClose>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <Tabs
                  value={showBackups ? "backups" : "versions"}
                  onValueChange={(v) => setShowBackups(v === "backups")}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="versions" className="justify-center">
                      组件版本
                    </TabsTrigger>
                    <TabsTrigger value="backups" className="justify-center">
                      备份管理
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="versions">
                    <VersionComparisonTab
                      components={components}
                      selectedComponent={selectedComponent}
                      onSelectComponent={setSelectedComponent}
                      componentDetail={componentDetail}
                      isLoadingDetail={isLoadingDetail}
                      updateConfirmed={updateConfirmed}
                      onUpdateConfirmedChange={setUpdateConfirmed}
                      onUpdate={handleUpdate}
                      isUpdating={updateMutation.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="backups">
                    <BackupRestoreTab
                      backups={backups}
                      onRestore={handleRestore}
                      isRestoring={restoreMutation.isPending}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ModalContent>
          </ModalPortal>
        )}
      </AnimatePresence>
    </ModalRoot>
  );
};

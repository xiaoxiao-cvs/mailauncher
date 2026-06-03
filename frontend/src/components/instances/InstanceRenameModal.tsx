/**
 * 实例重命名模态框
 * 长条型模态框,支持失焦保存
 */

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import {
  ModalRoot,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalTitle,
  Input,
  Label,
  TactileButton,
} from "@/components/ls";

interface InstanceRenameModalProps {
  isOpen: boolean;
  instanceName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const InstanceRenameModal: React.FC<InstanceRenameModalProps> = ({
  isOpen,
  instanceName,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(instanceName);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当模态框打开时,初始化名称并聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setName(instanceName);
      // 延迟聚焦,确保模态框已经渲染
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, instanceName]);

  // 处理保存
  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== instanceName) {
      onSave(trimmedName);
    } else {
      onClose();
    }
  };

  // 处理键盘事件:Enter 保存(Esc 由 Dialog onEscapeKeyDown 走取消)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
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
            <ModalContent
              // Esc:取消并丢弃改动(保留原"按 Esc 取消"语义)
              onEscapeKeyDown={(e) => {
                e.preventDefault();
                onClose();
              }}
              // 点击背景:保存当前内容(保留原"失焦/点背景自动保存"语义)
              onInteractOutside={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <ModalTitle
                  className="text-lg font-semibold"
                  style={{ color: "var(--ls-ink)" }}
                >
                  重命名实例
                </ModalTitle>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-rename-input">实例名称</Label>
                <Input
                  id="instance-rename-input"
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入实例名称"
                />
                <p className="text-xs" style={{ color: "var(--ls-ink-faint)" }}>
                  按 Enter 保存,按 Esc 取消,点击背景自动保存
                </p>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <TactileButton
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 justify-center py-2.5"
                >
                  取消
                </TactileButton>
                <TactileButton
                  variant="life"
                  onClick={handleSave}
                  disabled={!name.trim() || name.trim() === instanceName}
                  className="flex-1 justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </TactileButton>
              </div>
            </ModalContent>
          </ModalPortal>
        )}
      </AnimatePresence>
    </ModalRoot>
  );
};

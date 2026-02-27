/**
 * 实例重命名模态框
 * 长条型模态框，毛玻璃效果，支持失焦保存
 */

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

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
  const modalRef = useRef<HTMLDivElement>(null);

  // 当模态框打开时，初始化名称并聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setName(instanceName);
      // 延迟聚焦，确保模态框已经渲染
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

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // 处理失焦
  const handleBlur = (e: React.FocusEvent) => {
    // 检查焦点是否移动到模态框外部
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget as Node)) {
      handleSave();
    }
  };

  // 点击背景关闭（但保存当前内容）
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* 背景 - 完全透明的毛玻璃效果 */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/5" />

      {/* 模态框 - 长条型 */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden"
        style={{
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        {/* 装饰性渐变背景 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          {/* 标题区 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              重命名实例
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="取消"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* 输入框 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              实例名称
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="请输入实例名称"
              className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl 
                       text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                       transition-all duration-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              按 Enter 保存，按 Esc 取消，失焦自动保存
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl 
                       hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 
                       transition-all duration-200 font-medium text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || name.trim() === instanceName}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl 
                       hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 font-medium text-sm shadow-lg shadow-blue-500/25"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      {/* 动画定义 */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

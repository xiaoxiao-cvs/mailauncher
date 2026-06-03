import React from "react";
import { ConfigSidebarProps } from "./types";

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  treeData,
  selectedGroupId,
  onSelectGroup,
}) => {
  return (
    <div
      className="w-56 lg:w-64 flex flex-col shrink-0"
      style={{
        background: "var(--ls-surface)",
        borderRight: "1px solid var(--ls-hairline)",
      }}
    >
      <div className="p-4 h-full overflow-y-auto scrollbar-thin">
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-2"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          Categories
        </div>
        <div className="space-y-1">
          {treeData && treeData.length > 0 ? (
            treeData.map((group) => {
              const active = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className="ls-item w-full text-left px-3 py-2.5 rounded-control text-sm font-medium flex items-center justify-between"
                  style={{
                    color: active ? "var(--ls-ink)" : "var(--ls-ink-soft)",
                    background: active ? "var(--ls-bg-2)" : undefined,
                  }}
                >
                  <span className="truncate">{group.name}</span>
                  {active && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "var(--ls-life)" }}
                    />
                  )}
                </button>
              );
            })
          ) : (
            <div
              className="text-sm px-3 py-2"
              style={{ color: "var(--ls-ink-faint)" }}
            >
              无配置分类
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { Loader2, RotateCw } from "lucide-react";
import {
  Surface,
  TactileButton,
  Label,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ls";
import { NapCatAccountsProps } from "./types";

export const NapCatAccounts: React.FC<NapCatAccountsProps> = ({
  napCatAccounts,
  selectedQQAccount,
  loadingAccounts,
  onLoadAccounts,
  onSelectAccount,
}) => {
  return (
    <Surface variant="panel" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "var(--ls-ink)" }}>
            账号管理
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--ls-ink-soft)" }}>
            选择用于快速登录的QQ账号
          </p>
        </div>
        <TactileButton
          variant="ghost"
          onClick={onLoadAccounts}
          disabled={loadingAccounts}
        >
          {loadingAccounts ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              刷新中
            </>
          ) : (
            <>
              <RotateCw className="w-4 h-4" />
              刷新账号
            </>
          )}
        </TactileButton>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="qq-account" className="text-sm mb-2 block">
            选择QQ账号
          </Label>
          {napCatAccounts.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ color: "var(--ls-ink-soft)" }}
            >
              <p className="mb-2">暂无已登录账号</p>
              <p className="text-xs" style={{ color: "var(--ls-ink-faint)" }}>
                请先在NapCat中登录QQ账号
              </p>
            </div>
          ) : (
            <SelectRoot
              value={selectedQQAccount || ""}
              onValueChange={onSelectAccount}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择QQ账号" />
              </SelectTrigger>
              <SelectContent>
                {napCatAccounts.map((accountInfo) => (
                  <SelectItem
                    key={accountInfo.account}
                    value={accountInfo.account}
                  >
                    <div className="flex items-center gap-3 py-1">
                      <img
                        src={`https://q1.qlogo.cn/g?b=qq&nk=${accountInfo.account}&s=100`}
                        alt=""
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gray"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                        }}
                      />
                      <div className="flex flex-col">
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--ls-ink)" }}
                        >
                          {accountInfo.nickname !== "QQ用户"
                            ? accountInfo.nickname
                            : `QQ ${accountInfo.account}`}
                        </span>
                        <span
                          className="text-xs ls-num"
                          style={{ color: "var(--ls-ink-faint)" }}
                        >
                          {accountInfo.account}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          )}
        </div>

        {selectedQQAccount && (
          <Surface variant="inset" className="p-4">
            <p className="text-sm" style={{ color: "var(--ls-ink)" }}>
              已选择账号:{" "}
              <strong className="ls-num" style={{ color: "var(--ls-life)" }}>
                {selectedQQAccount}
              </strong>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ls-ink-soft)" }}>
              保存后，该账号将用于NapCat快速登录
            </p>
          </Surface>
        )}
      </div>
    </Surface>
  );
};

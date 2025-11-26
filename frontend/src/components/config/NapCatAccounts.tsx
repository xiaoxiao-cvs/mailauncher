import React from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NapCatAccountsProps } from './types'

export const NapCatAccounts: React.FC<NapCatAccountsProps> = ({
  napCatAccounts,
  selectedQQAccount,
  loadingAccounts,
  onLoadAccounts,
  onSelectAccount,
}) => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/40 dark:border-gray-700/40 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">账号管理</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择用于快速登录的QQ账号</p>
        </div>
        <Button
          onClick={onLoadAccounts}
          disabled={loadingAccounts}
          size="sm"
          variant="outline"
          className="rounded-lg"
        >
          {loadingAccounts ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              刷新中
            </>
          ) : (
            <>
              <RotateCw className="w-4 h-4 mr-2" />
              刷新账号
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="qq-account" className="text-sm font-medium mb-2 block">
            选择QQ账号
          </Label>
          {napCatAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="mb-2">暂无已登录账号</p>
              <p className="text-xs">请先在NapCat中登录QQ账号</p>
            </div>
          ) : (
            <Select value={selectedQQAccount || ''} onValueChange={onSelectAccount}>
              <SelectTrigger className="w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="请选择QQ账号" />
              </SelectTrigger>
              <SelectContent>
                {napCatAccounts.map((accountInfo) => (
                  <SelectItem key={accountInfo.account} value={accountInfo.account}>
                    <div className="flex items-center gap-3 py-1">
                      <img
                        src={`https://q1.qlogo.cn/g?b=qq&nk=${accountInfo.account}&s=100`}
                        alt=""
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gray"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {accountInfo.nickname !== "QQ用户" ? accountInfo.nickname : `QQ ${accountInfo.account}`}
                        </span>
                        <span className="text-xs text-gray-500">{accountInfo.account}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedQQAccount && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              已选择账号: <strong>{selectedQQAccount}</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              保存后，该账号将用于NapCat快速登录
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

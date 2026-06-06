import { useEffect, useState } from "react";
import { Network, Check } from "lucide-react";

import { Surface, Input, Switch, TactileButton, Label } from "@/components/ls";
import {
  useNetworkProxyQuery,
  useSaveNetworkProxyMutation,
  type NetworkProxy,
} from "@/hooks/queries/useSourceProxyQueries";

/**
 * 网络代理面板
 * Clash/Mihomo 风格 host:port 的 HTTP 代理，注入到 git clone、pip、reqwest 出站。
 * 开关切换即时保存；host/port 编辑后点"保存"提交，避免每次按键都落库。
 */
export function NetworkProxyPanel() {
  const { data: proxy, isLoading } = useNetworkProxyQuery();
  const saveProxy = useSaveNetworkProxyMutation();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (proxy) {
      setHost(proxy.host);
      setPort(String(proxy.port));
    }
  }, [proxy]);

  const commit = (next: NetworkProxy) => {
    setError(null);
    setSaved(false);
    saveProxy.mutate(next, {
      onSuccess: () => setSaved(true),
      onError: (e) => setError(String(e)),
    });
  };

  // 开关:即时保存。host/port 取当前输入,输入非法时回退到上次保存值,避免落库出 0/空。
  const handleToggle = (enabled: boolean) => {
    const portNum = Number.parseInt(port, 10);
    const validPort =
      Number.isFinite(portNum) && portNum >= 1 && portNum <= 65535;
    commit({
      enabled,
      host: host.trim() || (proxy?.host ?? "127.0.0.1"),
      port: validPort ? portNum : (proxy?.port ?? 7890),
    });
  };

  // 保存按钮:校验端口范围后提交 host/port。
  const handleSave = () => {
    const portNum = Number.parseInt(port, 10);
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      setError("端口需为 1-65535 之间的整数");
      setSaved(false);
      return;
    }
    if (!host.trim()) {
      setError("代理主机不能为空");
      setSaved(false);
      return;
    }
    commit({
      enabled: proxy?.enabled ?? false,
      host: host.trim(),
      port: portNum,
    });
  };

  const enabled = proxy?.enabled ?? false;

  return (
    <Surface variant="panel" className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
            style={{
              background: "var(--ls-bg-2)",
              color: "var(--ls-ink-soft)",
            }}
          >
            <Network size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">网络代理</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
              HTTP 代理 (Clash/Mihomo)，作用于克隆、安装依赖与版本检查
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={isLoading || saveProxy.isPending}
          onCheckedChange={handleToggle}
          aria-label="启用网络代理"
        />
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="proxy-host">主机</Label>
            <Input
              id="proxy-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
              disabled={isLoading || saveProxy.isPending}
              className="font-mono disabled:opacity-60"
            />
          </div>
          <div className="w-32 space-y-1.5">
            <Label htmlFor="proxy-port">端口</Label>
            <Input
              id="proxy-port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="7890"
              disabled={isLoading || saveProxy.isPending}
              className="font-mono disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TactileButton
            variant="solid"
            onClick={handleSave}
            disabled={saveProxy.isPending}
            className="shrink-0 disabled:opacity-60"
          >
            保存代理地址
          </TactileButton>
          {saved && !error && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--ls-life)" }}
            >
              <Check size={14} />
              已保存
            </span>
          )}
        </div>

        {error && (
          <Surface variant="inset" className="p-3">
            <p
              className="break-words text-xs"
              style={{ color: "var(--ls-danger)" }}
            >
              {error}
            </p>
          </Surface>
        )}
      </div>
    </Surface>
  );
}

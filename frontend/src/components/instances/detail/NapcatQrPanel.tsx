/**
 * NapCat 扫码登录面板 —— 检测到 NapCat 在等扫码时,把它存的二维码 PNG 提到前端展示。
 *
 * NapCat 等扫码登录时会把二维码写到 `<实例>/NapCat/cache/qrcode.png`(也在终端打字符二维码)。
 * 这里轮询后端读该 PNG,按其修改时间判断"是否正在等扫码"(QQ 二维码约 2min 失效、NapCat 会刷新,
 * mtime 在新鲜窗口内即展示);登录后文件不再更新 → 转旧 → 面板自动消失。免去看终端字符二维码。
 */
import { useEffect, useState } from "react";

import { instanceApi, type NapcatQrCode } from "@/services/instanceApi";

const POLL_MS = 2000;
/** 二维码新鲜窗口(ms):mtime 在此内视为"正在等扫码"。略大于 QQ 二维码有效期。 */
const FRESH_MS = 150_000;

export function NapcatQrPanel({ instanceId }: { instanceId: string }) {
  const [qr, setQr] = useState<NapcatQrCode | null>(null);

  useEffect(() => {
    setQr(null);
    let cancelled = false;
    let timer: number | null = null;
    const poll = async () => {
      try {
        const r = await instanceApi.getNapcatQrcode(instanceId);
        if (!cancelled) {
          setQr((prev) => {
            const fresh = r != null && Date.now() - r.mtimeMs < FRESH_MS;
            const next = fresh ? r : null;
            // 无变化(都空,或同一张二维码)就保持原引用,避免无谓重渲
            if (next == null && prev == null) return prev;
            if (next != null && prev != null && prev.mtimeMs === next.mtimeMs) {
              return prev;
            }
            return next;
          });
        }
      } catch {
        // 瞬时读失败忽略,下次轮询再试
      }
      if (!cancelled) timer = window.setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [instanceId]);

  if (!qr) return null;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-hairline)",
        boxShadow: "var(--ls-shadow-soft)",
      }}
    >
      <img
        src={qr.dataUrl}
        alt="NapCat 登录二维码"
        className="h-44 w-44 shrink-0 rounded-lg bg-white p-1.5"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="min-w-0">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--ls-ink)" }}
        >
          NapCat 需要扫码登录
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
          用<b>手机 QQ</b> 扫一扫左侧二维码并授权登录;登录成功后此面板自动消失。
        </div>
        <div
          className="mt-2 flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: "var(--ls-life)" }}
          />
          等待扫码…(二维码过期会自动刷新)
        </div>
      </div>
    </div>
  );
}

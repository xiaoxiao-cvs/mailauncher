import { useState } from "react";
import { CheckCircle2, Rocket } from "lucide-react";

export function CompletePage() {
  const [launchOnClose, setLaunchOnClose] = useState(true);

  const handleFinish = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("finish_install", { launch: launchOnClose });
    } catch {
      // 开发模式下直接关闭
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-12 animate-fade-in">
      {/* Success Icon */}
      <div className="mb-6 relative">
        <CheckCircle2
          size={64}
          className="text-emerald-400"
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />
      </div>

      <h2 className="text-2xl font-bold mb-2">安装完成</h2>
      <p className="text-white/50 text-sm mb-8">
        MAI Launcher 已成功安装到您的计算机
      </p>

      {/* Launch checkbox */}
      <label className="flex items-center gap-3 mb-8 cursor-pointer group">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            launchOnClose
              ? "bg-brand-500 border-brand-500"
              : "border-white/30 group-hover:border-white/50"
          }`}
          onClick={() => setLaunchOnClose(!launchOnClose)}
        >
          {launchOnClose && (
            <svg
              viewBox="0 0 12 12"
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </div>
        <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
          立即启动 MAI Launcher
        </span>
      </label>

      {/* Finish Button */}
      <button
        onClick={handleFinish}
        className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
      >
        <Rocket size={18} />
        完成
      </button>
    </div>
  );
}

import { X, Minus } from "lucide-react";

export function TitleBar() {
  const minimize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().minimize();
  };

  const close = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between px-4 shrink-0"
    >
      <span className="text-xs text-white/40 font-medium tracking-wide">
        MAI Launcher Setup
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={minimize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
        >
          <Minus size={14} className="text-white/50" />
        </button>
        <button
          onClick={close}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 transition-colors group"
        >
          <X size={14} className="text-white/50 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}

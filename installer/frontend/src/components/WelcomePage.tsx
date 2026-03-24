import { useState } from "react";
import { FolderOpen, ChevronRight } from "lucide-react";

interface WelcomePageProps {
  onNext: (path: string) => void;
}

const DEFAULT_PATH = "C:\\Program Files\\MAI Launcher";

export function WelcomePage({ onNext }: WelcomePageProps) {
  const [installPath, setInstallPath] = useState(DEFAULT_PATH);

  const handleBrowse = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const selected = await invoke<string | null>("select_install_path");
      if (selected) {
        setInstallPath(selected);
      }
    } catch {
      // 开发模式下可能没有后端
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-12 animate-fade-in">
      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/25">
          <span className="text-3xl font-bold">M</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          MAI Launcher
        </h1>
        <p className="text-white/50 text-sm">
          欢迎安装 MAI Launcher — 麦麦启动器
        </p>
      </div>

      {/* Install Path */}
      <div className="w-full max-w-md mb-8">
        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
          安装位置
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 truncate">
            {installPath}
          </div>
          <button
            onClick={handleBrowse}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <FolderOpen size={16} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Install Button */}
      <button
        onClick={() => onNext(installPath)}
        className="group flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-medium shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300"
      >
        开始安装
        <ChevronRight
          size={18}
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </button>

      {/* Terms */}
      <p className="mt-6 text-xs text-white/30">
        点击"开始安装"即表示您同意{" "}
        <span className="text-white/50 hover:text-white/70 cursor-pointer underline underline-offset-2">
          许可协议
        </span>
      </p>
    </div>
  );
}

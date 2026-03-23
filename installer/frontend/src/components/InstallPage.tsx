import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InstallPageProps {
  installPath: string;
  onComplete: () => void;
}

interface InstallProgress {
  percent: number;
  stage: string;
  detail: string;
}

export function InstallPage({ installPath, onComplete }: InstallPageProps) {
  const [progress, setProgress] = useState<InstallProgress>({
    percent: 0,
    stage: "准备中",
    detail: "正在初始化安装程序...",
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const runInstall = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const { listen } = await import("@tauri-apps/api/event");

        // 监听安装进度事件
        const unlisten = await listen<InstallProgress>(
          "install-progress",
          (event) => {
            setProgress(event.payload);
            if (event.payload.percent >= 100) {
              unlisten();
              setTimeout(onComplete, 600);
            }
          }
        );

        // 调用后端开始安装
        await invoke("start_install", { path: installPath });
      } catch (e) {
        // 开发模式：模拟安装进度
        const stages = [
          { percent: 10, stage: "解压文件", detail: "正在解压安装包..." },
          { percent: 30, stage: "解压文件", detail: "正在释放程序文件..." },
          { percent: 50, stage: "安装组件", detail: "正在安装运行时组件..." },
          { percent: 70, stage: "配置环境", detail: "正在写入注册表..." },
          { percent: 85, stage: "创建快捷方式", detail: "正在创建桌面快捷方式..." },
          { percent: 100, stage: "安装完成", detail: "所有组件已安装完成" },
        ];

        for (const s of stages) {
          await new Promise((r) => setTimeout(r, 800));
          setProgress(s);
        }
        setTimeout(onComplete, 600);
      }
    };

    runInstall();
  }, [installPath, onComplete]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-12 animate-fade-in">
      {/* Spinner */}
      <div className="mb-8">
        <Loader2
          size={48}
          className="text-brand-400 animate-spin"
          strokeWidth={1.5}
        />
      </div>

      {/* Stage */}
      <h2 className="text-xl font-semibold mb-2">{progress.stage}</h2>
      <p className="text-sm text-white/50 mb-8">{progress.detail}</p>

      {/* Progress Bar */}
      <div className="w-full max-w-sm">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-white/30">{installPath}</span>
          <span className="text-xs text-white/50 font-mono">
            {progress.percent}%
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { WelcomePage } from "./components/WelcomePage";
import { InstallPage } from "./components/InstallPage";
import { CompletePage } from "./components/CompletePage";
import { TitleBar } from "./components/TitleBar";

type Page = "welcome" | "installing" | "complete";

export default function App() {
  const [page, setPage] = useState<Page>("welcome");
  const [installPath, setInstallPath] = useState<string>("");

  const handleStartInstall = useCallback((path: string) => {
    setInstallPath(path);
    setPage("installing");
  }, []);

  const handleInstallComplete = useCallback(() => {
    setPage("complete");
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <TitleBar />
      <div className="flex-1 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 h-full">
          {page === "welcome" && (
            <WelcomePage onNext={handleStartInstall} />
          )}
          {page === "installing" && (
            <InstallPage
              installPath={installPath}
              onComplete={handleInstallComplete}
            />
          )}
          {page === "complete" && <CompletePage />}
        </div>
      </div>
    </div>
  );
}

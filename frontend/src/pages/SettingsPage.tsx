import { useState } from "react";
import { Settings, Server, Save } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TactileButton,
} from "@/components/ls";
import {
  ThemeSettings,
  UpdateCheckSection,
  GitEnvironmentPanel,
  DeploymentPathPanel,
  PythonEnvironmentPanel,
} from "@/components/settings";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("launcher");

  const [gitPath, setGitPath] = useState("/usr/bin/git");
  const [deployPath, setDeployPath] = useState(
    "/Users/xaoxiao/mailauncher-data",
  );
  const [pythonPath, setPythonPath] = useState("/usr/bin/python3");
  const [venvType, setVenvType] = useState("venv");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="px-8 pb-4 pt-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">设置</h1>
        <p style={{ color: "var(--ls-ink-soft)" }}>管理启动器偏好与环境配置</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex w-full flex-1 flex-col overflow-hidden"
      >
        <div className="flex-none px-8">
          <TabsList>
            <TabsTrigger
              value="launcher"
              className="inline-flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              启动器设置
            </TabsTrigger>
            <TabsTrigger
              value="environment"
              className="inline-flex items-center gap-2"
            >
              <Server className="h-4 w-4" />
              环境配置
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-8">
          <TabsContent value="launcher" className="mt-0 space-y-6 outline-none">
            <ThemeSettings />
            <UpdateCheckSection />
          </TabsContent>

          <TabsContent
            value="environment"
            className="mt-0 space-y-6 outline-none"
          >
            <GitEnvironmentPanel
              gitPath={gitPath}
              onGitPathChange={setGitPath}
            />
            <DeploymentPathPanel
              deployPath={deployPath}
              onDeployPathChange={setDeployPath}
            />
            <PythonEnvironmentPanel
              pythonPath={pythonPath}
              onPythonPathChange={setPythonPath}
              venvType={venvType}
              onVenvTypeChange={setVenvType}
            />

            <div className="flex justify-end pt-2">
              <TactileButton
                variant="solid"
                disabled={isSaving}
                onClick={() => {
                  setIsSaving(true);
                  setTimeout(() => setIsSaving(false), 1500);
                }}
                className="px-8"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "保存中..." : "保存配置"}
              </TactileButton>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

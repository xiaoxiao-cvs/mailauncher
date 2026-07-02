import { useState } from "react";
import { Settings, Server, KeyRound, Globe } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ls";
import {
  ThemeSettings,
  UpdateCheckSection,
  GitEnvironmentPanel,
  DeploymentPathPanel,
  PythonEnvironmentPanel,
  NetworkProxyPanel,
  SourceManagerPanel,
  DiagnosticsSection,
} from "@/components/settings";
import { OnboardingResetSection } from "@/components/settings/OnboardingResetSection";
import { ApiProviderConfig } from "@/components/onboarding/ApiProviderConfig";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("launcher");

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
            <TabsTrigger value="api" className="inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              模型 API
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="inline-flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              网络与源
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-8">
          <TabsContent value="launcher" className="mt-0 space-y-6 outline-none">
            <ThemeSettings />
            <UpdateCheckSection />
            <DiagnosticsSection />
            <OnboardingResetSection />
          </TabsContent>

          <TabsContent
            value="environment"
            className="mt-0 space-y-6 outline-none"
          >
            <GitEnvironmentPanel />
            <DeploymentPathPanel />
            <PythonEnvironmentPanel />
          </TabsContent>

          <TabsContent value="api" className="mt-0 outline-none">
            <div className="min-h-[480px]">
              <ApiProviderConfig stepColor="var(--ls-life)" />
            </div>
          </TabsContent>

          <TabsContent value="network" className="mt-0 space-y-6 outline-none">
            <NetworkProxyPanel />
            <SourceManagerPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

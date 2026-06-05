import { ComponentType, Instance, RuntimeKind } from "@/services/instanceApi";
import { ComponentLogView } from "@/components/terminal/ComponentLogView";
import {
  StatusDot,
  Surface,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ls";

interface ComponentStatusInfo {
  running?: boolean;
  runtime_kind?: RuntimeKind;
}

interface InstanceTerminalPanelProps {
  instance: Instance;
  selectedComponent: ComponentType;
  onSelectComponent: (component: ComponentType) => void;
  availableComponents: ComponentType[];
  getComponentStatus: (
    component: ComponentType,
  ) => ComponentStatusInfo | undefined;
}

export function InstanceTerminalPanel({
  instance,
  selectedComponent,
  onSelectComponent,
  availableComponents,
  getComponentStatus,
}: InstanceTerminalPanelProps) {
  return (
    <Surface
      variant="inset"
      className="flex flex-1 flex-col overflow-hidden p-0"
    >
      <Tabs
        value={selectedComponent}
        onValueChange={(value) => onSelectComponent(value as ComponentType)}
        className="flex h-full min-h-0 flex-col"
      >
        {/* 终端头:凹陷面上的组件分段切换,选中项高面滑块跟随 */}
        <div
          className="flex items-center border-b px-4 py-3"
          style={{ borderColor: "var(--ls-hairline)" }}
        >
          <TabsList>
            {availableComponents.map((comp) => (
              <TabsTrigger key={comp} value={comp}>
                <span className="flex items-center gap-2">
                  {comp === "MaiBot" ? "MaiBot" : "NapCat"}
                  <StatusDot
                    running={getComponentStatus(comp)?.running === true}
                  />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 日志正文:统一风格的结构化日志视图(剥 ANSI + 解析 level/模块),非 xterm 终端 */}
        {availableComponents.map((comp) => (
          <TabsContent
            key={comp}
            value={comp}
            className="m-0 min-h-0 flex-1 outline-none"
            motionProps={{ className: "h-full" }}
          >
            <ComponentLogView
              key={`${instance.id}-${comp}`}
              instanceId={instance.id}
              component={comp}
              className="h-full"
            />
          </TabsContent>
        ))}
      </Tabs>
    </Surface>
  );
}

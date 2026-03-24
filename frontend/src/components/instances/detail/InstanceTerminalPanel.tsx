import { ComponentType, Instance, RuntimeKind } from '@/services/instanceApi';
import { TerminalComponent } from '@/components/terminal/TerminalComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ComponentStatusInfo {
  running?: boolean;
  runtime_kind?: RuntimeKind;
}

interface InstanceTerminalPanelProps {
  instance: Instance;
  selectedComponent: ComponentType;
  onSelectComponent: (component: ComponentType) => void;
  availableComponents: ComponentType[];
  getComponentStatus: (component: ComponentType) => ComponentStatusInfo | undefined;
}

export function InstanceTerminalPanel({
  instance,
  selectedComponent,
  onSelectComponent,
  availableComponents,
  getComponentStatus,
}: InstanceTerminalPanelProps) {
  return (
    <div className="flex-1 bg-[#1e1e1e] rounded-panel shadow-panel overflow-hidden flex flex-col">
      <div className="flex items-center px-4 py-3 bg-[#252526] border-b border-gray-700/30">
        <div className="flex gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>

        <Tabs
          value={selectedComponent}
          onValueChange={(value) => onSelectComponent(value as ComponentType)}
          className="flex-1"
        >
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            {availableComponents.map((comp) => (
              <TabsTrigger
                key={comp}
                value={comp}
                className="relative px-3 py-1 text-xs font-medium text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700/50 rounded-md transition-all"
              >
                <span className="flex items-center gap-2">
                  {comp === 'MaiBot' ? 'MaiBot' : comp === 'NapCat' ? 'NapCat' : 'Adapter'}
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      getComponentStatus(comp)?.running
                        ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                        : 'bg-gray-600'
                    }`}
                  />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 relative">
        <Tabs value={selectedComponent} className="h-full">
          {availableComponents.map((comp) => (
            <TabsContent key={comp} value={comp} className="h-full m-0">
              <TerminalComponent
                key={`${instance.id}-${comp}`}
                instanceId={instance.id}
                component={comp}
                className="h-full"
                isRunning={getComponentStatus(comp)?.running === true}
                runtimeKind={getComponentStatus(comp)?.runtime_kind ?? instance.runtime_profile.kind}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

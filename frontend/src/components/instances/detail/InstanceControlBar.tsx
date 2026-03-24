import { ComponentType, RuntimeKind } from '@/services/instanceApi';
import {
  Play,
  Square,
  RotateCw,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ComponentStatusInfo {
  running?: boolean;
  runtime_kind?: RuntimeKind;
}

interface InstanceControlBarProps {
  selectedComponent: ComponentType;
  selectedStartTarget: ComponentType | 'all';
  onSelectStartTarget: (target: ComponentType | 'all') => void;
  actionLoading: 'start' | 'stop' | 'restart' | null;
  allComponentsRunning: boolean;
  hasAnyComponentRunning: boolean;
  getComponentStatus: (component: ComponentType) => ComponentStatusInfo | undefined;
  onStart: (component?: ComponentType) => void;
  onStop: (component?: ComponentType) => void;
  onRestart: (component?: ComponentType) => void;
}

export function InstanceControlBar({
  selectedComponent,
  selectedStartTarget,
  onSelectStartTarget,
  actionLoading,
  allComponentsRunning,
  hasAnyComponentRunning,
  getComponentStatus,
  onStart,
  onStop,
  onRestart,
}: InstanceControlBarProps) {
  return (
    <div className="glass-panel p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {!allComponentsRunning && (
          <div className="flex items-center bg-green-500/10 rounded-control p-1 border border-green-500/20">
            <Button
              onClick={() => {
                if (selectedStartTarget === 'all') {
                  onStart();
                } else {
                  onStart(selectedStartTarget as ComponentType);
                }
              }}
              disabled={actionLoading === 'start'}
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm h-9 px-4"
            >
              {actionLoading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
              {selectedStartTarget === 'all' ? '启动所有' :
                selectedStartTarget === 'MaiBot' ? '启动 MaiBot' :
                selectedStartTarget === 'NapCat' ? '启动 NapCat' :
                selectedStartTarget === 'MaiBot-Napcat-Adapter' ? '启动 Adapter' : '启动'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-8 text-green-600 hover:bg-green-500/20 rounded-lg ml-1">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={selectedStartTarget} onValueChange={(v) => onSelectStartTarget(v as ComponentType | 'all')}>
                  {!hasAnyComponentRunning && (
                    <DropdownMenuRadioItem value="all">所有组件</DropdownMenuRadioItem>
                  )}
                  {!getComponentStatus('MaiBot')?.running && (
                    <DropdownMenuRadioItem value="MaiBot">MaiBot</DropdownMenuRadioItem>
                  )}
                  {!getComponentStatus('NapCat')?.running && (
                    <DropdownMenuRadioItem value="NapCat">NapCat</DropdownMenuRadioItem>
                  )}
                  {!getComponentStatus('MaiBot-Napcat-Adapter')?.running && (
                    <DropdownMenuRadioItem value="MaiBot-Napcat-Adapter">Adapter</DropdownMenuRadioItem>
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {hasAnyComponentRunning && (
          <>
            <div className="flex items-center bg-red-500/10 rounded-control p-1 border border-red-500/20">
              <Button
                onClick={() => onStop()}
                disabled={actionLoading === 'stop'}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm h-9 px-4"
              >
                {actionLoading === 'stop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-2 fill-current" />}
                停止
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-8 text-red-600 hover:bg-red-500/20 rounded-lg ml-1">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStop()}>所有组件</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStop('MaiBot')}>MaiBot</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStop('NapCat')}>NapCat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStop('MaiBot-Napcat-Adapter')}>Adapter</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center bg-blue-500/10 rounded-control p-1 border border-blue-500/20">
              <Button
                onClick={() => onRestart()}
                disabled={actionLoading === 'restart'}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm h-9 px-4"
              >
                {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
                重启
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-8 text-blue-600 hover:bg-blue-500/20 rounded-lg ml-1">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRestart()}>所有组件</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRestart('MaiBot')}>MaiBot</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRestart('NapCat')}>NapCat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRestart('MaiBot-Napcat-Adapter')}>Adapter</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      <div className="text-xs text-gray-400 font-medium px-2">
        {selectedComponent === 'MaiBot' ? 'MaiBot Console' : selectedComponent === 'NapCat' ? 'NapCat Console' : 'Adapter Console'}
      </div>
    </div>
  );
}

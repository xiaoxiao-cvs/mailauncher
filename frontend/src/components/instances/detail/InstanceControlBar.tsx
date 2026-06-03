import { ComponentType, RuntimeKind } from "@/services/instanceApi";
import {
  Play,
  Square,
  RotateCw,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Surface,
} from "@/components/ls";

interface ComponentStatusInfo {
  running?: boolean;
  runtime_kind?: RuntimeKind;
}

interface InstanceControlBarProps {
  selectedComponent: ComponentType;
  selectedStartTarget: ComponentType | "all";
  onSelectStartTarget: (target: ComponentType | "all") => void;
  actionLoading: "start" | "stop" | "restart" | null;
  allComponentsRunning: boolean;
  hasAnyComponentRunning: boolean;
  getComponentStatus: (
    component: ComponentType,
  ) => ComponentStatusInfo | undefined;
  onStart: (component?: ComponentType) => void;
  onStop: (component?: ComponentType) => void;
  onRestart: (component?: ComponentType) => void;
}

const START_LABEL: Record<ComponentType | "all", string> = {
  all: "启动所有",
  MaiBot: "启动 MaiBot",
  NapCat: "启动 NapCat",
};

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
    <Surface variant="panel" className="flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        {!allComponentsRunning && (
          <div className="flex items-center gap-1">
            <Button
              variant="life"
              onClick={() => {
                if (selectedStartTarget === "all") {
                  onStart();
                } else {
                  onStart(selectedStartTarget as ComponentType);
                }
              }}
              disabled={actionLoading === "start"}
            >
              {actionLoading === "start" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {START_LABEL[selectedStartTarget]}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="life"
                  aria-label="选择启动目标"
                  className="!px-2"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!hasAnyComponentRunning && (
                  <DropdownMenuItem onClick={() => onSelectStartTarget("all")}>
                    <Check
                      size={16}
                      style={{
                        opacity: selectedStartTarget === "all" ? 1 : 0,
                      }}
                    />
                    所有组件
                  </DropdownMenuItem>
                )}
                {!getComponentStatus("MaiBot")?.running && (
                  <DropdownMenuItem
                    onClick={() => onSelectStartTarget("MaiBot")}
                  >
                    <Check
                      size={16}
                      style={{
                        opacity: selectedStartTarget === "MaiBot" ? 1 : 0,
                      }}
                    />
                    MaiBot
                  </DropdownMenuItem>
                )}
                {!getComponentStatus("NapCat")?.running && (
                  <DropdownMenuItem
                    onClick={() => onSelectStartTarget("NapCat")}
                  >
                    <Check
                      size={16}
                      style={{
                        opacity: selectedStartTarget === "NapCat" ? 1 : 0,
                      }}
                    />
                    NapCat
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {hasAnyComponentRunning && (
          <>
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                onClick={() => onStop()}
                disabled={actionLoading === "stop"}
              >
                {actionLoading === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 fill-current" />
                )}
                停止
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="destructive"
                    aria-label="选择停止目标"
                    className="!px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStop()}>
                    所有组件
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStop("MaiBot")}>
                    MaiBot
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStop("NapCat")}>
                    NapCat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="solid"
                onClick={() => onRestart()}
                disabled={actionLoading === "restart"}
              >
                {actionLoading === "restart" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                重启
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="solid"
                    aria-label="选择重启目标"
                    className="!px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRestart()}>
                    所有组件
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRestart("MaiBot")}>
                    MaiBot
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRestart("NapCat")}>
                    NapCat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      <div
        className="px-2 text-xs font-medium"
        style={{ color: "var(--ls-ink-faint)" }}
      >
        {selectedComponent === "MaiBot" ? "MaiBot Console" : "NapCat Console"}
      </div>
    </Surface>
  );
}

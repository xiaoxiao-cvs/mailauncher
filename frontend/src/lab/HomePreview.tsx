import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { TactileButton } from "@/components/ls";
import { HomeView, type HomeRange } from "@/pages/home/HomeView";
import type { SystemInfo, SystemStats } from "@/services/systemApi";
import type { StatsSummary, ModelStats } from "@/hooks/queries/useStatsQueries";
import type { MessageQueueResponse } from "@/services/messageQueueApi";

/**
 * Preview 入口(无需 Tauri):用 mock 数据喂 HomeView 数据看板,验证 Living Surfaces 首页视觉。
 * mock 覆盖系统信息 + 实时资源、统计概览、头部模型分布、消息队列在途条目与时间序列。
 * vite dev 下访问 /home.html 即可预览。
 */

const GiB = 1024 ** 3;

const mockSystemInfo: SystemInfo = {
  os_name: "Windows",
  os_long_version: "Windows 11 Pro for Workstations",
  kernel_version: "10.0.26200",
  hostname: "MAI-WORKSTATION",
  cpu_brand: "AMD Ryzen 9 7950X 16-Core Processor",
  cpu_frequency: 4500,
  cpu_physical_cores: 16,
  cpu_logical_cores: 32,
  arch: "x86_64",
  launcher_version: "0.1.0",
  memory_total: 64 * GiB,
};

const mockSystemStats: SystemStats = {
  cpu_usage: 18.4,
  cpu_core_count: 32,
  memory_total: 64 * GiB,
  memory_used: 21.6 * GiB,
  swap_total: 16 * GiB,
  swap_used: 1.2 * GiB,
  disk_total: 931 * GiB,
  disk_available: 402 * GiB,
  net_rx_rate: 1.2 * 1024 * 1024,
  net_tx_rate: 240 * 1024,
  uptime_secs: 5 * 3600 + 23 * 60 + 11,
  load_avg_1: 4.12,
  load_avg_5: 3.78,
  load_avg_15: 3.5,
};

const mockSummary: StatsSummary = {
  total_requests: 8421,
  total_cost: 12.47,
  total_tokens: 2_340_115,
  input_tokens: 1_902_004,
  output_tokens: 438_111,
  online_time: 5 * 3600 + 23 * 60 + 11,
  total_messages: 12840,
  total_replies: 9633,
  avg_response_time: 1.82,
  cost_per_hour: 0.52,
  tokens_per_hour: 97_504,
};

function makeModel(
  over: Partial<ModelStats> & Pick<ModelStats, "model_name" | "total_cost">,
): ModelStats {
  return {
    display_name: null,
    request_count: 0,
    total_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    avg_response_time: 1.5,
    ...over,
  };
}

const mockModels: ModelStats[] = [
  makeModel({
    model_name: "gpt-4o",
    display_name: "gpt-4o",
    total_cost: 5.21,
    request_count: 3120,
  }),
  makeModel({
    model_name: "deepseek-v3",
    total_cost: 3.04,
    request_count: 2600,
  }),
  makeModel({
    model_name: "claude-haiku-4.5",
    total_cost: 2.1,
    request_count: 1500,
  }),
  makeModel({
    model_name: "gemini-2.5-flash",
    total_cost: 1.25,
    request_count: 900,
  }),
  makeModel({ model_name: "qwen-max", total_cost: 0.87, request_count: 301 }),
];

const mockQueues: MessageQueueResponse[] = [
  {
    instance_id: "inst-main",
    instance_name: "麦麦 · 主实例",
    connected: true,
    total_processed: 12840,
    error: null,
    messages: [
      {
        id: "m1",
        stream_id: "s1",
        group_name: "测试群",
        status: "generating",
        cycle_count: 1,
        retry_count: 0,
        retry_reason: null,
        action_type: "reply",
        start_time: Date.now() / 1000,
        sent_time: null,
        message_preview: "正在生成回复…",
      },
      {
        id: "m2",
        stream_id: "s2",
        group_name: "闲聊",
        status: "planning",
        cycle_count: 1,
        retry_count: 0,
        retry_reason: null,
        action_type: "reply",
        start_time: Date.now() / 1000,
        sent_time: null,
        message_preview: "思考中…",
      },
      {
        id: "m3",
        stream_id: "s3",
        group_name: "闲聊",
        status: "sent",
        cycle_count: 1,
        retry_count: 0,
        retry_reason: null,
        action_type: "reply",
        start_time: Date.now() / 1000 - 30,
        sent_time: Date.now() / 1000 - 12,
        message_preview: "已发送",
      },
    ],
  },
  {
    instance_id: "inst-night",
    instance_name: "夜间值守",
    connected: true,
    total_processed: 540,
    error: null,
    messages: [
      {
        id: "n1",
        stream_id: "ns1",
        group_name: null,
        status: "sending",
        cycle_count: 1,
        retry_count: 0,
        retry_reason: null,
        action_type: "reply",
        start_time: Date.now() / 1000,
        sent_time: null,
        message_preview: "发送中…",
      },
    ],
  },
];

const mockHistory = [
  210, 180, 320, 290, 410, 380, 520, 470, 610, 560, 700, 980,
];

export function HomePreview() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [range, setRange] = useState<HomeRange>("24h");

  const setThemeAttr = (next: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };

  return (
    <div className="min-h-full px-4 pb-6">
      <div className="mx-auto flex w-full items-center justify-between px-2 pt-6">
        <div
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          mailauncher · home preview
        </div>
        <TactileButton
          variant="solid"
          onClick={() => setThemeAttr(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          {theme === "light" ? "暗色" : "亮色"}
        </TactileButton>
      </div>

      <HomeView
        overview={{
          totalInstances: 5,
          runningInstances: 2,
          summary: mockSummary,
          topModels: mockModels,
        }}
        queues={mockQueues}
        systemInfo={mockSystemInfo}
        systemStats={mockSystemStats}
        range={range}
        onRangeChange={setRange}
        messageHistory={mockHistory}
      />
    </div>
  );
}

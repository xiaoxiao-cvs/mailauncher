import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import {
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ls";
import { springSoft } from "@/design/motion";
import { useSystemMonitor } from "@/hooks/useSystemMonitor";
import { OverviewTab } from "./monitor/tabs/OverviewTab";
import { CpuTab } from "./monitor/tabs/CpuTab";
import { MemoryTab } from "./monitor/tabs/MemoryTab";
import { DiskTab } from "./monitor/tabs/DiskTab";
import { NetworkTab } from "./monitor/tabs/NetworkTab";

/**
 * 监控 hub 页面壳 —— 顶部生息标题区 + LS Tabs 切换五个 deep tab。
 * tab 选择由 URL 段 /monitor/:tab? 单向驱动(useParams 读 -> Tabs 受控 -> 切换时 navigate 写回),
 * 浏览器前进/后退与刷新均保留当前 tab。系统数据在此一次性取(useSystemMonitor),逐个透传给各 tab,
 * 避免每个 tab 各自订阅造成重复连接。各 tab 按 MonitorTabProps 契约渲染其资源视图。
 */

interface MonitorTabDef {
  /** URL 段与 Radix tab value(全小写,稳定标识) */
  value: string;
  /** Tab 触发器中文标签 */
  label: string;
  /** 该 tab 的渲染组件,接收统一的 MonitorTabProps */
  Comp: React.ComponentType<{
    info: ReturnType<typeof useSystemMonitor>["info"];
    stats: ReturnType<typeof useSystemMonitor>["stats"];
  }>;
}

// tab 注册表是 TabsTrigger 列表与 TabsContent 列表的单一事实源,二者由它派生,避免两处手写漂移。
const MONITOR_TABS: MonitorTabDef[] = [
  { value: "overview", label: "系统总览", Comp: OverviewTab },
  { value: "cpu", label: "CPU", Comp: CpuTab },
  { value: "memory", label: "内存", Comp: MemoryTab },
  { value: "disk", label: "硬盘", Comp: DiskTab },
  { value: "network", label: "网络", Comp: NetworkTab },
];

const DEFAULT_TAB = "overview";

export function MonitorPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { info, stats } = useSystemMonitor();

  // URL 段可能缺省(/monitor)或为未知值(手输 /monitor/foo);两种情况都归一到默认 tab,
  // 防止把未知 value 喂给 Radix 导致无任何 TabsContent 命中、内容区空白。
  const activeTab = MONITOR_TABS.some((t) => t.value === tab)
    ? tab!
    : DEFAULT_TAB;

  return (
    <motion.div
      className="px-2 py-1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <Card>
        <div
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--ls-ink-faint)" }}
        >
          监控
        </div>
        <h1 className="mt-1 text-2xl font-semibold">系统监控</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ls-ink-soft)" }}>
          主机资源实时概览,按维度深入查看 CPU、内存、硬盘与网络。
        </p>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate("/monitor/" + value)}
        className="mt-5"
      >
        <TabsList>
          {MONITOR_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {MONITOR_TABS.map(({ value, Comp }) => (
          <TabsContent key={value} value={value} className="mt-4">
            <Comp info={info} stats={stats} />
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
}

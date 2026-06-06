import { useEffect, useState } from "react";
import {
  Boxes,
  GitBranch,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react";

import { Surface, Input, Switch, TactileButton, Badge } from "@/components/ls";
import {
  useSourceConfigQuery,
  useSaveSourceConfigMutation,
  type SourceConfig,
  type GithubMirror,
  type PypiSource,
} from "@/hooks/queries/useSourceProxyQueries";

/**
 * 下载源管理面板
 * GitHub 前缀镜像源 + PyPI 源的增删 / 上下移排序 / 优先级 / 启停。
 * "启用且优先级最高"者为实际生效源(后端 pick_active_*)。
 * 共用一份 source_config(整块保存):结构性变更(增删/移动/启停)即时落库,
 * 文本/数值字段编辑在失焦时落库,避免每次按键都写。
 */
export function SourceManagerPanel() {
  const { data: serverConfig, isLoading } = useSourceConfigQuery();
  const saveConfig = useSaveSourceConfigMutation();

  // 本地草稿:承载编辑中的字段值,结构性变更与失焦时同步到后端。
  const [draft, setDraft] = useState<SourceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (serverConfig) setDraft(serverConfig);
  }, [serverConfig]);

  const persist = (next: SourceConfig) => {
    setDraft(next);
    setError(null);
    setSaved(false);
    saveConfig.mutate(next, {
      onSuccess: () => setSaved(true),
      onError: (e) => setError(String(e)),
    });
  };

  if (isLoading || !draft) {
    return (
      <Surface variant="panel" className="p-6">
        <p className="text-sm" style={{ color: "var(--ls-ink-soft)" }}>
          正在加载下载源配置...
        </p>
      </Surface>
    );
  }

  // 生成唯一 id(新增行用)。
  const newId = (kind: string) =>
    `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // ==================== GitHub 镜像操作 ====================

  const githubActive = pickActive(draft.github);

  const updateGithub = (next: GithubMirror[]) =>
    persist({ ...draft, github: next });

  const addGithub = () =>
    updateGithub([
      ...draft.github,
      {
        id: newId("github"),
        name: "新镜像",
        prefix: "",
        priority: nextPriority(draft.github),
        enabled: false,
      },
    ]);

  const patchGithub = (id: string, patch: Partial<GithubMirror>) =>
    setDraft({
      ...draft,
      github: draft.github.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });

  // ==================== PyPI 源操作 ====================

  const pypiActive = pickActive(draft.pypi);

  const updatePypi = (next: PypiSource[]) => persist({ ...draft, pypi: next });

  const addPypi = () =>
    updatePypi([
      ...draft.pypi,
      {
        id: newId("pypi"),
        name: "新源",
        index_url: "",
        priority: nextPriority(draft.pypi),
        enabled: false,
      },
    ]);

  const patchPypi = (id: string, patch: Partial<PypiSource>) =>
    setDraft({
      ...draft,
      pypi: draft.pypi.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  return (
    <div className="space-y-6">
      {/* —— GitHub 镜像源 —— */}
      <Surface variant="panel" className="p-6">
        <SectionHeader
          icon={<GitBranch size={20} />}
          title="GitHub 镜像源"
          subtitle="前缀拼接式镜像，加速 git clone(空前缀=官方直连)"
          onAdd={addGithub}
          disabled={saveConfig.isPending}
        />

        <div className="space-y-2">
          {draft.github.map((m, idx) => (
            <SourceRow
              key={m.id}
              isActive={githubActive?.id === m.id}
              enabled={m.enabled}
              priority={m.priority}
              canMoveUp={idx > 0}
              canMoveDown={idx < draft.github.length - 1}
              disabled={saveConfig.isPending}
              onToggle={(enabled) =>
                updateGithub(
                  draft.github.map((x) =>
                    x.id === m.id ? { ...x, enabled } : x,
                  ),
                )
              }
              onMoveUp={() =>
                updateGithub(moveItem(draft.github, idx, idx - 1))
              }
              onMoveDown={() =>
                updateGithub(moveItem(draft.github, idx, idx + 1))
              }
              onDelete={() =>
                updateGithub(draft.github.filter((x) => x.id !== m.id))
              }
              onPriorityChange={(priority) => patchGithub(m.id, { priority })}
              onPriorityCommit={() => persist(draft)}
              nameField={
                <Input
                  value={m.name}
                  onChange={(e) => patchGithub(m.id, { name: e.target.value })}
                  onBlur={() => persist(draft)}
                  placeholder="镜像名称"
                  disabled={saveConfig.isPending}
                  className="disabled:opacity-60"
                />
              }
              urlField={
                <Input
                  value={m.prefix}
                  onChange={(e) =>
                    patchGithub(m.id, { prefix: e.target.value })
                  }
                  onBlur={() => persist(draft)}
                  placeholder="https://gh-proxy.com/  (留空=官方直连)"
                  disabled={saveConfig.isPending}
                  className="font-mono disabled:opacity-60"
                />
              }
            />
          ))}
        </div>
      </Surface>

      {/* —— PyPI 源 —— */}
      <Surface variant="panel" className="p-6">
        <SectionHeader
          icon={<Boxes size={20} />}
          title="PyPI 源"
          subtitle="pip 安装依赖使用的 index-url(http 源自动附 trusted-host)"
          onAdd={addPypi}
          disabled={saveConfig.isPending}
        />

        <div className="space-y-2">
          {draft.pypi.map((s, idx) => (
            <SourceRow
              key={s.id}
              isActive={pypiActive?.id === s.id}
              enabled={s.enabled}
              priority={s.priority}
              canMoveUp={idx > 0}
              canMoveDown={idx < draft.pypi.length - 1}
              disabled={saveConfig.isPending}
              onToggle={(enabled) =>
                updatePypi(
                  draft.pypi.map((x) =>
                    x.id === s.id ? { ...x, enabled } : x,
                  ),
                )
              }
              onMoveUp={() => updatePypi(moveItem(draft.pypi, idx, idx - 1))}
              onMoveDown={() => updatePypi(moveItem(draft.pypi, idx, idx + 1))}
              onDelete={() =>
                updatePypi(draft.pypi.filter((x) => x.id !== s.id))
              }
              onPriorityChange={(priority) => patchPypi(s.id, { priority })}
              onPriorityCommit={() => persist(draft)}
              nameField={
                <Input
                  value={s.name}
                  onChange={(e) => patchPypi(s.id, { name: e.target.value })}
                  onBlur={() => persist(draft)}
                  placeholder="源名称"
                  disabled={saveConfig.isPending}
                  className="disabled:opacity-60"
                />
              }
              urlField={
                <Input
                  value={s.index_url}
                  onChange={(e) =>
                    patchPypi(s.id, { index_url: e.target.value })
                  }
                  onBlur={() => persist(draft)}
                  placeholder="https://pypi.org/simple"
                  disabled={saveConfig.isPending}
                  className="font-mono disabled:opacity-60"
                />
              }
            />
          ))}
        </div>
      </Surface>

      {saved && !error && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--ls-life)" }}
        >
          <Check size={14} />
          已保存
        </div>
      )}
      {error && (
        <Surface variant="inset" className="p-3">
          <p
            className="break-words text-xs"
            style={{ color: "var(--ls-danger)" }}
          >
            {error}
          </p>
        </Surface>
      )}
    </div>
  );
}

// ==================== 子组件 ====================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onAdd: () => void;
  disabled: boolean;
}

function SectionHeader({
  icon,
  title,
  subtitle,
  onAdd,
  disabled,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--ls-r-control)]"
          style={{ background: "var(--ls-bg-2)", color: "var(--ls-ink-soft)" }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--ls-ink-soft)" }}>
            {subtitle}
          </p>
        </div>
      </div>
      <TactileButton
        variant="ghost"
        onClick={onAdd}
        disabled={disabled}
        className="shrink-0 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        添加
      </TactileButton>
    </div>
  );
}

interface SourceRowProps {
  isActive: boolean;
  enabled: boolean;
  priority: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  nameField: React.ReactNode;
  urlField: React.ReactNode;
  onToggle: (enabled: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onPriorityChange: (priority: number) => void;
  onPriorityCommit: () => void;
}

/**
 * 单个源行:启停开关 + 名称 + URL/前缀 + 优先级 + 上下移 + 删除。
 * 生效中的源(启用且优先级最高)挂"生效中"徽标。
 */
function SourceRow({
  isActive,
  enabled,
  priority,
  canMoveUp,
  canMoveDown,
  disabled,
  nameField,
  urlField,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  onPriorityChange,
  onPriorityCommit,
}: SourceRowProps) {
  return (
    <Surface variant="inset" className="p-3">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label="启用此源"
        />

        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {nameField}
          {urlField}
        </div>

        <div className="flex w-20 shrink-0 flex-col gap-1">
          <span
            className="text-[10px]"
            style={{ color: "var(--ls-ink-faint)" }}
          >
            优先级
          </span>
          <Input
            type="number"
            value={String(priority)}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              onPriorityChange(Number.isFinite(n) ? n : 0);
            }}
            onBlur={onPriorityCommit}
            disabled={disabled}
            className="font-mono disabled:opacity-60"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <TactileButton
            variant="ghost"
            onClick={onMoveUp}
            disabled={disabled || !canMoveUp}
            className="h-8 w-8 justify-center p-0 disabled:opacity-30"
            aria-label="上移"
          >
            <ArrowUp className="h-4 w-4" />
          </TactileButton>
          <TactileButton
            variant="ghost"
            onClick={onMoveDown}
            disabled={disabled || !canMoveDown}
            className="h-8 w-8 justify-center p-0 disabled:opacity-30"
            aria-label="下移"
          >
            <ArrowDown className="h-4 w-4" />
          </TactileButton>
          <TactileButton
            variant="ghost"
            onClick={onDelete}
            disabled={disabled}
            className="h-8 w-8 justify-center p-0 disabled:opacity-60"
            style={{ color: "var(--ls-danger)" }}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </TactileButton>
        </div>
      </div>

      {isActive && (
        <div className="mt-2">
          <Badge tone="life">生效中</Badge>
        </div>
      )}
    </Surface>
  );
}

// ==================== 纯工具 ====================

/** 选"启用且优先级最高"者(同优先级取先出现的),与后端 pick_active_* 一致。 */
function pickActive<T extends { enabled: boolean; priority: number }>(
  list: T[],
): T | undefined {
  return list
    .filter((x) => x.enabled)
    .reduce<
      T | undefined
    >((best, cur) => (!best || cur.priority > best.priority ? cur : best), undefined);
}

/** 新增行的默认优先级:比当前最大值高 10,自然排到最前。 */
function nextPriority(list: { priority: number }[]): number {
  if (list.length === 0) return 100;
  return Math.max(...list.map((x) => x.priority)) + 10;
}

/** 交换 from/to 两个下标的元素,返回新数组(越界则原样返回)。 */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

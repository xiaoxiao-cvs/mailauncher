/**
 * 网络代理与下载源相关的 React Query hooks
 *
 * 通过 Tauri invoke 调用 Rust 命令：
 * - get_network_proxy / set_network_proxy
 * - get_source_config / save_source_config
 *
 * 后端契约见 src-tauri/src/commands/source_proxy.rs 与 source_proxy_service.rs。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tauriInvoke } from "@/services/tauriInvoke";

// ==================== Types ====================

/** 网络代理（Clash/Mihomo 风格 host:port，仅 HTTP 代理） */
export interface NetworkProxy {
  enabled: boolean;
  host: string;
  port: number;
}

/** GitHub 前缀镜像源 */
export interface GithubMirror {
  id: string;
  name: string;
  /** 拼接前缀，空串=官方直连 */
  prefix: string;
  priority: number;
  enabled: boolean;
}

/** PyPI 源 */
export interface PypiSource {
  id: string;
  name: string;
  index_url: string;
  priority: number;
  enabled: boolean;
}

/** 下载源整体配置 */
export interface SourceConfig {
  github: GithubMirror[];
  pypi: PypiSource[];
}

// ==================== Query Keys ====================

export const sourceProxyKeys = {
  all: ["source-proxy"] as const,
  networkProxy: () => [...sourceProxyKeys.all, "network-proxy"] as const,
  sourceConfig: () => [...sourceProxyKeys.all, "source-config"] as const,
};

// ==================== Queries ====================

/** 获取网络代理配置（无配置时后端返回默认） */
export function useNetworkProxyQuery() {
  return useQuery({
    queryKey: sourceProxyKeys.networkProxy(),
    queryFn: async () => tauriInvoke<NetworkProxy>("get_network_proxy"),
  });
}

/** 获取下载源配置（无配置时后端返回种子默认） */
export function useSourceConfigQuery() {
  return useQuery({
    queryKey: sourceProxyKeys.sourceConfig(),
    queryFn: async () => tauriInvoke<SourceConfig>("get_source_config"),
  });
}

// ==================== Mutations ====================

/** 保存网络代理配置 */
export function useSaveNetworkProxyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (proxy: NetworkProxy) => {
      await tauriInvoke("set_network_proxy", { proxy });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sourceProxyKeys.networkProxy(),
      });
    },
  });
}

/** 保存下载源配置 */
export function useSaveSourceConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: SourceConfig) => {
      await tauriInvoke("save_source_config", { config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sourceProxyKeys.sourceConfig(),
      });
    },
  });
}

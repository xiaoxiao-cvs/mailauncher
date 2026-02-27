/**
 * 消息队列 API 服务
 * 已迁移至 Tauri IPC 调用
 */

import { tauriInvoke } from '@/services/tauriInvoke';

// ==================== Types ====================

export type MessageStatus = 'pending' | 'planning' | 'generating' | 'sending' | 'sent' | 'failed';

export interface MessageQueueItem {
  id: string;
  stream_id: string;
  group_name: string | null;
  status: MessageStatus;
  cycle_count: number;
  retry_count: number;
  retry_reason: string | null;
  action_type: string | null;
  start_time: number;
  sent_time: number | null;
  message_preview: string | null;
}

export interface MessageQueueResponse {
  instance_id: string;
  instance_name: string;
  connected: boolean;
  messages: MessageQueueItem[];
  total_processed: number;
  error: string | null;
}

// ==================== API Client ====================

class MessageQueueApiClient {
  /**
   * 获取单个实例的消息队列
   */
  async getInstanceQueue(instanceId: string): Promise<MessageQueueResponse> {
    return tauriInvoke<MessageQueueResponse>('get_instance_message_queue', { instanceId });
  }

  /**
   * 获取所有实例的消息队列
   */
  async getAllQueues(): Promise<MessageQueueResponse[]> {
    return tauriInvoke<MessageQueueResponse[]>('get_all_message_queues');
  }
}

export const messageQueueApi = new MessageQueueApiClient();

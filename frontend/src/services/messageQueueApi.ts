/**
 * 消息队列 API 服务
 */

import { apiJson } from '@/config/api';

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
    return apiJson<MessageQueueResponse>(`instances/${instanceId}/message-queue`);
  }

  /**
   * 获取所有实例的消息队列
   */
  async getAllQueues(): Promise<Record<string, MessageQueueResponse>> {
    return apiJson<Record<string, MessageQueueResponse>>('message-queue');
  }
}

export const messageQueueApi = new MessageQueueApiClient();

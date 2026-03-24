/**
 * 消息队列面板组件
 * 编排统计栏、历史趋势图和消息列表子组件
 */

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  useInstanceMessageQueueQuery,
  useAllMessageQueuesQuery,
} from '@/hooks/queries/useMessageQueueQueries';
import { useQueueRefreshStrategy } from './useQueueRefreshStrategy';
import { MessageQueueStats } from './MessageQueueStats';
import { MessageQueueList, type EnrichedMessage } from './MessageQueueList';
import { QueueSparkline } from './QueueSparkline';

interface MessageQueuePanelProps {
  instanceId?: string | null;
  className?: string;
}

export function MessageQueuePanel({ instanceId, className }: MessageQueuePanelProps) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const { refetchInterval, notifyActive } = useQueueRefreshStrategy();

  const singleInstanceQuery = useInstanceMessageQueueQuery(instanceId || null, {
    refetchInterval,
    enabled: !!instanceId,
  });

  const allQueuesQuery = useAllMessageQueuesQuery({
    refetchInterval,
    enabled: !instanceId,
  });

  const isLoading = instanceId ? singleInstanceQuery.isLoading : allQueuesQuery.isLoading;
  const error = (instanceId ? singleInstanceQuery.error : allQueuesQuery.error) as Error | null;

  const allInstancesData = useMemo(() => {
    if (instanceId && singleInstanceQuery.data) {
      return [singleInstanceQuery.data];
    }
    if (!instanceId && allQueuesQuery.data) {
      return Object.values(allQueuesQuery.data);
    }
    return [];
  }, [instanceId, singleInstanceQuery.data, allQueuesQuery.data]);

  const allMessages = useMemo(() => {
    const messages: EnrichedMessage[] = [];
    allInstancesData.forEach(instance => {
      if (instance.messages) {
        instance.messages.forEach(msg => {
          messages.push({
            ...msg,
            instanceName: instance.instance_name,
            instanceConnected: instance.connected,
          });
        });
      }
    });
    return messages.sort((a, b) => b.start_time - a.start_time);
  }, [allInstancesData]);

  const stats = useMemo(() => {
    const connectedCount = allInstancesData.filter(i => i.connected).length;
    const totalProcessed = allInstancesData.reduce((sum, i) => sum + (i.total_processed || 0), 0);
    const hasAnyConnected = connectedCount > 0;
    return { connectedCount, totalProcessed, hasAnyConnected };
  }, [allInstancesData]);

  useEffect(() => {
    const hasActiveMessages = allMessages.some(
      msg => !['sent', 'failed'].includes(msg.status)
    );
    if (hasActiveMessages) {
      notifyActive();
    }
  }, [allMessages, notifyActive]);

  return (
    <div className={cn("glass-panel p-6", className)}>
      <MessageQueueStats
        refetchInterval={refetchInterval}
        totalProcessed={stats.totalProcessed}
        hasAnyConnected={stats.hasAnyConnected}
        privacyMode={privacyMode}
        onTogglePrivacy={() => setPrivacyMode(prev => !prev)}
      />

      <QueueSparkline
        totalProcessed={stats.totalProcessed}
        hasAnyConnected={stats.hasAnyConnected}
      />

      <MessageQueueList
        allMessages={allMessages}
        isLoading={isLoading}
        error={error}
        hasAnyConnected={stats.hasAnyConnected}
        showInstanceName={!instanceId}
        privacyMode={privacyMode}
      />
    </div>
  );
}

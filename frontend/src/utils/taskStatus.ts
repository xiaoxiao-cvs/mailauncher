import { TaskStatus } from '@/types/notification'

export function mapServerStatusToTaskStatus(status: string): TaskStatus {
  if (status === 'downloading') return TaskStatus.DOWNLOADING
  if (status === 'installing') return TaskStatus.INSTALLING
  if (status === 'configuring') return TaskStatus.INSTALLING
  if (status === 'completed') return TaskStatus.SUCCESS
  if (status === 'failed') return TaskStatus.FAILED
  return TaskStatus.PENDING
}

/**
 * 通知类型定义
 */

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /** 下载/安装任务 */
  TASK = 'task',
  /** 消息通知 */
  MESSAGE = 'message',
  /** 警告通知 */
  WARNING = 'warning',
  /** 错误通知 */
  ERROR = 'error',
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 等待中 */
  PENDING = 'pending',
  /** 下载中 */
  DOWNLOADING = 'downloading',
  /** 安装中 */
  INSTALLING = 'installing',
  /** 成功 */
  SUCCESS = 'success',
  /** 失败 */
  FAILED = 'failed',
}

/**
 * 通知项接口
 */
export interface Notification {
  /** 通知 ID */
  id: string
  /** 通知类型 */
  type: NotificationType
  /** 标题 */
  title: string
  /** 描述/消息内容 */
  message: string
  /** 创建时间 */
  createdAt: Date
  /** 是否已读 */
  read: boolean
  /** 任务相关数据（仅 type=task 时存在） */
  task?: {
    /** 任务 ID */
    taskId: string
    /** 任务状态 */
    status: TaskStatus
    /** 进度百分比 (0-100) */
    progress: number
    /** 实例名称 */
    instanceName: string
    /** 版本 */
    version: string
    /** 组件列表 */
    components: string[]
    /** 部署路径 */
    deploymentPath: string
  }
}

/**
 * 安装概要状态
 */
export interface InstallOverviewState {
  /** 是否显示概要卡片 */
  visible: boolean
  /** 任务 ID */
  taskId: string | null
  /** 实例名称 */
  instanceName: string
  /** 版本 */
  version: string
  /** 组件列表 */
  components: string[]
  /** 部署路径 */
  deploymentPath: string
  /** 任务状态 */
  status: TaskStatus
  /** 是否加载中（骨架屏） */
  loading: boolean
}

/**
 * 实例详情页面
 * 显示实例的详细信息和终端
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInstanceStore } from '@/stores/instanceStore';
import { ComponentType } from '@/services/instanceApi';
import { TerminalComponent } from '@/components/terminal/TerminalComponent';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Settings,
  Activity,
  Clock,
  Server,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 组件显示名称映射
const componentLabels: Record<ComponentType, string> = {
  main: 'MaiBot 主程序',
  napcat: 'NapCat 服务',
  'napcat-ada': 'NapCat 适配器',
};

export const InstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    instances,
    selectedInstance,
    loading,
    fetchInstance,
    startInstance,
    stopInstance,
    restartInstance,
    startComponent,
    stopComponent,
    fetchComponentStatus,
    componentStatuses,
  } = useInstanceStore();
  
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('main');
  const [componentLoading, setComponentLoading] = useState<ComponentType | null>(null);
  
  const instance = selectedInstance || instances.find((i) => i.id === id);
  
  // 加载实例数据
  useEffect(() => {
    if (id) {
      fetchInstance(id);
      
      // 设置自动刷新（每10秒）
      const interval = setInterval(() => {
        fetchInstance(id);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [id, fetchInstance]);
  
  // 加载组件状态
  useEffect(() => {
    if (id && instance) {
      const components: ComponentType[] = ['main', 'napcat', 'napcat-ada'];
      
      // 立即加载一次
      components.forEach((component) => {
        fetchComponentStatus(id, component).catch(console.error);
      });
      
      // 设置定时刷新组件状态（每10秒）
      const interval = setInterval(() => {
        components.forEach((component) => {
          fetchComponentStatus(id, component).catch(console.error);
        });
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [id, instance, fetchComponentStatus]);
  
  if (!instance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">实例不存在</p>
              <button
                onClick={() => navigate('/instances')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                返回列表
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  
  // 获取组件状态
  const getComponentStatus = (component: ComponentType) => {
    return componentStatuses[instance.id]?.[component];
  };
  
  // 处理实例启动
  const handleStartInstance = async () => {
    try {
      // 先查询一次状态确保正确
      await fetchInstance(instance.id);
      await startInstance(instance.id);
      // 注意：startInstance 内部已经有延迟查询，这里不需要再查询
    } catch (error) {
      console.error('启动实例失败:', error);
    }
  };
  
  // 处理实例停止
  const handleStopInstance = async () => {
    try {
      // 先查询一次状态确保正确
      await fetchInstance(instance.id);
      await stopInstance(instance.id);
      // 注意：stopInstance 内部已经有延迟查询，这里不需要再查询
    } catch (error) {
      console.error('停止实例失败:', error);
    }
  };
  
  // 处理实例重启
  const handleRestartInstance = async () => {
    try {
      // 先查询一次状态确保正确
      await fetchInstance(instance.id);
      await restartInstance(instance.id);
      // 注意：restartInstance 内部已经有延迟查询，这里不需要再查询
    } catch (error) {
      console.error('重启实例失败:', error);
    }
  };
  
  // 处理组件操作
  const handleComponentAction = async (
    component: ComponentType,
    action: 'start' | 'stop'
  ) => {
    setComponentLoading(component);
    try {
      // 先查询一次状态确保正确
      await fetchComponentStatus(instance.id, component);
      
      if (action === 'start') {
        await startComponent(instance.id, component);
      } else {
        await stopComponent(instance.id, component);
      }
      // 注意：startComponent/stopComponent 内部已经会查询状态，这里不需要再查询
    } catch (error) {
      console.error(`${action} 组件失败:`, error);
    } finally {
      setComponentLoading(null);
    }
  };
  
  // 格式化时间
  const formatTime = (dateString?: string) => {
    if (!dateString) return '从未运行';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return '未知';
    }
  };
  
  // 格式化运行时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0秒';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
    
    return parts.join(' ');
  };
  
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped';
  
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instances')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {instance.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {instance.description || '无描述'}
              </p>
            </div>
            
            {/* 状态徽章 */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isRunning
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : isStopped
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}
            >
              {instance.status === 'running'
                ? '运行中'
                : instance.status === 'stopped'
                ? '已停止'
                : instance.status === 'starting'
                ? '启动中'
                : instance.status === 'stopping'
                ? '停止中'
                : '错误'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isStopped && (
              <button
                onClick={handleStartInstance}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg 
                         hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                启动
              </button>
            )}
            
            {isRunning && (
              <>
                <button
                  onClick={handleStopInstance}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                           hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  停止
                </button>
                
                <button
                  onClick={handleRestartInstance}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                           hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  重启
                </button>
              </>
            )}
            
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 左侧信息面板 */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                基本信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">版本</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {instance.bot_version || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">类型</span>
                  <span className="text-gray-900 dark:text-gray-100">{instance.bot_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatTime(instance.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 运行信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                运行信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">最后启动</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatTime(instance.last_run)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">累计运行</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDuration(instance.run_time)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 组件列表 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                组件管理
              </h3>
              <div className="space-y-2">
                {(['main', 'napcat', 'napcat-ada'] as ComponentType[]).map((component) => {
                  const status = getComponentStatus(component);
                  const isComponentRunning = status?.running || false;
                  const isComponentLoading = componentLoading === component;
                  
                  return (
                    <div
                      key={component}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isComponentRunning ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {componentLabels[component]}
                          </span>
                        </div>
                        
                        {status?.pid && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            PID: {status.pid}
                          </span>
                        )}
                      </div>
                      
                      {/* NapCat 首次启动提示 */}
                      {component === 'napcat' && !isComponentRunning && (
                        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium mb-1">💡 首次启动提示</p>
                          <p className="text-yellow-700 dark:text-yellow-300">
                            首次启动时需要扫码登录，请在终端查看二维码。登录成功后，后续可以使用 QQ 号快速启动。
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {isComponentRunning ? (
                          <button
                            onClick={() => handleComponentAction(component, 'stop')}
                            disabled={isComponentLoading}
                            className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded 
                                     hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            停止
                          </button>
                        ) : (
                          <button
                            onClick={() => handleComponentAction(component, 'start')}
                            disabled={isComponentLoading}
                            className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded 
                                     hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            启动
                          </button>
                        )}
                        
                        {status?.uptime && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            {formatDuration(status.uptime)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧终端区域 */}
        <div className="flex-1 flex flex-col">
          {/* 终端工具栏 */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                选择组件终端:
              </label>
              <Select
                value={selectedComponent}
                onValueChange={(value) => setSelectedComponent(value as ComponentType)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">{componentLabels.main}</SelectItem>
                  <SelectItem value="napcat">{componentLabels.napcat}</SelectItem>
                  <SelectItem value="napcat-ada">{componentLabels['napcat-ada']}</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex-1" />
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                当前: {componentLabels[selectedComponent]}
              </div>
            </div>
          </div>
          
          {/* 终端内容 */}
          <div className="flex-1 p-4 overflow-hidden">
            <TerminalComponent
              key={`${instance.id}-${selectedComponent}`}
              instanceId={instance.id}
              component={selectedComponent}
              className="h-full"
              isRunning={
                componentStatuses[instance.id]?.[selectedComponent]?.running === true
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

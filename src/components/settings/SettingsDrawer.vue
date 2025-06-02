<template>
    <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
        <div class="settings-drawer-container"> <!-- 头部 -->
            <div class="settings-header">
                <h2 class="settings-title">系统设置</h2> <button class="btn btn-ghost btn-sm btn-circle"
                    @click="closeDrawer" title="关闭">
                    <IconifyIcon icon="mdi:close" size="lg" />
                </button>
            </div>

            <!-- 主体内容 -->
            <div class="settings-content">
                <!-- 侧边栏导航 -->
                <div class="settings-sidebar">
                    <nav class="settings-nav">
                        <button v-for="tab in settingTabs" :key="tab.key" :class="[
                            'nav-item',
                            { active: activeTab === tab.key }]" @click="switchTab(tab.key)">
                            <IconifyIcon :icon="tab.icon" class="nav-icon" />
                            <span class="nav-label">{{ tab.title }}</span>
                        </button>
                    </nav>
                </div>

                <!-- 主内容区 -->
                <div class="settings-main">
                    <!-- 外观设置 -->
                    <div v-if="activeTab === 'appearance'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">外观设置</h3>
                            <p class="panel-description">自定义界面外观和主题样式</p>
                        </div>

                        <div class="settings-section">
                            <!-- 主题模式 -->
                            <div class="setting-group">
                                <h4 class="group-title">主题模式</h4>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">跟随系统/手动切换</label>
                                        <p class="setting-desc">切换系统界面的明暗主题，支持跟随系统设置</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="theme-mode-control">
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="system" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:theme-light-dark" class="option-icon" />
                                                    跟随系统
                                                </span>
                                            </label>
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="light" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:weather-sunny" class="option-icon" />
                                                    亮色模式
                                                </span>
                                            </label>
                                            <label class="mode-option">
                                                <input type="radio" name="themeMode" value="dark" v-model="themeMode"
                                                    @change="changeThemeMode" /> <span class="option-label">
                                                    <IconifyIcon icon="mdi:weather-night" class="option-icon" />
                                                    暗色模式
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 其他外观设置 -->
                            <div class="setting-group">
                                <h4 class="group-title">界面调整</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">动画效果</label>
                                        <p class="setting-desc">启用或禁用界面动画</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="enableAnimations" @change="toggleAnimations"
                                                class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">字体大小</label>
                                        <p class="setting-desc">调整界面文字的显示大小</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="font-size-control">
                                            <input type="range" min="12" max="18" v-model="fontSize"
                                                @input="changeFontSize" class="font-size-slider" />
                                            <span class="font-size-value">{{ fontSize }}px</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">布局密度</label>
                                        <p class="setting-desc">选择界面元素的间距紧密程度</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="density-options">
                                            <button
                                                :class="['density-btn', { active: layoutDensity === 'comfortable' }]"
                                                @click="setLayoutDensity('comfortable')">
                                                舒适
                                            </button>
                                            <button :class="['density-btn', { active: layoutDensity === 'compact' }]"
                                                @click="setLayoutDensity('compact')">
                                                紧凑
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- WebUI 设置标签页 -->
                    <div v-else-if="activeTab === 'webui'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">WebUI 配置</h3>
                            <p class="panel-description">配置 Web 用户界面的访问设置和功能</p>
                        </div>

                        <div class="settings-section">
                            <!-- WebUI启用设置 -->
                            <div class="setting-group">
                                <h4 class="group-title">WebUI 启用状态</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">启用 Web 用户界面</label>
                                        <p class="setting-desc">启用后可通过浏览器访问管理界面</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="webuiEnabled" @change="toggleWebuiEnabled"
                                                class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- WebUI端口配置 -->
                            <div v-show="webuiEnabled" class="setting-group">
                                <h4 class="group-title">端口配置</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">访问端口</label>
                                        <p class="setting-desc">设置 WebUI 的访问端口 (1024-65535)</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="port-control">
                                            <input type="number" v-model.number="webuiPort" @change="changeWebuiPort"
                                                class="input input-bordered input-sm" min="1024" max="65535"
                                                placeholder="11111" />
                                            <button class="btn btn-ghost btn-sm" @click="resetWebuiPort">
                                                <IconifyIcon icon="mdi:refresh" />
                                                默认
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- 访问信息预览 -->
                                <div class="bg-base-200 rounded-lg p-4 mt-4">
                                    <h4 class="font-medium mb-3 flex items-center gap-2">
                                        <IconifyIcon icon="mdi:eye-outline" class="w-4 h-4" />
                                        访问信息
                                    </h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-base-content/70">本地访问:</span>
                                            <span class="font-mono text-primary">http://localhost:{{ webuiPort }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-base-content/70">局域网访问:</span>
                                            <span class="font-mono text-primary">http://[本机IP]:{{ webuiPort }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-base-content/70">状态:</span>
                                            <span class="badge badge-sm"
                                                :class="webuiEnabled ? 'badge-success' : 'badge-neutral'">
                                                {{ webuiEnabled ? '启用' : '禁用' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- WebUI功能特性 -->
                            <div class="setting-group">
                                <h4 class="group-title">功能特性</h4>
                                <div
                                    class="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-200/50">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div class="flex items-start gap-2">
                                            <IconifyIcon icon="mdi:check-circle"
                                                class="w-4 h-4 text-green-500 mt-0.5" />
                                            <span>实时监控实例状态</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <IconifyIcon icon="mdi:check-circle"
                                                class="w-4 h-4 text-green-500 mt-0.5" />
                                            <span>远程管理和控制</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <IconifyIcon icon="mdi:check-circle"
                                                class="w-4 h-4 text-green-500 mt-0.5" />
                                            <span>日志查看和分析</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <IconifyIcon icon="mdi:check-circle"
                                                class="w-4 h-4 text-green-500 mt-0.5" />
                                            <span>配置文件在线编辑</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- 安全提示 -->
                                <div class="alert alert-info mt-4">
                                    <IconifyIcon icon="mdi:shield-outline" class="w-4 h-4" />
                                    <div class="text-sm">
                                        <div class="font-medium">安全提示</div>
                                        <div class="opacity-80">请确保防火墙设置允许访问此端口</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 后端服务设置标签页 -->
                    <div v-else-if="activeTab === 'backend'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">后端服务配置</h3>
                            <p class="panel-description">配置后端服务连接和运行模式</p>
                        </div>

                        <div class="settings-section">
                            <!-- 后端地址配置 -->
                            <div class="setting-group">
                                <h4 class="group-title">服务地址</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">后端服务地址</label>
                                        <p class="setting-desc">配置后端API服务的连接地址</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="backend-url-control">
                                            <input type="text" v-model="backendUrl" @change="changeBackendUrl"
                                                class="input input-bordered input-sm flex-1"
                                                placeholder="http://localhost:8000" />
                                            <button class="btn btn-ghost btn-sm" @click="resetBackendUrl">
                                                <IconifyIcon icon="mdi:refresh" />
                                                默认
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 连接测试 -->
                            <div class="setting-group">
                                <h4 class="group-title">连接测试</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">测试后端连接</label>
                                        <p class="setting-desc">检查后端服务是否可以正常连接</p>
                                    </div>
                                    <div class="setting-control">
                                        <button class="btn btn-outline btn-sm" @click="testBackendConnection"
                                            :class="{ 'loading': isTestingBackendConnection }"
                                            :disabled="isTestingBackendConnection">
                                            <IconifyIcon v-if="!isTestingBackendConnection" icon="mdi:connection" />
                                            {{ isTestingBackendConnection ? '测试中...' : '测试连接' }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 运行模式 -->
                            <div class="setting-group">
                                <h4 class="group-title">运行模式</h4>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="mode-option" :class="{ 'mode-selected': !isMockDataActive }">
                                        <div class="mode-content">
                                            <div class="mode-icon bg-green-500/10">
                                                <IconifyIcon icon="mdi:server-network" class="w-6 h-6 text-green-500" />
                                            </div>
                                            <h4 class="font-medium">完整模式</h4>
                                            <p class="text-sm text-base-content/70">连接后端服务，启用所有功能</p>
                                        </div>
                                    </div>
                                    <div class="mode-option" :class="{ 'mode-selected': isMockDataActive }">
                                        <div class="mode-content">
                                            <div class="mode-icon bg-amber-500/10">
                                                <IconifyIcon icon="mdi:eye-outline" class="w-6 h-6 text-amber-500" />
                                            </div>
                                            <h4 class="font-medium">演示模式</h4>
                                            <p class="text-sm text-base-content/70">使用模拟数据，仅用于预览</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 关于标签页 -->
                    <div v-else-if="activeTab === 'about'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">关于 MaiLauncher</h3>
                            <p class="panel-description">查看应用版本信息和相关资源</p>
                        </div>

                        <div class="settings-section">
                            <!-- 应用信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">应用信息</h4>

                                <div class="about-app-info">
                                    <div class="app-icon">
                                        <IconifyIcon icon="mdi:rocket-launch" class="app-icon-img" />
                                    </div>
                                    <div class="app-details">
                                        <h5 class="app-name">MaiLauncher</h5>
                                        <p class="app-description">MaiBot 实例管理和部署工具</p>
                                        <div class="version-details">
                                            <div class="version-item">
                                                <span class="version-label">前端版本:</span>
                                                <span class="version-value">0.1.0-Preview.1</span>
                                            </div>
                                            <div class="version-item">
                                                <span class="version-label">后端版本:</span>
                                                <span class="version-value">0.1.0-preview.2</span>
                                                <span class="version-value">0.1.0-Preview.2</span>
                                            </div>
                                            <div class="version-item">
                                                <span class="version-label">构建时间:</span>
                                                <span class="version-value">{{ buildDate }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 系统信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">系统信息</h4>
                                <div class="system-info-grid">
                                    <div class="system-info-item">
                                        <span class="info-label">操作系统:</span>
                                        <span class="info-value">{{ systemInfo.platform }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">系统架构:</span>
                                        <span class="info-value">{{ systemInfo.arch }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">Node.js 版本:</span>
                                        <span class="info-value">{{ systemInfo.nodeVersion }}</span>
                                    </div>
                                    <div class="system-info-item">
                                        <span class="info-label">浏览器引擎:</span>
                                        <span class="info-value">{{ systemInfo.userAgent }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 开源信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">开源信息</h4>
                                <div class="open-source-info">
                                    <div class="license-info">
                                        <p><strong>许可证:</strong> GNU General Public License v3.0</p>
                                        <p><strong>项目地址:</strong>
                                            <a href="https://github.com/MaiM-with-u/MaiLauncher" target="_blank"
                                                class="link link-primary">
                                                GitHub Repository
                                            </a>
                                        </p>
                                        <p><strong>Bug 反馈:</strong>
                                            <a href="https://github.com/MaiM-with-u/MaiLauncher/issues" target="_blank"
                                                class="link link-primary">
                                                提交 Issue
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- 依赖信息 -->
                            <div class="setting-group">
                                <h4 class="group-title">主要依赖</h4>
                                <div class="dependencies-info">
                                    <div class="dependency-item">
                                        <span class="dep-name">Vue.js</span>
                                        <span class="dep-version">3.5.13</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Tauri</span>
                                        <span class="dep-version">2.x</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Vite</span>
                                        <span class="dep-version">6.0.3</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">DaisyUI</span>
                                        <span class="dep-version">4.5.0</span>
                                    </div>
                                    <div class="dependency-item">
                                        <span class="dep-name">Python Backend</span>
                                        <span class="dep-version">3.10+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 高级设置 -->
                    <div v-else-if="activeTab === 'advanced'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">高级设置</h3>
                            <p class="panel-description">配置高级功能和调试选项</p>
                        </div>

                        <div class="settings-section">
                            <!-- 模拟数据控制 -->
                            <div class="setting-group">
                                <h4 class="group-title">数据源设置</h4>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">强制禁用模拟数据</label>
                                        <p class="setting-desc">启用后，即使后端连接失败也不会使用模拟数据。适合生产环境使用。</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="forceMockDisabled"
                                                @change="toggleForceMockDisabled" class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">当前模拟数据状态</label>
                                        <p class="setting-desc">显示当前应用是否正在使用模拟数据</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="status-indicator">
                                            <span
                                                :class="['status-badge', isMockDataActive ? 'status-active' : 'status-inactive']">
                                                {{ isMockDataActive ? '使用模拟数据' : '使用真实数据' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 调试设置 -->
                            <div class="setting-group">
                                <h4 class="group-title">调试设置</h4>
                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">后端连接状态</label>
                                        <p class="setting-desc">手动检查后端服务器连接状态，支持自动重连</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="connection-controls">
                                            <div class="connection-status">
                                                <span :class="['status-badge', backendConnectionStatus]">
                                                    <IconifyIcon :icon="connectionStatusIcon" />
                                                    {{ connectionStatusText }}
                                                </span>
                                            </div>
                                            <div class="connection-buttons">
                                                <button class="btn btn-outline btn-sm" @click="checkBackendConnection"
                                                    :class="{ 'loading': isCheckingConnection }"
                                                    :disabled="isCheckingConnection">
                                                    <IconifyIcon v-if="!isCheckingConnection" icon="mdi:refresh" />
                                                    {{ isCheckingConnection ? '检查中...' : '重新检查' }}
                                                </button>
                                                <button v-if="!isConnected && !forceMockDisabled"
                                                    class="btn btn-primary btn-sm" @click="attemptReconnection"
                                                    :class="{ 'loading': isReconnecting }" :disabled="isReconnecting">
                                                    <IconifyIcon v-if="!isReconnecting" icon="mdi:connection" />
                                                    {{ isReconnecting ? '重连中...' : '尝试重连' }}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">清除本地缓存</label>
                                        <p class="setting-desc">清除应用的本地存储和缓存数据</p>
                                    </div>
                                    <div class="setting-control">
                                        <button class="btn btn-outline btn-sm btn-warning" @click="clearLocalData">
                                            <IconifyIcon icon="mdi:delete-sweep" />
                                            清除缓存
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> <!-- 系统设置标签页 -->
                    <div v-else-if="activeTab === 'system'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">系统设置</h3>
                            <p class="panel-description">配置应用的系统行为和通知</p>
                        </div>

                        <div class="settings-section">
                            <!-- 启动设置 -->
                            <div class="setting-group">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                        <IconifyIcon icon="mdi:rocket-launch" class="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <h4 class="group-title">启动设置</h4>
                                        <p class="text-sm text-base-content/70">配置应用启动时的行为</p>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">启动时显示欢迎页面</label>
                                        <p class="setting-desc">每次启动应用程序时显示欢迎界面和功能介绍</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="showWelcomeOnStartup"
                                                @change="toggleShowWelcomeOnStartup" class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 通知设置 -->
                            <div class="setting-group">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                        <IconifyIcon icon="mdi:bell" class="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h4 class="group-title">通知设置</h4>
                                        <p class="text-sm text-base-content/70">配置系统通知行为</p>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">部署完成通知</label>
                                        <p class="setting-desc">当实例部署完成时显示通知</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="deploymentNotifications"
                                                @change="toggleDeploymentNotifications" class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">实例状态变化通知</label>
                                        <p class="setting-desc">当实例启动、停止或出错时显示通知</p>
                                    </div>
                                    <div class="setting-control">
                                        <label class="toggle-switch">
                                            <input type="checkbox" v-model="instanceNotifications"
                                                @change="toggleInstanceNotifications" class="toggle-input" />
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 路径快捷访问 -->
                            <div class="setting-group">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                        <IconifyIcon icon="mdi:folder-cog" class="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 class="group-title">路径快捷访问</h4>
                                        <p class="text-sm text-base-content/70">快速访问和配置路径</p>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">路径配置</label>
                                        <p class="setting-desc">前往路径配置页面设置数据存储和部署路径</p>
                                    </div>
                                    <div class="setting-control">
                                        <button @click="switchTab('paths')" class="btn btn-outline btn-sm">
                                            <IconifyIcon icon="mdi:folder-cog" class="w-4 h-4" />
                                            配置路径
                                        </button>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">当前路径状态</label>
                                        <p class="setting-desc">查看当前配置的路径信息</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="bg-base-200 rounded-lg p-3">
                                            <div class="space-y-1 text-xs">
                                                <div class="flex justify-between">
                                                    <span class="text-base-content/70">数据存储:</span>
                                                    <span class="text-primary font-mono">{{ dataStoragePath || '未设置'
                                                        }}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-base-content/70">实例部署:</span>
                                                    <span class="text-primary font-mono">{{ deploymentPath || '未设置'
                                                        }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 路径配置标签页 -->
                    <div v-else-if="activeTab === 'paths'" class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">路径配置</h3>
                            <p class="panel-description">配置数据存储和实例部署的路径</p>
                        </div>

                        <div class="settings-section">
                            <!-- 数据存储路径 -->
                            <div class="setting-group">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <IconifyIcon icon="mdi:database" class="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 class="group-title">数据存储路径</h4>
                                        <p class="text-sm text-base-content/70">用于存储配置文件、日志和数据</p>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">数据存放路径</label>
                                        <p class="setting-desc">选择MaiBot实例数据的存放位置，建议选择磁盘空间充足的位置</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="data-path-control">
                                            <div class="flex gap-2 mb-2">
                                                <input v-model="dataStoragePath" type="text" placeholder="数据存放路径"
                                                    class="input input-bordered input-sm flex-1" readonly />
                                                <button @click="selectDataFolder" class="btn btn-outline btn-sm"
                                                    :disabled="isSelectingFolder">
                                                    <IconifyIcon v-if="!isSelectingFolder" icon="mdi:folder-open"
                                                        class="w-4 h-4" />
                                                    <span v-if="isSelectingFolder"
                                                        class="loading loading-spinner loading-xs"></span>
                                                    {{ isSelectingFolder ? '选择中...' : '浏览' }}
                                                </button>
                                                <button @click="resetDataPath" class="btn btn-ghost btn-sm">
                                                    <IconifyIcon icon="mdi:refresh" class="w-4 h-4" />
                                                    默认
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <IconifyIcon icon="mdi:information" class="w-4 h-4 text-info" />
                                                <span class="text-xs text-base-content/60">
                                                    当前路径: {{ dataStoragePath || '未设置' }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 实例部署路径 -->
                            <div class="setting-group">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                                        <IconifyIcon icon="mdi:package-variant" class="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h4 class="group-title">实例部署路径</h4>
                                        <p class="text-sm text-base-content/70">用于安装和运行 MaiBot 实例</p>
                                    </div>
                                </div>

                                <div class="setting-item">
                                    <div class="setting-info">
                                        <label class="setting-label">实例部署路径</label>
                                        <p class="setting-desc">选择MaiBot实例的部署和运行位置</p>
                                    </div>
                                    <div class="setting-control">
                                        <div class="deployment-path-control">
                                            <div class="flex gap-2 mb-2">
                                                <input v-model="deploymentPath" type="text" placeholder="实例部署路径"
                                                    class="input input-bordered input-sm flex-1" readonly />
                                                <button @click="selectDeploymentFolder" class="btn btn-outline btn-sm"
                                                    :disabled="isSelectingDeploymentFolder">
                                                    <IconifyIcon v-if="!isSelectingDeploymentFolder"
                                                        icon="mdi:folder-open" class="w-4 h-4" />
                                                    <span v-if="isSelectingDeploymentFolder"
                                                        class="loading loading-spinner loading-xs"></span>
                                                    {{ isSelectingDeploymentFolder ? '选择中...' : '浏览' }}
                                                </button>
                                                <button @click="resetDeploymentPath" class="btn btn-ghost btn-sm">
                                                    <IconifyIcon icon="mdi:refresh" class="w-4 h-4" />
                                                    默认
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <IconifyIcon icon="mdi:information" class="w-4 h-4 text-info" />
                                                <span class="text-xs text-base-content/60">
                                                    当前路径: {{ deploymentPath || '未设置' }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 路径预览 -->
                            <div class="setting-group">
                                <h4 class="group-title">路径预览</h4>
                                <div class="bg-base-200 rounded-lg p-4">
                                    <div class="space-y-2 text-sm font-mono">
                                        <div class="flex justify-between">
                                            <span class="text-base-content/70">数据存储:</span>
                                            <span class="text-primary">{{ dataStoragePath || '未设置' }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-base-content/70">实例部署:</span>
                                            <span class="text-primary">{{ deploymentPath || '未设置' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 路径操作 -->
                            <div class="setting-group">
                                <h4 class="group-title">路径操作</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button class="btn btn-outline" @click="openDataFolder">
                                        <IconifyIcon icon="mdi:folder-open" class="w-4 h-4" />
                                        打开数据文件夹
                                    </button>
                                    <button class="btn btn-outline" @click="openDeploymentFolder">
                                        <IconifyIcon icon="mdi:folder-open" class="w-4 h-4" />
                                        打开部署文件夹
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 其他标签页的占位内容 -->
                    <div v-else class="settings-panel">
                        <div class="panel-header">
                            <h3 class="panel-title">{{ getCurrentTabTitle() }}</h3>
                            <p class="panel-description">功能开发中...</p>
                        </div>
                        <div class="coming-soon">
                            <IconifyIcon icon="mdi:construction" class="coming-soon-icon" />
                            <p>此功能正在开发中，敬请期待</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 底部 -->
            <div class="settings-footer">
                <div class="footer-info">
                    <span class="version-info">版本 0.1.0-preview.2</span>
                </div>
                <div class="footer-actions"> <button class="btn btn-ghost btn-sm" @click="resetSettings">
                        <IconifyIcon icon="mdi:refresh" size="sm" />
                        重置设置
                    </button>
                    <button class="btn btn-primary btn-sm" @click="closeDrawer">
                        <IconifyIcon icon="mdi:check" size="sm" />
                        完成
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue'
import { useDarkMode, useTheme } from '../../services/theme'
import settingsService from '../../services/settingsService'
import IconifyIcon from '../common/IconifyIcon.vue'
import './SettingsDrawer.css'

// 注入依赖
const emitter = inject('emitter', null)

// 属性定义
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    }
})

// 事件定义
const emit = defineEmits(['close'])

// 设置标签页
const activeTab = ref('appearance')

// 设置标签页定义
const settingTabs = [
    { key: 'appearance', title: '外观', icon: 'mdi:palette' },
    { key: 'system', title: '系统', icon: 'mdi:cog' },
    { key: 'paths', title: '路径配置', icon: 'mdi:folder-cog' },
    { key: 'webui', title: 'WebUI', icon: 'mdi:web' },
    { key: 'backend', title: '后端服务', icon: 'mdi:server-network' },
    { key: 'notifications', title: '通知', icon: 'mdi:bell' },
    { key: 'privacy', title: '隐私', icon: 'mdi:shield-lock' },
    { key: 'about', title: '关于', icon: 'mdi:information' },
    { key: 'advanced', title: '高级', icon: 'mdi:tune' }
]

// 使用主题和暗色模式
const { currentTheme, availableThemes, setTheme } = useTheme()
const { darkMode, toggleDarkMode } = useDarkMode(emitter)

// 确保 currentTheme 是响应式的
watch(currentTheme, (newTheme) => {
    console.log('currentTheme 变化:', newTheme)
}, { immediate: true })

// 主题模式状态 (system, light, dark)
const themeMode = ref(localStorage.getItem('themeMode') || 'system')

// 系统暗色模式检测
const systemDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

// 数据存放路径相关
const dataStoragePath = ref('')
const isSelectingFolder = ref(false)
const deploymentPath = ref('')
const isSelectingDeploymentFolder = ref(false)

// 通知设置
const deploymentNotifications = ref(localStorage.getItem('deploymentNotifications') !== 'false')
const instanceNotifications = ref(localStorage.getItem('instanceNotifications') !== 'false')

// 启动设置
const showWelcomeOnStartup = ref(localStorage.getItem('showWelcomeOnStartup') !== 'false')

// WebUI 设置
const webuiEnabled = ref(localStorage.getItem('webuiEnabled') !== 'false')
const webuiPort = ref(parseInt(localStorage.getItem('webuiPort')) || 11111)

// 后端服务设置
const backendUrl = ref(localStorage.getItem('backendUrl') || 'http://localhost:8000')
const isTestingBackendConnection = ref(false)

// 外观设置状态
const isDarkMode = computed(() => {
    if (themeMode.value === 'system') {
        return systemDarkMode.value
    }
    return themeMode.value === 'dark'
})

const enableAnimations = ref(localStorage.getItem('enableAnimations') !== 'false')
const fontSize = ref(parseInt(localStorage.getItem('fontSize') || '14'))
const layoutDensity = ref(localStorage.getItem('layoutDensity') || 'comfortable')

// 高级设置状态
const forceMockDisabled = ref(localStorage.getItem('forceMockDisabled') === 'true')
const isCheckingConnection = ref(false)
const isReconnecting = ref(false)
const isConnected = ref(false)
const lastConnectionCheck = ref(null)

// 计算属性：后端连接状态
const backendConnectionStatus = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'status-checking'
    if (isConnected.value) return 'status-connected'
    if (forceMockDisabled.value) return 'status-error'
    return 'status-mock'
})

const connectionStatusIcon = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'mdi:loading'
    if (isConnected.value) return 'mdi:check-circle'
    if (forceMockDisabled.value) return 'mdi:alert-circle'
    return 'mdi:database'
})

const connectionStatusText = computed(() => {
    if (isCheckingConnection.value) return '检查中...'
    if (isReconnecting.value) return '重连中...'
    if (isConnected.value) return '已连接后端'
    if (forceMockDisabled.value) return '连接失败'
    return '使用模拟数据'
})

// 计算属性：检查当前是否使用模拟数据
const isMockDataActive = computed(() => {
    return localStorage.getItem('useMockData') === 'true'
})

// 关于页面数据
const buildDate = ref('2025-01-01 12:00:00')
const systemInfo = ref({
    platform: 'Unknown',
    arch: 'Unknown',
    nodeVersion: 'Unknown',
    userAgent: 'Unknown'
})

// 方法
const switchTab = (tab) => {
    activeTab.value = tab
    settingsService.setTab(tab)
}

const closeDrawer = () => {
    emit('close')
    settingsService.closeSettings()
}

const handleBackdropClick = () => {
    closeDrawer()
}

const getCurrentTabTitle = () => {
    const tab = settingTabs.find(t => t.key === activeTab.value)
    return tab ? tab.title : '设置'
}

// 初始化系统信息
const initSystemInfo = () => {
    // 设置构建时间
    buildDate.value = new Date().toLocaleString('zh-CN')

    // 检测系统信息
    systemInfo.value = {
        platform: navigator.platform || 'Unknown',
        arch: navigator.userAgent.includes('x64') ? 'x64' :
            navigator.userAgent.includes('x86') ? 'x86' : 'Unknown',
        nodeVersion: process?.versions?.node || 'Unknown',
        userAgent: navigator.userAgent.substring(0, 80) + '...'
    }
}

// 初始化数据存放路径
const initDataPath = () => {
    const savedDataPath = localStorage.getItem('dataStoragePath')
    const savedDeploymentPath = localStorage.getItem('deploymentPath')

    if (savedDataPath) {
        dataStoragePath.value = savedDataPath
    } else {
        // 设置默认路径
        const defaultPath = getDefaultDataPath()
        dataStoragePath.value = defaultPath
        localStorage.setItem('dataStoragePath', defaultPath)
    }

    if (savedDeploymentPath) {
        deploymentPath.value = savedDeploymentPath
    } else {
        // 设置默认部署路径
        const defaultDeployPath = getDefaultDeploymentPath()
        deploymentPath.value = defaultDeployPath
        localStorage.setItem('deploymentPath', defaultDeployPath)
    }
}

// 获取默认部署路径
const getDefaultDeploymentPath = () => {
    // Windows 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "windows") {
        return "D:\\MaiBot\\Deployments"
    }
    // macOS 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "macos") {
        return "~/Documents/MaiBot/Deployments"
    }
    // Linux 默认路径
    return "~/MaiBot/Deployments"
}

// 获取默认数据路径 (从 folderSelector.js 移植)
const getDefaultDataPath = () => {
    // Windows 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "windows") {
        return "D:\\MaiBot\\Data"
    }
    // macOS 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "macos") {
        return "~/Documents/MaiBot/Data"
    }
    // Linux 默认路径
    return "~/MaiBot/Data"
}

// 选择数据存放文件夹
const selectDataFolder = async () => {
    if (isSelectingFolder.value) return

    isSelectingFolder.value = true
    try {
        // 动态导入 folderSelector
        const { selectFolder } = await import('@/utils/folderSelector')

        const selectedPath = await selectFolder({
            title: '选择数据存放文件夹',
            defaultPath: dataStoragePath.value || getDefaultDataPath()
        })

        if (selectedPath) {
            dataStoragePath.value = selectedPath
            localStorage.setItem('dataStoragePath', selectedPath)

            // 通知其他组件路径已更改
            window.dispatchEvent(new CustomEvent('data-path-changed', {
                detail: { path: selectedPath }
            }))

            const { default: toastService } = await import('@/services/toastService')
            toastService.success(`数据存放路径已设置为: ${selectedPath}`)
        }
    } catch (error) {
        console.error('选择文件夹失败:', error)
        const { default: toastService } = await import('@/services/toastService')
        toastService.error('选择文件夹失败，请重试')
    } finally {
        isSelectingFolder.value = false
    }
}

// 选择部署文件夹
const selectDeploymentFolder = async () => {
    if (isSelectingDeploymentFolder.value) return

    isSelectingDeploymentFolder.value = true
    try {
        // 动态导入 folderSelector
        const { selectFolder } = await import('@/utils/folderSelector')

        const selectedPath = await selectFolder({
            title: '选择部署下载文件夹',
            defaultPath: deploymentPath.value || getDefaultDeploymentPath()
        })

        if (selectedPath) {
            deploymentPath.value = selectedPath
            localStorage.setItem('deploymentPath', selectedPath)

            // 通知其他组件部署路径已更改
            window.dispatchEvent(new CustomEvent('deployment-path-changed', {
                detail: { path: selectedPath }
            }))

            const { default: toastService } = await import('@/services/toastService')
            toastService.success(`部署下载路径已设置为: ${selectedPath}`)
        }
    } catch (error) {
        console.error('选择文件夹失败:', error)
        const { default: toastService } = await import('@/services/toastService')
        toastService.error('选择文件夹失败，请重试')
    } finally {
        isSelectingDeploymentFolder.value = false
    }
}

// 切换部署完成通知
const toggleDeploymentNotifications = () => {
    localStorage.setItem('deploymentNotifications', deploymentNotifications.value.toString())
}

// 切换实例状态通知
const toggleInstanceNotifications = () => {
    localStorage.setItem('instanceNotifications', instanceNotifications.value.toString())
}

// 切换启动时显示欢迎页面
const toggleShowWelcomeOnStartup = () => {
    localStorage.setItem('showWelcomeOnStartup', showWelcomeOnStartup.value.toString())
    console.log('启动时显示欢迎页面设置已更新:', showWelcomeOnStartup.value)
}

// WebUI 配置方法
const toggleWebuiEnabled = async () => {
    try {
        if (webuiEnabled.value) {
            // 启动 WebUI 服务器
            const { invoke } = await import('@tauri-apps/api/core')
            const result = await invoke('start_webui_server', { port: webuiPort.value })

            localStorage.setItem('webuiEnabled', webuiEnabled.value.toString())
            console.log('WebUI 启用状态已更新:', webuiEnabled.value)

            const { default: toastService } = await import('../../services/toastService')
            toastService.success(result)
        } else {
            // 停止 WebUI 服务器
            const { invoke } = await import('@tauri-apps/api/core')
            const result = await invoke('stop_webui_server')

            localStorage.setItem('webuiEnabled', webuiEnabled.value.toString())
            console.log('WebUI 启用状态已更新:', webuiEnabled.value)

            const { default: toastService } = await import('../../services/toastService')
            toastService.success(result)
        }

        // 通知其他组件 WebUI 状态已更改
        window.dispatchEvent(new CustomEvent('webui-status-changed', {
            detail: { enabled: webuiEnabled.value, port: webuiPort.value }
        }))
    } catch (error) {
        console.error('切换 WebUI 状态失败:', error)
        // 回滚状态
        webuiEnabled.value = !webuiEnabled.value

        const { default: toastService } = await import('../../services/toastService')
        toastService.error('WebUI 操作失败: ' + error)
    }
}

const changeWebuiPort = async () => {
    // 验证端口范围
    if (webuiPort.value < 1024 || webuiPort.value > 65535) {
        webuiPort.value = 11111 // 重置为默认值
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('端口号必须在 1024-65535 范围内')
        })
        return
    } try {
        localStorage.setItem('webuiPort', webuiPort.value.toString())
        console.log('WebUI 端口已更新:', webuiPort.value)

        // 如果 WebUI 当前启用，重启服务器以应用新端口
        if (webuiEnabled.value) {
            const { invoke } = await import('@tauri-apps/api/core')

            // 停止现有服务器
            await invoke('stop_webui_server')

            // 启动新服务器
            const result = await invoke('start_webui_server', { port: webuiPort.value })

            const { default: toastService } = await import('../../services/toastService')
            toastService.success(`WebUI 端口已更新为 ${webuiPort.value}，服务器已重启`)
        } else {
            const { default: toastService } = await import('../../services/toastService')
            toastService.success(`WebUI 端口已设置为 ${webuiPort.value}`)
        }

        // 通知其他组件端口已更改
        window.dispatchEvent(new CustomEvent('webui-port-changed', {
            detail: { port: webuiPort.value, enabled: webuiEnabled.value }
        }))
    } catch (error) {
        console.error('更新 WebUI 端口失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('更新端口失败: ' + error)
    }
}

const resetWebuiPort = () => {
    webuiPort.value = 11111
    changeWebuiPort()
}

// 初始化 WebUI 状态检查
const initializeWebuiStatus = async () => {
    try {
        const { invoke } = await import('@tauri-apps/api/core')
        const [enabled, port] = await invoke('get_webui_status')

        // 同步实际状态和本地设置
        if (enabled !== webuiEnabled.value) {
            console.log('同步 WebUI 状态:', enabled)
            webuiEnabled.value = enabled
            localStorage.setItem('webuiEnabled', enabled.toString())
        }

        if (port !== webuiPort.value) {
            console.log('同步 WebUI 端口:', port)
            webuiPort.value = port
            localStorage.setItem('webuiPort', port.toString())
        }
    } catch (error) {
        console.warn('无法获取 WebUI 状态，可能是在开发模式:', error)
    }
}

// 后端服务配置方法
const changeBackendUrl = () => {
    // 验证 URL 格式
    try {
        new URL(backendUrl.value)
    } catch (error) {
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('请输入有效的 URL 格式')
        })
        return
    }

    localStorage.setItem('backendUrl', backendUrl.value)
    console.log('后端服务地址已更新:', backendUrl.value)

    // 通知其他组件后端地址已更改
    window.dispatchEvent(new CustomEvent('backend-url-changed', {
        detail: { url: backendUrl.value }
    }))

    import('../../services/toastService').then(({ default: toastService }) => {
        toastService.success('后端服务地址已更新')
    })
}

const resetBackendUrl = () => {
    backendUrl.value = 'http://localhost:23456'
    changeBackendUrl()
}

const testBackendConnection = async () => {
    isTestingBackendConnection.value = true

    try {
        // 动态导入需要的服务
        const [{ default: apiService }, { default: toastService }] = await Promise.all([
            import('../../services/apiService'),
            import('../../services/toastService')
        ])

        console.log('测试后端连接:', backendUrl.value)

        // 这里需要使用当前设置的后端地址进行测试
        const connected = await apiService.testConnection(backendUrl.value)

        if (connected) {
            toastService.success('后端连接测试成功')
        } else {
            toastService.error('后端连接测试失败')
        }
    } catch (error) {
        console.error('测试后端连接时出错:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('连接测试失败: ' + error.message)
    } finally {
        isTestingBackendConnection.value = false
    }
}

// 路径配置方法
const resetDataPath = () => {
    const defaultPath = getDefaultDataPath()
    dataStoragePath.value = defaultPath
    localStorage.setItem('dataStoragePath', defaultPath)

    import('../../services/toastService').then(({ default: toastService }) => {
        toastService.success(`数据存放路径已重置为默认: ${defaultPath}`)
    })
}

const resetDeploymentPath = () => {
    const defaultPath = getDefaultDeploymentPath()
    deploymentPath.value = defaultPath
    localStorage.setItem('deploymentPath', defaultPath)

    import('../../services/toastService').then(({ default: toastService }) => {
        toastService.success(`实例部署路径已重置为默认: ${defaultPath}`)
    })
}

const openDataFolder = async () => {
    if (!dataStoragePath.value) {
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('数据存放路径未设置')
        })
        return
    }

    try {
        // 这里可以使用 Tauri 的 API 打开文件夹
        const { shell } = await import('@tauri-apps/api')
        await shell.open(dataStoragePath.value)
    } catch (error) {
        console.error('打开数据文件夹失败:', error)
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('打开文件夹失败')
        })
    }
}

const openDeploymentFolder = async () => {
    if (!deploymentPath.value) {
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('实例部署路径未设置')
        })
        return
    }

    try {
        // 这里可以使用 Tauri 的 API 打开文件夹
        const { shell } = await import('@tauri-apps/api')
        await shell.open(deploymentPath.value)
    } catch (error) {
        console.error('打开部署文件夹失败:', error)
        import('../../services/toastService').then(({ default: toastService }) => {
            toastService.error('打开文件夹失败')
        })
    }
}

// 组件挂载时初始化
onMounted(async () => {
    // 初始化路径设置
    if (!dataStoragePath.value) {
        dataStoragePath.value = localStorage.getItem('dataStoragePath') || getDefaultDataPath()
    }
    if (!deploymentPath.value) {
        deploymentPath.value = localStorage.getItem('deploymentPath') || getDefaultDeploymentPath()
    }

    // 初始化 WebUI 状态
    await initializeWebuiStatus()
})
</script>

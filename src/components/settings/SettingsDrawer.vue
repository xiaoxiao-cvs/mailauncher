<template>
    <transition name="settings-drawer" appear>
        <div v-if="isOpen" class="settings-drawer-backdrop" @click.self="handleBackdropClick">
            <div class="settings-drawer-container"><!-- 头部 -->
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
                </div>                <!-- 主内容区 -->                <div class="settings-main" @wheel.stop>
                    <!-- 设置面板切换动画容器 -->
                    <transition 
                        :name="panelTransitionName" 
                        mode="out-in" 
                        :duration="{ enter: 500, leave: 300 }"
                        appear
                        @before-enter="onBeforeEnter"
                        @enter="onEnter"
                        @leave="onLeave"
                    >
                        <!-- 动态组件包装器 -->
                        <div :key="activeTab" class="settings-panel-wrapper">
                        <!-- 外观设置 - 使用组件库重构 -->
                        <div v-if="activeTab === 'appearance'" key="appearance" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">外观设置</h3>
                                <p class="panel-description">自定义界面外观和主题样式</p>
                            </div>

                            <div class="settings-section">
                                <!-- 主题模式组件 -->
                                <SettingGroup title="主题模式" icon="mdi:palette" icon-class="text-purple-500">
                                    <ThemeSelector 
                                        v-model="themeMode" 
                                        @change="changeThemeMode" 
                                    />
                                </SettingGroup>

                                <!-- 界面调整组件 -->
                                <SettingGroup title="界面调整" icon="mdi:cog-outline" icon-class="text-blue-500">
                                    <SettingSwitch
                                        label="动画效果"
                                        description="启用或禁用界面动画"
                                        v-model="enableAnimations"
                                        @change="toggleAnimations"
                                    />

                                    <SettingSlider
                                        label="字体大小"
                                        description="调整界面文字的显示大小"
                                        :min="12"
                                        :max="18"
                                        suffix="px"
                                        v-model="fontSize"
                                        @change="changeFontSize"
                                    />

                                    <SettingRadioGroup
                                        label="布局密度"
                                        description="选择界面元素的间距紧密程度"
                                        :options="densityOptions"
                                        v-model="layoutDensity"
                                        @change="setLayoutDensity"
                                    />
                                </SettingGroup>
                            </div>
                        </div> <!-- WebUI 设置标签页 -->
                        <!-- WebUI 设置 - 使用组件库重构 -->
                        <div v-else-if="activeTab === 'webui'" key="webui" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">WebUI 配置</h3>
                                <p class="panel-description">配置 Web 用户界面的访问设置和功能</p>
                            </div>

                            <div class="settings-section">
                                <!-- WebUI启用设置组件 -->
                                <SettingGroup title="WebUI 启用状态" icon="mdi:web" icon-class="text-blue-500">
                                    <SettingSwitch
                                        label="启用 Web 用户界面"
                                        description="启用后可通过浏览器访问管理界面"
                                        v-model="webuiEnabled"
                                        @change="toggleWebuiEnabled"
                                    />
                                </SettingGroup>

                                <!-- WebUI端口配置组件 -->
                                <SettingGroup v-show="webuiEnabled" title="端口配置" icon="mdi:ethernet" icon-class="text-green-500">
                                    <PortConfig
                                        label="访问端口"
                                        description="设置 WebUI 的访问端口 (1024-65535)"
                                        v-model="webuiPort"
                                        :min-port="1024"
                                        :max-port="65535"
                                        :default-port="11111"
                                        :show-reset-button="true"
                                        :access-urls="webuiAccessUrls"
                                        @change="changeWebuiPort"
                                        @reset="resetWebuiPort"
                                    />
                                </SettingGroup>

                                <!-- WebUI功能特性组件 -->
                                <SettingGroup title="功能特性" icon="mdi:feature-search" icon-class="text-purple-500">
                                    <div class="setting-item">
                                        <div class="setting-info">
                                            <label class="setting-label">WebUI 特性</label>
                                            <p class="setting-desc">查看 WebUI 提供的功能特性</p>
                                        </div>
                                        <div class="setting-control">
                                            <div class="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-200/50">
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
                                                        <span>配置文件在线编辑</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 安全提示保持原样 -->
                                    <div class="alert alert-info mt-4">
                                        <IconifyIcon icon="mdi:shield-outline" class="w-4 h-4" />
                                        <div class="text-sm">
                                            <div class="font-medium">安全提示</div>
                                            <div class="opacity-80">请确保防火墙设置允许访问此端口</div>
                                        </div>
                                    </div>
                                </SettingGroup>
                            </div>
                        </div>                        <!-- 后端服务设置 - 使用组件库重构 -->
                        <div v-else-if="activeTab === 'backend'" key="backend" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">后端服务配置</h3>
                                <p class="panel-description">配置后端服务连接和运行模式</p>
                            </div>

                            <div class="settings-section">
                                <!-- 后端地址配置组件 -->
                                <SettingGroup title="服务地址" icon="mdi:server" icon-class="text-blue-500">
                                    <SettingInput
                                        label="后端服务地址"
                                        description="配置后端API服务的连接地址"
                                        type="url"
                                        placeholder="http://localhost:23456"
                                        v-model="backendUrl"
                                        :show-reset-button="true"
                                        default-value="http://localhost:23456"
                                        @change="changeBackendUrl"
                                        @reset="resetBackendUrl"
                                    />
                                </SettingGroup>

                                <!-- 连接测试组件 -->
                                <SettingGroup title="连接测试" icon="mdi:connection" icon-class="text-green-500">
                                    <ConnectionTester
                                        :url="backendUrl"
                                        @test="testBackendConnection"
                                        @status-change="handleBackendStatusChange"
                                    />
                                </SettingGroup>
                            </div>
                        </div><!-- 关于标签页 -->
                        <div v-else-if="activeTab === 'about'" key="about" class="settings-panel">
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
                                                    <span class="version-value">{{ currentVersionInfo.frontend.version
                                                        }}</span>
                                                    <span class="version-internal">({{
                                                        currentVersionInfo.frontend.internal }})</span>
                                                </div>
                                                <div class="version-item">
                                                    <span class="version-label">后端版本:</span>
                                                    <span class="version-value">{{ backendVersionInfo.version ||
                                                        '获取中...' }}</span>
                                                    <span v-if="backendVersionInfo.internal"
                                                        class="version-internal">({{ backendVersionInfo.internal
                                                        }})</span>
                                                </div>
                                                <div class="version-item">
                                                    <span class="version-label">构建时间:</span>
                                                    <span class="version-value">{{ buildDate }}</span>
                                                </div> <!-- 版本检查部分 -->
                                                <div class="version-check-section">
                                                    <div class="version-check-controls">
                                                        <button class="btn btn-outline btn-sm" @click="checkForUpdates"
                                                            :disabled="isCheckingVersion">
                                                            <span v-if="isCheckingVersion"
                                                                class="loading loading-spinner loading-xs"></span>
                                                            <IconifyIcon v-else icon="mdi:refresh" />
                                                            {{ isCheckingVersion ? '检查中...' : '检查更新' }}
                                                        </button>
                                                    </div>

                                                    <!-- 更新状态显示 -->
                                                    <div v-if="versionCheckInfo.lastCheck" class="version-check-result">
                                                        <div v-if="versionCheckInfo.hasUpdate" class="alert alert-info">
                                                            <IconifyIcon icon="mdi:information" />
                                                            <div>
                                                                <div class="font-medium">发现新版本: {{
                                                                    versionCheckInfo.latestVersion }}</div>
                                                                <div class="text-sm opacity-80">
                                                                    内部版本号: {{ versionCheckInfo.latestInternal }}
                                                                </div>
                                                                <div v-if="versionCheckInfo.releaseNotes"
                                                                    class="text-sm mt-1">
                                                                    {{ versionCheckInfo.releaseNotes }}
                                                                </div>
                                                                <button v-if="versionCheckInfo.updateUrl"
                                                                    @click="openUpdateUrl"
                                                                    class="btn btn-primary btn-xs mt-2">
                                                                    下载更新
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div v-else class="alert alert-success">
                                                            <IconifyIcon icon="mdi:check-circle" />
                                                            <div>当前已是最新版本</div>
                                                        </div>
                                                    </div>

                                                    <!-- 检查失败显示 -->
                                                    <div v-if="versionCheckError" class="alert alert-error">
                                                        <IconifyIcon icon="mdi:alert-circle" />
                                                        <div>{{ versionCheckError }}</div>
                                                    </div>
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
                                                <a href="https://github.com/MaiM-with-u/MaiLauncher/issues"
                                                    target="_blank" class="link link-primary">
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
                        <div v-else-if="activeTab === 'advanced'" key="advanced" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">高级设置</h3>
                                <p class="panel-description">配置高级功能和调试选项</p>
                            </div>
                            <div class="settings-section">
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
                                                    <button class="btn btn-outline btn-sm"
                                                        @click="checkBackendConnection"
                                                        :class="{ 'loading': isCheckingConnection }"
                                                        :disabled="isCheckingConnection">
                                                        <IconifyIcon v-if="!isCheckingConnection" icon="mdi:refresh" />
                                                        {{ isCheckingConnection ? '检查中...' : '重新检查' }}
                                                    </button>
                                                    <button v-if="!isConnected" class="btn btn-primary btn-sm"
                                                        @click="attemptReconnection"
                                                        :class="{ 'loading': isReconnecting }"
                                                        :disabled="isReconnecting">
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
                        </div>                        <!-- 系统设置 - 使用组件库重构 -->
                        <div v-else-if="activeTab === 'system'" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">系统设置</h3>
                                <p class="panel-description">配置应用的系统行为和通知</p>
                            </div>

                            <div class="settings-section">
                                <!-- 启动设置组件 -->
                                <SettingGroup title="启动设置" icon="mdi:rocket-launch" icon-class="text-purple-500">
                                    <SettingSwitch
                                        label="启动时显示欢迎页面"
                                        description="每次启动应用程序时显示欢迎界面和功能介绍"
                                        v-model="showWelcomeOnStartup"
                                        @change="toggleShowWelcomeOnStartup"
                                    />
                                </SettingGroup>

                                <!-- 通知设置组件 -->
                                <SettingGroup title="通知设置" icon="mdi:bell" icon-class="text-amber-500">
                                    <SettingSwitch
                                        label="部署完成通知"
                                        description="当实例部署完成时显示通知"
                                        v-model="deploymentNotifications"
                                        @change="toggleDeploymentNotifications"
                                    />

                                    <SettingSwitch
                                        label="实例状态变化通知"
                                        description="当实例启动、停止或出错时显示通知"
                                        v-model="instanceNotifications"
                                        @change="toggleInstanceNotifications"
                                    />
                                </SettingGroup>

                                <!-- 实例命名设置组件 -->
                                <SettingGroup title="实例命名设置" icon="mdi:tag-outline" icon-class="text-cyan-500">
                                    <SettingInput
                                        label="实例名称模式"
                                        description="定义新实例的自动命名规则，支持变量占位符"
                                        type="text"
                                        placeholder="例如: MaiBot-{version}"
                                        v-model="instanceNamePattern"
                                        :show-reset-button="true"
                                        default-value="MaiBot-{version}"
                                        :hint="instanceNameHint"
                                        @change="updateInstanceNamePattern"
                                        @reset="resetInstanceNamePattern"
                                    />
                                </SettingGroup>

                                <!-- 路径快捷访问组件 -->
                                <SettingGroup title="路径快捷访问" icon="mdi:folder-cog" icon-class="text-emerald-500">
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
                                            <div class="bg-base-100 border border-base-300/50 rounded-lg p-3">
                                                <div class="space-y-1 text-xs">
                                                    <div class="flex justify-between">
                                                        <span class="text-base-content/70">数据存储:</span>
                                                        <span class="text-primary font-mono">{{ dataStoragePath || '未设置' }}</span>
                                                    </div>
                                                    <div class="flex justify-between">
                                                        <span class="text-base-content/70">实例部署:</span>
                                                        <span class="text-primary font-mono">{{ deploymentPath || '未设置' }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SettingGroup>
                            </div>
                        </div><!-- 路径配置标签页 -->
                        <!-- 路径配置 - 使用组件库重构 -->
                        <div v-else-if="activeTab === 'paths'" class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">路径配置</h3>
                                <p class="panel-description">配置数据存储和实例部署的路径</p>
                            </div>

                            <div class="settings-section">
                                <!-- 数据存储路径组件 -->
                                <SettingGroup title="数据存储路径" icon="mdi:database" icon-class="text-blue-500">
                                    <PathSelector
                                        label="数据存放路径"
                                        description="选择MaiBot实例数据的存放位置，建议选择磁盘空间充足的位置"
                                        v-model="dataStoragePath"
                                        dialog-title="选择数据存储目录"
                                        :default-path="getDefaultDataPath()"
                                        @select="selectDataFolder"
                                        @reset="resetDataPath"
                                    />
                                </SettingGroup>

                                <!-- 实例部署路径组件 -->
                                <SettingGroup title="实例部署路径" icon="mdi:package-variant" icon-class="text-green-500">
                                    <PathSelector
                                        label="实例部署路径"
                                        description="选择MaiBot实例的部署和运行位置"
                                        v-model="deploymentPath"
                                        dialog-title="选择部署目录"
                                        :default-path="getDefaultDeploymentPath()"
                                        @select="selectDeploymentFolder"
                                        @reset="resetDeploymentPath"
                                    />
                                </SettingGroup>

                                <!-- 路径预览组件 -->
                                <SettingGroup title="路径预览" icon="mdi:eye-outline" icon-class="text-purple-500">
                                    <div class="setting-item">
                                        <div class="setting-info">
                                            <label class="setting-label">当前配置</label>
                                            <p class="setting-desc">查看当前配置的所有路径信息</p>
                                        </div>
                                        <div class="setting-control">
                                            <div class="bg-base-100 border border-base-300/50 rounded-lg p-4">
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
                                    </div>

                                    <!-- 路径操作 -->
                                    <div class="setting-item">
                                        <div class="setting-info">
                                            <label class="setting-label">快速访问</label>
                                            <p class="setting-desc">在文件管理器中快速打开配置的路径</p>
                                        </div>
                                        <div class="setting-control">
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
                                </SettingGroup>
                            </div>
                        </div> <!-- 其他标签页的占位内容 -->
                        <div v-else class="settings-panel">
                            <div class="panel-header">
                                <h3 class="panel-title">{{ getCurrentTabTitle() }}</h3>                                <p class="panel-description">功能开发中...</p>
                            </div>
                            <div class="coming-soon">
                                <IconifyIcon icon="mdi:construction" class="coming-soon-icon" />
                                <p>此功能正在开发中，敬请期待</p>
                            </div>
                        </div>
                        </div> <!-- settings-panel-wrapper 结束标签 -->
                    </transition>
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
                    </button>                </div>
            </div>
        </div>
    </div>
    </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue'
import { useDarkMode, useTheme } from '../../services/theme-simplified'
import settingsService from '../../services/settingsService'
import enhancedToastService from '../../services/enhancedToastService'
import IconifyIcon from '../common/IconifyIcon.vue'
import './SettingsDrawer.css'
// 导入版本相关服务
import versionService from '../../services/versionService'
import { formatVersionInfo } from '../../utils/versionUtils'

// 导入设置组件库
import {
    SettingGroup,
    SettingSwitch,
    SettingSlider,
    SettingSelect,
    SettingInput,
    SettingRadioGroup,
    ThemeSelector,
    PathSelector,
    PortConfig,
    ConnectionTester
} from '../settings'

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

// 前一个标签页（用于动画方向判断）
const previousTab = ref('appearance')

// 计算动画方向的transition名称
const panelTransitionName = computed(() => {
    const currentIndex = settingTabs.findIndex(tab => tab.key === activeTab.value)
    const previousIndex = settingTabs.findIndex(tab => tab.key === previousTab.value)

    console.log('Transition calculation:', {
        currentTab: activeTab.value,
        previousTab: previousTab.value,
        currentIndex,
        previousIndex
    })

    if (currentIndex === -1 || previousIndex === -1) {
        return 'settings-panel-fade'
    }

    // 确保有明显的过渡效果
    if (currentIndex > previousIndex) {
        return 'settings-panel-slide-right'
    } else if (currentIndex < previousIndex) {
        return 'settings-panel-slide-left'
    } else {
        return 'settings-panel-fade'
    }
})

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

// 实例命名设置
const instanceNamePattern = ref(localStorage.getItem('instanceNamePattern') || 'MaiBot-{version}')

// 计算实例名称预览
const instanceNamePreview = computed(() => {
    const pattern = instanceNamePattern.value || 'MaiBot-{version}'
    const variables = {
        version: 'v1.0.0',
        timestamp: '123456',
        date: '20250619',
        time: '120000'
    }
    
    let result = pattern
    Object.keys(variables).forEach(key => {
        const placeholder = `{${key}}`
        result = result.replace(new RegExp(placeholder, 'g'), variables[key])
    })
    
    // 清理多余的分隔符
    result = result.replace(/[-_]+/g, '-').replace(/^[-_]+|[-_]+$/g, '')
    
    return result || 'MaiBot-v1-0-0'
})

// WebUI 设置
const webuiEnabled = ref(localStorage.getItem('webuiEnabled') !== 'false')
const webuiPort = ref(parseInt(localStorage.getItem('webuiPort')) || 11111)

// 后端服务设置
const backendUrl = ref(localStorage.getItem('backendUrl') || 'http://localhost:23456')
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

// 组件库特有数据
// 布局密度选项
const densityOptions = [
    { value: 'comfortable', label: '舒适', description: '标准间距' },
    { value: 'compact', label: '紧凑', description: '节省空间' }
]

// WebUI访问URL列表
const webuiAccessUrls = computed(() => [
    `http://localhost:${webuiPort.value}`,
    `http://[本机IP]:${webuiPort.value}`
])

// 实例名称提示信息
const instanceNameHint = computed(() => {
    const variables = [
        '{version} - 版本名称',
        '{timestamp} - 时间戳',
        '{date} - 日期(YYYYMMDD)',
        '{time} - 时间(HHMMSS)'
    ]
    return `支持的变量: ${variables.join(', ')}\n预览: ${instanceNamePreview.value}`
})

// 高级设置状态
const isCheckingConnection = ref(false)
const isReconnecting = ref(false)
const isConnected = ref(false)
const lastConnectionCheck = ref(null)

// 计算属性：后端连接状态
const backendConnectionStatus = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'status-checking'
    if (isConnected.value) return 'status-connected'
    return 'status-error'
})

const connectionStatusIcon = computed(() => {
    if (isCheckingConnection.value || isReconnecting.value) return 'mdi:loading'
    if (isConnected.value) return 'mdi:check-circle'
    return 'mdi:alert-circle'
})

const connectionStatusText = computed(() => {
    if (isCheckingConnection.value) return '检查中...'
    if (isReconnecting.value) return '重连中...'
    if (isConnected.value) return '已连接后端'
    return '连接失败'
})

// 关于页面数据
const buildDate = ref('2025-01-01 12:00:00')
const systemInfo = ref({
    platform: 'Unknown',
    arch: 'Unknown',
    nodeVersion: 'Unknown',
    userAgent: 'Unknown'
})

// 版本检查相关状态
const currentVersionInfo = ref({
    frontend: {
        version: '0.1.0',
        internal: 100
    }
})
const backendVersionInfo = ref({
    version: '',
    internal: null
})
const versionCheckInfo = ref({
    hasUpdate: false,
    latestVersion: '',
    latestInternal: 0,
    updateUrl: null,
    releaseNotes: '',
    lastCheck: null
})
const isCheckingVersion = ref(false)
const versionHistory = ref([])
const isLoadingVersionHistory = ref(false)
const versionCheckError = ref('')
const autoCheckEnabled = ref(localStorage.getItem('autoVersionCheck') !== 'false')
const autoCheckInterval = ref(parseInt(localStorage.getItem('autoVersionCheckInterval')) || 24) // 小时

// 方法
const switchTab = (tab) => {
    // 记录前一个标签页
    previousTab.value = activeTab.value
    
    // 直接切换，让Vue的过渡系统处理动画
    activeTab.value = tab
    settingsService.setTab(tab)
    
    console.log('Tab switched from', previousTab.value, 'to', activeTab.value)
}

// 过渡动画钩子函数
const onBeforeEnter = (el) => {
    console.log('Before enter transition:', panelTransitionName.value)
}

const onEnter = (el, done) => {
    console.log('Enter transition:', panelTransitionName.value)
    // 确保动画完成后调用done
    setTimeout(done, 400)
}

const onLeave = (el, done) => {
    console.log('Leave transition:', panelTransitionName.value)
    // 确保动画完成后调用done
    setTimeout(done, 200)
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

// 组件库相关方法
const handleBackendStatusChange = (status) => {
    isConnected.value = status.connected
    lastConnectionCheck.value = status.timestamp
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
    // 所有平台都使用相对于后端根目录的路径
    // ~ 表示相对于启动器后端根目录（开发时）或exe根目录（打包后）
    if (window.__TAURI_INTERNALS__?.platform === "windows") {
        return "~\\MaiBot\\Deployments"
    }
    // macOS 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "macos") {
        return "~/MaiBot/Deployments"
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
        // 检查是否在 Tauri 环境中
        if (typeof window === 'undefined' || (!window.__TAURI__ && !window.isTauriApp)) {
            const { default: toastService } = await import('@/services/toastService')
            toastService.error('文件夹选择功能仅在桌面应用中可用，请手动输入路径')
            return
        }

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
        
        // 提供更具体的错误信息
        if (error.message && error.message.includes('invoke')) {
            toastService.error('Tauri API 未正确初始化，请重启应用后重试')
        } else if (error.message && error.message.includes('dialog')) {
            toastService.error('文件对话框插件未正确加载，请检查应用配置')
        } else {
            toastService.error('选择文件夹失败，请重试或手动输入路径')
        }
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

// 实例名称模式设置相关方法
const updateInstanceNamePattern = async () => {
    const pattern = instanceNamePattern.value.trim()
    
    // 基本验证
    if (!pattern) {
        instanceNamePattern.value = 'MaiBot-{version}'
        return
    }
    
    // 保存到localStorage
    localStorage.setItem('instanceNamePattern', pattern)
    
    // 调用实例名称生成器的设置方法
    try {
        const { setInstanceNamePattern } = await import('@/utils/instanceNameGenerator')
        setInstanceNamePattern(pattern)
        
        const { default: toastService } = await import('@/services/toastService')
        toastService.success('实例名称模式已更新')
        
        console.log('实例名称模式已更新:', pattern)
    } catch (error) {
        console.error('更新实例名称模式失败:', error)
        const { default: toastService } = await import('@/services/toastService')
        toastService.error('更新实例名称模式失败')
    }
}

const resetInstanceNamePattern = () => {
    instanceNamePattern.value = 'MaiBot-{version}'
    updateInstanceNamePattern()
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
const changeBackendUrl = async () => {
    // 验证 URL 格式
    try {
        const url = new URL(backendUrl.value)

        localStorage.setItem('backendUrl', backendUrl.value)
        console.log('后端服务地址已更新:', backendUrl.value)

        // 更新全局后端配置
        const backendConfig = (await import('../../config/backendConfig')).default
        backendConfig.setBackendServer(url.hostname, parseInt(url.port) || 23456)

        // 通知其他组件后端地址已更改
        window.dispatchEvent(new CustomEvent('backend-url-changed', {
            detail: { url: backendUrl.value }
        }))

        const { default: toastService } = await import('../../services/toastService')
        toastService.success('后端服务地址已更新')
    } catch (error) {
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('请输入有效的 URL 格式')
    }
}

const resetBackendUrl = () => {
    backendUrl.value = 'http://localhost:23456'
    changeBackendUrl()
}

const testBackendConnection = async () => {
    isTestingBackendConnection.value = true

    try {
        // 动态导入需要的服务
        const { default: toastService } = await import('../../services/toastService')

        console.log('测试后端连接:', backendUrl.value)

        // 直接使用fetch测试连接，支持自定义后端地址
        const testUrl = `${backendUrl.value}/api/v1/system/health`

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 5000
        })

        if (response.ok) {
            const data = await response.json()
            if (data && data.status === 'success') {
                toastService.success('后端连接测试成功')

                // 更新后端配置到全局
                const backendConfig = (await import('../../config/backendConfig')).default
                const url = new URL(backendUrl.value)
                backendConfig.setBackendServer(url.hostname, parseInt(url.port) || 23456)                // 通知其他组件后端连接状态已改变
                window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                    detail: { connected: true }
                }))
            } else {
                toastService.error('后端服务响应格式不正确')
            }
        } else {
            toastService.error(`连接失败：HTTP ${response.status}`)
        }
    } catch (error) {
        console.error('测试后端连接时出错:', error)
        const { default: toastService } = await import('../../services/toastService')

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            toastService.error('连接被拒绝，请检查：\n1. 后端服务是否已启动\n2. IP地址和端口是否正确\n3. 防火墙设置')
        } else {
            toastService.error('连接测试失败: ' + error.message)
        }
    } finally {
        isTestingBackendConnection.value = false
    }
}

// 检查后端连接状态
const checkBackendConnection = async () => {
    isCheckingConnection.value = true
    try {
        const testUrl = `${backendUrl.value}/api/v1/system/health`
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 5000
        })

        if (response.ok) {
            const data = await response.json()
            isConnected.value = data && data.status === 'success'
        } else {
            isConnected.value = false
        }
        lastConnectionCheck.value = new Date()
    } catch (error) {
        console.error('检查后端连接失败:', error)
        isConnected.value = false
        lastConnectionCheck.value = new Date()
    } finally {
        isCheckingConnection.value = false
    }
}

// 尝试重新连接后端
const attemptReconnection = async () => {
    isReconnecting.value = true
    try {
        const { default: toastService } = await import('../../services/toastService')

        // 尝试重新连接
        await checkBackendConnection()

        if (isConnected.value) {
            toastService.success('重新连接成功')
            // 通知其他组件后端连接状态已改变
            window.dispatchEvent(new CustomEvent('backend-connection-changed', {
                detail: { connected: true }
            }))
        } else {
            toastService.error('重新连接失败，请检查后端服务状态')
        }
    } catch (error) {
        console.error('重新连接失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('重新连接失败: ' + error.message)
    } finally {
        isReconnecting.value = false
    }
}

// 清除本地数据
const clearLocalData = async () => {
    try {
        const { default: toastService } = await import('../../services/toastService')

        // 清除特定的本地存储数据，保留设置相关数据
        const keysToRemove = [
            'instancesCache',
            'deploymentsCache',
            'logsCache',
            'lastSyncTime'
        ]

        keysToRemove.forEach(key => {
            localStorage.removeItem(key)
        })

        // 清除会话存储
        sessionStorage.clear()

        toastService.success('本地缓存数据已清除')

        // 通知其他组件数据已清除
        window.dispatchEvent(new CustomEvent('local-data-cleared'))
    } catch (error) {
        console.error('清除本地数据失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('清除本地数据失败: ' + error.message)
    }
}

// 主题模式切换方法
const changeThemeMode = () => {
    console.log('主题模式已更新:', themeMode.value)

    // 根据选择的模式应用主题
    let targetTheme
    if (themeMode.value === 'system') {
        // 跟随系统
        targetTheme = systemDarkMode.value ? 'dark' : 'light'
        console.log('系统主题检测:', systemDarkMode.value ? '暗色' : '亮色', '应用主题:', targetTheme)
    } else {
        // 直接应用选择的主题
        targetTheme = themeMode.value
        console.log('手动选择主题:', targetTheme)
    }

    // 设置主题
    setTheme(targetTheme)

    // 通知其他组件主题模式已更改
    window.dispatchEvent(new CustomEvent('theme-mode-changed', {
        detail: {
            mode: themeMode.value,
            theme: targetTheme,
            isSystem: themeMode.value === 'system'
        }
    }))
}

// 切换动画效果
const toggleAnimations = () => {
    localStorage.setItem('enableAnimations', enableAnimations.value.toString())
    console.log('动画效果设置已更新:', enableAnimations.value)

    // 应用动画设置到文档
    if (enableAnimations.value) {
        document.documentElement.classList.add('animations-enabled')
        document.documentElement.classList.remove('animations-disabled')
    } else {
        document.documentElement.classList.add('animations-disabled')
        document.documentElement.classList.remove('animations-enabled')
    }

    // 通知其他组件动画设置已更改
    window.dispatchEvent(new CustomEvent('animations-setting-changed', {
        detail: { enabled: enableAnimations.value }
    }))
}

// 改变字体大小
const changeFontSize = () => {
    localStorage.setItem('fontSize', fontSize.value.toString())
    console.log('字体大小已更新:', fontSize.value)

    // 应用字体大小到文档
    document.documentElement.style.setProperty('--custom-font-size', `${fontSize.value}px`)

    // 通知其他组件字体大小已更改
    window.dispatchEvent(new CustomEvent('font-size-changed', {
        detail: { size: fontSize.value }
    }))
}

// 设置布局密度
const setLayoutDensity = (density) => {
    layoutDensity.value = density
    localStorage.setItem('layoutDensity', density)
    console.log('布局密度已更新:', density)

    // 应用布局密度到文档
    document.documentElement.className = document.documentElement.className
        .replace(/layout-\w+/g, '')
    document.documentElement.classList.add(`layout-${density}`)

    // 通知其他组件布局密度已更改
    window.dispatchEvent(new CustomEvent('layout-density-changed', {
        detail: { density }
    }))
}

// 重置设置
const resetSettings = async () => {
    try {
        // 重置主题设置
        themeMode.value = 'system'
        enableAnimations.value = true
        fontSize.value = 14
        layoutDensity.value = 'comfortable'

        // 重置其他设置
        webuiEnabled.value = true
        webuiPort.value = 11111
        backendUrl.value = 'http://localhost:23456'
        deploymentNotifications.value = true
        instanceNotifications.value = true
        showWelcomeOnStartup.value = true

        // 重置路径设置
        dataStoragePath.value = getDefaultDataPath()
        deploymentPath.value = getDefaultDeploymentPath()

        // 清除本地存储
        localStorage.clear()

        // 重新保存默认设置
        localStorage.setItem('themeMode', 'system')
        localStorage.setItem('enableAnimations', 'true')
        localStorage.setItem('fontSize', '14')
        localStorage.setItem('layoutDensity', 'comfortable')
        localStorage.setItem('webuiEnabled', 'true')
        localStorage.setItem('webuiPort', '11111')
        localStorage.setItem('backendUrl', 'http://localhost:23456')
        localStorage.setItem('deploymentNotifications', 'true')
        localStorage.setItem('instanceNotifications', 'true')
        localStorage.setItem('showWelcomeOnStartup', 'true')
        localStorage.setItem('dataStoragePath', dataStoragePath.value)
        localStorage.setItem('deploymentPath', deploymentPath.value)

        // 应用重置后的设置
        changeThemeMode()
        toggleAnimations()
        changeFontSize()
        setLayoutDensity('comfortable')

        const { default: toastService } = await import('../../services/toastService')
        toastService.success('设置已重置为默认值')

        // 通知其他组件设置已重置
        window.dispatchEvent(new CustomEvent('settings-reset'))
    } catch (error) {
        console.error('重置设置失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('重置设置失败: ' + error.message)
    }
}

// 打开数据文件夹
const openDataFolder = async () => {
    try {
        if (window.__TAURI_INTERNALS__) {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('open_folder', { path: dataStoragePath.value })
        } else {
            // 开发环境下的处理
            console.log('在开发环境中，无法打开文件夹:', dataStoragePath.value)
            const { default: toastService } = await import('../../services/toastService')
            toastService.info('开发环境下无法打开文件夹')
        }
    } catch (error) {
        console.error('打开数据文件夹失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('打开文件夹失败: ' + error.message)
    }
}

// 打开部署文件夹
const openDeploymentFolder = async () => {
    try {
        if (window.__TAURI_INTERNALS__) {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('open_folder', { path: deploymentPath.value })
        } else {
            // 开发环境下的处理
            console.log('在开发环境中，无法打开文件夹:', deploymentPath.value)
            const { default: toastService } = await import('../../services/toastService')
            toastService.info('开发环境下无法打开文件夹')
        }
    } catch (error) {
        console.error('打开部署文件夹失败:', error)
        const { default: toastService } = await import('../../services/toastService')
        toastService.error('打开文件夹失败: ' + error.message)
    }
}

// 系统主题检测和监听
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

const handleSystemThemeChange = (e) => {
    const wasSystemDark = systemDarkMode.value
    systemDarkMode.value = e.matches

    console.log('系统主题变化:', wasSystemDark ? '暗色' : '亮色', '->', e.matches ? '暗色' : '亮色')

    // 只有在 system 模式下才响应系统主题变化
    if (themeMode.value === 'system') {
        console.log('当前为系统模式，响应系统主题变化')
        changeThemeMode()
    }
}

// 初始化设置
const initializeSettings = () => {
    // 首先初始化系统暗色模式检测
    systemDarkMode.value = mediaQuery.matches
    console.log('初始系统主题状态:', systemDarkMode.value ? '暗色' : '亮色')

    // 初始化所有设置从 localStorage
    themeMode.value = localStorage.getItem('themeMode') || 'system'
    enableAnimations.value = localStorage.getItem('enableAnimations') !== 'false'
    fontSize.value = parseInt(localStorage.getItem('fontSize') || '14')
    layoutDensity.value = localStorage.getItem('layoutDensity') || 'comfortable'

    webuiEnabled.value = localStorage.getItem('webuiEnabled') !== 'false'
    webuiPort.value = parseInt(localStorage.getItem('webuiPort')) || 11111
    backendUrl.value = localStorage.getItem('backendUrl') || 'http://localhost:23456'

    deploymentNotifications.value = localStorage.getItem('deploymentNotifications') !== 'false'
    instanceNotifications.value = localStorage.getItem('instanceNotifications') !== 'false'
    showWelcomeOnStartup.value = localStorage.getItem('showWelcomeOnStartup') !== 'false'

    dataStoragePath.value = localStorage.getItem('dataStoragePath') || getDefaultDataPath()
    
    // 安全获取部署路径，检查并修复有问题的路径
    let savedDeploymentPath = localStorage.getItem('deploymentPath');
    if (savedDeploymentPath && (savedDeploymentPath.includes('MaiBot\\MaiBot') || savedDeploymentPath.includes('D:\\MaiBot'))) {
        console.warn('设置页面检测到localStorage中的部署路径有问题，重置为默认值:', savedDeploymentPath);
        localStorage.removeItem('deploymentPath');
        savedDeploymentPath = null;
    }
    deploymentPath.value = savedDeploymentPath || getDefaultDeploymentPath()

    console.log('初始化主题模式:', themeMode.value)

    // 应用初始化设置
    changeThemeMode()
    changeFontSize()
    setLayoutDensity(layoutDensity.value)

    if (enableAnimations.value) {
        document.documentElement.classList.add('animations-enabled')
    } else {
        document.documentElement.classList.remove('animations-enabled')
    }

    console.log('设置已初始化')
}

// 组件挂载时的初始化
onMounted(() => {
    console.log('SettingsDrawer 组件开始挂载')

    // 监听系统主题变化
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    // 初始化设置（包括系统主题检测）
    initializeSettings()

    // 初始化 WebUI 状态
    initializeWebuiStatus()

    // 初始化版本信息
    initializeVersionInfo()

    // 确保滚轮事件正常工作
    nextTick(() => {
        const settingsPanel = document.querySelector('.settings-panel')
        if (settingsPanel) {
            // 阻止事件冒泡，确保滚轮事件在设置面板内部处理
            settingsPanel.addEventListener('wheel', (e) => {
                e.stopPropagation()
            }, { passive: true })
        }
    })

    console.log('SettingsDrawer 组件已挂载')
})

// 组件卸载时清理
onBeforeUnmount(() => {
    // 移除系统主题监听器
    mediaQuery.removeEventListener('change', handleSystemThemeChange)

    console.log('SettingsDrawer 组件已卸载')
})

// 监听主题模式变化，保存到 localStorage
watch(themeMode, (newMode, oldMode) => {
    if (oldMode !== undefined) { // 避免初始化时触发
        console.log('主题模式变化 (watch):', oldMode, '->', newMode)
        localStorage.setItem('themeMode', newMode)

        // 注意：这里不调用 changeThemeMode，因为模板中的 @change 事件已经会调用
        // changeThemeMode() 会在用户点击时通过 @change 事件触发
    }
}, { immediate: false })

// 监听系统暗色模式变化，但不直接触发主题切换（由 handleSystemThemeChange 处理）
watch(systemDarkMode, (newValue, oldValue) => {
    if (oldValue !== undefined) { // 避免初始化时触发
        console.log('系统暗色模式变化:', oldValue, '->', newValue)
    }
}, { immediate: false })

// 版本检查相关方法
const checkForUpdates = async () => {
    if (isCheckingVersion.value) return

    isCheckingVersion.value = true
    versionCheckError.value = ''

    try {
        const updateInfo = await versionService.checkForUpdatesFromBackend()

        if (updateInfo.success) {
            versionCheckInfo.value = {
                hasUpdate: updateInfo.data.has_update,
                latestVersion: updateInfo.data.latest_version,
                latestInternal: updateInfo.data.latest_internal,
                updateUrl: updateInfo.data.update_url,
                releaseNotes: updateInfo.data.release_notes,
                lastCheck: new Date().toISOString()
            }

            if (updateInfo.data.has_update) {
                const { default: toastService } = await import('@/services/toastService')
                toastService.info(`发现新版本: ${updateInfo.data.latest_version}`)
            } else {
                const { default: toastService } = await import('@/services/toastService')
                toastService.success('当前已是最新版本')
            }
        } else {
            throw new Error(updateInfo.error || '检查更新失败')
        }
    } catch (error) {
        console.error('检查版本更新失败:', error)
        versionCheckError.value = error.message || '检查更新时发生错误'

        const { default: toastService } = await import('@/services/toastService')
        toastService.error('检查更新失败，请稍后重试')
    } finally {
        isCheckingVersion.value = false
    }
}

const loadBackendVersion = async () => {
    try {
        const response = await versionService.getCurrentVersionFromBackend()

        if (response.success && response.data) {
            backendVersionInfo.value = {
                version: response.data.version,
                internal: response.data.internal_version
            }
        }
    } catch (error) {
        console.error('获取后端版本失败:', error)
        backendVersionInfo.value = {
            version: '获取失败',
            internal: null
        }
    }
}

const loadVersionHistory = async () => {
    if (isLoadingVersionHistory.value) return

    isLoadingVersionHistory.value = true

    try {
        const response = await versionService.getVersionHistory()

        if (response.success && response.data) {
            versionHistory.value = response.data
        }
    } catch (error) {
        console.error('获取版本历史失败:', error)
        const { default: toastService } = await import('@/services/toastService')
        toastService.error('获取版本历史失败')
    } finally {
        isLoadingVersionHistory.value = false
    }
}

const initializeVersionInfo = () => {
    // 初始化前端版本信息
    try {
        // 从 package.json 或其他地方获取前端版本
        const packageVersion = '0.1.0' // 这里应该从实际的 package.json 获取
        const { version, internal } = formatVersionInfo(packageVersion)

        currentVersionInfo.value.frontend = {
            version,
            internal
        }
    } catch (error) {
        console.error('初始化版本信息失败:', error)
    }

    // 加载后端版本信息
    loadBackendVersion()
}

const toggleAutoVersionCheck = () => {
    localStorage.setItem('autoVersionCheck', autoCheckEnabled.value.toString())

    if (autoCheckEnabled.value) {
        versionService.startAutoCheck(autoCheckInterval.value * 60 * 60 * 1000) // 转换为毫秒
    } else {
        versionService.stopAutoCheck()
    }
}

const updateAutoCheckInterval = () => {
    localStorage.setItem('autoVersionCheckInterval', autoCheckInterval.value.toString())

    if (autoCheckEnabled.value) {
        versionService.startAutoCheck(autoCheckInterval.value * 60 * 60 * 1000) // 转换为毫秒
    }
}

const openUpdateUrl = () => {
    if (versionCheckInfo.value.updateUrl) {
        window.open(versionCheckInfo.value.updateUrl, '_blank')
    }
}
</script>

<style>
@import './SettingsDrawer.css';

/* 组件库图标对齐优化 */
.setting-group .group-icon {
  /* 确保图标容器不会影响整体布局 */
  align-self: flex-start;
  margin-top: 0.125rem;
}

.setting-group .group-icon .iconify {
  /* 确保图标在容器中居中 */
  display: block;
  margin: 0 auto;
}

.setting-item {
  /* 确保设置项之间有适当的间距 */
  margin-bottom: 0;
}

.setting-item .setting-control {
  /* 确保控制元素垂直居中 */
  align-self: center;
}

/* 修正开关组件的对齐 */
.toggle-switch {
  vertical-align: middle;
}

/* 修正滑块组件的对齐 */
.slider-control {
  align-items: center;
}

/* 确保组件库中的图标与原设计一致 */
.group-title,
.setting-label {
  /* 确保文字与图标对齐 */
  line-height: 1.4;
}
</style>

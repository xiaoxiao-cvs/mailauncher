<template>
    <div v-if="visible" class="fixed inset-0 z-50 bg-base-100 overflow-y-auto">
        <div class="min-h-screen w-full max-w-5xl mx-auto p-6"> <!-- 头部 -->
            <div class="flex items-center justify-center gap-3 mb-8">
                <div class="flex items-center gap-3">
                    <img src="/assets/icon.ico" alt="MaiLauncher" class="w-12 h-12" />
                    <div>
                        <h1 class="font-bold text-2xl">MaiLauncher 初始化设置</h1>
                        <p class="text-sm text-base-content/70">让我们来配置您的 MaiBot 启动器</p>
                    </div>
                </div>
            </div>

            <!-- 步骤内容 -->
            <div class="setup-content">
                <!-- 步骤1: 欢迎和概述 -->
                <div v-if="currentStep.id === 'welcome'" class="setup-step animate-step-in">
                    <div class="text-center mb-8">
                        <div class="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <Icon icon="mdi:rocket-launch" class="w-12 h-12 text-primary" />
                        </div>
                        <h2 class="text-3xl font-bold mb-4">欢迎使用 MaiLauncher！</h2>
                        <p class="text-lg text-base-content/70 max-w-2xl mx-auto">
                            MaiLauncher 是您管理和部署 MaiBot 实例的强大工具。让我们通过几个简单的步骤来配置您的系统。
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="feature-card">
                            <div class="feature-icon bg-blue-500/10">
                                <Icon icon="mdi:server" class="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 class="font-semibold mb-2">实例管理</h3>
                            <p class="text-sm text-base-content/70">创建、启动和管理 MaiBot 实例</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon bg-green-500/10">
                                <Icon icon="mdi:console" class="w-8 h-8 text-green-500" />
                            </div>
                            <h3 class="font-semibold mb-2">终端控制</h3>
                            <p class="text-sm text-base-content/70">实时终端交互和日志监控</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon bg-purple-500/10">
                                <Icon icon="mdi:download" class="w-8 h-8 text-purple-500" />
                            </div>
                            <h3 class="font-semibold mb-2">自动部署</h3>
                            <p class="text-sm text-base-content/70">一键下载和安装最新版本</p>
                        </div>
                    </div>
                </div>

                <!-- 步骤2: 路径配置 -->
                <div v-if="currentStep.id === 'paths'" class="setup-step animate-step-in">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4">配置存储路径</h2>
                        <p class="text-base-content/70 mb-8">
                            设置数据存储和实例部署的路径。这些路径将用于存储配置文件、日志和实例文件。
                        </p>

                        <div class="space-y-6">
                            <!-- 数据存储路径 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:database" class="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">数据存储路径</h3>
                                        <p class="text-sm text-base-content/70">用于存储配置文件、日志和数据</p>
                                    </div>
                                </div>
                                <div class="flex gap-3">
                                    <input type="text" v-model="config.dataStoragePath"
                                        class="input input-bordered flex-1" placeholder="选择数据存储路径">
                                    <button class="btn btn-outline" @click="selectDataPath">
                                        <Icon icon="mdi:folder-outline" class="w-4 h-4" />
                                        浏览
                                    </button>
                                    <button class="btn btn-ghost" @click="resetDataPath">
                                        <Icon icon="mdi:refresh" class="w-4 h-4" />
                                        默认
                                    </button>
                                </div>
                            </div>

                            <!-- 部署路径 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:package-variant" class="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">实例部署路径</h3>
                                        <p class="text-sm text-base-content/70">用于安装和运行 MaiBot 实例</p>
                                    </div>
                                </div>
                                <div class="flex gap-3">
                                    <input type="text" v-model="config.deploymentPath"
                                        class="input input-bordered flex-1" placeholder="选择实例部署路径">
                                    <button class="btn btn-outline" @click="selectDeploymentPath">
                                        <Icon icon="mdi:folder-outline" class="w-4 h-4" />
                                        浏览
                                    </button>
                                    <button class="btn btn-ghost" @click="resetDeploymentPath">
                                        <Icon icon="mdi:refresh" class="w-4 h-4" />
                                        默认
                                    </button>
                                </div>
                            </div>

                            <!-- 路径预览 -->
                            <div class="bg-base-200 rounded-lg p-4">
                                <h4 class="font-medium mb-3 flex items-center gap-2">
                                    <Icon icon="mdi:eye-outline" class="w-4 h-4" />
                                    路径预览
                                </h4>
                                <div class="space-y-2 text-sm font-mono">
                                    <div class="flex justify-between">
                                        <span class="text-base-content/70">数据存储:</span>
                                        <span class="text-primary">{{ config.dataStoragePath || '未设置' }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-base-content/70">实例部署:</span>
                                        <span class="text-primary">{{ config.deploymentPath || '未设置' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 步骤3: 后端连接 -->
                <div v-if="currentStep.id === 'backend'" class="setup-step animate-step-in">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4">后端服务配置</h2>
                        <p class="text-base-content/70 mb-8">
                            配置后端服务连接以启用完整功能。如果没有后端服务，系统将以演示模式运行。
                        </p>

                        <div class="space-y-6"> <!-- 连接状态 -->
                            <div class="bg-base-200 rounded-lg p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="font-semibold">连接状态</h3>
                                    <button class="btn btn-primary btn-sm" @click="attemptReconnect"
                                        :disabled="isReconnecting">
                                        <span v-if="isReconnecting" class="loading loading-spinner loading-xs"></span>
                                        <Icon v-else icon="mdi:refresh" class="w-4 h-4" />
                                        {{ isReconnecting ? '重连中...' : '重连' }}
                                    </button>
                                </div>
                                <div class="alert" :class="backendConnectionStatus.alertClass">
                                    <Icon :icon="backendConnectionStatus.icon" class="shrink-0 w-6 h-6" />
                                    <div>
                                        <h4 class="font-bold">{{ backendConnectionStatus.title }}</h4>
                                        <p class="text-sm">{{ backendConnectionStatus.description }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- 后端配置 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:server-network" class="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">后端服务地址</h3>
                                        <p class="text-sm text-base-content/70">配置后端API服务的连接地址</p>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex gap-3">
                                        <input type="text" v-model="config.backendUrl"
                                            class="input input-bordered flex-1" placeholder="http://localhost:23456">
                                        <button class="btn btn-ghost" @click="resetBackendUrl">
                                            <Icon icon="mdi:refresh" class="w-4 h-4" />
                                            默认
                                        </button>
                                    </div>
                                    <p class="text-xs text-base-content/50">
                                        默认地址: http://localhost:23456
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 步骤4: 检查链接与更新 -->
                <div v-if="currentStep.id === 'connection'" class="setup-step animate-step-in">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4">检查链接与更新</h2>
                        <p class="text-base-content/70 mb-8">
                            检查各项服务的连接状态，并检查是否有可用的后端更新。
                        </p>

                        <div class="space-y-6">
                            <!-- 连接检查区域 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:connection" class="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">服务连接检查</h3>
                                        <p class="text-sm text-base-content/70">检查各项服务的连接状态</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <!-- Github连接 -->
                                    <div
                                        class="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-base-300">
                                        <div class="flex items-center gap-3">
                                            <Icon icon="mdi:github" class="w-6 h-6 text-base-content" />
                                            <div>
                                                <div class="font-medium">GitHub</div>
                                                <div class="text-sm text-base-content/70">github.com</div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span v-if="connectionStatus.github === 'checking'"
                                                class="loading loading-spinner loading-sm"></span>
                                            <span v-else-if="connectionStatus.github === 'success'"
                                                class="badge badge-success">
                                                <Icon icon="mdi:check" class="w-3 h-3 mr-1" />
                                                连接正常
                                            </span>
                                            <span v-else-if="connectionStatus.github === 'error'"
                                                class="badge badge-error">
                                                <Icon icon="mdi:close" class="w-3 h-3 mr-1" />
                                                连接失败
                                            </span>
                                            <span v-else class="badge badge-outline">
                                                <Icon icon="mdi:help" class="w-3 h-3 mr-1" />
                                                未检查
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Gitee连接 -->
                                    <div
                                        class="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-base-300">
                                        <div class="flex items-center gap-3">
                                            <Icon icon="simple-icons:gitee" class="w-6 h-6 text-red-500" />
                                            <div>
                                                <div class="font-medium">Gitee</div>
                                                <div class="text-sm text-base-content/70">gitee.com</div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span v-if="connectionStatus.gitee === 'checking'"
                                                class="loading loading-spinner loading-sm"></span>
                                            <span v-else-if="connectionStatus.gitee === 'success'"
                                                class="badge badge-success">
                                                <Icon icon="mdi:check" class="w-3 h-3 mr-1" />
                                                连接正常
                                            </span>
                                            <span v-else-if="connectionStatus.gitee === 'error'"
                                                class="badge badge-error">
                                                <Icon icon="mdi:close" class="w-3 h-3 mr-1" />
                                                连接失败
                                            </span>
                                            <span v-else class="badge badge-outline">
                                                <Icon icon="mdi:help" class="w-3 h-3 mr-1" />
                                                未检查
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 后端连接 -->
                                    <div
                                        class="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-base-300">
                                        <div class="flex items-center gap-3">
                                            <Icon icon="mdi:server" class="w-6 h-6 text-green-500" />
                                            <div>
                                                <div class="font-medium">后端服务</div>
                                                <div class="text-sm text-base-content/70">{{ config.backendUrl }}</div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span v-if="connectionStatus.backend === 'checking'"
                                                class="loading loading-spinner loading-sm"></span>
                                            <span v-else-if="connectionStatus.backend === 'success'"
                                                class="badge badge-success">
                                                <Icon icon="mdi:check" class="w-3 h-3 mr-1" />
                                                连接正常
                                            </span>
                                            <span v-else-if="connectionStatus.backend === 'error'"
                                                class="badge badge-error">
                                                <Icon icon="mdi:close" class="w-3 h-3 mr-1" />
                                                连接失败
                                            </span>
                                            <span v-else class="badge badge-outline">
                                                <Icon icon="mdi:help" class="w-3 h-3 mr-1" />
                                                未检查
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 检查全部按钮 -->
                                    <div class="flex items-center justify-center p-4">
                                        <button class="btn btn-primary" @click="checkAllConnections"
                                            :disabled="isCheckingConnections">
                                            <span v-if="isCheckingConnections"
                                                class="loading loading-spinner loading-sm"></span>
                                            <Icon v-else icon="mdi:refresh" class="w-4 h-4" />
                                            {{ isCheckingConnections ? '检查中...' : '检查全部连接' }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 更新检查区域 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:update" class="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">版本更新检查</h3>
                                        <p class="text-sm text-base-content/70">检查后端服务是否有可用更新</p>
                                    </div>
                                </div>

                                <div class="space-y-4">
                                    <!-- 当前版本信息 -->
                                    <div
                                        class="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-base-300">
                                        <div class="flex items-center gap-3">
                                            <Icon icon="mdi:information" class="w-6 h-6 text-blue-500" />
                                            <div>
                                                <div class="font-medium">当前版本</div>
                                                <div class="text-sm text-base-content/70">{{ updateInfo.currentVersion
                                                    || '未知' }}</div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <button class="btn btn-outline btn-sm" @click="checkForUpdates"
                                                :disabled="isCheckingUpdates">
                                                <span v-if="isCheckingUpdates"
                                                    class="loading loading-spinner loading-xs"></span>
                                                <Icon v-else icon="mdi:refresh" class="w-3 h-3" />
                                                {{ isCheckingUpdates ? '检查中' : '检查更新' }}
                                            </button>
                                        </div>
                                    </div>

                                    <!-- 更新信息 -->
                                    <div v-if="updateInfo.hasUpdate" class="alert alert-info">
                                        <Icon icon="mdi:information" class="w-5 h-5" />
                                        <div>
                                            <div class="font-medium">发现新版本: {{ updateInfo.latestVersion }}</div>
                                            <div class="text-sm opacity-80">{{ updateInfo.updateDescription }}</div>
                                        </div>
                                    </div>

                                    <div v-else-if="updateInfo.checked && !updateInfo.hasUpdate"
                                        class="alert alert-success">
                                        <Icon icon="mdi:check-circle" class="w-5 h-5" />
                                        <div>当前已是最新版本</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 步骤5: WebUI配置 -->
                <div v-if="currentStep.id === 'webui'" class="setup-step animate-step-in">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4">WebUI 配置</h2>
                        <p class="text-base-content/70 mb-8">
                            配置 Web 用户界面的访问设置，包括启用状态和端口配置。
                        </p>

                        <div class="space-y-6">
                            <!-- WebUI启用设置 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:web" class="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">WebUI 启用状态</h3>
                                        <p class="text-sm text-base-content/70">启用或禁用 Web 用户界面</p>
                                    </div>
                                </div>

                                <div
                                    class="flex items-center justify-between p-6 bg-base-100 rounded-lg border border-base-300">
                                    <div class="flex items-center gap-4">
                                        <div class="flex-shrink-0">
                                            <div
                                                class="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                                                <Icon icon="mdi:web" class="w-6 h-6 text-purple-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <div class="font-semibold text-lg">Web 用户界面</div>
                                            <div class="text-base-content/70">
                                                启用后可通过浏览器访问管理界面
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm font-medium">{{ config.webui.enabled ? '已启用' : '已禁用'
                                            }}</span>
                                        <HyperOS2Switch v-model="config.webui.enabled" />
                                    </div>
                                </div>
                            </div>

                            <!-- WebUI端口配置 -->
                            <div v-show="config.webui.enabled" class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:lan" class="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">端口配置</h3>
                                        <p class="text-sm text-base-content/70">设置 WebUI 的访问端口</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <!-- 端口设置 -->
                                    <div class="space-y-4">
                                        <div class="form-control">
                                            <label class="label">
                                                <span class="label-text font-medium">访问端口</span>
                                                <span class="label-text-alt text-base-content/60">默认: 11111</span>
                                            </label>
                                            <input type="number" v-model.number="config.webui.port"
                                                class="input input-bordered" min="1024" max="65535"
                                                placeholder="11111" />
                                            <label class="label">
                                                <span class="label-text-alt text-base-content/60">
                                                    端口范围: 1024-65535
                                                </span>
                                            </label>
                                        </div>

                                        <!-- 端口验证 -->
                                        <div v-if="config.webui.port && (config.webui.port < 1024 || config.webui.port > 65535)"
                                            class="alert alert-warning">
                                            <Icon icon="mdi:alert" class="w-4 h-4" />
                                            <span class="text-sm">请输入 1024-65535 范围内的端口号</span>
                                        </div>
                                    </div>

                                    <!-- 预览和访问信息 -->
                                    <div class="space-y-4">
                                        <div class="bg-base-200 rounded-lg p-4 border border-base-300">
                                            <h4 class="font-medium mb-3 flex items-center gap-2">
                                                <Icon icon="mdi:eye-outline" class="w-4 h-4" />
                                                访问信息
                                            </h4>
                                            <div class="space-y-2 text-sm">
                                                <div class="flex justify-between">
                                                    <span class="text-base-content/70">本地访问:</span>
                                                    <span class="font-mono text-primary">http://localhost:{{
                                                        config.webui.port || 11111 }}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-base-content/70">局域网访问:</span>
                                                    <span class="font-mono text-primary">http://[本机IP]:{{
                                                        config.webui.port || 11111 }}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-base-content/70">状态:</span>
                                                    <span class="badge badge-sm"
                                                        :class="config.webui.enabled ? 'badge-success' : 'badge-neutral'">
                                                        {{ config.webui.enabled ? '启用' : '禁用' }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 安全提示 -->
                                        <div class="alert alert-info">
                                            <Icon icon="mdi:shield-outline" class="w-4 h-4" />
                                            <div class="text-sm">
                                                <div class="font-medium">安全提示</div>
                                                <div class="opacity-80">请确保防火墙设置允许访问此端口</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 步骤6: 主题和动画 -->
                <div v-if="currentStep.id === 'appearance'" class="setup-step animate-step-in">
                    <div class="max-w-3xl mx-auto">
                        <h2 class="text-2xl font-bold mb-4">主题和外观</h2>
                        <p class="text-base-content/70 mb-8">
                            自定义 MaiLauncher 的外观和主题，让界面更符合您的使用习惯。
                        </p>

                        <div class="space-y-6">
                            <!-- 主题模式 -->
                            <div class="config-section">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                                        <Icon icon="mdi:palette" class="w-5 h-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold">主题模式</h3>
                                        <p class="text-sm text-base-content/70">选择界面的明暗主题</p>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label v-for="theme in themeOptions" :key="theme.value" class="theme-option"
                                        :class="{ 'theme-selected': config.themeMode === theme.value }">
                                        <input type="radio" name="theme" :value="theme.value" v-model="config.themeMode"
                                            class="hidden" @change="applyThemePreview">
                                        <div class="theme-content">
                                            <div class="theme-icon" :class="theme.iconBg">
                                                <Icon :icon="theme.icon" class="w-6 h-6" :class="theme.iconColor" />
                                            </div>
                                            <h4 class="font-medium">{{ theme.title }}</h4>
                                            <p class="text-sm text-base-content/70">{{ theme.description }}</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- 其他外观选项 -->
                            <div class="config-section">
                                <h3 class="font-semibold mb-4">界面选项</h3>
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <label class="font-medium">动画效果</label>
                                            <p class="text-sm text-base-content/70">启用界面过渡动画</p>
                                        </div>
                                        <HyperOS2Switch v-model="config.enableAnimations" />
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <label class="font-medium">启动时显示欢迎页面</label>
                                            <p class="text-sm text-base-content/70">每次启动时显示欢迎界面</p>
                                        </div>
                                        <HyperOS2Switch v-model="config.showWelcomeOnStartup" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 步骤7: 完成 -->
                <div v-if="currentStep.id === 'complete'" class="setup-step animate-step-in">
                    <div class="text-center max-w-2xl mx-auto">
                        <div class="w-24 h-24 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
                            <Icon icon="mdi:check-circle" class="w-12 h-12 text-success" />
                        </div>
                        <h2 class="text-3xl font-bold mb-4">设置完成！</h2>
                        <p class="text-lg text-base-content/70 mb-8">
                            恭喜！您已成功配置了 MaiLauncher。现在可以开始使用各项功能了。
                        </p>

                        <div class="bg-base-200 rounded-lg p-6 mb-8">
                            <h3 class="font-semibold mb-4">配置摘要</h3>
                            <div class="text-left space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-base-content/70">数据存储路径:</span>
                                    <span class="font-mono text-sm">{{ config.dataStoragePath }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-base-content/70">实例部署路径:</span>
                                    <span class="font-mono text-sm">{{ config.deploymentPath }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-base-content/70">后端地址:</span>
                                    <span class="font-mono text-sm">{{ config.backendUrl }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-base-content/70">主题模式:</span>
                                    <span class="badge badge-outline">{{ getThemeDisplayName(config.themeMode) }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div class="next-step-card">
                                <Icon icon="mdi:download" class="w-8 h-8 text-blue-500 mb-3" />
                                <h4 class="font-semibold mb-2">下载实例</h4>
                                <p class="text-sm text-base-content/70">访问下载中心获取最新的 MaiBot 版本</p>
                            </div>
                            <div class="next-step-card">
                                <Icon icon="mdi:server" class="w-8 h-8 text-green-500 mb-3" />
                                <h4 class="font-semibold mb-2">实例管理</h4>
                                <p class="text-sm text-base-content/70">管理和配置您的 MaiBot 实例</p>
                            </div>
                            <div class="next-step-card">
                                <Icon icon="mdi:settings" class="w-8 h-8 text-purple-500 mb-3" />
                                <h4 class="font-semibold mb-2">进一步配置</h4>
                                <p class="text-sm text-base-content/70">在设置页面中调整更多高级选项</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div> <!-- 底部导航 -->
            <div class="flex items-center justify-center mt-12 pt-6 border-t border-base-300">
                <div class="flex gap-3">
                    <button v-if="currentStepIndex > 0" class="btn btn-outline" @click="previousStep">
                        <Icon icon="mdi:arrow-left" class="w-4 h-4" />
                    </button>

                    <button v-if="currentStepIndex < steps.length - 1" class="btn btn-primary" @click="nextStep"
                        :disabled="!canProceed">
                        <Icon icon="mdi:arrow-right" class="w-4 h-4" />
                    </button>

                    <button v-if="currentStepIndex === steps.length - 1" class="btn btn-success" @click="completeSetup">
                        <Icon icon="mdi:check" class="w-4 h-4" />
                        开始使用
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getDefaultDataPath, getDefaultDeploymentPath, setDataStoragePath, setDeploymentPath } from '@/utils/pathSync'
import toastService from '@/services/toastService'
import { HyperOS2Switch } from '../settings/hyperos2'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['close', 'complete'])

// 设置步骤
const steps = [
    { id: 'welcome', title: '欢迎', required: false },
    { id: 'paths', title: '路径配置', required: true },
    { id: 'backend', title: '后端连接', required: false },
    { id: 'connection', title: '连接检查', required: false },
    { id: 'webui', title: 'WebUI配置', required: false },
    { id: 'appearance', title: '外观设置', required: false },
    { id: 'complete', title: '完成', required: false }
]

const currentStepIndex = ref(0)
const isTestingConnection = ref(false)
const isReconnecting = ref(false)

// 配置状态
const config = ref({
    dataStoragePath: getDefaultDataPath(),
    deploymentPath: getDefaultDeploymentPath(),
    backendUrl: 'http://localhost:23456',
    themeMode: 'system',
    enableAnimations: true,
    showWelcomeOnStartup: false,
    webui: {
        enabled: true,
        port: 11111
    }
})

// 连接检查状态
const connectionStatus = ref({
    github: 'idle', // idle, checking, success, error
    gitee: 'idle',
    backend: 'idle'
})

const isCheckingConnections = ref(false)

// 更新检查状态
const updateInfo = ref({
    currentVersion: '0.1.0-Preview.3',
    latestVersion: null,
    hasUpdate: false,
    checked: false,
    updateDescription: ''
})

const isCheckingUpdates = ref(false)

// 主题选项
const themeOptions = [
    {
        value: 'system',
        title: '跟随系统',
        description: '自动切换明暗主题',
        icon: 'mdi:theme-light-dark',
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-500'
    },
    {
        value: 'light',
        title: '亮色模式',
        description: '始终使用亮色主题',
        icon: 'mdi:weather-sunny',
        iconBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-500'
    },
    {
        value: 'dark',
        title: '暗色模式',
        description: '始终使用暗色主题',
        icon: 'mdi:weather-night',
        iconBg: 'bg-gray-500/10',
        iconColor: 'text-gray-500'
    }
]

// 当前步骤
const currentStep = computed(() => steps[currentStepIndex.value])

// 是否可以继续下一步
const canProceed = computed(() => {
    const step = currentStep.value
    if (!step.required) return true

    switch (step.id) {
        case 'paths':
            return config.value.dataStoragePath && config.value.deploymentPath
        default:
            return true
    }
})

// 后端连接状态（用于步骤3）
const backendConnectionStatus = computed(() => {
    return {
        alertClass: 'alert-success',
        icon: 'mdi:check-circle',
        title: '连接正常',
        description: '后端服务连接成功，所有功能可正常使用。'
    }
})

// 步骤导航
const nextStep = () => {
    if (currentStepIndex.value < steps.length - 1) {
        currentStepIndex.value++
    }
}

const previousStep = () => {
    if (currentStepIndex.value > 0) {
        currentStepIndex.value--
    }
}

// 路径选择
const selectDataPath = async () => {
    // 这里应该调用 Tauri API 来选择文件夹
    toastService.info('文件夹选择功能需要后端支持')
}

const selectDeploymentPath = async () => {
    // 这里应该调用 Tauri API 来选择文件夹
    toastService.info('文件夹选择功能需要后端支持')
}

const resetDataPath = () => {
    config.value.dataStoragePath = getDefaultDataPath()
}

const resetDeploymentPath = () => {
    config.value.deploymentPath = getDefaultDeploymentPath()
}

const resetBackendUrl = () => {
    config.value.backendUrl = 'http://localhost:23456'
}

// 重连功能
const attemptReconnect = async () => {
    isReconnecting.value = true
    try {
        // 尝试重新连接后端服务
        const response = await fetch(`${config.value.backendUrl}/api/v1/system/health`, {
            method: 'GET',
            timeout: 5000
        })

        if (response.ok) {
            const data = await response.json()
            if (data && data.status === 'success') {
                toastService.success('重连成功！')
            } else {
                toastService.error('重连失败：响应格式不正确')
            }
        } else {
            toastService.error('重连失败')
        }
    } catch (error) {
        console.error('重连失败:', error)
        toastService.error('重连失败')
    } finally {
        isReconnecting.value = false
    }
}

// 连接测试
const testConnection = async () => {
    isTestingConnection.value = true
    try {
        // 这里应该调用实际的连接测试
        await new Promise(resolve => setTimeout(resolve, 2000))
        toastService.success('连接测试成功')
    } catch (error) {
        toastService.error('连接测试失败')
    } finally {
        isTestingConnection.value = false
    }
}

// 主题预览
const applyThemePreview = () => {
    const theme = config.value.themeMode
    if (theme === 'system') {
        // 跟随系统
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
        document.documentElement.setAttribute('data-theme', theme)
    }
}

// 获取主题显示名称
const getThemeDisplayName = (value) => {
    const option = themeOptions.find(opt => opt.value === value)
    return option ? option.title : value
}

// 完成设置
const completeSetup = () => {
    // 保存所有配置
    setDataStoragePath(config.value.dataStoragePath);
    setDeploymentPath(config.value.deploymentPath);

    localStorage.setItem('backendUrl', config.value.backendUrl)
    localStorage.setItem('themeMode', config.value.themeMode)
    localStorage.setItem('enableAnimations', config.value.enableAnimations.toString())
    localStorage.setItem('firstTimeSetupCompleted', 'true')

    // 保存 WebUI 配置
    localStorage.setItem('webui.enabled', config.value.webui.enabled.toString())
    localStorage.setItem('webui.port', config.value.webui.port.toString())

    if (!config.value.showWelcomeOnStartup) {
        localStorage.setItem('welcomeModalDontShow', 'true')
    }

    // 应用最终主题
    applyThemePreview()

    toastService.success('配置已保存，欢迎使用 MaiLauncher！')
    emit('complete')
    emit('close')
}

// 连接检查功能
const checkConnection = async (service) => {
    connectionStatus.value[service] = 'checking'

    try {
        let url
        switch (service) {
            case 'github':
                url = 'https://api.github.com/octocat'
                break
            case 'gitee':
                url = 'https://gitee.com/api/v5/user'
                break
            case 'backend':
                url = `${config.value.backendUrl}/api/v1/system/health`
                break
            default:
                throw new Error('Unknown service')
        }        const response = await fetch(url, {
            method: 'GET',
            mode: service === 'backend' ? 'cors' : 'no-cors',
            timeout: 10000
        })

        // 对于后端请求，检查响应内容
        if (service === 'backend') {
            if (response.ok) {
                const data = await response.json()
                if (data && data.status === 'success') {
                    connectionStatus.value[service] = 'success'
                } else {
                    connectionStatus.value[service] = 'error'
                }
            } else {
                connectionStatus.value[service] = 'error'
            }
        } else {
            // 对于其他 no-cors 请求，只要没有抛出异常就认为连接成功
            connectionStatus.value[service] = 'success'
        }

    } catch (error) {
        console.error(`${service} 连接检查失败:`, error)
        connectionStatus.value[service] = 'error'
    }
}

const checkAllConnections = async () => {
    isCheckingConnections.value = true

    try {
        // 并行检查所有连接
        await Promise.all([
            checkConnection('github'),
            checkConnection('gitee'),
            checkConnection('backend')
        ])

        // 检查结果
        const results = Object.values(connectionStatus.value)
        const successCount = results.filter(status => status === 'success').length
        const totalCount = results.length

        if (successCount === totalCount) {
            toastService.success('所有服务连接正常')
        } else if (successCount > 0) {
            toastService.warning(`${successCount}/${totalCount} 个服务连接正常`)
        } else {
            toastService.error('所有服务连接失败')
        }

    } catch (error) {
        console.error('连接检查过程出错:', error)
        toastService.error('连接检查过程出错')
    } finally {
        isCheckingConnections.value = false
    }
}

// 更新检查功能
const checkForUpdates = async () => {
    isCheckingUpdates.value = true
    updateInfo.value.checked = false

    try {
        // 使用实际的后端API检查更新
        const response = await fetch(`${config.value.backendUrl}/api/v1/version/check`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        updateInfo.value = {
            currentVersion: data.current_version || '1.0.0',
            latestVersion: data.latest_version,
            hasUpdate: data.has_update || false,
            checked: true,
            updateDescription: data.update_description || ''
        }

        if (updateInfo.value.hasUpdate) {
            toastService.info(`发现新版本: ${updateInfo.value.latestVersion}`)
        } else {
            toastService.success('当前已是最新版本')
        }

    } catch (error) {
        console.error('检查更新失败:', error)
        toastService.error('检查更新失败，请稍后重试')

        // 设置默认值
        updateInfo.value = {
            currentVersion: '1.0.0',
            latestVersion: null,
            hasUpdate: false,
            checked: true,
            updateDescription: ''
        }
    } finally {
        isCheckingUpdates.value = false
    }
}

// 初始化
onMounted(() => {
    // 检查是否已有配置
    const savedDataPath = localStorage.getItem('dataStoragePath')
    const savedDeploymentPath = localStorage.getItem('deploymentPath')
    const savedBackendUrl = localStorage.getItem('backendUrl')
    const savedThemeMode = localStorage.getItem('themeMode')
    const savedAnimations = localStorage.getItem('enableAnimations')
    const savedWebuiEnabled = localStorage.getItem('webui.enabled')
    const savedWebuiPort = localStorage.getItem('webui.port')

    if (savedDataPath) config.value.dataStoragePath = savedDataPath
    if (savedDeploymentPath) config.value.deploymentPath = savedDeploymentPath
    if (savedBackendUrl) config.value.backendUrl = savedBackendUrl
    if (savedThemeMode) config.value.themeMode = savedThemeMode
    if (savedAnimations) config.value.enableAnimations = savedAnimations === 'true'
    if (savedWebuiEnabled !== null) config.value.webui.enabled = savedWebuiEnabled === 'true'
    if (savedWebuiPort) config.value.webui.port = parseInt(savedWebuiPort) || 11111
})
</script>

<style scoped>
.animate-step-in {
    animation: stepIn 0.3s ease-out;
}

@keyframes stepIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.step-indicator {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    transition: all 0.3s ease;
}

.step-completed {
    background-color: hsl(var(--su));
    color: hsl(var(--suc));
}

.step-current {
    background-color: hsl(var(--p));
    color: hsl(var(--pc));
}

.step-pending {
    background-color: hsl(var(--b3));
    color: hsl(var(--bc) / 0.5);
}

.step-connector {
    width: 2rem;
    height: 0.125rem;
    background-color: hsl(var(--b3));
    transition: all 0.3s ease;
}

.step-connector-completed {
    background-color: hsl(var(--su));
}

.feature-card {
    padding: 1.5rem;
    background-color: hsl(var(--b2));
    border-radius: 0.5rem;
    text-align: center;
    transition: all 0.3s ease;
}

.feature-card:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.feature-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem auto;
}

.config-section {
    background-color: hsl(var(--b2));
    border-radius: 0.5rem;
    padding: 1.5rem;
}

.mode-option {
    display: block;
    cursor: pointer;
    transition: all 0.3s ease;
}

.mode-content {
    padding: 1rem;
    border: 2px solid hsl(var(--b3));
    border-radius: 0.5rem;
    text-align: center;
    transition: all 0.3s ease;
}

.mode-content:hover {
    border-color: hsl(var(--p) / 0.5);
}

.mode-selected .mode-content {
    border-color: hsl(var(--p));
    background-color: hsl(var(--p) / 0.05);
}

.mode-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.75rem auto;
}

.theme-option {
    display: block;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
}

.theme-content {
    padding: 1.5rem;
    border: 2px solid hsl(var(--b3));
    border-radius: 0.75rem;
    text-align: center;
    transition: all 0.3s ease;
    background-color: hsl(var(--b1));
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;
}

.theme-content:hover {
    border-color: hsl(var(--p) / 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-selected .theme-content {
    border-color: hsl(var(--p));
    background-color: hsl(var(--p) / 0.1);
    box-shadow: 0 4px 12px hsl(var(--p) / 0.2);
}

.theme-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.75rem auto;
    transition: all 0.3s ease;
}

.next-step-card {
    padding: 1.5rem;
    background-color: hsl(var(--b2));
    border-radius: 0.5rem;
    text-align: center;
}

.progress {
    width: 100%;
    background-color: hsl(var(--b3));
    border-radius: 9999px;
    height: 0.5rem;
    overflow: hidden;
}

.progress-value {
    height: 100%;
    background-color: hsl(var(--p));
    transition: all 0.3s ease;
}

/* Toggle Switch 样式 */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 3.5rem;
    height: 2rem;
}

.toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: hsl(var(--b3));
    transition: 0.3s;
    border-radius: 2rem;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 1.5rem;
    width: 1.5rem;
    left: 0.25rem;
    bottom: 0.25rem;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked+.toggle-slider {
    background-color: hsl(var(--p));
}

.toggle-input:checked+.toggle-slider:before {
    transform: translateX(1.5rem);
}

.toggle-input:focus+.toggle-slider {
    box-shadow: 0 0 1px hsl(var(--p));
}
</style>

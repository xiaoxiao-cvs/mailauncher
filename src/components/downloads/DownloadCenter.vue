<template>
    <div class="download-center">
        <div class="version-select-container">
            <div class="card rounded-xl bg-base-100 p-5 shadow-md">

                <!-- 安装方式选择页面 -->
                <transition name="page-fade" mode="out-in">
                    <div v-if="currentStep === 'select-mode'" key="select-mode" class="install-mode-selection">
                        <div class="card-title mb-6 text-center">选择安装方式</div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- 添加硬盘中已有实例 -->
                            <div class="install-option">
                                <button @click="selectInstallMode('existing')"
                                    class="btn btn-outline btn-lg w-full h-32 flex flex-col gap-3 hover:btn-primary transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    <div class="text-center">
                                        <div class="font-semibold">添加硬盘中已有实例</div>
                                        <div class="text-sm opacity-70">导入已存在的MaiBot实例</div>
                                    </div>
                                </button>
                            </div>

                            <!-- 下载新实例 -->
                            <div class="install-option">
                                <button @click="selectInstallMode('new')"
                                    class="btn btn-outline btn-lg w-full h-32 flex flex-col gap-3 hover:btn-primary transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    <div class="text-center">
                                        <div class="font-semibold">下载新实例</div>
                                        <div class="text-sm opacity-70">从官方源下载并安装新实例</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 添加已有实例页面 -->
                    <div v-else-if="currentStep === 'existing-instance'" key="existing-instance"
                        class="existing-instance-setup">
                        <div class="flex items-center mb-6">
                            <button @click="goBack"
                                class="btn btn-ghost btn-sm mr-3 hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div class="card-title">添加硬盘中已有实例</div>
                        </div> <!-- MaiBot主程序路径选择 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">MaiBot主程序文件夹</span>
                                <span class="label-text-alt text-info">包含main.py的文件夹</span>
                            </label>
                            <div class="input-group">
                                <input v-model="maibotPath" type="text" placeholder="例如：D:\MaiBot\existing-instance"
                                    class="input input-bordered flex-1 bg-base-100 text-base-content" />
                                <button @click="selectMaibotFolder" class="btn btn-outline">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    浏览
                                </button>
                            </div>
                        </div>

                        <!-- 适配器文件夹路径选择 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">适配器文件夹</span>
                                <span class="label-text-alt text-info">NapCat或其他适配器所在文件夹</span>
                            </label>
                            <div class="input-group">
                                <input v-model="adapterPath" type="text" placeholder="例如：D:\Adapters\napcat"
                                    class="input input-bordered flex-1 bg-base-100 text-base-content" />
                                <button @click="selectAdapterFolder" class="btn btn-outline">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    浏览
                                </button>
                            </div>
                        </div>

                        <!-- 实例检测状态 -->
                        <div v-if="existingInstancePath" class="mb-4">
                            <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                <div class="flex items-center gap-3">
                                    <div v-if="instanceDetection.loading" class="loading loading-spinner loading-sm">
                                    </div>
                                    <div v-else-if="instanceDetection.valid" class="text-success">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div v-else-if="instanceDetection.error" class="text-error">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="flex-1">
                                        <div v-if="instanceDetection.loading" class="text-sm">检测实例中...</div>
                                        <div v-else-if="instanceDetection.valid" class="text-sm text-success">实例检测成功
                                        </div>
                                        <div v-else-if="instanceDetection.error" class="text-sm text-error">{{
                                            instanceDetection.error }}</div>
                                        <div v-if="instanceDetection.version" class="text-xs opacity-70">版本: {{
                                            instanceDetection.version }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 实例配置 -->
                        <div v-if="instanceDetection.valid" class="space-y-4"> <!-- 实例名称 -->
                            <div class="mb-4">
                                <label class="label">
                                    <span class="label-text">实例名称</span>
                                    <span v-if="existingInstanceNameValidation.isChecking"
                                        class="label-text-alt text-info">
                                        <span class="loading loading-spinner loading-xs"></span> 检查中...
                                    </span>
                                    <span v-else-if="existingInstanceName && existingInstanceNameValidation.isValid"
                                        class="label-text-alt text-success">
                                        ✓ 可用
                                    </span>
                                    <span v-else-if="existingInstanceName && existingInstanceNameValidation.isDuplicate"
                                        class="label-text-alt text-error">
                                        ✗ 已存在
                                    </span>
                                </label>
                                <input v-model="existingInstanceName" type="text" placeholder="请输入实例名称" :class="[
                                    'input input-bordered w-full bg-base-100 text-base-content',
                                    {
                                        'input-success': existingInstanceName && existingInstanceNameValidation.isValid && !existingInstanceNameValidation.isDuplicate,
                                        'input-error': existingInstanceName && (!existingInstanceNameValidation.isValid || existingInstanceNameValidation.isDuplicate)
                                    }
                                ]" />
                                <label v-if="existingInstanceNameValidation.message" class="label">
                                    <span :class="[
                                        'label-text-alt',
                                        {
                                            'text-success': existingInstanceNameValidation.isValid && !existingInstanceNameValidation.isDuplicate,
                                            'text-error': !existingInstanceNameValidation.isValid || existingInstanceNameValidation.isDuplicate,
                                            'text-warning': existingInstanceNameValidation.message.includes('无法验证')
                                        }
                                    ]">
                                        {{ existingInstanceNameValidation.message }}
                                    </span>
                                </label>
                            </div>

                            <!-- MaiBot端口 -->
                            <div class="mb-4">
                                <label class="label">
                                    <span class="label-text">MaiBot 端口</span>
                                </label> <input v-model="existingMaibotPort" type="number" placeholder="例如：8000"
                                    class="input input-bordered w-full bg-base-100 text-base-content" />
                            </div>

                            <!-- EULA 同意选项 -->
                            <div class="mb-4">
                                <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                    <div class="form-control">
                                        <label class="label cursor-pointer justify-start gap-3">
                                            <input type="checkbox" v-model="existingEulaAgreed"
                                                class="checkbox checkbox-primary" />
                                            <div class="flex-1">
                                                <div class="font-medium text-sm">我已阅读并同意</div>
                                                <div class="text-xs text-base-content/70">
                                                    <a href="https://gitee.com/DrSmooth/MaiBot/blob/main/EULA.md"
                                                        target="_blank" class="link link-primary hover:link-accent">
                                                        最终用户许可协议 (EULA)
                                                    </a>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 添加按钮 -->
                            <div class="flex justify-end">
                                <button class="btn btn-primary" @click="addExistingInstance"
                                    :disabled="!canAddExisting">
                                    <span v-if="addingInstance" class="loading loading-spinner loading-xs mr-2"></span>
                                    添加实例
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 下载新实例页面 -->
                    <div v-else-if="currentStep === 'new-instance'" key="new-instance" class="new-instance-setup">
                        <div class="flex items-center mb-6">
                            <button @click="goBack"
                                class="btn btn-ghost btn-sm mr-3 hover:scale-105 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div class="card-title">下载新实例</div>
                        </div> <!-- 版本选择三阶段动画组件 -->
                        <div class="mb-4">
                            <label class="label">
                                <span class="label-text">选择版本</span>
                            </label>

                            <!-- 三阶段动画容器 -->
                            <div class="version-selector-container relative">
                                <!-- 阶段1: 加载动画 -->
                                <transition name="stage-fade" mode="out-in">
                                    <div v-if="versionLoadingStage === 'loading'" key="loading-stage"
                                        class="version-stage loading-stage">
                                        <div
                                            class="flex items-center justify-center py-8 px-4 bg-base-100 rounded-lg border border-base-200">
                                            <div class="flex flex-col items-center gap-3">
                                                <div class="relative">
                                                    <div class="loading-spinner-custom animate-spin">
                                                        <svg class="w-8 h-8 text-primary" fill="none"
                                                            viewBox="0 0 24 24">
                                                            <circle class="opacity-25" cx="12" cy="12" r="10"
                                                                stroke="currentColor" stroke-width="3"></circle>
                                                            <path class="opacity-75" fill="currentColor"
                                                                d="M4 12a8 8 0 018-8v8H4z"></path>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="font-medium text-base-content">正在获取版本信息</div>
                                                    <div class="text-sm text-base-content/60 mt-1">请稍候...</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 阶段2: 成功勾选动画 -->
                                    <div v-else-if="versionLoadingStage === 'success'" key="success-stage"
                                        class="version-stage success-stage">
                                        <div
                                            class="flex items-center justify-center py-8 px-4 bg-base-100 rounded-lg border border-success">
                                            <div class="flex flex-col items-center gap-3">
                                                <div class="success-checkmark animate-checkmark">
                                                    <svg class="w-12 h-12 text-success" fill="none" viewBox="0 0 24 24"
                                                        stroke="currentColor">
                                                        <path class="checkmark-path" stroke-linecap="round"
                                                            stroke-linejoin="round" stroke-width="3"
                                                            d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div class="text-center">
                                                    <div class="font-medium text-success">版本信息获取成功</div>
                                                    <div class="text-sm text-base-content/60 mt-1">找到 {{
                                                        availableVersions.length }} 个可用版本</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div> <!-- 阶段3: 版本选择下拉框 (使用 daisyUI CSS focus 方法) -->
                                    <div v-else-if="versionLoadingStage === 'dropdown'" key="dropdown-stage"
                                        class="version-stage dropdown-stage">
                                        <div class="dropdown w-full">
                                            <!-- 下拉框按钮 - 使用 CSS focus 方法 -->
                                            <div tabindex="0" role="button"
                                                class="btn btn-outline w-full justify-between hover:bg-base-200 transition-all duration-300 animate-slide-in"
                                                :class="{
                                                    'btn-disabled': installing || loading,
                                                    'border-primary bg-primary/5': selectedVersion,
                                                    'text-base-content/50': !selectedVersion
                                                }">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-medium transition-colors duration-300"
                                                        :class="{ 'text-primary': selectedVersion }">
                                                        {{ selectedVersion || '请选择一个版本' }}
                                                    </span>
                                                </div>
                                                <!-- 右侧箭头：未选择时显示 >，已选择时显示 ✓ -->
                                                <div class="transition-transform duration-300"
                                                    :class="{ 'scale-110': selectedVersion }">
                                                    <svg v-if="selectedVersion" xmlns="http://www.w3.org/2000/svg"
                                                        class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24"
                                                        stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round"
                                                            stroke-width="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <svg v-else xmlns="http://www.w3.org/2000/svg"
                                                        class="h-4 w-4 text-base-content/60" fill="none"
                                                        viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round"
                                                            stroke-width="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div> <!-- 下拉菜单内容 - 使用 CSS focus 方法 -->
                                            <ul tabindex="0"
                                                class="dropdown-content z-[99999] menu p-0 shadow-xl bg-base-100 rounded-lg w-full mt-2 border border-base-200 max-h-80 overflow-hidden">
                                                <div class="p-3">
                                                    <div v-if="availableVersions.length === 0"
                                                        class="py-6 text-center text-base-content/60">
                                                        <div class="flex flex-col items-center gap-3">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8"
                                                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                                    stroke-width="2"
                                                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v4.01" />
                                                            </svg>
                                                            <span class="text-sm">暂无可用版本</span>
                                                        </div>
                                                    </div>
                                                    <div v-else
                                                        class="space-y-1 max-h-64 overflow-y-auto version-list-container">
                                                        <li v-for="(version, index) in availableVersions"
                                                            :key="version"> <a
                                                                @click="handleVersionSelect(version, $event)"
                                                                class="version-option w-full text-left p-3 rounded-lg hover:bg-base-200 transition-all duration-150 flex items-center justify-between group animate-item-fade-in"
                                                                :style="{ 'animation-delay': `${index * 30}ms` }"
                                                                :class="{
                                                                    'bg-primary/10 text-primary border border-primary/20 shadow-sm': selectedVersion === version,
                                                                    'hover:bg-primary/5': selectedVersion !== version
                                                                }">
                                                                <div class="flex items-center gap-3">
                                                                    <div class="flex-shrink-0">
                                                                        <div class="transition-all duration-200"
                                                                            :class="{ 'scale-110': selectedVersion === version }">
                                                                            <svg v-if="selectedVersion === version"
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                class="h-5 w-5 text-primary animate-pulse"
                                                                                fill="none" viewBox="0 0 24 24"
                                                                                stroke="currentColor">
                                                                                <path stroke-linecap="round"
                                                                                    stroke-linejoin="round"
                                                                                    stroke-width="2"
                                                                                    d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                            <div v-else
                                                                                class="w-5 h-5 rounded-full border-2 border-base-300 group-hover:border-primary transition-all duration-200">
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="font-medium text-sm transition-colors duration-200"
                                                                            :class="{ 'text-primary': selectedVersion === version }">
                                                                            {{ version }}
                                                                        </div>
                                                                        <div class="text-xs text-base-content/60">
                                                                            {{ getVersionDescription(version) }}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div v-if="isLatestVersion(version)"
                                                                    class="badge badge-primary badge-sm animate-pulse">
                                                                    最新
                                                                </div>
                                                            </a>
                                                        </li>
                                                    </div>
                                                </div>
                                            </ul>
                                        </div>
                                    </div>
                                </transition>
                            </div>
                        </div>

                        <!-- 选择版本后展开的配置选项 -->
                        <transition name="slide-fade">
                            <div v-if="selectedVersion && !installing" class="config-options"> <!-- 实例名称 -->
                                <div class="mb-4">
                                    <label class="label">
                                        <span class="label-text">实例名称</span>
                                        <span v-if="instanceNameValidation.isChecking" class="label-text-alt text-info">
                                            <span class="loading loading-spinner loading-xs"></span> 检查中...
                                        </span>
                                        <span v-else-if="instanceName && instanceNameValidation.isValid"
                                            class="label-text-alt text-success">
                                            ✓ 可用
                                        </span>
                                        <span v-else-if="instanceName && instanceNameValidation.isDuplicate"
                                            class="label-text-alt text-error">
                                            ✗ 已存在
                                        </span>
                                    </label>
                                    <input v-model="instanceName" type="text" placeholder="请输入实例名称" :class="[
                                        'input input-bordered w-full bg-base-100 text-base-content',
                                        {
                                            'input-success': instanceName && instanceNameValidation.isValid && !instanceNameValidation.isDuplicate,
                                            'input-error': instanceName && (!instanceNameValidation.isValid || instanceNameValidation.isDuplicate)
                                        }
                                    ]" :disabled="installing" />
                                    <label v-if="instanceNameValidation.message" class="label">
                                        <span :class="[
                                            'label-text-alt',
                                            {
                                                'text-success': instanceNameValidation.isValid && !instanceNameValidation.isDuplicate,
                                                'text-error': !instanceNameValidation.isValid || instanceNameValidation.isDuplicate,
                                                'text-warning': instanceNameValidation.message.includes('无法验证')
                                            }
                                        ]">
                                            {{ instanceNameValidation.message }}
                                        </span>
                                    </label>
                                </div>

                                <!-- 安装路径 -->
                                <div class="mb-4">
                                    <label class="label">
                                        <span class="label-text">安装路径</span>
                                    </label> <input v-model="installPath" type="text"
                                        placeholder="例如：D:\MaiBot\MaiBot-1"
                                        class="input input-bordered w-full bg-base-100 text-base-content"
                                        :disabled="installing" />
                                </div>

                                <!-- Napcat-ada 服务配置 -->
                                <div class="mb-4">
                                    <div
                                        class="card p-3 rounded-lg border border-base-200 bg-base-100 hover:shadow-md transition-all">
                                        <div class="card-title text-sm mb-2">Napcat-ada 服务</div>

                                        <div class="form-control">
                                            <label class="label cursor-pointer justify-start gap-2">
                                                <input type="checkbox" v-model="selectedServices['napcat-ada']" checked
                                                    disabled class="checkbox checkbox-primary" />
                                                <div class="service-info">
                                                    <div class="font-medium">napcat-ada</div>
                                                    <div class="text-xs text-base-content/70">Napcat-ada 服务</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- 端口配置 -->
                                <div class="mb-4">
                                    <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                        <div class="card-title text-sm mb-2">端口配置</div>
                                        <div class="mb-3">
                                            <label class="label">
                                                <span class="label-text">MaiBot 主端口</span>
                                            </label> <input v-model="maibotPort" type="number" placeholder="例如：8000"
                                                class="input input-bordered w-full bg-base-100 text-base-content"
                                                :disabled="installing" />
                                        </div>
                                        <!-- Napcat-ada 端口配置 -->
                                        <div v-show="selectedServices['napcat-ada']" class="mb-3">
                                            <label class="label">
                                                <span class="label-text">Napcat-ada 端口</span>
                                            </label> <input v-model="servicePorts['napcat-ada']" type="number"
                                                placeholder="例如：8095"
                                                class="input input-bordered w-full bg-base-100 text-base-content"
                                                :disabled="installing" />
                                        </div>
                                    </div>
                                </div>

                                <!-- EULA 同意选项 -->
                                <div class="mb-4">
                                    <div class="card p-3 rounded-lg border border-base-200 bg-base-100">
                                        <div class="form-control">
                                            <label class="label cursor-pointer justify-start gap-3">
                                                <input type="checkbox" v-model="eulaAgreed"
                                                    class="checkbox checkbox-primary" :disabled="installing" />
                                                <div class="flex-1">
                                                    <div class="font-medium text-sm">我已阅读并同意</div>
                                                    <div class="text-xs text-base-content/70">
                                                        <a href="https://gitee.com/DrSmooth/MaiBot/blob/main/EULA.md"
                                                            target="_blank" class="link link-primary hover:link-accent">
                                                            最终用户许可协议 (EULA)
                                                        </a>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- 安装按钮 -->
                                <div class="flex justify-end">
                                    <button class="btn btn-primary" @click="startInstall"
                                        :disabled="!canInstall || installing">
                                        <span v-if="installing" class="loading loading-spinner loading-xs mr-2"></span>
                                        开始安装
                                    </button>
                                </div>
                            </div>
                        </transition>
                    </div>
                </transition>

                <!-- 安装进度 -->
                <transition name="fade">
                    <div v-if="installing" class="mt-4">
                        <div class="install-summary p-3 rounded-lg bg-base-200 mb-4">
                            <div class="font-medium mb-2">安装配置概要</div>
                            <div class="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>版本: <span class="font-medium">{{ selectedVersion }}</span></div>
                                <div>实例名: <span class="font-medium">{{ instanceName }}</span></div>
                                <div>路径: <span class="font-medium">{{ installPath }}</span></div>
                                <div>MaiBot端口: <span class="font-medium">{{ maibotPort }}</span></div>
                                <template v-for="service in availableServices" :key="`summary-${service.name}`">
                                    <div v-if="selectedServices[service.name]">
                                        Napcat-ada端口:
                                        <span class="font-medium">{{ servicePorts[service.name] }}</span>
                                    </div>
                                </template>
                                <div class="col-span-2 flex justify-end items-center">
                                    <span v-if="!installComplete"
                                        class="loading loading-spinner loading-xs mr-2"></span>
                                    <span v-else class="text-success">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </span>
                                    <span>{{ installComplete ? '安装完成' : `安装中... (${installStatusText})` }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 进度条 -->
                        <div class="mb-4">
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">总体安装进度</span>
                                <span class="text-sm">{{ installProgress }}%</span>
                            </div>
                            <progress class="progress progress-primary w-full" :value="installProgress"
                                max="100"></progress>
                            <!-- 服务安装进度条 -->
                            <div v-if="servicesProgress.length > 0" class="mt-3">
                                <div v-for="service in servicesProgress" :key="`progress-${service.name}`" class="mb-2">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-sm">{{ service.name }} 安装 ({{ service.status }})</span>
                                        <span class="text-sm">{{ service.progress }}%</span>
                                    </div>
                                    <progress
                                        :class="`progress ${service.status === 'completed' ? 'progress-success' : 'progress-info'} w-full`"
                                        :value="service.progress" max="100"></progress>
                                    <div class="text-xs opacity-70 mt-0.5">{{ service.message }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>

                <!-- 安装日志 -->
                <transition name="fade">
                    <div v-if="installing && logs.length > 0" class="mt-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="font-medium">安装日志</div>
                        </div>
                        <div class="log-container bg-base-300 rounded-lg p-3 h-80 overflow-y-auto font-mono text-sm">
                            <div v-for="(log, index) in logs" :key="index" class="log-line" :class="getLogClass(log)">
                                <span class="opacity-60">[{{ log.time }}]</span> {{ log.message }}
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useDeployStore } from '@/stores/deployStore';
import { useInstanceStore } from '@/stores/instanceStore';
import toastService from '@/services/toastService';
import { addExistingInstance as addExistingInstanceAPI } from '@/api/instances';
import { generateUniqueInstanceNameAsync, fetchExistingInstances, isInstanceNameExists } from '@/utils/instanceNameGenerator';

// 使用 stores
const deployStore = useDeployStore();
const instanceStore = useInstanceStore();

// 本地状态变量
const loading = ref(false);
const currentStep = ref('select-mode'); // 当前步骤: 'select-mode', 'existing-instance', 'new-instance'

// 下载新实例相关状态
const selectedVersion = ref('');
const instanceName = ref('');
const installPath = ref('');
const maibotPort = ref('8000');
const selectedServices = reactive({});
const servicePorts = reactive({});
const eulaAgreed = ref(false); // EULA 同意状态

// 实例名称验证状态
const instanceNameValidation = reactive({
    isChecking: false,
    isValid: true,
    isDuplicate: false,
    message: ''
});

// 已有实例名称验证状态
const existingInstanceNameValidation = reactive({
    isChecking: false,
    isValid: true,
    isDuplicate: false,
    message: ''
});

// 三阶段加载状态: 'loading' -> 'success' -> 'dropdown'
const versionLoadingStage = ref('loading');

// 添加已有实例相关状态
const maibotPath = ref('');
const adapterPath = ref('');
const existingInstanceName = ref('');
const existingMaibotPort = ref('8000');
const existingEulaAgreed = ref(false);
const addingInstance = ref(false);
const maibotDetection = reactive({
    loading: false,
    valid: false,
    error: null,
    version: null,
    hasConfig: false
});
const adapterDetection = reactive({
    loading: false,
    valid: false,
    error: null,
    version: null,
    hasConfig: false
});

// 保持向后兼容的计算属性
const existingInstancePath = computed(() => maibotPath.value);
const instanceDetection = computed(() => ({
    loading: maibotDetection.loading || adapterDetection.loading,
    valid: maibotDetection.valid && adapterDetection.valid,
    error: maibotDetection.error || adapterDetection.error,
    version: maibotDetection.version,
    hasConfig: maibotDetection.hasConfig && adapterDetection.hasConfig
}));

// 事件
const emit = defineEmits(['refresh']);

// 计算属性 - 基于 store 状态
const availableVersions = computed(() => {
    const versions = deployStore.availableVersions;
    // 如果 store 中没有版本数据，返回默认版本
    if (!versions || versions.length === 0) {
        console.warn('Store 中没有版本数据，使用默认版本列表');
        return ['latest', 'main', 'v0.6.3', 'v0.6.2', 'v0.6.1'];
    }
    return versions;
});
const availableServices = computed(() => deployStore.availableServices);
const installing = computed(() => deployStore.currentDeployment?.installing || false);
const installComplete = computed(() => deployStore.currentDeployment?.installComplete || false);
const installProgress = computed(() => deployStore.currentDeployment?.installProgress || 0);
const servicesProgress = computed(() => deployStore.currentDeployment?.servicesProgress || []);
const logs = computed(() => deployStore.currentDeployment?.logs || []);

// 计算属性 - 是否可以安装新实例
const canInstall = computed(() => {
    // 基础验证：必须有版本和实例名称
    if (!selectedVersion.value || !instanceName.value.trim() || !installPath.value.trim()) {
        return false;
    }

    // 端口验证 - 主端口必须有效
    if (!maibotPort.value) {
        return false;
    }

    // 如果选择了Napcat-ada服务，必须有对应端口
    if (selectedServices['napcat-ada'] && !servicePorts['napcat-ada']) {
        return false;
    }

    // EULA 必须同意
    if (!eulaAgreed.value) {
        return false;
    }

    return true;
});

// 计算属性 - 是否可以添加已有实例
const canAddExisting = computed(() => {
    return maibotDetection.valid &&
        adapterDetection.valid &&
        existingInstanceName.value.trim() &&
        existingMaibotPort.value &&
        existingEulaAgreed.value;
});

// 计算属性 - 安装状态文本
const installStatusText = computed(() => {
    if (servicesProgress.value.length > 0) {
        const currentService = servicesProgress.value[0];
        switch (currentService.status) {
            case 'downloading':
                return '下载中';
            case 'extracting':
                return '解压中';
            case 'installing':
                return '安装中';
            case 'configuring':
                return '配置中';
            case 'finishing':
                return '完成中';
            default:
                return currentService.status || '处理中';
        }
    }
    return '准备中';
});

// 初始化版本和服务数据
const initializeData = async () => {
    console.log('🚀 开始三阶段初始化流程');

    // 阶段1: 开始加载
    console.log('📥 阶段1: 设置加载状态');
    versionLoadingStage.value = 'loading';
    loading.value = true;

    try {
        // 设置超时处理，防止API调用卡死
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('初始化超时')), 10000); // 10秒超时
        });

        const initPromise = Promise.all([
            deployStore.fetchVersions().catch(error => {
                console.warn('获取版本列表失败，使用默认版本:', error);
                return ['latest', 'main', 'v0.6.3', 'v0.6.2', 'v0.6.1'];
            }),
            deployStore.fetchServices().catch(error => {
                console.warn('获取服务列表失败，使用默认服务:', error);
                return [{ name: "napcat-ada", description: "Napcat-ada 服务" }];
            })
        ]);

        console.log('⏳ 等待API调用完成...');
        await Promise.race([initPromise, timeoutPromise]);

        // 阶段2: 显示成功勾选 (持续1.5秒)
        console.log('✅ 阶段2: 显示成功状态');
        versionLoadingStage.value = 'success';
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 阶段3: 显示下拉框
        console.log('📋 阶段3: 显示下拉框');
        versionLoadingStage.value = 'dropdown';

        // 初始化服务选择状态和端口
        selectedServices['napcat-ada'] = true; // 默认选中
        servicePorts['napcat-ada'] = '8095'; // 默认端口

        // 初始化部署路径
        initializeDeploymentPath();

        console.log('🎉 数据初始化完成，当前阶段:', versionLoadingStage.value);
    } catch (error) {
        console.error('❌ 数据初始化失败:', error);
        toastService.warning('数据初始化失败，使用默认配置');

        // 失败时直接跳到下拉框阶段
        versionLoadingStage.value = 'dropdown';

        // 确保即使初始化失败，也要设置基本的默认值
        selectedServices['napcat-ada'] = true;
        servicePorts['napcat-ada'] = '8095';
        initializeDeploymentPath();
    } finally {
        loading.value = false;
    }
};

// 初始化部署路径
const initializeDeploymentPath = () => {
    // 从本地获取部署路径，如果没有则使用默认值
    const savedDeploymentPath = localStorage.getItem('deploymentPath');

    if (savedDeploymentPath) {
        // 使用保存的部署路径作为基础路径
        if (!installPath.value) {
            installPath.value = `${savedDeploymentPath}\\MaiBot-1`;
        }
    } else {
        // 使用默认路径
        const defaultPath = getDefaultDeploymentPath();
        if (!installPath.value) {
            installPath.value = `${defaultPath}\\MaiBot-1`;
        }
    }
};

// 获取默认部署路径
const getDefaultDeploymentPath = () => {
    // Windows 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "windows") {
        return "D:\\MaiBot\\Deployments";
    }
    // macOS 默认路径
    if (window.__TAURI_INTERNALS__?.platform === "macos") {
        return "~/Documents/MaiBot/Deployments";
    }
    // Linux 默认路径
    return "~/MaiBot/Deployments";
};

// 获取日志类样式
const getLogClass = (log) => {
    switch (log.level) {
        case 'error': return 'text-error';
        case 'warning': return 'text-warning';
        case 'success': return 'text-success';
        default: return 'text-base-content';
    }
};

// 开始安装流程 (使用 deployStore)
const startInstall = async () => {
    if (!canInstall.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    // 再次检查 EULA 是否已同意
    if (!eulaAgreed.value) {
        toastService.error('请先阅读并同意最终用户许可协议 (EULA)');
        return;
    }

    try {
        // 准备部署配置
        const installServices = [];
        if (selectedServices['napcat-ada']) {
            installServices.push({
                name: 'napcat-ada',
                path: `${installPath.value}\\napcat-ada`,
                port: parseInt(servicePorts['napcat-ada']),
                run_cmd: 'python main.py'
            });
        }

        const deployConfig = {
            instance_name: instanceName.value,
            install_services: installServices,
            install_path: installPath.value,
            port: parseInt(maibotPort.value),
            version: selectedVersion.value
        };

        // 使用 deployStore 开始部署
        await deployStore.startDeployment(deployConfig);

        // 触发实例列表刷新
        emit('refresh');
        instanceStore.fetchInstances(true);
    } catch (error) {
        console.error('安装过程出错:', error);
        toastService.error(`安装失败: ${error.message}`);
    }
};

// 选择安装模式
const selectInstallMode = (mode) => {
    if (mode === 'existing') {
        currentStep.value = 'existing-instance';
    } else if (mode === 'new') {
        currentStep.value = 'new-instance';
        // 当选择下载新实例时，重新开始三阶段动画
        console.log('选择下载新实例，重新开始三阶段动画');
        versionLoadingStage.value = 'loading';
        initializeData();
    }
};

// 下拉菜单状态控制
const dropdownOpen = ref(false);

// 版本下拉框相关方法已改为CSS focus方法，无需JavaScript状态管理

// 强制重置加载状态
const forceResetLoading = () => {
    console.log('强制重置加载状态');
    loading.value = false;
    versionLoadingStage.value = 'dropdown'; // 重置到下拉框阶段
    toastService.warning('已强制重置加载状态，如果问题持续请刷新页面');
};

// 重新播放三阶段动画
const restartAnimation = async () => {
    console.log('重新播放三阶段动画');
    // CSS focus方法自动处理下拉框关闭，无需手动控制
    await initializeData(); // 重新执行初始化
};

const selectVersion = async (version) => {
    selectedVersion.value = version;

    // 立即关闭下拉菜单 - 使用多种方法确保关闭
    // 方法1: 移除所有下拉菜单相关元素的焦点
    const dropdownButton = document.querySelector('.version-stage .dropdown [tabindex="0"][role="button"]');
    const dropdownContent = document.querySelector('.version-stage .dropdown-content');

    if (dropdownButton) {
        dropdownButton.blur();
    }
    if (dropdownContent) {
        dropdownContent.blur();
    }

    // 方法2: 移除当前活跃元素的焦点
    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }

    // 方法3: 使用 setTimeout 确保在下一个事件循环中执行
    setTimeout(() => {
        const allFocusableElements = document.querySelectorAll('.dropdown [tabindex="0"]');
        allFocusableElements.forEach(element => {
            if (element.blur) {
                element.blur();
            }
        });
    }, 10);

    // 使用新的实例名称生成逻辑
    try {
        const uniqueName = await generateUniqueInstanceNameAsync(version);
        instanceName.value = uniqueName;
        toastService.success(`已为您生成实例名称: ${uniqueName}`);
    } catch (error) {
        console.error('生成实例名称失败:', error);
        // 降级处理：使用原有逻辑
        if (!instanceName.value) {
            instanceName.value = `MaiBot-${version}-${Date.now().toString().slice(-4)}`;
        }
        toastService.warning('自动生成实例名称失败，请手动检查名称是否重复');
    }
};

const getVersionDescription = (version) => {
    const descriptions = {
        'main': '主分支 - 最新开发版本',
        'dev': '开发分支 - 实验性功能',
        'latest': '最新稳定版',
        'stable': '稳定版本'
    };

    if (version.startsWith('v') || version.startsWith('0.')) {
        return '正式发布版本';
    }

    return descriptions[version] || '发布版本';
};

// 实例名称验证函数
const validateInstanceName = async (name) => {
    if (!name || name.trim() === '') {
        instanceNameValidation.isValid = false;
        instanceNameValidation.isDuplicate = false;
        instanceNameValidation.message = '请输入实例名称';
        return;
    }

    // 检查名称格式
    const nameRegex = /^[a-zA-Z0-9\-_\u4e00-\u9fa5]+$/;
    if (!nameRegex.test(name)) {
        instanceNameValidation.isValid = false;
        instanceNameValidation.isDuplicate = false;
        instanceNameValidation.message = '实例名称只能包含字母、数字、中文、横线和下划线';
        return;
    }

    // 检查是否重复
    instanceNameValidation.isChecking = true;
    try {
        const existingInstances = await fetchExistingInstances();
        const isDuplicate = isInstanceNameExists(name, existingInstances);

        instanceNameValidation.isDuplicate = isDuplicate;
        instanceNameValidation.isValid = !isDuplicate;
        instanceNameValidation.message = isDuplicate
            ? '实例名称已存在，请选择其他名称'
            : '实例名称可用';
    } catch (error) {
        console.error('验证实例名称失败:', error);
        instanceNameValidation.isValid = true; // 验证失败时假设可用
        instanceNameValidation.isDuplicate = false;
        instanceNameValidation.message = '无法验证名称是否重复，请手动确认';
    } finally {
        instanceNameValidation.isChecking = false;
    }
};

// 已有实例名称验证函数
const validateExistingInstanceName = async (name) => {
    if (!name || name.trim() === '') {
        existingInstanceNameValidation.isValid = false;
        existingInstanceNameValidation.isDuplicate = false;
        existingInstanceNameValidation.message = '请输入实例名称';
        return;
    }

    // 检查名称格式
    const nameRegex = /^[a-zA-Z0-9\-_\u4e00-\u9fa5]+$/;
    if (!nameRegex.test(name)) {
        existingInstanceNameValidation.isValid = false;
        existingInstanceNameValidation.isDuplicate = false;
        existingInstanceNameValidation.message = '实例名称只能包含字母、数字、中文、横线和下划线';
        return;
    }

    // 检查是否重复
    existingInstanceNameValidation.isChecking = true;
    try {
        const existingInstances = await fetchExistingInstances();
        const isDuplicate = isInstanceNameExists(name, existingInstances);

        existingInstanceNameValidation.isDuplicate = isDuplicate;
        existingInstanceNameValidation.isValid = !isDuplicate;
        existingInstanceNameValidation.message = isDuplicate
            ? '实例名称已存在，请选择其他名称'
            : '实例名称可用';
    } catch (error) {
        console.error('验证已有实例名称失败:', error);
        existingInstanceNameValidation.isValid = true; // 验证失败时假设可用
        existingInstanceNameValidation.isDuplicate = false;
        existingInstanceNameValidation.message = '无法验证名称是否重复，请手动确认';
    } finally {
        existingInstanceNameValidation.isChecking = false;
    }
};

const isLatestVersion = (version) => {
    const versions = availableVersions.value;
    if (versions.length === 0) return false;

    // 如果是main分支，通常被认为是最新的
    if (version === 'main') return true;

    // 如果是版本号列表中的第一个（通常API返回的是按时间排序）
    return versions.indexOf(version) === 0 || version === 'latest';
};

// 点击外部关闭下拉框的逻辑已由CSS focus方法替代，无需JavaScript监听

// 返回上一步
const goBack = () => {
    currentStep.value = 'select-mode';
    // 重置相关状态
    maibotPath.value = '';
    adapterPath.value = '';
    existingInstanceName.value = '';
    existingMaibotPort.value = '8000';
    existingEulaAgreed.value = false;
    resetMaibotDetection();
    resetAdapterDetection();

    selectedVersion.value = '';
    instanceName.value = '';
    installPath.value = 'D:\\MaiBot\\MaiBot-1';
    maibotPort.value = '8000';
    eulaAgreed.value = false;
};

// 选择MaiBot文件夹
const selectMaibotFolder = async () => {
    // 这里应该调用 Tauri 的文件选择 API
    // 临时使用 prompt 作为演示
    const path = prompt('请输入MaiBot主程序文件夹路径:', maibotPath.value);
    if (path) {
        maibotPath.value = path;
        await detectMaibot();
    }
};

// 选择适配器文件夹
const selectAdapterFolder = async () => {
    // 这里应该调用 Tauri 的文件选择 API
    // 临时使用 prompt 作为演示
    const path = prompt('请输入适配器文件夹路径:', adapterPath.value);
    if (path) {
        adapterPath.value = path;
        await detectAdapter();
    }
};

// 选择文件夹 (简化版本，实际需要集成文件选择API)
const selectFolder = async () => {
    // 这里应该调用 Tauri 的文件选择 API
    // 临时使用 prompt 作为演示
    const path = prompt('请输入实例路径:', existingInstancePath.value);
    if (path) {
        existingInstancePath.value = path;
        await detectInstance();
    }
};

// 重置MaiBot检测状态
const resetMaibotDetection = () => {
    maibotDetection.loading = false;
    maibotDetection.valid = false;
    maibotDetection.error = null;
    maibotDetection.version = null;
    maibotDetection.hasConfig = false;
};

// 重置适配器检测状态
const resetAdapterDetection = () => {
    adapterDetection.loading = false;
    adapterDetection.valid = false;
    adapterDetection.error = null;
    adapterDetection.version = null;
    adapterDetection.hasConfig = false;
};

// 重置实例检测状态 (保持向后兼容)
const resetInstanceDetection = () => {
    resetMaibotDetection();
    resetAdapterDetection();
};

// 检测MaiBot实例
const detectMaibot = async () => {
    if (!maibotPath.value.trim()) {
        resetMaibotDetection();
        return;
    }

    maibotDetection.loading = true;
    resetMaibotDetection();
    maibotDetection.loading = true;

    try {
        // 这里应该调用后端API来检测MaiBot实例
        // 临时模拟检测逻辑
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟检测延迟

        // 简单的路径验证 - 检查是否包含main.py
        if (maibotPath.value.includes('main.py') ||
            maibotPath.value.includes('MaiBot')) {
            maibotDetection.valid = true;
            maibotDetection.version = '检测到的MaiBot版本';
            maibotDetection.hasConfig = true;

            // 预填充实例名称
            if (!existingInstanceName.value) {
                const pathParts = maibotPath.value.split('\\');
                existingInstanceName.value = pathParts[pathParts.length - 1] || 'existing-maibot';
            }
        } else {
            maibotDetection.error = '未检测到有效的MaiBot实例，请确保路径包含main.py文件';
        }
    } catch (error) {
        maibotDetection.error = `MaiBot检测失败: ${error.message}`;
    } finally {
        maibotDetection.loading = false;
    }
};

// 检测适配器
const detectAdapter = async () => {
    if (!adapterPath.value.trim()) {
        resetAdapterDetection();
        return;
    }

    adapterDetection.loading = true;
    resetAdapterDetection();
    adapterDetection.loading = true;

    try {
        // 这里应该调用后端API来检测适配器
        // 临时模拟检测逻辑
        await new Promise(resolve => setTimeout(resolve, 800)); // 模拟检测延迟

        // 简单的路径验证 - 检查是否是有效的适配器目录
        if (adapterPath.value.includes('napcat') ||
            adapterPath.value.includes('adapter') ||
            adapterPath.value.includes('NapCat')) {
            adapterDetection.valid = true;
            adapterDetection.version = '检测到的适配器版本';
            adapterDetection.hasConfig = true;
        } else {
            adapterDetection.error = '未检测到有效的适配器，请确保路径指向正确的适配器文件夹';
        }
    } catch (error) {
        adapterDetection.error = `适配器检测失败: ${error.message}`;
    } finally {
        adapterDetection.loading = false;
    }
};

// 检测实例 (保持向后兼容，同时检测两个路径)
const detectInstance = async () => {
    await Promise.all([
        detectMaibot(),
        detectAdapter()
    ]);
};

// 添加已有实例
const addExistingInstance = async () => {
    if (!canAddExisting.value) {
        toastService.error('请完成所有必填项');
        return;
    }

    if (!existingEulaAgreed.value) {
        toastService.error('请先阅读并同意最终用户许可协议 (EULA)');
        return;
    }

    addingInstance.value = true;

    try {
        // 构建符合后端API格式的请求数据，支持分离的MaiBot和适配器路径
        const instanceConfig = {
            instance_name: existingInstanceName.value,
            maibot_path: maibotPath.value,
            adapter_path: adapterPath.value,
            install_services:
                [
                    {
                        name: 'napcat-ada',
                        path: adapterPath.value,
                        port: 8095,
                        run_cmd: 'python main.py'
                    }
                ],
            install_path: maibotPath.value, // 主安装路径使用MaiBot路径
            port: parseInt(existingMaibotPort.value),
            version: maibotDetection.version || 'unknown'
        };

        // 调用后端API
        const response = await addExistingInstanceAPI(instanceConfig);

        toastService.success(response.message || '实例添加成功');

        // 触发实例列表刷新
        emit('refresh');
        instanceStore.fetchInstances(true);

        // 返回首页
        goBack();

    } catch (error) {
        console.error('添加实例失败:', error);
        toastService.error(`添加实例失败: ${error.message}`);
    } finally {
        addingInstance.value = false;
    }
};

// 当组件挂载时初始化数据
onMounted(async () => {
    console.log('DownloadCenter 组件挂载，开始初始化...');

    // 先设置基本的默认值，确保界面可用
    selectedServices['napcat-ada'] = true;
    servicePorts['napcat-ada'] = '8095';
    initializeDeploymentPath();

    // 设置初始状态为dropdown，避免在选择模式页面就开始动画
    versionLoadingStage.value = 'dropdown';
    loading.value = false;    // 监听部署路径变更事件
    window.addEventListener('deployment-path-changed', handleDeploymentPathChange);

    // CSS focus方法已替代JavaScript控制的下拉框，无需额外的点击监听

    console.log('DownloadCenter 初始化完成，当前阶段:', versionLoadingStage.value);
});

// 组件卸载时清理资源
onBeforeUnmount(() => {
    // deployStore 会自动处理清理工作
    if (deployStore.currentDeployment) {
        deployStore.cleanup();
    }    // 移除事件监听器
    window.removeEventListener('deployment-path-changed', handleDeploymentPathChange);

    // CSS focus方法已替代JavaScript监听，无需移除点击监听
});

// 处理部署路径变更
const handleDeploymentPathChange = (event) => {
    const newPath = event.detail.path;
    if (newPath && selectedVersion.value) {
        // 更新安装路径
        installPath.value = `${newPath}\\MaiBot-${selectedVersion.value}-1`;
    }
};

// 监听选择版本变化
watch(selectedVersion, (newValue) => {
    if (newValue) {
        // 预填充一些默认值
        if (!instanceName.value) {
            instanceName.value = `maibot-${newValue}-1`;
        }

        // 根据设置的部署路径预填充安装路径
        const savedDeploymentPath = localStorage.getItem('deploymentPath') || getDefaultDeploymentPath();
        installPath.value = `${savedDeploymentPath}\\MaiBot-${newValue}-1`;
    }
});

// 监听MaiBot路径变化
watch(maibotPath, (newValue) => {
    if (newValue && newValue.trim()) {
        detectMaibot();
    } else {
        resetMaibotDetection();
    }
});

// 监听适配器路径变化
watch(adapterPath, (newValue) => {
    if (newValue && newValue.trim()) {
        detectAdapter();
    } else {
        resetAdapterDetection();
    }
});

// 监听已有实例路径变化 (保持向后兼容)
watch(existingInstancePath, (newValue) => {
    if (newValue && newValue.trim()) {
        detectInstance();
    } else {
        resetInstanceDetection();
    }
});

// 监听实例名称变化，实时验证
let validateTimeout = null;
watch(instanceName, (newValue) => {
    // 清除之前的定时器
    if (validateTimeout) {
        clearTimeout(validateTimeout);
    }

    // 重置验证状态
    instanceNameValidation.isChecking = false;
    instanceNameValidation.isValid = true;
    instanceNameValidation.isDuplicate = false;
    instanceNameValidation.message = '';

    // 如果名称为空，直接返回
    if (!newValue || newValue.trim() === '') {
        return;
    }

    // 防抖处理，500ms 后执行验证
    validateTimeout = setTimeout(() => {
        validateInstanceName(newValue.trim());
    }, 500);
});

// 监听已有实例名称变化，实时验证
let validateExistingTimeout = null;
watch(existingInstanceName, (newValue) => {
    // 清除之前的定时器
    if (validateExistingTimeout) {
        clearTimeout(validateExistingTimeout);
    }

    // 重置验证状态
    existingInstanceNameValidation.isChecking = false;
    existingInstanceNameValidation.isValid = true;
    existingInstanceNameValidation.isDuplicate = false;
    existingInstanceNameValidation.message = '';

    // 如果名称为空，直接返回
    if (!newValue || newValue.trim() === '') {
        return;
    }

    // 防抖处理，500ms 后执行验证
    validateExistingTimeout = setTimeout(() => {
        validateExistingInstanceName(newValue.trim());
    }, 500);
});

// 处理版本选择并强制关闭下拉菜单
const handleVersionSelect = async (version, event) => {
    // 先选择版本（现在是异步的）
    await selectVersion(version);

    // 立即关闭下拉菜单的多重方法
    // 方法1: 移除事件目标的焦点
    if (event.target && event.target.blur) {
        event.target.blur();
    }

    // 方法2: 移除当前活跃元素的焦点
    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }

    // 方法3: 查找下拉菜单按钮并移除焦点
    const dropdown = event.target.closest('.dropdown');
    if (dropdown) {
        const button = dropdown.querySelector('[tabindex="0"][role="button"]');
        if (button) {
            button.blur();
            button.removeAttribute('tabindex');
            setTimeout(() => {
                button.setAttribute('tabindex', '0');
            }, 100);
        }
    }

    // 方法4: 使用原生的失焦方法
    setTimeout(() => {
        const focusedElement = document.querySelector(':focus');
        if (focusedElement && focusedElement.blur) {
            focusedElement.blur();
        }
    }, 10);

    // 阻止事件冒泡和默认行为
    event.stopPropagation();
    event.preventDefault();
    return false;
};
</script>

<style scoped>
/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* 三阶段动画样式 */
.stage-fade-enter-active,
.stage-fade-leave-active {
    transition: all 0.4s ease-in-out;
}

.stage-fade-enter-from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
}

.stage-fade-leave-to {
    opacity: 0;
    transform: scale(1.1) translateY(-10px);
}

/* 加载动画样式 */
.loading-stage {
    animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.02);
        opacity: 0.9;
    }
}

/* 成功勾选动画 */
.success-stage {
    animation: success-bounce 0.6s ease-out;
}

@keyframes success-bounce {
    0% {
        transform: scale(0.3) rotate(-12deg);
        opacity: 0;
    }

    50% {
        transform: scale(1.1) rotate(3deg);
        opacity: 1;
    }

    100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
    }
}

.animate-checkmark {
    animation: checkmark-draw 0.8s ease-out 0.2s both;
}

@keyframes checkmark-draw {
    0% {
        stroke-dasharray: 0 100;
        stroke-dashoffset: 0;
        transform: scale(0.8);
    }

    50% {
        stroke-dasharray: 50 100;
        stroke-dashoffset: -25;
        transform: scale(1.1);
    }

    100% {
        stroke-dasharray: 100 100;
        stroke-dashoffset: -100;
        transform: scale(1);
    }
}

.checkmark-path {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: checkmark-draw 0.8s ease-out 0.2s both;
}

/* 下拉框阶段动画 */
.dropdown-stage {
    animation: slide-in-from-top 0.5s ease-out;
}

.animate-slide-in {
    animation: slide-in-elastic 0.6s ease-out;
}

@keyframes slide-in-from-top {
    0% {
        opacity: 0;
        transform: translateY(-30px) scale(0.9);
    }

    60% {
        opacity: 1;
        transform: translateY(5px) scale(1.02);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes slide-in-elastic {
    0% {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }

    70% {
        opacity: 1;
        transform: translateY(2px) scale(1.01);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* 下拉菜单动画 */
.dropdown-fade-enter-active {
    transition: all 0.2s ease-out;
}

.dropdown-fade-leave-active {
    transition: all 0.15s ease-in;
}

.dropdown-fade-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-5px) scale(0.98);
}

.animate-dropdown-open {
    animation: dropdown-open 0.2s ease-out;
}

@keyframes dropdown-open {
    0% {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        max-height: 0;
    }

    50% {
        opacity: 0.9;
        transform: translateY(-2px) scale(0.99);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        max-height: 20rem;
    }
}

/* 版本选项逐项动画 */
.animate-item-fade-in {
    opacity: 0;
    animation: item-fade-in 0.3s ease-out forwards;
}

@keyframes item-fade-in {
    0% {
        opacity: 0;
        transform: translateX(-15px);
    }

    100% {
        opacity: 1;
        transform: translateX(0);
    }
}

/* 自定义滚动条 - 移除双滚动条 */
.version-list-container::-webkit-scrollbar {
    width: 6px;
}

.version-list-container::-webkit-scrollbar-track {
    background: hsl(var(--b3));
    border-radius: 3px;
}

.version-list-container::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.3);
    border-radius: 3px;
    transition: background 0.2s ease;
}

.version-list-container::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--bc) / 0.5);
}

/* 确保版本选择下拉框的定位稳定 */
.version-stage.dropdown-stage .dropdown {
    position: relative !important;
}

.version-stage.dropdown-stage .dropdown-content {
    position: absolute !important;
    top: 100% !important;
    left: 0 !important;
    width: 100% !important;
    margin-top: 0.5rem !important;
    transform: none !important;
}

/* 移除外层容器的滚动条 */
.dropdown {
    position: relative !important;
}

.dropdown-content {
    overflow: visible !important;
}

/* 确保下拉框内所有文本支持主题切换 */
.dropdown-content,
.dropdown-content * {
    color: hsl(var(--bc)) !important;
}

/* 下拉框内的无内容提示文字 */
.dropdown-content .text-base-content\/60 {
    color: hsl(var(--bc) / 0.6) !important;
}

/* 版本下拉框样式优化 */
.dropdown {
    position: relative;
}

.dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: hsl(var(--b1)) !important;
    border: 1px solid hsl(var(--b3));
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 99999 !important;
    max-height: 16rem;
    overflow: visible;
    animation: dropdownFadeIn 0.2s ease-out;
}

@keyframes dropdownFadeIn {
    from {
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* 版本选项样式 */
.version-option {
    transition: all 0.15s ease;
    border: 1px solid transparent;
    color: hsl(var(--bc)) !important;
}

.version-option:hover {
    background: hsl(var(--b2)) !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px hsl(var(--bc) / 0.1);
}

.version-option:active {
    transform: translateY(0);
}

/* 选中状态的版本选项 */
.version-option.bg-primary\/10 {
    background: hsl(var(--p) / 0.1) !important;
    color: hsl(var(--p)) !important;
    border-color: hsl(var(--p) / 0.2) !important;
}

/* 日志容器样式 */
.log-container {
    background: hsl(var(--b3));
    font-family: 'Courier New', monospace;
    line-height: 1.4;
}

.log-line {
    padding: 2px 0;
    word-break: break-all;
}

/* 进度条动画 */
.progress {
    transition: all 0.3s ease;
}

/* 安装配置选项卡片悬停效果 */
.install-option .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 强制关闭下拉菜单的样式 */
.dropdown-close .dropdown-content {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
}

/* 确保下拉菜单在失去焦点时关闭 */
.dropdown:not(:focus-within) .dropdown-content {
    display: none;
}

/* 优化下拉菜单的关闭行为 */
.dropdown .dropdown-content {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown:not(.dropdown-open):not(:focus-within) .dropdown-content {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
    pointer-events: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .dropdown-content {
        max-height: 12rem;
    }

    .version-option {
        padding: 0.75rem;
    }
}

/* 暗色模式增强样式 */
[data-theme="dark"] .dropdown-content,
[data-theme="night"] .dropdown-content,
[data-theme="black"] .dropdown-content,
[data-theme="dracula"] .dropdown-content {
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .version-option:hover,
[data-theme="night"] .version-option:hover,
[data-theme="black"] .version-option:hover,
[data-theme="dracula"] .version-option:hover {
    box-shadow: 0 2px 8px hsl(var(--bc) / 0.2);
}
</style>

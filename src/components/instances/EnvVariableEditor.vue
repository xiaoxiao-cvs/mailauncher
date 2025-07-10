<template>
  <div class="env-variables">
    <!-- 系统配置区域 -->
    <div class="system-config-section" v-if="systemConfig.length > 0">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="mdi:cog" class="section-icon" />
          系统配置
        </h3>
        <p class="section-description">基础系统配置参数</p>
      </div>

      <div class="system-config-grid">
        <div 
          v-for="config in systemConfig"
          :key="config.key"
          class="system-config-item"
        >
          <label class="system-config-label">{{ config.label }}</label>
          <input
            type="text"
            :value="config.value"
            @input="updateSystemConfig(config.key, $event.target.value)"
            class="system-config-input"
            :placeholder="config.placeholder"
          />
        </div>
      </div>
    </div>

    <!-- 提供商配置区域 -->
    <div class="providers-section">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="mdi:api" class="section-icon" />
          API 提供商配置
        </h3>
        <p class="section-description">管理AI模型API提供商的URL和密钥配置</p>
      </div>

      <!-- 提供商列表 -->
      <div class="providers-list">
        <div 
          v-for="provider in providers" 
          :key="provider.name"
          class="provider-card"
          :class="{ 'provider-card-editing': editingProvider === provider.name }"
        >
          <div class="provider-header">
            <div class="provider-info">
              <input
                v-if="editingProvider === provider.name"
                v-model="tempProviderName"
                class="provider-name-input"
                placeholder="提供商名称"
                @blur="saveProviderEdit"
                @keyup.enter="saveProviderEdit"
                @keyup.esc="cancelProviderEdit"
              />
              <h4 v-else class="provider-name" @dblclick="startEditProvider(provider.name)">
                {{ provider.displayName }}
              </h4>
              <span class="provider-status" :class="{ 'status-configured': provider.isConfigured }">
                {{ provider.isConfigured ? '已配置' : '未配置' }}
              </span>
            </div>
            <div class="provider-actions">
              <button
                v-if="editingProvider === provider.name"
                class="btn btn-ghost btn-xs text-success"
                @click="saveProviderEdit"
                title="保存"
              >
                <Icon icon="mdi:check" class="w-4 h-4" />
              </button>
              <button
                v-if="editingProvider === provider.name"
                class="btn btn-ghost btn-xs text-warning"
                @click="cancelProviderEdit"
                title="取消"
              >
                <Icon icon="mdi:close" class="w-4 h-4" />
              </button>
              <button
                v-if="editingProvider !== provider.name && !isDefaultProvider(provider.name)"
                class="btn btn-ghost btn-xs text-error"
                @click="removeProvider(provider.name)"
                title="删除提供商"
              >
                <Icon icon="mdi:delete" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="provider-fields">
            <div class="field-group">
              <label class="field-label">
                <Icon icon="mdi:link-variant" class="field-icon" />
                API URL
              </label>
              <input
                type="url"
                :value="provider.baseUrl"
                @input="updateProviderField(provider.name, 'baseUrl', $event.target.value)"
                class="field-input"
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div class="field-group">
              <label class="field-label">
                <Icon icon="mdi:key-variant" class="field-icon" />
                API Key
              </label>
              <div class="key-input-wrapper">
                <input
                  :type="showKeys[provider.name] ? 'text' : 'password'"
                  :value="provider.apiKey"
                  @input="updateProviderField(provider.name, 'apiKey', $event.target.value)"
                  class="field-input key-input"
                  placeholder="sk-..."
                />
                <button
                  class="key-toggle"
                  @click="toggleKeyVisibility(provider.name)"
                  :title="showKeys[provider.name] ? '隐藏密钥' : '显示密钥'"
                >
                  <Icon :icon="showKeys[provider.name] ? 'mdi:eye-off' : 'mdi:eye'" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加新提供商 -->
      <div class="add-provider-section">
        <div class="add-provider-inline" v-if="!showAddProvider">
          <button class="add-provider-btn-inline" @click="showAddProvider = true">
            <Icon icon="mdi:plus" class="add-icon-inline" />
            添加自定义API提供商
          </button>
        </div>
        
        <div class="add-provider-inline-form" v-else>
          <input
            v-model="newProviderName"
            class="inline-input"
            placeholder="提供商名称"
            @keyup.enter="focusNextInput"
          />
          <input
            type="url"
            v-model="newProviderUrl"
            class="inline-input"
            placeholder="API URL"
            @keyup.enter="focusNextInput"
          />
          <input
            type="password"
            v-model="newProviderKey"
            class="inline-input"
            placeholder="API Key (可选)"
            @keyup.enter="addProvider"
          />
          <div class="inline-actions">
            <button
              class="btn btn-primary btn-sm"
              @click="addProvider"
              :disabled="!newProviderName.trim() || !newProviderUrl.trim()"
              title="添加"
            >
              <Icon icon="mdi:check" class="w-4 h-4" />
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click="cancelAddProvider"
              title="取消"
            >
              <Icon icon="mdi:close" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 其他环境变量区域 -->
    <div class="other-vars-section" v-if="otherEnvVars.length > 0">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="mdi:cog-outline" class="section-icon" />
          其他环境变量
        </h3>
        <p class="section-description">系统配置和其他自定义环境变量</p>
      </div>

      <div class="env-vars-list">
        <div 
          v-for="envVar in otherEnvVars" 
          :key="envVar.key"
          class="env-item"
          @mouseenter="onEnvItemHover(envVar.key, true)"
          @mouseleave="onEnvItemHover(envVar.key, false)"
        >
          <div class="env-key">
            <input 
              v-if="editingEnvKey === envVar.key"
              type="text" 
              v-model="tempEnvKey"
              class="input input-bordered input-sm w-full"
              @blur="saveEnvKeyEdit(envVar.key)"
              @keyup.enter="saveEnvKeyEdit(envVar.key)"
              @keyup.esc="cancelEnvKeyEdit"
            />
            <label 
              v-else
              class="env-label"
              @dblclick="startEditEnvKey(envVar.key)"
              :title="isEnvItemHovered(envVar.key) ? '双击编辑变量名' : ''"
            >
              {{ envVar.key }}
            </label>
          </div>
          <div class="env-value">
            <input 
              v-if="editingEnvValue === envVar.key"
              type="text" 
              v-model="tempEnvValue"
              class="input input-bordered input-sm w-full"
              @blur="saveEnvValueEdit(envVar.key)"
              @keyup.enter="saveEnvValueEdit(envVar.key)"
              @keyup.esc="cancelEnvValueEdit"
            />
            <input 
              v-else
              type="text" 
              :value="envVar.value"
              class="input input-bordered input-sm w-full env-value-display"
              :class="{ 'env-value-hover': isEnvItemHovered(envVar.key) }"
              @click="startEditEnvValue(envVar.key)"
              :title="isEnvItemHovered(envVar.key) ? '点击编辑变量值' : ''"
              readonly
            />
          </div>
          <div class="env-actions">
            <template v-if="editingEnvKey === envVar.key || editingEnvValue === envVar.key">
              <button 
                class="btn btn-ghost btn-xs text-success"
                @click="editingEnvKey === envVar.key ? saveEnvKeyEdit(envVar.key) : saveEnvValueEdit(envVar.key)"
                title="保存"
              >
                <Icon icon="mdi:check" class="w-4 h-4" />
              </button>
              <button 
                class="btn btn-ghost btn-xs text-warning"
                @click="editingEnvKey === envVar.key ? cancelEnvKeyEdit() : cancelEnvValueEdit()"
                title="取消"
              >
                <Icon icon="mdi:close" class="w-4 h-4" />
              </button>
            </template>
            <template v-else>
              <button 
                class="btn btn-ghost btn-xs"
                :class="{ 
                  'text-error': isEnvItemHovered(envVar.key),
                  'text-base-content/50': !isEnvItemHovered(envVar.key)
                }"
                @click="removeEnvVariable(envVar.key)"
                :title="isEnvItemHovered(envVar.key) ? '删除环境变量' : ''"
              >
                <Icon icon="mdi:delete" class="w-4 h-4" />
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- 添加新环境变量 -->
      <div class="add-env-item">
        <div class="env-key">
          <input 
            type="text" 
            v-model="newEnvKey"
            placeholder="变量名"
            class="input input-bordered input-sm w-full"
            @keyup.enter="addEnvVariable"
          />
        </div>
        <div class="env-value">
          <input 
            type="text" 
            v-model="newEnvValue"
            placeholder="变量值"
            class="input input-bordered input-sm w-full"
            @keyup.enter="addEnvVariable"
          />
        </div>
        <div class="env-actions">
          <button 
            class="btn btn-primary btn-xs"
            @click="addEnvVariable"
            :disabled="!newEnvKey.trim() || !newEnvValue.trim()"
          >
            <Icon icon="mdi:plus" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 快速配置模板 -->
    <div class="templates-section" v-if="!showAddProvider">
      <div class="section-header">
        <h3 class="section-title">
          <Icon icon="mdi:bookmark-multiple" class="section-icon" />
          快速配置模板
        </h3>
        <p class="section-description">选择常用的API提供商模板快速配置</p>
      </div>

      <div class="templates-grid">
        <div 
          v-for="template in providerTemplates"
          :key="template.name"
          class="template-card"
          @click="applyTemplate(template)"
        >
          <div class="template-icon">
            <Icon :icon="template.icon" />
          </div>
          <div class="template-info">
            <h4 class="template-name">{{ template.displayName }}</h4>
            <p class="template-description">{{ template.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import toastService from '@/services/toastService'

const props = defineProps({
  envConfig: Object
})

const emit = defineEmits(['update:envConfig', 'mark-changed'])

// 预定义的提供商模板
const providerTemplates = [
  {
    name: 'SILICONFLOW',
    displayName: 'SiliconFlow',
    description: '硅基流动AI平台',
    icon: 'mdi:cpu-64-bit',
    baseUrl: 'https://api.siliconflow.cn/v1/',
    keyPattern: 'SILICONFLOW_KEY'
  },
  {
    name: 'DEEP_SEEK',
    displayName: 'DeepSeek',
    description: 'DeepSeek AI平台',
    icon: 'mdi:brain',
    baseUrl: 'https://api.deepseek.com/v1',
    keyPattern: 'DEEP_SEEK_KEY'
  },
  {
    name: 'CHAT_ANY_WHERE',
    displayName: 'ChatAnyWhere',
    description: 'ChatAnyWhere AI服务',
    icon: 'mdi:chat',
    baseUrl: 'https://api.chatanywhere.tech/v1',
    keyPattern: 'CHAT_ANY_WHERE_KEY'
  },
  {
    name: 'BAILIAN',
    displayName: '百炼平台',
    description: '阿里云百炼AI平台',
    icon: 'mdi:cloud',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    keyPattern: 'BAILIAN_KEY'
  }
]

// 系统配置键
const systemConfigKeys = ['HOST', 'PORT']

// 默认提供商（不能删除）
const defaultProviders = new Set(['SILICONFLOW', 'DEEP_SEEK', 'CHAT_ANY_WHERE', 'BAILIAN'])

// 状态管理
const editingEnvKey = ref('')
const editingEnvValue = ref('')
const tempEnvKey = ref('')
const tempEnvValue = ref('')
const hoveredEnvItems = ref(new Set())
const newEnvKey = ref('')
const newEnvValue = ref('')

// 提供商相关状态
const editingProvider = ref('')
const tempProviderName = ref('')
const showKeys = ref({})
const showAddProvider = ref(false)
const newProviderName = ref('')
const newProviderUrl = ref('')
const newProviderKey = ref('')

// 计算属性：解析提供商配置
const providers = computed(() => {
  const result = []
  const processedKeys = new Set()

  // 解析现有的环境变量配置
  if (props.envConfig) {
    // 首先处理已知的模板提供商
    providerTemplates.forEach(template => {
      const baseUrlKey = `${template.name}_BASE_URL`
      const keyKey = template.keyPattern
      
      const provider = {
        name: template.name,
        displayName: template.displayName,
        baseUrl: props.envConfig[baseUrlKey] || '',
        apiKey: props.envConfig[keyKey] || '',
        isConfigured: !!(props.envConfig[baseUrlKey] && props.envConfig[keyKey])
      }
      
      result.push(provider)
      processedKeys.add(baseUrlKey)
      processedKeys.add(keyKey)
    })

    // 处理自定义提供商（匹配 *_BASE_URL 和 *_KEY 模式）
    const customProviders = new Map()
    
    Object.keys(props.envConfig).forEach(key => {
      if (processedKeys.has(key) || systemConfigKeys.includes(key)) return
      
      if (key.endsWith('_BASE_URL')) {
        const providerName = key.replace('_BASE_URL', '')
        if (!customProviders.has(providerName)) {
          customProviders.set(providerName, { name: providerName, baseUrl: '', apiKey: '' })
        }
        customProviders.get(providerName).baseUrl = props.envConfig[key]
      } else if (key.endsWith('_KEY')) {
        const providerName = key.replace('_KEY', '')
        if (!customProviders.has(providerName)) {
          customProviders.set(providerName, { name: providerName, baseUrl: '', apiKey: '' })
        }
        customProviders.get(providerName).apiKey = props.envConfig[key]
        processedKeys.add(`${providerName}_BASE_URL`)
        processedKeys.add(key)
      }
    })

    // 添加自定义提供商到结果
    customProviders.forEach(provider => {
      result.push({
        ...provider,
        displayName: provider.name.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        isConfigured: !!(provider.baseUrl && provider.apiKey)
      })
    })
  }

  return result
})

// 计算属性：系统配置
const systemConfig = computed(() => {
  const configs = [
    { key: 'HOST', label: '主机地址', placeholder: '127.0.0.1' },
    { key: 'PORT', label: '端口号', placeholder: '8000' }
  ]
  
  return configs.map(config => ({
    ...config,
    value: props.envConfig?.[config.key] || ''
  }))
})

// 计算属性：其他环境变量（非提供商相关，非系统配置）
const otherEnvVars = computed(() => {
  if (!props.envConfig) return []
  
  const providerKeys = new Set()
  providers.value.forEach(provider => {
    providerKeys.add(`${provider.name}_BASE_URL`)
    providerKeys.add(`${provider.name}_KEY`)
  })

  return Object.entries(props.envConfig)
    .filter(([key]) => !providerKeys.has(key) && !systemConfigKeys.includes(key))
    .map(([key, value]) => ({ key, value }))
})

// 提供商操作方法
const updateProviderField = (providerName, field, value) => {
  const newConfig = { ...props.envConfig }
  
  if (field === 'baseUrl') {
    newConfig[`${providerName}_BASE_URL`] = value
  } else if (field === 'apiKey') {
    newConfig[`${providerName}_KEY`] = value
  }
  
  emit('update:envConfig', newConfig)
  emit('mark-changed')
}

// 系统配置操作方法
const updateSystemConfig = (key, value) => {
  const newConfig = { ...props.envConfig }
  newConfig[key] = value
  emit('update:envConfig', newConfig)
  emit('mark-changed')
}

const startEditProvider = (providerName) => {
  editingProvider.value = providerName
  tempProviderName.value = providerName
  nextTick(() => {
    // 尝试聚焦到提供商名称输入框
    const input = document.querySelector('.provider-name-input')
    if (input) {
      try {
        input.focus()
        input.select()
      } catch (e) {
        console.warn('无法聚焦到提供商名称输入框:', e)
      }
    }
  })
}

const saveProviderEdit = () => {
  const oldName = editingProvider.value
  const newName = tempProviderName.value.trim().toUpperCase().replace(/\s+/g, '_')
  
  if (!newName || newName === oldName) {
    cancelProviderEdit()
    return
  }

  // 检查名称是否已存在
  if (providers.value.some(p => p.name === newName && p.name !== oldName)) {
    toastService.error('提供商名称已存在')
    cancelProviderEdit()
    return
  }

  // 更新环境变量键名
  const newConfig = { ...props.envConfig }
  
  // 移除旧的键
  delete newConfig[`${oldName}_BASE_URL`]
  delete newConfig[`${oldName}_KEY`]
  
  // 添加新的键
  const oldProvider = providers.value.find(p => p.name === oldName)
  if (oldProvider) {
    if (oldProvider.baseUrl) newConfig[`${newName}_BASE_URL`] = oldProvider.baseUrl
    if (oldProvider.apiKey) newConfig[`${newName}_KEY`] = oldProvider.apiKey
  }
  
  emit('update:envConfig', newConfig)
  emit('mark-changed')
  
  editingProvider.value = ''
  tempProviderName.value = ''
}

const cancelProviderEdit = () => {
  editingProvider.value = ''
  tempProviderName.value = ''
}

const removeProvider = (providerName) => {
  if (isDefaultProvider(providerName)) {
    toastService.error('无法删除默认提供商')
    return
  }

  const newConfig = { ...props.envConfig }
  delete newConfig[`${providerName}_BASE_URL`]
  delete newConfig[`${providerName}_KEY`]
  
  emit('update:envConfig', newConfig)
  emit('mark-changed')
  
  toastService.success('提供商已删除')
}

const isDefaultProvider = (providerName) => {
  return providerTemplates.some(template => template.name === providerName)
}

const toggleKeyVisibility = (providerName) => {
  showKeys.value = {
    ...showKeys.value,
    [providerName]: !showKeys.value[providerName]
  }
}

const addProvider = () => {
  if (!newProviderName.value.trim() || !newProviderUrl.value.trim()) {
    toastService.error('请输入提供商名称和URL')
    return
  }

  const providerName = newProviderName.value.trim().toUpperCase().replace(/\s+/g, '_')
  
  // 检查名称是否已存在
  if (providers.value.some(p => p.name === providerName)) {
    toastService.error('提供商名称已存在')
    return
  }

  const newConfig = { ...props.envConfig }
  newConfig[`${providerName}_BASE_URL`] = newProviderUrl.value.trim()
  if (newProviderKey.value.trim()) {
    newConfig[`${providerName}_KEY`] = newProviderKey.value.trim()
  }
  
  emit('update:envConfig', newConfig)
  emit('mark-changed')
  
  // 重置表单
  cancelAddProvider()
  toastService.success('提供商添加成功')
}

const cancelAddProvider = () => {
  showAddProvider.value = false
  newProviderName.value = ''
  newProviderUrl.value = ''
  newProviderKey.value = ''
}

// 焦点管理
const focusNextInput = (event) => {
  const currentInput = event.target
  if (currentInput.placeholder.includes('提供商名称')) {
    const urlInput = currentInput.parentNode.querySelector('input[placeholder*="API URL"]')
    if (urlInput) {
      try {
        urlInput.focus()
      } catch (e) {
        console.warn('无法聚焦到URL输入框:', e)
      }
    }
  } else if (currentInput.placeholder.includes('API URL')) {
    const keyInput = currentInput.parentNode.querySelector('input[placeholder*="API Key"]')
    if (keyInput) {
      try {
        keyInput.focus()
      } catch (e) {
        console.warn('无法聚焦到Key输入框:', e)
      }
    }
  }
}

const applyTemplate = (template) => {
  const newConfig = { ...props.envConfig }
  
  // 检查是否已存在
  const baseUrlKey = `${template.name}_BASE_URL`
  const keyKey = template.keyPattern
  
  if (!newConfig[baseUrlKey]) {
    newConfig[baseUrlKey] = template.baseUrl
  }
  
  if (!newConfig[keyKey]) {
    newConfig[keyKey] = ''
  }
  
  emit('update:envConfig', newConfig)
  emit('mark-changed')
  
  toastService.success(`已应用 ${template.displayName} 模板`)
}

// 环境变量悬停状态管理
const onEnvItemHover = (key, isHovered) => {
  if (isHovered) {
    hoveredEnvItems.value.add(key)
  } else {
    hoveredEnvItems.value.delete(key)
  }
}

const isEnvItemHovered = (key) => {
  return hoveredEnvItems.value.has(key)
}

// 环境变量编辑功能
const startEditEnvKey = (key) => {
  editingEnvKey.value = key
  tempEnvKey.value = key
  nextTick(() => {
    // 安全地聚焦到输入框
    const inputs = document.querySelectorAll('.input')
    const keyInput = Array.from(inputs).find(input => 
      input.value === key && input.classList.contains('input-bordered')
    )
    if (keyInput) {
      try {
        keyInput.focus()
        keyInput.select()
      } catch (e) {
        console.warn('无法聚焦到环境变量键输入框:', e)
      }
    }
  })
}

const startEditEnvValue = (key) => {
  editingEnvValue.value = key
  tempEnvValue.value = props.envConfig[key] || ''
  nextTick(() => {
    // 安全地聚焦到输入框
    const inputs = document.querySelectorAll('.input')
    const valueInput = Array.from(inputs).find(input => 
      input.classList.contains('input-bordered') && 
      input !== document.activeElement
    )
    if (valueInput) {
      try {
        valueInput.focus()
        valueInput.select()
      } catch (e) {
        console.warn('无法聚焦到环境变量值输入框:', e)
      }
    }
  })
}

const saveEnvKeyEdit = (oldKey) => {
  if (!tempEnvKey.value.trim()) {
    cancelEnvKeyEdit()
    return
  }
  
  const newKey = tempEnvKey.value.trim()
  if (newKey !== oldKey) {
    // 检查新键名是否已存在
    if (props.envConfig[newKey] !== undefined) {
      toastService.error('环境变量名已存在')
      cancelEnvKeyEdit()
      return
    }
    
    // 更新键名
    const value = props.envConfig[oldKey]
    const newConfig = { ...props.envConfig }
    delete newConfig[oldKey]
    newConfig[newKey] = value
    emit('update:envConfig', newConfig)
    emit('mark-changed')
  }
  
  editingEnvKey.value = ''
  tempEnvKey.value = ''
}

const saveEnvValueEdit = (key) => {
  if (props.envConfig[key] !== tempEnvValue.value) {
    const newConfig = { ...props.envConfig }
    newConfig[key] = tempEnvValue.value
    emit('update:envConfig', newConfig)
    emit('mark-changed')
  }
  
  editingEnvValue.value = ''
  tempEnvValue.value = ''
}

const cancelEnvKeyEdit = () => {
  editingEnvKey.value = ''
  tempEnvKey.value = ''
}

const cancelEnvValueEdit = () => {
  editingEnvValue.value = ''
  tempEnvValue.value = ''
}

const addEnvVariable = () => {
  if (!newEnvKey.value.trim() || !newEnvValue.value.trim()) return
  
  const newConfig = { ...props.envConfig }
  newConfig[newEnvKey.value.trim()] = newEnvValue.value.trim()
  emit('update:envConfig', newConfig)
  emit('mark-changed')
  
  newEnvKey.value = ''
  newEnvValue.value = ''
}

const removeEnvVariable = (key) => {
  if (props.envConfig && props.envConfig[key] !== undefined) {
    const newConfig = { ...props.envConfig }
    delete newConfig[key]
    emit('update:envConfig', newConfig)
    emit('mark-changed')
  }
}
</script>

<style scoped>
.env-variables {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 100%;
}

/* 系统配置样式 */
.system-config-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.system-config-section:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .system-config-section {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .system-config-section:hover {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.system-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.system-config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.system-config-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

:root[data-theme="dark"] .system-config-label {
  color: rgba(255, 255, 255, 0.7);
}

.system-config-input {
  padding: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  outline: none;
}

.system-config-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

:root[data-theme="dark"] .system-config-input {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .system-config-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  background: rgba(31, 41, 55, 1);
}

/* 节区样式 */
.providers-section,
.other-vars-section,
.templates-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.providers-section:hover,
.other-vars-section:hover,
.templates-section:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .providers-section,
:root[data-theme="dark"] .other-vars-section,
:root[data-theme="dark"] .templates-section {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .providers-section:hover,
:root[data-theme="dark"] .other-vars-section:hover,
:root[data-theme="dark"] .templates-section:hover {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

/* 节区头部 */
.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .section-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.5rem 0;
}

:root[data-theme="dark"] .section-title {
  color: rgba(255, 255, 255, 0.9);
}

.section-icon {
  font-size: 1.5rem;
  color: #3b82f6;
}

.section-description {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  line-height: 1.4;
}

:root[data-theme="dark"] .section-description {
  color: rgba(255, 255, 255, 0.6);
}

/* 提供商列表 */
.providers-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 提供商卡片 */
.provider-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.provider-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.provider-card-editing {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:root[data-theme="dark"] .provider-card {
  background: rgba(55, 65, 81, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
}

:root[data-theme="dark"] .provider-card:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(96, 165, 250, 0.3);
}

/* 提供商头部 */
.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.25rem 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.provider-name:hover {
  color: #3b82f6;
}

:root[data-theme="dark"] .provider-name {
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .provider-name:hover {
  color: #60a5fa;
}

.provider-name-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.95);
  outline: none;
  transition: all 0.2s ease;
}

.provider-name-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:root[data-theme="dark"] .provider-name-input {
  background: rgba(55, 65, 81, 0.95);
  border-color: #60a5fa;
  color: rgba(255, 255, 255, 0.9);
}

.provider-status {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  transition: all 0.2s ease;
}

.provider-status.status-configured {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

:root[data-theme="dark"] .provider-status {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

:root[data-theme="dark"] .provider-status.status-configured {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.provider-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* 提供商字段 */
.provider-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .provider-fields {
    grid-template-columns: 1fr 1fr;
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

:root[data-theme="dark"] .field-label {
  color: rgba(255, 255, 255, 0.7);
}

.field-icon {
  font-size: 1rem;
  color: #6b7280;
}

.field-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  outline: none;
}

.field-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

:root[data-theme="dark"] .field-input {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .field-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  background: rgba(31, 41, 55, 1);
}

/* API Key 输入框特殊样式 */
.key-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.key-input {
  padding-right: 2.5rem;
}

.key-toggle {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.key-toggle:hover {
  color: rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .key-toggle {
  color: rgba(255, 255, 255, 0.5);
}

:root[data-theme="dark"] .key-toggle:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

/* 添加提供商区域 */
.add-provider-section {
  margin-top: 1rem;
}

/* 内联添加提供商样式 */
.add-provider-inline {
  padding: 0.75rem;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.add-provider-inline:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.02);
}

:root[data-theme="dark"] .add-provider-inline {
  border-color: rgba(255, 255, 255, 0.2);
}

:root[data-theme="dark"] .add-provider-inline:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.02);
}

.add-provider-btn-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  white-space: nowrap;
}

.add-provider-btn-inline:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

:root[data-theme="dark"] .add-provider-btn-inline {
  color: rgba(255, 255, 255, 0.6);
}

:root[data-theme="dark"] .add-provider-btn-inline:hover {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.add-icon-inline {
  font-size: 0.875rem;
  width: 1rem;
  height: 1rem;
}

.add-provider-inline-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

:root[data-theme="dark"] .add-provider-inline-form {
  background: rgba(96, 165, 250, 0.05);
  border-color: rgba(96, 165, 250, 0.2);
}

.inline-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  outline: none;
  min-width: 0;
}

.inline-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

:root[data-theme="dark"] .inline-input {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .inline-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
  background: rgba(31, 41, 55, 1);
}

.inline-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .add-provider-inline-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .inline-actions {
    justify-content: flex-end;
  }
}

/* 移除旧样式 */
.add-provider-card {
  border: 2px dashed rgba(0, 0, 0, 0.2);
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.add-provider-card:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.02);
}

:root[data-theme="dark"] .add-provider-card {
  border-color: rgba(255, 255, 255, 0.2);
}

:root[data-theme="dark"] .add-provider-card:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.02);
}

.add-provider-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.6);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-provider-btn:hover {
  color: #3b82f6;
}

:root[data-theme="dark"] .add-provider-btn {
  color: rgba(255, 255, 255, 0.6);
}

:root[data-theme="dark"] .add-provider-btn:hover {
  color: #60a5fa;
}

.add-icon {
  font-size: 1.25rem;
}

.add-provider-form {
  background: rgba(59, 130, 246, 0.05);
  border-color: #3b82f6;
}

:root[data-theme="dark"] .add-provider-form {
  background: rgba(96, 165, 250, 0.05);
  border-color: #60a5fa;
}

/* 模板网格 */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.template-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

:root[data-theme="dark"] .template-card {
  background: rgba(55, 65, 81, 0.9);
  border-color: rgba(255, 255, 255, 0.08);
}

:root[data-theme="dark"] .template-card:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(96, 165, 250, 0.3);
}

.template-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 0.75rem;
  color: #3b82f6;
  font-size: 1.5rem;
  flex-shrink: 0;
}

:root[data-theme="dark"] .template-icon {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.25rem 0;
}

:root[data-theme="dark"] .template-name {
  color: rgba(255, 255, 255, 0.9);
}

.template-description {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  line-height: 1.3;
}

:root[data-theme="dark"] .template-description {
  color: rgba(255, 255, 255, 0.6);
}

/* 环境变量列表（其他变量） */
.env-vars-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.env-item {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.env-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(0, 0, 0, 0.15);
}

:root[data-theme="dark"] .env-item {
  background: rgba(55, 65, 81, 0.8);
  border-color: rgba(255, 255, 255, 0.08);
}

:root[data-theme="dark"] .env-item:hover {
  background: rgba(55, 65, 81, 1);
  border-color: rgba(255, 255, 255, 0.15);
}

.env-key {
  display: flex;
  align-items: center;
}

.env-label {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
  cursor: pointer;
  padding: 0.25rem 0;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.env-label:hover {
  color: #3b82f6;
}

:root[data-theme="dark"] .env-label {
  color: rgba(255, 255, 255, 0.8);
}

:root[data-theme="dark"] .env-label:hover {
  color: #60a5fa;
}

.env-value {
  display: flex;
  align-items: center;
}

.env-value-display {
  cursor: pointer;
}

.env-value-hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.env-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.add-env-item {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.02);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  border-radius: 0.5rem;
  margin-top: 0.75rem;
}

:root[data-theme="dark"] .add-env-item {
  background: rgba(96, 165, 250, 0.02);
  border-color: rgba(96, 165, 250, 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .env-item,
  .add-env-item {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .provider-fields {
    grid-template-columns: 1fr;
  }
  
  .templates-grid {
    grid-template-columns: 1fr;
  }
}

/* 按钮通用样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  min-height: 1.5rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  min-height: 2rem;
}

.btn-ghost {
  background: transparent;
  color: inherit;
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
}

.text-success {
  color: #16a34a !important;
}

.text-warning {
  color: #d97706 !important;
}

.text-error {
  color: #dc2626 !important;
}

:root[data-theme="dark"] .text-success {
  color: #4ade80 !important;
}

:root[data-theme="dark"] .text-warning {
  color: #fbbf24 !important;
}

:root[data-theme="dark"] .text-error {
  color: #f87171 !important;
}

/* 输入框通用样式 */
.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
  outline: none;
}

.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}

:root[data-theme="dark"] .input {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  background: rgba(31, 41, 55, 1);
}

.input-bordered {
  border-width: 1px;
}

.input-sm {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
}

/* 工具类 */
.w-full {
  width: 100%;
}

.w-4 {
  width: 1rem;
}

.h-4 {
  height: 1rem;
}

.text-base-content\/50 {
  color: rgba(0, 0, 0, 0.5);
}

:root[data-theme="dark"] .text-base-content\/50 {
  color: rgba(255, 255, 255, 0.5);
}
</style>

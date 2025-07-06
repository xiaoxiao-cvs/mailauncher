<template>
  <div class="env-variables">
    <div 
      v-for="(value, key) in envConfig" 
      :key="key" 
      class="env-item"
      @mouseenter="onEnvItemHover(key, true)"
      @mouseleave="onEnvItemHover(key, false)"
    >
      <div class="env-key">
        <input 
          v-if="editingEnvKey === key"
          type="text" 
          v-model="tempEnvKey"
          class="input input-bordered input-sm w-full"
          @blur="saveEnvKeyEdit(key)"
          @keyup.enter="saveEnvKeyEdit(key)"
          @keyup.esc="cancelEnvKeyEdit"
          @vue:mounted="($el) => { $el.focus(); $el.select() }"
        />
        <label 
          v-else
          class="env-label"
          @dblclick="startEditEnvKey(key)"
          :title="isEnvItemHovered(key) ? '双击编辑变量名' : ''"
        >
          {{ key }}
        </label>
      </div>
      <div class="env-value">
        <input 
          v-if="editingEnvValue === key"
          type="text" 
          v-model="tempEnvValue"
          class="input input-bordered input-sm w-full"
          @blur="saveEnvValueEdit(key)"
          @keyup.enter="saveEnvValueEdit(key)"
          @keyup.esc="cancelEnvValueEdit"
          @vue:mounted="($el) => { $el.focus(); $el.select() }"
        />
        <input 
          v-else
          type="text" 
          :value="envConfig[key]"
          class="input input-bordered input-sm w-full env-value-display"
          :class="{ 'env-value-hover': isEnvItemHovered(key) }"
          @click="startEditEnvValue(key)"
          :title="isEnvItemHovered(key) ? '点击编辑变量值' : ''"
          readonly
        />
      </div>
      <div class="env-actions">
        <template v-if="editingEnvKey === key || editingEnvValue === key">
          <button 
            class="btn btn-ghost btn-xs text-success"
            @click="editingEnvKey === key ? saveEnvKeyEdit(key) : saveEnvValueEdit(key)"
            title="保存"
          >
            <Icon icon="mdi:check" class="w-4 h-4" />
          </button>
          <button 
            class="btn btn-ghost btn-xs text-warning"
            @click="editingEnvKey === key ? cancelEnvKeyEdit() : cancelEnvValueEdit()"
            title="取消"
          >
            <Icon icon="mdi:close" class="w-4 h-4" />
          </button>
        </template>
        <template v-else>
          <button 
            class="btn btn-ghost btn-xs"
            :class="{ 
              'text-error': isEnvItemHovered(key),
              'text-base-content/50': !isEnvItemHovered(key)
            }"
            @click="removeEnvVariable(key)"
            :title="isEnvItemHovered(key) ? '删除环境变量' : ''"
          >
            <Icon icon="mdi:delete" class="w-4 h-4" />
          </button>
        </template>
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
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import toastService from '@/services/toastService'

const props = defineProps({
  envConfig: Object
})

const emit = defineEmits(['update:envConfig', 'mark-changed'])

// 环境变量编辑状态
const editingEnvKey = ref('')
const editingEnvValue = ref('')
const tempEnvKey = ref('')
const tempEnvValue = ref('')
const hoveredEnvItems = ref(new Set())
const newEnvKey = ref('')
const newEnvValue = ref('')

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
    // 由于使用了动态ref，输入框会自动聚焦
  })
}

const startEditEnvValue = (key) => {
  editingEnvValue.value = key
  tempEnvValue.value = props.envConfig[key] || ''
  nextTick(() => {
    // 由于使用了动态ref，输入框会自动聚焦
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

<template>
  <div class="setting-item" :class="{ 'search-matched-item': searchQuery && matchType }">
    <div class="setting-info">
      <label class="setting-label">
        <div class="setting-label-wrapper">
          <div class="label-content">
            <span class="label-text" v-html="highlightText(label, searchQuery)"></span>
            <span 
              class="search-match-badge transition-all duration-200" 
              :class="{ 'opacity-0 scale-75': !searchQuery || !matchType }"
            >
              {{ searchQuery && matchType ? getMatchTypeName(matchType) : '匹配' }}
            </span>
          </div>
          <div 
            class="field-key-hint transition-all duration-200 overflow-hidden" 
            :class="{ 'opacity-0 -translate-y-1 max-h-0': !searchQuery, 'opacity-100 translate-y-0 max-h-8': searchQuery }"
          >
            {{ fieldKey }}
          </div>
        </div>
      </label>
      <p class="setting-description" v-html="highlightText(description, searchQuery)"></p>
    </div>
    <div class="setting-control">
      <!-- 字符串数组类型 -->
      <div v-if="config.type === 'string-array'" class="tag-list-container">
        <div class="tag-list">
          <div v-for="(item, index) in value" :key="index" class="tag-item">
            <span class="tag-text" v-html="highlightText(item, searchQuery)"></span>
            <button class="tag-remove" @click="removeArrayItem(index)" title="删除">
              <Icon icon="mdi:close" class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="tag-input-container">
          <input 
            type="text" 
            v-model="newItemValue"
            class="tag-input"
            :placeholder="`输入${label}`"
            @keyup.enter="addArrayItem"
            @blur="addArrayItem"
          />
          <button class="tag-add-btn" @click="addArrayItem" :title="`添加${label}`">
            <Icon icon="mdi:plus" class="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <!-- 布尔类型 -->
      <CustomToggle 
        v-else-if="config.type === 'switch'" 
        :model-value="value"
        @update:model-value="updateValue"
        class="toggle-sm"
      />
      
      <!-- 选择类型 -->
      <select 
        v-else-if="config.type === 'select'" 
        class="select select-bordered select-sm" 
        :value="value"
        @change="updateValue($event.target.value)"
      >
        <option v-for="option in config.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      
      <!-- 文本域类型 -->
      <textarea 
        v-else-if="config.type === 'textarea'"
        class="textarea textarea-bordered textarea-sm" 
        :rows="config.rows || 3"
        :value="value"
        @input="updateValue($event.target.value)"
      ></textarea>
      
      <!-- 数字类型 -->
      <input 
        v-else-if="config.type === 'number'"
        type="number" 
        class="input input-bordered input-sm" 
        :step="config.step || 1"
        :min="config.min"
        :max="config.max"
        :value="value"
        @input="updateValue(parseFloat($event.target.value) || 0)"
        :readonly="readonly"
      />
      
      <!-- 字符串类型 -->
      <input 
        v-else
        type="text" 
        class="input input-bordered input-sm" 
        :value="value"
        @input="updateValue($event.target.value)"
        :readonly="readonly"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import CustomToggle from '../common/CustomToggle.vue'

const props = defineProps({
  fieldKey: String,
  label: String,
  description: String,
  value: [String, Number, Boolean, Array],
  config: Object,
  searchQuery: String,
  matchType: String,
  readonly: Boolean
})

const emit = defineEmits(['update:value', 'add-array-item', 'remove-array-item'])

const newItemValue = ref('')

const updateValue = (newValue) => {
  emit('update:value', newValue)
}

const addArrayItem = () => {
  if (!newItemValue.value.trim()) return
  emit('add-array-item', newItemValue.value.trim())
  newItemValue.value = ''
}

const removeArrayItem = (index) => {
  emit('remove-array-item', index)
}

const highlightText = (text, query) => {
  if (!text || !query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

const getMatchTypeName = (matchType) => {
  const typeNames = {
    'key': '字段名',
    'label': '标签',
    'description': '描述',
    'value': '值',
    'section': '组名'
  }
  return typeNames[matchType] || '匹配'
}
</script>

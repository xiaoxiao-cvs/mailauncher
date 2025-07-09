<template>
  <div class="hyperos2-field-item" :class="{ 'search-matched': searchQuery && matchType }">
    <!-- 字符串数组类型 -->
    <div v-if="config.type === 'string-array'" class="hyperos2-field-array">
      <div class="field-header">
        <label class="field-label">
          <span v-html="highlightText(label, searchQuery)"></span>
          <span 
            v-if="searchQuery && matchType"
            class="search-match-badge"
          >
            {{ getMatchTypeName(matchType) }}
          </span>
        </label>
        <div 
          v-if="searchQuery"
          class="field-key-hint"
        >
          {{ fieldKey }}
        </div>
      </div>
      <p v-if="description" class="field-description" v-html="highlightText(description, searchQuery)"></p>
      
      <div class="array-container">
        <div class="array-items">
          <div v-for="(item, index) in value" :key="index" class="array-item">
            <span class="item-text" v-html="highlightText(item, searchQuery)"></span>
            <HyperOS2Button 
              variant="ghost" 
              size="small"
              @click="removeArrayItem(index)"
              prefix-icon="mdi:close"
              title="删除"
            />
          </div>
        </div>
        <div class="array-input">
          <HyperOS2Input 
            v-model="newItemValue"
            :placeholder="`输入${label}`"
            @keyup.enter="addArrayItem"
            @blur="addArrayItem"
          />
          <HyperOS2Button
            variant="primary"
            size="small"
            @click="addArrayItem"
            prefix-icon="mdi:plus"
            :title="`添加${label}`"
          />
        </div>
      </div>
    </div>
    
    <!-- 布尔类型 -->
    <div v-else-if="config.type === 'switch'" class="hyperos2-field-switch">
      <div class="field-header">
        <label class="field-label">
          <span v-html="highlightText(label, searchQuery)"></span>
          <span 
            v-if="searchQuery && matchType"
            class="search-match-badge"
          >
            {{ getMatchTypeName(matchType) }}
          </span>
        </label>
        <div 
          v-if="searchQuery"
          class="field-key-hint"
        >
          {{ fieldKey }}
        </div>
      </div>
      <p v-if="description" class="field-description" v-html="highlightText(description, searchQuery)"></p>
      
      <div class="field-control">
        <HyperOS2Switch
          :model-value="value"
          @update:model-value="updateValue"
          :disabled="readonly"
        />
      </div>
    </div>
    
    <!-- 选择类型 -->
    <div v-else-if="config.type === 'select'" class="hyperos2-field-select">
      <HyperOS2Select
        :model-value="value"
        @update:model-value="updateValue"
        :label="highlightedLabel"
        :description="highlightedDescription"
        :options="config.options"
        :disabled="readonly"
      />
      <div 
        v-if="searchQuery"
        class="field-key-hint"
      >
        {{ fieldKey }}
      </div>
    </div>
    
    <!-- 文本域类型 -->
    <div v-else-if="config.type === 'textarea'" class="hyperos2-field-textarea">
      <HyperOS2Textarea
        :model-value="value"
        @update:model-value="updateValue"
        :label="highlightedLabel"
        :description="highlightedDescription"
        :rows="config.rows || 3"
        :readonly="readonly"
      />
      <div 
        v-if="searchQuery"
        class="field-key-hint"
      >
        {{ fieldKey }}
      </div>
    </div>
    
    <!-- 数字类型 -->
    <div v-else-if="config.type === 'number'" class="hyperos2-field-number">
      <HyperOS2Input
        :model-value="value"
        @update:model-value="updateValue"
        :label="highlightedLabel"
        :description="highlightedDescription"
        type="number"
        :step="config.step || 1"
        :min="config.min"
        :max="config.max"
        :readonly="readonly"
      />
      <div 
        v-if="searchQuery"
        class="field-key-hint"
      >
        {{ fieldKey }}
      </div>
    </div>
    
    <!-- 滑块类型 -->
    <div v-else-if="config.type === 'slider'" class="hyperos2-field-slider">
      <HyperOS2Slider
        :model-value="value"
        @update:model-value="updateValue"
        :label="highlightedLabel"
        :description="highlightedDescription"
        :min="config.min || 0"
        :max="config.max || 100"
        :step="config.step || 1"
        :suffix="config.suffix || ''"
        :prefix="config.prefix || ''"
        :disabled="readonly"
      />
      <div 
        v-if="searchQuery"
        class="field-key-hint"
      >
        {{ fieldKey }}
      </div>
    </div>
    
    <!-- 字符串类型（默认） -->
    <div v-else class="hyperos2-field-input">
      <HyperOS2Input
        :model-value="value"
        @update:model-value="updateValue"
        :label="highlightedLabel"
        :description="highlightedDescription"
        :readonly="readonly"
      />
      <div 
        v-if="searchQuery"
        class="field-key-hint"
      >
        {{ fieldKey }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  HyperOS2Input, 
  HyperOS2Select, 
  HyperOS2Switch,
  HyperOS2Textarea,
  HyperOS2Slider,
  HyperOS2Button
} from '../settings/hyperos2'

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

// 计算属性
const highlightedLabel = computed(() => {
  return highlightText(props.label, props.searchQuery)
})

const highlightedDescription = computed(() => {
  return highlightText(props.description, props.searchQuery)
})

// 方法
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

<style scoped>
@import '@/components/settings/hyperos2-variables.css';

.hyperos2-field-item {
  margin-bottom: var(--hyperos-space-lg);
  transition: all var(--hyperos-transition-base);
}

.hyperos2-field-item.search-matched {
  background: rgba(var(--hyperos-primary-rgb), 0.05);
  border-radius: var(--hyperos-radius-md);
  padding: var(--hyperos-space-md);
  border-left: 3px solid var(--hyperos-primary);
}

/* 字段头部 */
.field-header {
  margin-bottom: var(--hyperos-space-sm);
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--hyperos-text-primary);
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-sm);
  margin-bottom: var(--hyperos-space-xs);
}

.field-description {
  font-size: 0.8rem;
  color: var(--hyperos-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.field-key-hint {
  font-size: 0.75rem;
  color: var(--hyperos-text-tertiary);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  background: var(--hyperos-bg-secondary);
  padding: 2px 6px;
  border-radius: var(--hyperos-radius-sm);
  margin-top: var(--hyperos-space-xs);
}

.search-match-badge {
  font-size: 0.7rem;
  background: var(--hyperos-primary);
  color: white;
  padding: 2px 6px;
  border-radius: var(--hyperos-radius-sm);
  font-weight: 500;
}

/* 数组字段 */
.hyperos2-field-array {
  width: 100%;
}

.array-container {
  margin-top: var(--hyperos-space-md);
}

.array-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hyperos-space-sm);
  margin-bottom: var(--hyperos-space-md);
}

.array-item {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-xs);
  background: var(--hyperos-bg-secondary);
  padding: var(--hyperos-space-xs) var(--hyperos-space-sm);
  border-radius: var(--hyperos-radius-md);
  border: 1px solid var(--hyperos-border-secondary);
}

.item-text {
  font-size: 0.85rem;
  color: var(--hyperos-text-primary);
}

.array-input {
  display: flex;
  gap: var(--hyperos-space-sm);
  align-items: flex-end;
}

/* 开关字段 */
.hyperos2-field-switch {
  display: flex;
  flex-direction: column;
  gap: var(--hyperos-space-sm);
}

.field-control {
  display: flex;
  justify-content: flex-end;
}

/* 搜索高亮 */
:deep(.search-highlight) {
  background: rgba(var(--hyperos-primary-rgb), 0.3);
  color: var(--hyperos-text-primary);
  border-radius: 2px;
  padding: 1px 2px;
}

/* 暗色主题适配 */
[data-theme="dark"] .hyperos2-field-item.search-matched {
  background: rgba(var(--hyperos-primary-rgb), 0.1);
}

[data-theme="dark"] .array-item {
  background: var(--hyperos-bg-tertiary);
  border-color: var(--hyperos-border-primary);
}
</style>

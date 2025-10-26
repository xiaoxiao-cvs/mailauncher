<!-- HyperOS 2 风格文本区域组件 -->
<template>
  <div 
    :class="[
      'hyperos2-textarea-container',
      {
        'hyperos2-textarea--disabled': disabled,
        'hyperos2-textarea--error': error,
        'hyperos2-textarea--focused': isFocused,
        'hyperos2-textarea--resizable': resizable
      }
    ]"
  >
    <!-- 标签区域 -->
    <div v-if="label || description" class="hyperos2-textarea-header">
      <div class="hyperos2-textarea-label-area">
        <label v-if="label" :for="inputId" class="hyperos2-textarea-label">
          {{ label }}
          <span v-if="required" class="hyperos2-textarea-required">*</span>
        </label>
        <p v-if="description" class="hyperos2-textarea-description">{{ description }}</p>
      </div>
      
      <!-- 字符计数 -->
      <div v-if="showCount && maxLength" class="hyperos2-textarea-count">
        <span :class="{ 'hyperos2-textarea-count--warning': isNearLimit }">
          {{ currentLength }}/{{ maxLength }}
        </span>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="hyperos2-textarea-wrapper">
      <textarea
        :id="inputId"
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        :rows="rows"
        :class="[
          'hyperos2-textarea-input',
          {
            'hyperos2-textarea-input--error': error,
            'hyperos2-textarea-input--resizable': resizable
          }
        ]"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeyDown"
      />
      
      <!-- 清除按钮 -->
      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="hyperos2-textarea-clear"
        @click="handleClear"
        title="清除内容"
      >
        <IconifyIcon icon="mdi:close" size="16" />
      </button>
    </div>
    
    <!-- 底部信息 -->
    <div v-if="error || hint" class="hyperos2-textarea-footer">
      <div v-if="error" class="hyperos2-textarea-error">
        <IconifyIcon icon="mdi:alert-circle" size="14" />
        {{ error }}
      </div>
      <div v-else-if="hint" class="hyperos2-textarea-hint">
        <IconifyIcon icon="mdi:information" size="14" />
        {{ hint }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import IconifyIcon from '@/components/common/IconifyIcon.vue'

/**
 * HyperOS 2 风格文本区域组件
 * 支持多行文本输入，具有现代化的视觉效果
 */
const props = defineProps({
  // 绑定值
  modelValue: {
    type: String,
    default: ''
  },
  
  // 标签
  label: {
    type: String,
    default: ''
  },
  
  // 描述
  description: {
    type: String,
    default: ''
  },
  
  // 占位符
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  
  // 是否只读
  readonly: {
    type: Boolean,
    default: false
  },
  
  // 是否必填
  required: {
    type: Boolean,
    default: false
  },
  
  // 行数
  rows: {
    type: Number,
    default: 4
  },
  
  // 最大长度
  maxLength: {
    type: Number,
    default: null
  },
  
  // 显示字符计数
  showCount: {
    type: Boolean,
    default: false
  },
  
  // 是否可清除
  clearable: {
    type: Boolean,
    default: false
  },
  
  // 是否可调整大小
  resizable: {
    type: Boolean,
    default: true
  },
  
  // 错误信息
  error: {
    type: String,
    default: ''
  },
  
  // 提示信息
  hint: {
    type: String,
    default: ''
  },
  
  // 自动聚焦
  autofocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur', 'clear', 'input'])

// 组件引用
const textareaRef = ref(null)

// 组件状态
const isFocused = ref(false)
const inputId = computed(() => `hyperos2-textarea-${Math.random().toString(36).substr(2, 9)}`)

// 当前字符长度
const currentLength = computed(() => props.modelValue.length)

// 是否接近限制
const isNearLimit = computed(() => {
  if (!props.maxLength) return false
  return currentLength.value / props.maxLength > 0.8
})

// 事件处理
const handleInput = (event) => {
  const value = event.target.value
  emit('update:modelValue', value)
  emit('input', value)
}

const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event) => {
  isFocused.value = false
  emit('blur', event)
  emit('change', event.target.value)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  emit('change', '')
  
  // 聚焦到输入框
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

const handleKeyDown = (event) => {
  // 支持 Ctrl+A 全选
  if (event.ctrlKey && event.key === 'a') {
    event.target.select()
    return
  }
  
  // 支持 Ctrl+Z 撤销（浏览器默认行为）
  // 支持 Tab 缩进
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    const start = event.target.selectionStart
    const end = event.target.selectionEnd
    const value = event.target.value
    const newValue = value.substring(0, start) + '  ' + value.substring(end)
    
    emit('update:modelValue', newValue)
    
    nextTick(() => {
      event.target.selectionStart = event.target.selectionEnd = start + 2
    })
  }
}

// 组件挂载后自动聚焦
onMounted(() => {
  if (props.autofocus && textareaRef.value) {
    textareaRef.value.focus()
  }
})

// 暴露方法
defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  select: () => textareaRef.value?.select()
})
</script>

<style scoped>
.hyperos2-textarea-container {
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
}

.hyperos2-textarea-container.hyperos2-textarea--disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* 标签区域 */
.hyperos2-textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--hyperos-space-md);
}

.hyperos2-textarea-label-area {
  flex: 1;
}

.hyperos2-textarea-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--hyperos-text-primary);
  margin-bottom: var(--hyperos-space-xs);
  cursor: pointer;
}

.hyperos2-textarea-required {
  color: var(--hyperos-error);
  margin-left: var(--hyperos-space-xs);
}

.hyperos2-textarea-description {
  font-size: 0.75rem;
  color: var(--hyperos-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.hyperos2-textarea-count {
  font-size: 0.75rem;
  color: var(--hyperos-text-tertiary);
  margin-left: var(--hyperos-space-md);
}

.hyperos2-textarea-count--warning {
  color: var(--hyperos-warning);
}

/* 输入区域 */
.hyperos2-textarea-wrapper {
  position: relative;
}

.hyperos2-textarea-input {
  width: 100%;
  padding: var(--hyperos-space-md);
  border: 1px solid var(--hyperos-border-secondary);
  border-radius: var(--hyperos-radius-lg);
  background: var(--hyperos-bg-primary);
  color: var(--hyperos-text-primary);
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all var(--hyperos-transition-base);
  backdrop-filter: blur(var(--hyperos-blur-sm));
  -webkit-backdrop-filter: blur(var(--hyperos-blur-sm));
}

.hyperos2-textarea-input::placeholder {
  color: var(--hyperos-text-tertiary);
}

.hyperos2-textarea-input:focus {
  outline: none;
  border-color: var(--hyperos-primary);
  box-shadow: 0 0 0 3px rgba(var(--hyperos-primary-rgb), 0.1);
  background: var(--hyperos-bg-card);
}

.hyperos2-textarea-input--error {
  border-color: var(--hyperos-error);
}

.hyperos2-textarea-input--error:focus {
  border-color: var(--hyperos-error);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.hyperos2-textarea-input--resizable {
  resize: vertical;
}

.hyperos2-textarea-container.hyperos2-textarea--resizable .hyperos2-textarea-input {
  resize: both;
}

/* 清除按钮 */
.hyperos2-textarea-clear {
  position: absolute;
  top: var(--hyperos-space-md);
  right: var(--hyperos-space-md);
  width: 24px;
  height: 24px;
  border: none;
  background: var(--hyperos-bg-tertiary);
  color: var(--hyperos-text-secondary);
  border-radius: var(--hyperos-radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--hyperos-transition-fast);
  z-index: 1;
}

.hyperos2-textarea-clear:hover {
  background: var(--hyperos-bg-secondary);
  color: var(--hyperos-text-primary);
  transform: scale(1.1);
}

.hyperos2-textarea-clear:active {
  transform: scale(0.95);
}

/* 底部信息 */
.hyperos2-textarea-footer {
  margin-top: var(--hyperos-space-sm);
}

.hyperos2-textarea-error,
.hyperos2-textarea-hint {
  display: flex;
  align-items: center;
  gap: var(--hyperos-space-xs);
  font-size: 0.75rem;
  line-height: 1.4;
}

.hyperos2-textarea-error {
  color: var(--hyperos-error);
}

.hyperos2-textarea-hint {
  color: var(--hyperos-text-secondary);
}

/* 焦点状态 */
.hyperos2-textarea-container.hyperos2-textarea--focused .hyperos2-textarea-wrapper {
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hyperos2-textarea-header {
    flex-direction: column;
    gap: var(--hyperos-space-sm);
  }
  
  .hyperos2-textarea-count {
    margin-left: 0;
    align-self: flex-end;
  }
  
  .hyperos2-textarea-input {
    padding: var(--hyperos-space-md);
    font-size: 16px; /* 防止iOS缩放 */
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .hyperos2-textarea-input {
    border-color: var(--hyperos-border-dark);
    background: var(--hyperos-bg-primary-dark);
  }
  
  .hyperos2-textarea-input:focus {
    background: var(--hyperos-bg-tertiary-dark);
  }
}
</style>

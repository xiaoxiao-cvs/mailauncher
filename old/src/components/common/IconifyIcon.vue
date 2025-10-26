<template>
  <!-- 确保没有重复的属性 -->
  <span class="iconify-wrapper" :class="[sizeClass, colorClass]">
    <Icon :icon="icon" :width="computedSize" :height="computedSize" :color="computedColor" />
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 'default', // xs, sm, default, lg, xl, 2xl, 或数字字符串如 "20"
  },
  color: {
    type: String,
    default: '' // 默认使用当前文本颜色
  }
});

// 计算尺寸
const computedSize = computed(() => {
  const sizeMap = {
    'xs': '14px',
    'sm': '16px',
    'default': '20px',
    'lg': '24px',
    'xl': '32px',
    '2xl': '32px'
  };
  
  // 转换为字符串
  const sizeStr = String(props.size);
  
  // 如果是预定义的尺寸关键字，使用映射值
  if (sizeMap[sizeStr]) {
    return sizeMap[sizeStr];
  }
  
  // 如果是数字字符串，直接添加px
  if (/^\d+$/.test(sizeStr)) {
    return sizeStr + 'px';
  }
  
  // 如果已经包含单位，直接返回
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(sizeStr)) {
    return sizeStr;
  }
  
  // 默认回退
  return '20px';
});

// 计算颜色
const computedColor = computed(() => {
  return props.color || 'currentColor';
});

// 尺寸样式类
const sizeClass = computed(() => {
  const sizeStr = String(props.size);
  return `iconify-size-${sizeStr}`;
});

// 颜色样式类
const colorClass = computed(() => {
  if (!props.color) return '';
  if (props.color.startsWith('#') || props.color.startsWith('rgb')) {
    return '';
  }
  return `iconify-color-${props.color}`;
});
</script>

<style>
.iconify-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  line-height: 1;
}

/* 尺寸类 */
.iconify-size-xs svg {
  width: 14px;
  height: 14px;
}

.iconify-size-sm svg {
  width: 16px;
  height: 16px;
}

.iconify-size-default svg {
  width: 20px;
  height: 20px;
}

.iconify-size-lg svg {
  width: 24px;
  height: 24px;
}

.iconify-size-xl svg {
  width: 32px;
  height: 32px;
}

/* 主题适配样式 */
.iconify-size-xs svg,
.iconify-size-sm svg,
.iconify-size-default svg,
.iconify-size-lg svg,
.iconify-size-xl svg {
  transition: color 0.3s ease;
}

/* 添加主题色适配 */
[data-theme] .iconify-color-primary svg {
  color: hsl(var(--p));
}

[data-theme] .iconify-color-secondary svg {
  color: hsl(var(--s));
}

[data-theme] .iconify-color-accent svg {
  color: hsl(var(--a));
}

/* 添加反转色支持 */
.iconify-wrapper.iconify-inverted svg {
  filter: invert(1);
}
</style>

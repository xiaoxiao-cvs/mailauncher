/**
 * HyperOS 2 组件库统一导出入口
 * 提供完整的 HyperOS 2 风格设置组件
 */

// HyperOS 2 基础组件
export { default as HyperOS2Button } from './base/HyperOS2Button.vue'
export { default as HyperOS2Switch } from './base/HyperOS2Switch.vue'
export { default as HyperOS2Input } from './base/HyperOS2Input.vue'
export { default as HyperOS2Select } from './base/HyperOS2Select.vue'
export { default as HyperOS2Group } from './base/HyperOS2Group.vue'
export { default as HyperOS2Slider } from './base/HyperOS2Slider.vue'
export { default as HyperOS2Textarea } from './base/HyperOS2Textarea.vue'

// HyperOS 2 设置抽屉
export { default as HyperOS2SettingsDrawer } from './HyperOS2SettingsDrawer.vue'

/**
 * HyperOS 2 组件库使用指南
 * 
 * ## 基础使用
 * ```vue
 * <template>
 *   <HyperOS2Group title="基础设置" icon="mdi:cog">
 *     <HyperOS2Switch
 *       label="启用功能"
 *       v-model="enabled"
 *     />
 *     
 *     <HyperOS2Slider
 *       label="数值设置"
 *       :min="0"
 *       :max="100"
 *       suffix="%"
 *       v-model="value"
 *     />
 *   </HyperOS2Group>
 * </template>
 * ```
 * 
 * ## 特性
 * - 🎨 现代化 HyperOS 2 设计风格
 * - 🌈 毛玻璃效果和渐变背景
 * - 📱 完全响应式设计
 * - ⚡ 流畅的动画效果
 * - 🎯 完整的无障碍支持
 * - 🔧 高度可定制化
 * 
 * ## 主题
 * 组件支持亮色、暗色和自动主题切换，完美适配 HyperOS 2 的视觉规范。
 */

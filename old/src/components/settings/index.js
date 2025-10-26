/**
 * 设置组件库入口文件
 * 统一导出所有设置相关组件，方便使用和维护
 */

// 基础组件 - 已重构为HyperOS2组件
export { default as SettingGroup } from './base/HyperOS2SettingGroup.vue' // 使用新的HyperOS2风格
export { default as HyperOS2SettingGroup } from './base/HyperOS2SettingGroup.vue'

// HyperOS2组件 - 推荐使用
export { 
    HyperOS2Group, 
    HyperOS2Input, 
    HyperOS2Select, 
    HyperOS2Switch,
    HyperOS2Textarea,
    HyperOS2Slider,
    HyperOS2Button
} from './hyperos2'

// 兼容性别名
export { HyperOS2Input as SettingInput } from './hyperos2'
export { HyperOS2Switch as SettingSwitch } from './hyperos2'
export { HyperOS2Select as SettingSelect } from './hyperos2'
export { HyperOS2Select as SettingRadioGroup } from './hyperos2'
export { HyperOS2Slider as SettingSlider } from './hyperos2'

// 专用表单组件
export { default as ThemeSelector } from './forms/ThemeSelector.vue'
export { default as PathSelector } from './forms/PathSelector.vue'
export { default as PortConfig } from './forms/PortConfig.vue'
export { default as ConnectionTester } from './forms/ConnectionTester.vue'

// 预构建面板
export { default as AppearancePanel } from './panels/AppearancePanel.vue'

/**
 * 设置组件库使用指南
 * 
 * ## 基础使用
 * ```vue
 * <template>
 *   <SettingGroup title="基础设置" icon="mdi:cog">
 *     <SettingSwitch
 *       label="启用功能"
 *       description="启用或禁用此功能"
 *       v-model="enabled"
 *     />
 *     
 *     <SettingSlider
 *       label="数值设置"
 *       description="调整数值大小"
 *       :min="0"
 *       :max="100"
 *       suffix="%"
 *       v-model="value"
 *     />
 *   </SettingGroup>
 * </template>
 * ```
 * 
 * ## 高级使用
 * ```vue
 * <template>
 *   <PathSelector
 *     label="安装路径"
 *     description="选择软件安装路径"
 *     v-model="installPath"
 *     dialog-title="选择安装目录"
 *     :default-path="getDefaultPath()"
 *   />
 *   
 *   <PortConfig
 *     label="服务端口"
 *     description="配置服务监听端口"
 *     v-model="port"
 *     :show-test-button="true"
 *     :show-status="true"
 *     @test="handlePortTest"
 *   />
 * </template>
 * ```
 * 
 * ## 自定义主题
 * 所有组件都支持DaisyUI主题系统，可以通过CSS变量自定义样式：
 * ```css
 * :root {
 *   --p: 259 94% 51%;  // 主色调
 *   --s: 314 100% 47%; // 次色调
 *   --a: 174 60% 51%;  // 强调色
 * }
 * ```
 */

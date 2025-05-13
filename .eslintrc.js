module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021
  },
  rules: {
    // 全局规则
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    
    // Vue特定规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    
    // Vue 3宏相关规则
    'vue/no-undef-components': ['error', {
      ignorePatterns: ['defineProps', 'defineEmits', 'defineExpose', 'withDefaults']
    }],
    
    // 对于Vue 3宏不需要导入
    'no-undef': ['error', {
      'typeof': true,
      'globals': {
        'defineProps': 'readonly',
        'defineEmits': 'readonly',
        'defineExpose': 'readonly',
        'withDefaults': 'readonly'
      }
    }]
  },
  globals: {
    'defineProps': 'readonly',
    'defineEmits': 'readonly',
    'defineExpose': 'readonly',
    'withDefaults': 'readonly'
  }
}

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // 将所有 React Hooks 推荐规则降级为警告
      ...Object.keys(reactHooks.configs.recommended.rules).reduce((acc, key) => {
        acc[key] = 'warn'
        return acc
      }, {}),
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 关闭或降级其他规则
      '@typescript-eslint/no-explicit-any': 'off',
      // 下划线前缀为"故意不用"约定（解构占位、接口对齐用形参），统一放行
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // 配置文件（如 tailwind.config.ts）使用 require 加载插件属正常用法
    files: ['**/*.config.{ts,js,cjs,mjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)

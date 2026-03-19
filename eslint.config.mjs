// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // 1. 全局忽略目录
  {
    ignores: [
      '**/dist/**',
      '**/.runtime/**',
      '**/node_modules/**',
      'playground/src/.runtime/**',
    ],
  },

  // 2. 基础 JavaScript 推荐规则
  js.configs.recommended,

  // 3. 针对 Node.js 配置文件 (*.js, *.mjs, *.cjs) 的处理
  // 禁用类型检查，防止解析器为 JS 文件寻找 TS 配置
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: globals.node,
    },
    ...ts.configs.disableTypeChecked,
  },

  ...ts.configs.recommendedTypeChecked,
  {
    // 确保这里的 glob 覆盖到所有你使用的 TS 后缀
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
    },
  },
);

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      security
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // dangerouslySetInnerHTML の使用を禁止する（XSS 対策）
      'react/no-danger': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      // セキュリティ（eslint-plugin-security の推奨ルールのうち誤検知が多いものはオフにし、
      // XSS / コードインジェクションに直結するルールのみを有効化する）
      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-unsafe-regex': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      // 生の innerHTML への代入を禁止する（XSS 対策。DOM 操作は React の標準レンダリングを使う）
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message:
            '生の innerHTML への代入は禁止されています。XSS のリスクがあるため、React の標準的なレンダリングを使用してください。'
        }
      ]
    }
  },
  {
    ignores: [
      'node_modules/',
      'build/',
      '.plasmo/',
      '*.config.js',
      '*.config.ts',
      '.storybook/'
    ]
  }
);

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

const NO_INNER_HTML = {
  selector: "AssignmentExpression[left.property.name='innerHTML']",
  message:
    '生の innerHTML への代入は禁止されています。XSS のリスクがあるため、React の標準的なレンダリングを使用してください。'
};

// 保存領域（chrome.storage.local）の書き手は background のサービスだけにする。待ち行列の外から書くと、並んだ書き込みの変更が消える
const STORAGE_WRITERS = [
  'src/lib/settingsService.ts',
  'src/lib/siteService.ts',
  'src/lib/activityService.ts'
];
// 支援誘導の表示状態（supportPromptItem）だけは画面が書く
const SUPPORT_PROMPT_WRITER = 'src/lib/supportPrompt.ts';
// GA4 のクライアント ID とセッションは chrome.storage.local を直接使う
const ANALYTICS_WRITER = 'src/lib/analytics.ts';
// storage の実体（defineItem・getItem）を import してよいファイル
const STORAGE_OWNERS = ['src/lib/storage.ts', 'src/lib/settingsService.ts'];
// テストは前提データを保存領域へ直接置く
const TEST_FILES = [
  'src/**/__tests__/**',
  'src/**/*.test.{ts,tsx}',
  'src/test/**'
];

const STORAGE_WRITE_MESSAGE =
  '保存領域へ書けるのは background のサービス（settingsService / siteService / activityService）だけです。画面からは background へメッセージで依頼してください（docs/DATA_MODEL.md）。';

// 保存項目（WxtStorageItem）と @wxt-dev/storage の書き込みメソッド。受け手の名前ではなくメソッド名で当てるので、項目を引数で受ける汎用の書き込みも止まる
const WXT_WRITE_METHOD =
  '/^(setValue|removeValue|setMeta|removeMeta|migrate|setItem|setItems|setMetas|removeItem|removeItems|restoreSnapshot)$/';

const WXT_STORAGE_WRITE = {
  selector: `CallExpression > MemberExpression.callee:matches([property.name=${WXT_WRITE_METHOD}], [property.value=${WXT_WRITE_METHOD}])`,
  message: STORAGE_WRITE_MESSAGE
};

const SUPPORT_PROMPT_ONLY_WRITE = {
  selector: `${WXT_STORAGE_WRITE.selector}:not([object.name='supportPromptItem'])`,
  message: STORAGE_WRITE_MESSAGE
};

const CHROME_LOCAL_WRITE = {
  selector:
    "CallExpression > MemberExpression.callee[property.name=/^(set|remove|clear)$/][object.property.name='local'][object.object.property.name='storage']",
  message: STORAGE_WRITE_MESSAGE
};

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
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-danger': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      'security/detect-eval-with-expression': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-unsafe-regex': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-restricted-syntax': ['error', NO_INNER_HTML]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      ...STORAGE_WRITERS,
      SUPPORT_PROMPT_WRITER,
      ANALYTICS_WRITER,
      ...TEST_FILES
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_INNER_HTML,
        WXT_STORAGE_WRITE,
        CHROME_LOCAL_WRITE
      ]
    }
  },
  {
    files: STORAGE_WRITERS,
    rules: {
      'no-restricted-syntax': ['error', NO_INNER_HTML, CHROME_LOCAL_WRITE]
    }
  },
  {
    files: [SUPPORT_PROMPT_WRITER],
    rules: {
      'no-restricted-syntax': [
        'error',
        NO_INNER_HTML,
        SUPPORT_PROMPT_ONLY_WRITE,
        CHROME_LOCAL_WRITE
      ]
    }
  },
  {
    files: [ANALYTICS_WRITER],
    rules: {
      'no-restricted-syntax': ['error', NO_INNER_HTML, WXT_STORAGE_WRITE]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...STORAGE_OWNERS, ...TEST_FILES],
    rules: {
      'no-restricted-imports': [
        'error',
        ...['@wxt-dev/storage', 'wxt/utils/storage'].map((name) => ({
          name,
          importNames: ['storage'],
          message: `storage の実体は src/lib/storage.ts の保存項目を通して使ってください。${STORAGE_WRITE_MESSAGE}`
        }))
      ]
    }
  },
  {
    ignores: [
      'node_modules/',
      'build/',
      '.output/',
      '.wxt/',
      '*.config.js',
      '*.config.ts',
      '.storybook/'
    ]
  }
);

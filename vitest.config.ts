import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      // src 配下のみを集計対象にする。
      // include を指定しないと storybook-static/ や build/ のビルド成果物まで
      // 集計に含まれ、カバレッジの数値が実態を表さなくなる
      include: ['src/**'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/__tests__/**',
        'src/test/**',
        // 型定義のみのファイル（実行されるコードを持たない）
        'src/types/index.ts',
        'src/types/messages.ts',
        'src/types/report.ts',
        'src/types/storageSchemas.ts',
        // re-export のみのファイル（ロジックを持たず、実体は src/lib 側でテスト済み）
        'src/background/time-limit.ts'
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
      // 現状値を下回らないラインを下限とする（退行防止が目的）。
      // src/components が未テストのため低い水準から始め、
      // テスト追加に合わせて段階的に引き上げる
      thresholds: {
        statements: 34,
        branches: 83,
        functions: 62,
        lines: 34
      }
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src')
    }
  }
});

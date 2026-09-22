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
      // src 配下のソースのみを集計対象にする。
      // include を指定しないと storybook-static/ や build/ のビルド成果物まで
      // 集計に含まれ、カバレッジの数値が実態を表さなくなる。
      // ⚠ 拡張子を明示するのは vitest 4 で coverage.extensions が廃止されたため。
      //   `src/**` だけだと index.html まで解析対象になり、パースエラーになる
      include: ['src/**/*.{ts,tsx}'],
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
        'src/background/time-limit.ts',
        // WXT のエントリポイント。ビルド時の仮想モジュール `#imports` に依存しており
        // vitest からは読み込めない（src/background/init.ts の説明を参照）。
        // vitest 4 の AST ベース解析は未変換の TS をパースできずエラーを出して自動除外するので、
        // 計測できないことを設定側で明示する（中身は init.ts 側でテストしている）
        'src/entrypoints/*.ts'
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
      // 現状値を下回らないラインを下限とする（退行防止が目的）。
      // テストを増やした PR では引き上げず、引き上げは別途判断する
      // （docs/COMPONENT_TESTING.md「カバレッジ」）
      thresholds: {
        statements: 34,
        branches: 83,
        functions: 61,
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

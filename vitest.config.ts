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
      // 拡張子まで絞る（`src/**` だと index.html まで解析してパースエラーになる）
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/__tests__/**',
        'src/test/**',
        'src/types/index.ts',
        'src/types/messages.ts',
        'src/types/report.ts',
        'src/types/storageSchemas.ts',
        // `#imports`（WXT の仮想モジュール）に依存し vitest から読めない。中身は init.ts 側でテストする
        'src/entrypoints/*.ts'
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
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

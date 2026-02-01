# Next.js 環境構築手順

`/project:setup` で src/ が存在しない場合に実行する手順です。

---

## 1. Next.js プロジェクト作成

既存ファイル（docs/PRD.md 等）がある場合、`create-next-app` は直接実行できないため、一時ディレクトリを経由する：

```bash
# 1. 一時ディレクトリで Next.js プロジェクトを作成
npx create-next-app@latest .nextjs-temp --yes

# 2. 生成されたファイルを現在のディレクトリにコピー（既存ファイルは上書きしない）
cp -rn .nextjs-temp/* .nextjs-temp/.[!.]* . 2>/dev/null || true

# 3. 一時ディレクトリを削除
rm -rf .nextjs-temp
```

※ `--yes` でデフォルト設定（TypeScript, Tailwind CSS, ESLint, App Router, Turbopack）が適用されます
※ `-n` オプションで既存ファイル（CLAUDE.md, docs/ 等）は保持されます

---

## 2. 追加パッケージのインストール

```bash
# Formatter
npm install -D prettier eslint-config-prettier

# バリデーション
npm install zod

# テスト
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test

# Storybook
npx storybook@latest init
```

---

## 3. 設定ファイル作成

### .gitignore に追記

`create-next-app` が生成した `.gitignore` に、Claude Code 用の設定を追記：

```gitignore
# Claude Code local settings
.claude/settings.local.json
.claude/tmp/
.claude/logs/
.claude/mcp-cache/
claude_desktop_config.json
```

| 項目 | 用途 |
| ---- | ---- |
| `.claude/settings.local.json` | ローカル権限設定（チーム共有は `settings.json` を使用） |
| `.claude/tmp/` | 一時ファイル（コミットメッセージ等） |
| `.claude/logs/` | デバッグログ |
| `.claude/mcp-cache/` | MCP サーバーキャッシュ |
| `claude_desktop_config.json` | Claude Desktop 個人設定 |

### .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### .node-version

```
24
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom';
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

---

## 4. npm scripts 追加

package.json の scripts に以下を追加：

```json
{
  "scripts": {
    "format": "prettier --write .",
    "test": "vitest",
    "test:e2e": "playwright test",
    "docs:api": "npx @redocly/cli preview-docs docs/openapi.yaml"
  }
}
```

---

## 5. GitHub Actions 追加

`.github/workflows/ci.yml` を作成：

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test -- --run

      - name: Build
        run: npm run build
```

---

## 6. Analytics 設定

Vercel Analytics をデフォルトで導入：

```bash
npm install @vercel/analytics
```

`src/app/layout.tsx` に追加：

```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### ユーザー設定が必要な項目

| 項目                     | 設定場所              | 説明                                  |
| ------------------------ | --------------------- | ------------------------------------- |
| Vercel Analytics         | Vercel ダッシュボード | Project Settings → Analytics → Enable |
| Google Analytics（任意） | `.env.local`          | `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`      |

※ Google Analytics を追加する場合は別途 `@next/third-parties` を使用

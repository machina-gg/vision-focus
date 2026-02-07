# Plasmo 環境構築手順

`/project:setup` で src/ が存在しない場合に実行する手順です。

---

## 1. Plasmo プロジェクト作成

既存ファイル（docs/PRD.md 等）がある場合、`create-plasmo` は直接実行できないため、一時ディレクトリを経由する：

```bash
# 1. 一時ディレクトリで Plasmo プロジェクトを作成
pnpm create plasmo .plasmo-temp --with-src

# 2. 生成されたファイルを現在のディレクトリにコピー（既存ファイルは上書きしない）
cp -rn .plasmo-temp/* .plasmo-temp/.[!.]* . 2>/dev/null || true

# 3. 一時ディレクトリを削除
rm -rf .plasmo-temp
```

※ `--with-src` で src/ ディレクトリにソースコードが配置されます
※ `-n` オプションで既存ファイル（CLAUDE.md, docs/ 等）は保持されます

---

## 2. 追加パッケージのインストール

```bash
# Formatter
pnpm add -D prettier eslint-config-prettier

# バリデーション
pnpm add zod

# テスト
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D @playwright/test

# Storybook
pnpm dlx storybook@latest init

# Tailwind CSS（Plasmo では手動セットアップが必要な場合）
pnpm add -D tailwindcss @tailwindcss/postcss postcss
```

---

## 3. 設定ファイル作成

### .gitignore に追記

Plasmo が生成した `.gitignore` に、Claude Code 用の設定を追記：

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

### postcss.config.mjs

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
};
```

---

## 4. pnpm scripts 追加

package.json の scripts に以下を追加：

```json
{
  "scripts": {
    "format": "prettier --write .",
    "test": "vitest",
    "test:e2e": "playwright test"
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

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test -- --run

      - name: Build
        run: pnpm build
```

`.github/workflows/e2e.yml` を作成：

```yaml
name: E2E Tests

on:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm test:e2e
```

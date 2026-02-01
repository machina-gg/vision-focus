# CLAUDE.md

このファイルは Claude Code への指示書です。
プロジェクトで作業する際は、必ずこのファイルに従ってください。

---

## 1. プロジェクト概要

作業開始時に以下を確認：

| ファイル | 存在する場合 | 存在しない場合 |
|----------|-------------|---------------|
| docs/PRD.md | 内容を把握 | `/project:requirements` を促す |
| docs/DESIGN.md | 内容を把握 | `/project:design` を促す |
| docs/openapi.yaml | 内容を把握 | 必要に応じて作成 |
| src/ | 実装を継続 | 初回実装時に環境構築 |

---

## 2. 技術スタック

### 必須
| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js (App Router) 16.x |
| 言語 | TypeScript 5.x |
| スタイリング | Tailwind CSS 4.x |
| バリデーション | Zod |
| Linter / Formatter | ESLint / Prettier |
| パッケージ管理 | npm |
| Node.js | 24.x |
| 単体テスト | Vitest + React Testing Library |
| E2Eテスト | Playwright |
| コンポーネント管理 | Storybook |

### プロジェクトに応じて追加
| カテゴリ | 選択肢 |
|----------|--------|
| データストレージ | Supabase（ローカル: Supabase Local / 本番: Supabase Cloud） |
| UIコンポーネント | shadcn/ui |
| アイコン | Lucide |
| フォーム | React Hook Form |
| データフェッチ | SWR / TanStack Query |

---

## 3. コマンド一覧

以下のスラッシュコマンドが使用可能です：

| コマンド | 説明 |
|----------|------|
| `/project:requirements` | 要件定義を行う |
| `/project:design` | 設計を行う |
| `/project:api` | API設計を行う |
| `/project:setup` | 環境構築を行う |
| `/project:prototype` | プロトタイプ実装（デザインコンセプト確定） |
| `/project:test-design` | E2Eテスト設計を行う |
| `/project:implement` | 本実装を行う |
| `/project:continue` | 進捗確認・作業再開 |
| `/project:review` | コードレビューと修正 |
| `/project:deploy` | デプロイを行う |
| `/project:improvements` | 改善リスト作成・Issue一括登録 |

詳細は `.claude/commands/` 配下の各ファイルを参照。

---

## 4. 環境構築手順

`/project:setup` で src/ が存在しない場合に実行：

### 4.1 Next.js プロジェクト作成

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

### 4.2 追加パッケージのインストール
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

### 4.3 設定ファイル作成

**.prettierrc**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**.node-version**
```
24
```

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**src/test/setup.ts**
```typescript
import '@testing-library/jest-dom'
```

**playwright.config.ts**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 4.4 npm scripts 追加
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

**Supabase 使用時は以下も追加：**
```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:reset": "supabase db reset"
  }
}
```

### 4.5 GitHub Actions 追加
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

### 4.6 Analytics 設定
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

#### ユーザー設定が必要な項目
| 項目 | 設定場所 | 説明 |
|------|----------|------|
| Vercel Analytics | Vercel ダッシュボード | Project Settings → Analytics → Enable |
| Google Analytics（任意） | `.env.local` | `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` |

※ Google Analytics を追加する場合は別途 `@next/third-parties` を使用

### 4.7 Supabase Local 設定（データストレージ使用時）

データストレージに Supabase を使用する場合、以下の手順でローカル環境を構築：

#### 前提条件
- Docker Desktop がインストールされていること

#### セットアップ手順

```bash
# 1. Supabase CLI のインストール
npm install -D supabase

# 2. Supabase クライアントのインストール
npm install @supabase/supabase-js

# 3. Supabase プロジェクトの初期化
npx supabase init

# 4. ローカル環境の起動
npx supabase start
```

起動後、以下の情報が表示されます：
- API URL: `http://127.0.0.1:54321`
- anon key: ローカル用の匿名キー
- Studio URL: `http://127.0.0.1:54323`（管理画面）

#### 環境変数の設定

`.env.local` を作成：
```bash
# Supabase（ローカル開発用）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<起動時に表示されたanon key>
```

`.env.local.example` を作成（Git管理用）：
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Supabase クライアント設定

`src/lib/supabase.ts` を作成：
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### npm scripts 追加
```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:reset": "supabase db reset"
  }
}
```

#### マイグレーション

```bash
# 新しいマイグレーションを作成
npx supabase migration new <migration_name>

# マイグレーションを適用
npx supabase db reset
```

マイグレーションファイルは `supabase/migrations/` に保存されます。

#### Storage（画像アップロード）

Supabase Storage は `supabase start` で自動的に起動します。

**バケット作成（SQL マイグレーション）**

`supabase/migrations/XXXXXX_create_storage_bucket.sql`:
```sql
-- バケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- アップロードポリシー（認証ユーザーのみ）
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- 閲覧ポリシー（全員）
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

**アップロード実装例**

`src/lib/storage.ts`:
```typescript
import { supabase } from './supabase'

export async function uploadImage(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file)

  if (error) throw error
  return data
}

export function getImageUrl(path: string) {
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(path)

  return data.publicUrl
}
```

#### Auth（認証）

Supabase Auth も `supabase start` で自動的に起動します。

**対応認証方式**
- Email / Password
- Magic Link（パスワードレス）
- OAuth（Google, GitHub, Twitter など）
- Phone Auth（SMS）

**認証実装例**

`src/lib/auth.ts`:
```typescript
import { supabase } from './supabase'

// サインアップ
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

// サインイン
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// サインアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// 現在のユーザー取得
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

**セッション管理（App Router）**

`src/components/providers/AuthProvider.tsx`:
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext<{ user: User | null }>({ user: null })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

**OAuth 設定（本番環境）**

1. Supabase ダッシュボード → Authentication → Providers
2. 使用するプロバイダーを有効化（Google, GitHub など）
3. 各プロバイダーの Client ID / Secret を設定

※ ローカル環境では Email/Password 認証でテスト可能

#### 本番環境（Supabase Cloud）へのデプロイ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. 本番用の環境変数を Vercel に設定
3. マイグレーションを本番に適用：
   ```bash
   npx supabase link --project-ref <project-id>
   npx supabase db push
   ```

---

## 5. ディレクトリ構成

```
├── src/
│   ├── app/              # ページ（App Router）
│   ├── components/       # UIコンポーネント
│   │   └── ui/           # 汎用部品
│   │       └── Button/
│   │           ├── Button.tsx
│   │           ├── Button.test.tsx
│   │           └── Button.stories.tsx
│   ├── hooks/            # カスタムフック
│   ├── lib/              # ユーティリティ関数
│   ├── types/            # 型定義
│   └── styles/           # グローバルCSS
├── supabase/             # Supabase 設定（使用時のみ）
│   ├── migrations/       # DBマイグレーション
│   └── config.toml       # Supabase設定
├── .storybook/           # Storybook 設定
└── docs/                 # ドキュメント
```

### コロケーションルール
- コンポーネント、テスト、stories は同じディレクトリに配置
- `ComponentName/` フォルダでグループ化

---

## 6. 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `Button.tsx` |
| フック | camelCase + use | `useSettings.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 型定義 | PascalCase | `Settings.ts` |
| 定数 | UPPER_SNAKE_CASE | `API_BASE_URL` |

---

## 7. コーディング規約

### 基本ルール
- 関数コンポーネントを使用（クラスコンポーネント禁止）
- `any` 型は禁止、必ず型を定義する
- コンポーネントは1ファイル1コンポーネント
- named export を基本（default export は app/ 配下のみ）

### インポート順序
1. 外部ライブラリ（react, next など）
2. 内部モジュール（@/ エイリアス）
3. 相対パス
4. 型定義

### コーディングスタイル
- async/await を使用（.then チェーン禁止）
- 早期リターンでネストを減らす
- マジックナンバーは定数化
- コメントは「なぜ」を書く（「何」はコードで表現）

---

## 8. 禁止事項

- `any` 型の使用
- `console.log` の本番コード残留
- 未使用のインポート・変数
- `.then` チェーン（async/await を使う）
- クラスコンポーネント
- インラインスタイル（Tailwind を使う）
- default export（app/ 配下以外）
- PRD.md の無断変更（確認必須）
- テストなしでの複雑なロジック実装

---

## 9. ドキュメントテンプレート

テンプレートは `.claude/templates/` に配置されています。

| テンプレート | 用途 |
|-------------|------|
| [COMPETITIVE_ANALYSIS.md](./.claude/templates/COMPETITIVE_ANALYSIS.md) | 競合調査レポート |
| [PRD.md](./.claude/templates/PRD.md) | 要件定義書 |
| [DESIGN.md](./.claude/templates/DESIGN.md) | 設計書 |
| [SCREEN.md](./.claude/templates/SCREEN.md) | 画面設計 |
| [COMPONENT.md](./.claude/templates/COMPONENT.md) | コンポーネント設計 |
| [DATA_MODEL.md](./.claude/templates/DATA_MODEL.md) | データモデル |
| [TEST_CASES.md](./.claude/templates/TEST_CASES.md) | E2Eテストケース |
| [DESIGN_CONCEPT.md](./.claude/templates/DESIGN_CONCEPT.md) | デザインコンセプト |
| [IMPROVEMENTS.md](./.claude/templates/IMPROVEMENTS.md) | 改善リスト |
| [openapi.yaml](./.claude/templates/openapi.yaml) | API定義 |

---

## 10. SSOT（Single Source of Truth）

各情報の正式な管理場所：

| 情報 | SSOT | 備考 |
|------|------|------|
| 機能要件・制約 | docs/PRD.md | 他では参照リンク |
| 技術スタック | docs/DESIGN.md | README.mdは簡易版 |
| ディレクトリ構成 | docs/DESIGN.md | - |
| データモデル | docs/DATA_MODEL.md | バリデーション含む |
| コンポーネント | docs/COMPONENT.md | - |
| 画面設計 | docs/SCREEN.md | - |
| 実装状況 | GitHub Issues | PRDにはチェック不要 |

---

## 11. 参照ドキュメント

- [README](./README.md)
- [開発フロー](./.claude/docs/DEVELOPMENT_FLOW.md)
- [GitHub MCP 設定](./.claude/docs/SETUP_GITHUB_MCP.md)
- [Vercel MCP 設定](./.claude/docs/SETUP_VERCEL_MCP.md)


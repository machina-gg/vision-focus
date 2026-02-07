
---

## 8. 技術スタック

### 共通（全プロジェクト）

| カテゴリ           | 技術                           |
| ------------------ | ------------------------------ |
| 言語               | TypeScript 5.x                 |
| スタイリング       | Tailwind CSS 4.x               |
| バリデーション     | Zod                            |
| Linter / Formatter | ESLint / Prettier              |
| Node.js            | 24.x                           |
| 単体テスト         | Vitest + React Testing Library |
| E2Eテスト          | Playwright                     |
| コンポーネント管理 | Storybook                      |

### フレームワーク

| フレームワーク             | パッケージ管理 | 用途                |
| -------------------------- | -------------- | ------------------- |
| Next.js (App Router) 16.x | npm            | Webアプリケーション |

### プロジェクトに応じて追加

| カテゴリ         | 選択肢                                                      |
| ---------------- | ----------------------------------------------------------- |
| データストレージ | Supabase（ローカル: Supabase Local / 本番: Supabase Cloud） |
| UIコンポーネント | shadcn/ui                                                   |
| アイコン         | Lucide                                                      |
| フォーム         | React Hook Form                                             |
| データフェッチ   | SWR / TanStack Query                                        |

---

## 9. ディレクトリ構成

### Next.js プロジェクト

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

## 10. 参照ドキュメント

- [README](./README.md)
- [開発フロー](./.claude/vibe-coding-utils/docs/shared/DEVELOPMENT_FLOW.md)
- [GitHub MCP 設定](./.claude/vibe-coding-utils/docs/shared/SETUP_GITHUB_MCP.md)
- [Vercel MCP 設定](./.claude/vibe-coding-utils/docs/nextjs/SETUP_VERCEL_MCP.md)
- [権限設定](./.claude/vibe-coding-utils/docs/shared/SETUP_PERMISSIONS.md)

### 環境構築手順（/project:setup 時に参照）

- [Next.js セットアップ](./.claude/vibe-coding-utils/docs/nextjs/SETUP_NEXTJS.md)
- [Supabase セットアップ](./.claude/vibe-coding-utils/docs/nextjs/SETUP_SUPABASE.md)

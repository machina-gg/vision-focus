
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

| フレームワーク | パッケージ管理 | 用途     |
| -------------- | -------------- | -------- |
| Plasmo 0.90.x  | pnpm           | Chrome拡張 |

### プロジェクトに応じて追加

| カテゴリ         | 選択肢                                                      |
| ---------------- | ----------------------------------------------------------- |
| データストレージ | Chrome Storage API / Supabase                               |
| UIコンポーネント | shadcn/ui                                                   |
| アイコン         | Lucide                                                      |
| フォーム         | React Hook Form                                             |
| データフェッチ   | SWR / TanStack Query                                        |

---

## 9. ディレクトリ構成

### Plasmo（Chrome拡張）プロジェクト

```
├── src/
│   ├── newtab.tsx          # 新しいタブページ
│   ├── popup.tsx           # ポップアップ
│   ├── options.tsx         # オプションページ
│   ├── background/         # バックグラウンドスクリプト
│   ├── contents/           # コンテンツスクリプト
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── lib/                # ユーティリティ関数
│   ├── types/              # 型定義
│   ├── constants/          # 定数
│   └── styles/             # グローバルCSS
├── assets/                 # 静的アセット（アイコン、背景画像、i18n）
├── scripts/                # ビルド・ユーティリティスクリプト
├── .storybook/             # Storybook 設定
└── docs/                   # ドキュメント
```

### コロケーションルール

- コンポーネント、テスト、stories は同じディレクトリに配置
- `ComponentName/` フォルダでグループ化

---

## 10. 参照ドキュメント

- [README](./README.md)
- [開発フロー](./.claude/vibe-coding-utils/docs/shared/DEVELOPMENT_FLOW.md)
- [GitHub MCP 設定](./.claude/vibe-coding-utils/docs/shared/SETUP_GITHUB_MCP.md)
- [権限設定](./.claude/vibe-coding-utils/docs/shared/SETUP_PERMISSIONS.md)

### 環境構築手順（/project:setup 時に参照）

- [Plasmo セットアップ](./.claude/vibe-coding-utils/docs/chrome-extension/SETUP_PLASMO.md)

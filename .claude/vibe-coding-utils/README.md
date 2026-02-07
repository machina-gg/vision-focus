# Vibe Coding Utils

## About

Claude Code でバイブコーディングするためのテンプレートリポジトリです。

AIに指示を出すだけで、要件定義から実装まで一貫したフォーマットで開発を進められます。
`git subtree` で取り込むことで、複数プロジェクトでの再利用とテンプレート更新の反映が可能です。

### 対応フレームワーク

| フレームワーク             | パッケージ管理 | 用途                |
| -------------------------- | -------------- | ------------------- |
| Next.js (App Router) 16.x | npm            | Webアプリケーション |
| Plasmo 0.90.x              | pnpm           | Chrome拡張          |

## Quick Start

### 1. プロジェクトに取り込む

```bash
# プロジェクトのルートディレクトリで実行
git subtree add --prefix=.claude/vibe-coding-utils https://github.com/machina-gg/vibe-coding-utils.git develop --squash
```

### 2. フレームワークを選択してセットアップ

```bash
# Next.js の場合
bash .claude/vibe-coding-utils/scripts/setup-framework.sh nextjs

# Chrome拡張の場合
bash .claude/vibe-coding-utils/scripts/setup-framework.sh chrome-extension
```

### 3. 開発を開始

1. `docs/INPUT.md` に作りたいものを記載
2. `/project:requirements` で要件定義
3. `/project:design` で設計
4. `/project:setup` で環境構築
5. `/project:prototype` でプロトタイプ実装
6. `/project:implement` で本実装
7. `/project:deploy` でデプロイ

テンプレートの更新方法やチームメンバーの設定は [Subtree セットアップガイド](./docs/shared/SETUP_SUBTREE.md) を参照してください。

## What's Included

```
vibe-coding-utils/
├── templates/          # ドキュメントテンプレート・CLAUDE.md テンプレート
├── commands/           # Claude Code カスタムコマンド
│   ├── shared/         # フレームワーク共通
│   ├── nextjs/         # Next.js 固有
│   └── chrome-extension/  # Chrome拡張 固有
├── docs/               # セットアップ・開発ガイド
│   ├── shared/         # 共通ドキュメント
│   ├── nextjs/         # Next.js 固有
│   └── chrome-extension/  # Chrome拡張 固有
├── scripts/            # セットアップスクリプト
├── QUICKSTART.md       # クイックリファレンス
└── CONTRIBUTING.md     # コントリビューションガイド
```

## Commands

Claude Code で以下のスラッシュコマンドが使用可能です：

| コマンド                         | 説明                               | 共通 | Next.js | Chrome拡張 |
| -------------------------------- | ---------------------------------- | :--: | :-----: | :--------: |
| `/project:requirements`          | 要件定義を行う                     |  o   |         |            |
| `/project:design`                | 設計を行う                         |      |    o    |     o      |
| `/project:api`                   | API設計を行う                      |      |    o    |     o      |
| `/project:setup`                 | 環境構築を行う                     |      |    o    |     o      |
| `/project:prototype`             | プロトタイプ実装（デザイン確認用） |      |    o    |     o      |
| `/project:test-design`           | E2Eテスト設計を行う                |  o   |         |            |
| `/project:implement <Issue番号>` | 本実装を行う（複数指定で並行開発） |      |    o    |     o      |
| `/project:status`                | 現在の状況を確認                   |  o   |         |            |
| `/project:review`                | コードレビューと修正               |  o   |         |            |
| `/project:deploy`                | デプロイを行う                     |      |    o    |     o      |

## Workflow

| #   | フェーズ     | コマンド                | 成果物                                       |
| --- | ------------ | ----------------------- | -------------------------------------------- |
| 1   | 要件定義     | `/project:requirements` | docs/PRD.md, reports/COMPETITIVE_ANALYSIS.md |
| 2   | 設計         | `/project:design`       | docs/DESIGN.md, SCREEN.md, GitHub Issues     |
| 3   | API設計      | `/project:api`          | docs/openapi.yaml                            |
| 4   | 環境構築     | `/project:setup`        | src/, 設定ファイル一式                       |
| 5   | プロトタイプ | `/project:prototype`    | src/components/, Storybook, メイン画面       |
| 6   | テスト設計   | `/project:test-design`  | docs/TEST_CASES.md                           |
| 7   | 本実装       | `/project:implement`    | src/, PR                                     |
| 8   | デプロイ     | `/project:deploy`       | 本番環境                                     |

詳細: [開発フロー図](./docs/shared/DEVELOPMENT_FLOW.md)

## Documentation

| ファイル | 内容 |
| -------- | ---- |
| [CLAUDE_CODE_REFERENCE.md](./CLAUDE_CODE_REFERENCE.md) | Claude Code 操作リファレンス |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | コントリビューションガイド |
| [Subtree セットアップ](./docs/shared/SETUP_SUBTREE.md) | 取り込み・更新手順 |
| [開発フロー](./docs/shared/DEVELOPMENT_FLOW.md) | 開発フロー図 |
| [GitHub MCP 設定](./docs/shared/SETUP_GITHUB_MCP.md) | Issue 管理の設定 |
| [権限設定](./docs/shared/SETUP_PERMISSIONS.md) | コミット・PR確認スキップ |

### Next.js 固有

| ファイル | 内容 |
| -------- | ---- |
| [Next.js セットアップ](./docs/nextjs/SETUP_NEXTJS.md) | 環境構築手順 |
| [Supabase セットアップ](./docs/nextjs/SETUP_SUPABASE.md) | DB/認証セットアップ |
| [Vercel MCP 設定](./docs/nextjs/SETUP_VERCEL_MCP.md) | デプロイ設定 |

### Chrome拡張 固有

| ファイル | 内容 |
| -------- | ---- |
| [Plasmo セットアップ](./docs/chrome-extension/SETUP_PLASMO.md) | 環境構築手順 |
| [Chrome Web Store](./docs/chrome-extension/SETUP_CHROME_WEB_STORE.md) | 公開手順 |

## Prerequisites

| 項目         | 必須 | 説明                        |
| ------------ | ---- | --------------------------- |
| Node.js 24.x | ✅   | JavaScript ランタイム       |
| Claude Code  | ✅   | AI コーディングアシスタント |
| GitHub MCP   | ✅   | Issue 管理に必要            |

## License

MIT

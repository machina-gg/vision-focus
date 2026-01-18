# Next.js Vibe Coding Template

## About

Claude Code でバイブコーディングするためのプロジェクトテンプレートです。

AIに指示を出すだけで、要件定義から実装まで一貫したフォーマットで開発を進められます。

## Tech Stack

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| Linter / Formatter | ESLint / Prettier |
| パッケージ管理 | npm |
| ホスティング | Vercel |
| CI/CD | GitHub Actions |

## What's Included

```
├── docs/           # 設計・技術ドキュメント
├── reports/        # 調査・分析レポート
├── .github/        # CI/CD 設定
├── .claude/        # Claude Code カスタムコマンド
├── CLAUDE.md       # AI向け指示書
└── README.md       # このファイル
```

※ `src/` はAIが初回実装時に自動生成します

## Getting Started

1. このテンプレートから新規リポジトリを作成
2. clone して Claude Code で開く
3. `docs/INPUT.md` に作りたいものを記載
4. `/project:requirements` で要件定義
5. `/project:design` で設計
6. `/project:api` でAPI設計（必要に応じて）
7. `/project:prototype` でプロトタイプ実装・デザイン確認
8. `/project:implement` で本実装
9. `/project:deploy` でデプロイ

## Workflow

👉 [開発フロー図](./docs/DEVELOPMENT_FLOW.md)

| # | フェーズ | コマンド | 成果物 |
|---|----------|----------|--------|
| 1 | 要件定義 | `/project:requirements` | docs/PRD.md, reports/COMPETITIVE_ANALYSIS.md |
| 2 | 設計 | `/project:design` | docs/DESIGN.md, SCREEN.md, GitHub Issues |
| 3 | API設計 | `/project:api` | docs/openapi.yaml |
| 4 | プロトタイプ | `/project:prototype` | src/components/, Storybook, TOP画面 |
| 5 | 本実装 | `/project:implement` | src/, Issue更新 |
| 6 | 繰り返し | `/project:continue` | - |
| 7 | デプロイ | `/project:deploy` | 本番環境 |

## Commands

Claude Code で以下のスラッシュコマンドが使用可能です：

| コマンド | 説明 | 成果物 |
|----------|------|--------|
| `/project:requirements` | 要件定義を行う | docs/PRD.md, reports/COMPETITIVE_ANALYSIS.md |
| `/project:design` | 設計を行う | docs/DESIGN.md, SCREEN.md, COMPONENT.md, ERD.md, GitHub Issues |
| `/project:api` | API設計を行う | docs/openapi.yaml |
| `/project:prototype` | プロトタイプ実装（デザイン確認用） | src/components/, Storybook, TOP画面 |
| `/project:implement` | 本実装を行う | src/, Issue更新 |
| `/project:continue` | 進捗確認・作業再開 | - |
| `/project:review` | コードレビューと修正 | - |
| `/project:deploy` | デプロイを行う | 本番環境, Analytics設定 |

## npm Scripts

環境構築後（`/project:prototype` 実行後）に使用可能：

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run format` | Prettier でフォーマット |
| `npm run test` | Vitest で単体テスト |
| `npm run test:e2e` | Playwright で E2E テスト |
| `npm run storybook` | Storybook 起動 |
| `npm run docs:api` | OpenAPI ドキュメント表示 |

## Documentation

| ファイル | 内容 | 作成タイミング |
|----------|------|---------------|
| docs/INPUT.md | 要件ヒアリングシート | 最初に記載 |
| reports/COMPETITIVE_ANALYSIS.md | 競合調査レポート | `/project:requirements` |
| reports/WORK_LOG.md | 作業履歴 | 各フェーズで自動追記 |
| docs/PRD.md | 要件定義書 | `/project:requirements` |
| docs/DESIGN.md | 設計書 | `/project:design` |
| docs/SCREEN.md | 画面設計 | `/project:design` |
| docs/COMPONENT.md | コンポーネント設計 | `/project:design` |
| docs/ERD.md | ER図（DB使用時） | `/project:design` |
| docs/openapi.yaml | API設計（OpenAPI 3.0） | `/project:api` |
| GitHub Issues | タスク・進捗管理 | 随時更新 |

### reports/COMPETITIVE_ANALYSIS.md（競合調査レポート）
- 調査対象（競合サービス一覧）
- 機能比較表
- 各競合の強み・弱み
- 差別化ポイント
- 参考にすべき点

### reports/WORK_LOG.md（作業履歴）
- 各フェーズで実施した作業の記録
- 成果物へのリンク
- 対応した Issue 番号
- 変更ファイル一覧

### docs/PRD.md（要件定義書）
- プロジェクト概要・背景
- ターゲットユーザー
- 機能一覧（MVP / 将来）
- 非機能要件

### docs/DESIGN.md（設計書）
- 技術スタック
- ディレクトリ構成
- 状態管理方針
- 主要コンポーネント設計

### docs/SCREEN.md（画面設計）
- 画面一覧
- 画面遷移図
- 各画面のワイヤーフレーム・要素

### docs/COMPONENT.md（コンポーネント設計）
- コンポーネント一覧
- コンポーネント階層図（Mermaid）
- 主要コンポーネント詳細（Props, 用途）

### docs/ERD.md（ER図）
- テーブル一覧
- ER図（Mermaid）
- テーブル詳細（カラム定義）

### docs/openapi.yaml（API設計）
- OpenAPI 3.0 形式
- エンドポイント定義
- リクエスト / レスポンススキーマ
- Swagger UI で確認可能

### GitHub Issues（タスク・進捗管理）
- タスクの作成・管理
- 進捗の記録
- ラベルで分類
  - 初回: feature
  - 開発中に追加: bug / refactor / docs

## Prerequisites

このテンプレートを使用するには以下が必要です：

| 項目 | 必須 | 説明 |
|------|------|------|
| Node.js 24.x | ✅ | JavaScript ランタイム |
| Claude Code | ✅ | AI コーディングアシスタント |
| GitHub MCP | ✅ | Issue 管理に必要 |
| Vercel MCP | ✅ | デプロイに必要 |

### セットアップ手順

1. **Node.js** をインストール（v24推奨）
   ```bash
   node -v  # v24.x.x を確認
   ```

2. **Claude Code** をインストール
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. **GitHub MCP** を設定
   👉 [GitHub MCP 設定ガイド](./docs/SETUP_GITHUB_MCP.md)

4. **Vercel MCP** を設定
   👉 [Vercel MCP 設定ガイド](./docs/SETUP_VERCEL_MCP.md)

## License

MIT

<p align="center">
  <img src="assets/images/logo.png" alt="VisionFocus" width="400">
</p>

# VisionFocus

## About

**「理想を現実にする」** ためのChrome拡張機能。

単なるサイトブロッカーではなく、「現状の可視化（分析）」「誘惑の遮断（ブロック）」「目標の再認識（モチベーション）」の3段階で、ユーザーの生産性を最大化するセルフコントロール・システム。

## 背景・課題

- 既存のブロッカーは「禁止」するだけで動機付けが弱い
- 最新ツールはAI多用により動作が重く、かつ高価（$3〜$10/月）
- 「なぜブロックされているのか」を思い出させる仕組みがない

VisionFocusは、非AIによる爆速な動作と月額$1.99という競合最安クラスの低価格、そして「なぜ今それをしてはいけないのか」を視覚的に訴えかけるビジョン・ダッシュボードにより、ユーザーを強力に目標へ引き戻します。

## Tech Stack

| カテゴリ           | 技術              |
| ------------------ | ----------------- |
| 拡張機能仕様       | Manifest V3       |
| フレームワーク     | Plasmo            |
| 言語               | TypeScript        |
| UIライブラリ       | React             |
| スタイリング       | Tailwind CSS      |
| Linter / Formatter | ESLint / Prettier |
| パッケージ管理     | pnpm              |
| 配布               | Chrome Web Store  |

## What's Included

ディレクトリ構成の詳細は [DESIGN.md](./docs/DESIGN.md) を参照。

## Getting Started

1. このテンプレートから新規リポジトリを作成
2. clone して Claude Code で開く
3. `docs/INPUT.md` に作りたいものを記載
4. `/project:requirements` で要件定義
5. `/project:design` で設計
6. `/project:prototype` でプロトタイプ実装・デザイン確認
7. `/project:test-design` でE2Eテスト設計
8. `/project:implement` で本実装
9. `/project:deploy` でデプロイ

## Workflow

👉 [開発フロー図](./docs/DEVELOPMENT_FLOW.md)

| #   | フェーズ     | コマンド                | 成果物                                       |
| --- | ------------ | ----------------------- | -------------------------------------------- |
| 1   | 要件定義     | `/project:requirements` | docs/PRD.md, reports/COMPETITIVE_ANALYSIS.md |
| 2   | 設計         | `/project:design`       | docs/DESIGN.md, SCREEN.md, GitHub Issues     |
| 3   | API設計      | `/project:api`          | docs/openapi.yaml                            |
| 4   | プロトタイプ | `/project:prototype`    | src/components/, Storybook, TOP画面          |
| 5   | 本実装       | `/project:implement`    | src/, Issue更新                              |
| 6   | 繰り返し     | `/project:continue`     | -                                            |
| 7   | デプロイ     | `/project:deploy`       | 本番環境                                     |
| 8   | 改善         | `/project:improvements` | docs/IMPROVEMENTS.md, GitHub Issues          |

## Commands

Claude Code で以下のスラッシュコマンドが使用可能です：

| コマンド                         | 説明                               | 成果物                                                                |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `/project:requirements`          | 要件定義を行う                     | docs/PRD.md, reports/COMPETITIVE_ANALYSIS.md                          |
| `/project:design`                | 設計を行う                         | docs/DESIGN.md, SCREEN.md, COMPONENT.md, DATA_MODEL.md, GitHub Issues |
| `/project:api`                   | API設計を行う                      | docs/openapi.yaml                                                     |
| `/project:prototype`             | プロトタイプ実装（デザイン確認用） | src/components/, Storybook, TOP画面                                   |
| `/project:implement <Issue番号>` | 本実装を行う（複数指定で並行開発） | src/, PR                                                              |
| `/project:continue`              | 進捗確認・作業再開                 | -                                                                     |
| `/project:review`                | コードレビューと修正               | -                                                                     |
| `/project:deploy`                | デプロイを行う                     | 本番環境, Analytics設定                                               |
| `/project:improvements`          | 改善リスト作成・Issue一括登録      | docs/IMPROVEMENTS.md, GitHub Issues                                   |

## npm Scripts

環境構築後（`/project:setup` 実行後）に使用可能：

| コマンド        | 説明                                |
| --------------- | ----------------------------------- |
| `pnpm dev`      | 開発サーバー起動（HMR対応）         |
| `pnpm build`    | 本番ビルド（build/chrome-mv3-prod） |
| `pnpm package`  | Chrome Web Store用zipファイル作成   |
| `pnpm lint`     | ESLint 実行                         |
| `pnpm format`   | Prettier でフォーマット             |
| `pnpm test`     | Vitest で単体テスト                 |
| `pnpm test:e2e` | Playwright で E2E テスト            |

## Documentation

| ファイル                        | 内容                 | 作成タイミング          |
| ------------------------------- | -------------------- | ----------------------- |
| docs/INPUT.md                   | 要件ヒアリングシート | 最初に記載              |
| docs/PRD.md                     | 要件定義書           | `/project:requirements` |
| docs/DESIGN.md                  | 設計書               | `/project:design`       |
| docs/SCREEN.md                  | 画面設計             | `/project:design`       |
| docs/COMPONENT.md               | コンポーネント設計   | `/project:design`       |
| docs/DESIGN_CONCEPT.md          | デザインコンセプト   | `/project:prototype`    |
| docs/TEST_CASES.md              | E2Eテストケース      | `/project:test-design`  |
| docs/ANALYTICS.md               | GA4計測ドキュメント  | 随時更新                |
| reports/COMPETITIVE_ANALYSIS.md | 競合調査レポート     | `/project:requirements` |
| GitHub Issues                   | タスク・進捗管理     | 随時更新                |

### reports/COMPETITIVE_ANALYSIS.md（競合調査レポート）

- 調査対象（競合サービス一覧）
- 機能比較表
- 各競合の強み・弱み
- 差別化ポイント
- 参考にすべき点

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

### docs/DESIGN_CONCEPT.md（デザインコンセプト）

- カラーパレット
- タイポグラフィ
- コンポーネントスタイル
- 必要な画像一覧

### docs/TEST_CASES.md（E2Eテストケース）

- テストケース一覧
- 優先度（P0/P1/P2）
- テストシナリオ詳細

### GitHub Issues（タスク・進捗管理）

- タスクの作成・管理
- 進捗の記録
- ラベルで分類
  - 初回: feature
  - 開発中に追加: bug / refactor / docs

## Prerequisites

このプロジェクトを開発するには以下が必要です：

| 項目         | 必須 | 説明                                 |
| ------------ | ---- | ------------------------------------ |
| Node.js 24.x | ✅   | JavaScript ランタイム                |
| pnpm         | ✅   | パッケージマネージャー（Plasmo推奨） |
| Claude Code  | ✅   | AI コーディングアシスタント          |
| GitHub MCP   | ✅   | Issue 管理に必要                     |
| Chrome       | ✅   | 開発・テスト用ブラウザ               |

### セットアップ手順

1. **Node.js** をインストール（v24推奨）

   ```bash
   node -v  # v24.x.x を確認
   ```

2. **pnpm** をインストール

   ```bash
   npm install -g pnpm
   ```

3. **Claude Code** をインストール

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

4. **GitHub MCP** を設定
   👉 [GitHub MCP 設定ガイド](./docs/SETUP_GITHUB_MCP.md)

### Chrome拡張の開発モード

1. `pnpm dev` で開発サーバーを起動
2. Chrome で `chrome://extensions` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `build/chrome-mv3-dev` フォルダを選択

## License

MIT

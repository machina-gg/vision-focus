<p align="center">
  <img src="src/assets/images/logo.png" alt="VisionFocus" width="400">
</p>

# VisionFocus

## About

**「やるべきことに時間を使う」** ためのChrome拡張機能。

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
| フレームワーク     | WXT               |
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
4. Issue → worktree → PR → レビュー → マージの流れと委譲手順は machina-gg/trillion-game の `.claude/skills/delegate-task/SKILL.md` が SSOT

## npm Scripts

`pnpm install` 後に使用可能：

| コマンド               | 説明                                         |
| ---------------------- | -------------------------------------------- |
| `pnpm dev`             | 開発サーバー起動（HMR対応）                  |
| `pnpm build`           | 本番ビルド（.output/chrome-mv3）             |
| `pnpm package`         | Chrome Web Store 用 zip を作成（`.output/`） |
| `pnpm lint`            | ESLint 実行                                  |
| `pnpm format`          | Prettier でフォーマット                      |
| `pnpm test`            | Vitest で単体テスト                          |
| `pnpm test:coverage`   | カバレッジ計測（閾値チェック付き）           |
| `pnpm test:e2e`        | Playwright で E2E テスト（ヘッドレス）       |
| `pnpm test:e2e:headed` | E2E をブラウザ表示付きで実行（デバッグ用）   |

**コンポーネントテスト:**

React コンポーネントの単体テストは、何を検査し何を検査しないかを
[docs/COMPONENT_TESTING.md](./docs/COMPONENT_TESTING.md) に定める（置き場所・スナップショットを取らない理由を含む）。

**カバレッジ:**

```bash
pnpm test:coverage
```

- 集計対象は `src/**` の `.ts` / `.tsx`（story・テストコード・型定義のみのファイル・WXT のエントリポイントは除外）
- 閾値を下回ると失敗する。CI の `coverage` ジョブでも同じチェックが走る
- 詳細な HTML レポートは `coverage/index.html` に出力される
- 閾値（`vitest.config.ts`）は退行防止のための下限値。テストを増やした PR では引き上げず、引き上げは別途判断する（[docs/COMPONENT_TESTING.md](./docs/COMPONENT_TESTING.md)「カバレッジ」）

**E2E テストの前提条件:**

```bash
# 初回のみ: Playwright Chromium ブラウザをインストール
pnpm exec playwright install chromium

# ビルドしてからテスト実行
pnpm build
pnpm test:e2e
```

- **ヘッドレスで動く**。拡張機能は新ヘッドレス（`channel: 'chromium'`）でロードできるため、実行中に画面が出てフォーカスを奪われることはない
- 描画を見て調べたいときは `pnpm test:e2e:headed`
- 外部サイトへはアクセスしない。`example.com` / `youtube.com` はローカルの HTTPS サーバで再現している（`tests/e2e/fixtures/testServer.ts`）
- ナイトリー（03:00 JST）で自動実行される。PR ごとには実行しない

## Documentation

| ファイル                        | 内容                     |
| ------------------------------- | ------------------------ |
| docs/INPUT.md                   | 要件ヒアリングシート     |
| docs/PRD.md                     | 要件定義書               |
| docs/DESIGN.md                  | 設計書                   |
| docs/SCREEN.md                  | 画面設計                 |
| docs/COMPONENT.md               | コンポーネント設計       |
| docs/DESIGN_CONCEPT.md          | デザインコンセプト       |
| docs/TEST_CASES.md              | E2Eテストケース          |
| docs/COMPONENT_TESTING.md       | コンポーネントテスト方針 |
| docs/ANALYTICS.md               | GA4計測ドキュメント      |
| reports/COMPETITIVE_ANALYSIS.md | 競合調査レポート         |
| GitHub Issues                   | タスク・進捗管理         |

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

### docs/COMPONENT_TESTING.md（コンポーネントテスト方針）

- 何を確かめ、何を確かめないか
- テストの置き場所
- 壊したら落ちることの確かめ方

### GitHub Issues（タスク・進捗管理）

- タスクの作成・管理
- 進捗の記録
- ラベルで分類
  - 初回: feature
  - 開発中に追加: bug / refactor / docs

## Prerequisites

このプロジェクトを開発するには以下が必要です：

| 項目         | 必須 | 説明                        |
| ------------ | ---- | --------------------------- |
| Node.js 24.x | ✅   | JavaScript ランタイム       |
| pnpm         | ✅   | パッケージマネージャー      |
| Claude Code  | ✅   | AI コーディングアシスタント |
| GitHub MCP   | ✅   | Issue 管理に必要            |
| Chrome       | ✅   | 開発・テスト用ブラウザ      |

### セットアップ手順

1. **Node.js** をインストール（v24推奨）

   ```bash
   node -v  # v24.x.x を確認
   ```

2. **pnpm** をインストール

   ```bash
   npm install -g pnpm
   ```

   使用する版は `package.json` の `packageManager` が持つ。CI（`pnpm/action-setup`）も
   同じ値を読むため、版の指定元はこの 1 箇所だけである。

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
5. `.output/chrome-mv3-dev` フォルダを選択

`pnpm build` の出力は `.output/chrome-mv3` で、こちらも同じ手順で読み込める。

### 環境変数

GA4 の計測を使う場合のみ設定する（未設定でもビルド・動作し、計測イベントの送信だけがスキップされる）。

1. `.env.example` をコピーして `.env` を作る
2. `WXT_GA_MEASUREMENT_ID` / `WXT_GA_API_SECRET` に値を入れる

- WXT がビルド時に埋め込むのは `WXT_` / `VITE_` で始まる変数だけ。コードからは `import.meta.env.WXT_GA_MEASUREMENT_ID` のように参照する（`src/lib/analytics.ts`）
- 計測内容は [ANALYTICS.md](./docs/ANALYTICS.md) を参照

## License

MIT

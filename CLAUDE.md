# CLAUDE.md

このファイルは Claude Code への指示書です。
プロジェクトで作業する際は、必ずこのファイルに従ってください。

---

## 1. 禁止事項（最重要）

以下は厳守してください：

- `any` 型の使用
- `console.log` の本番コード残留
- 未使用のインポート・変数
- `.then` チェーン（async/await を使う）
- クラスコンポーネント
- インラインスタイル（Tailwind を使う）
- default export（フレームワークのエントリファイル以外）
  - Next.js の場合: `app/` 配下のページコンポーネント
  - Plasmo の場合: `newtab.tsx`, `popup.tsx`, `options.tsx`, `background/index.ts`, `contents/*.ts`
- PRD.md の無断変更（確認必須）
- テストなしでの複雑なロジック実装
- Git コマンドの `&&` 連結（権限パターンがマッチしなくなるため、個別に実行すること）
- `#` を含むブランチ名を引用符なしで使用（シェルがコメントと解釈するため、必ず引用符で囲むこと）
  - ❌ `git checkout feature/#17`
  - ✅ `git checkout "feature/#17"`
- 複数行コミットメッセージを `-m` オプションで直接指定（権限パターンがマッチしなくなるため、`-F` オプションでファイルから読み込むこと）
  - ❌ `git commit -m "$(cat <<'EOF' ... EOF)"`
  - ✅ `git commit -F .claude/tmp/commit-msg.txt`

---

## 2. プロジェクト概要

作業開始時に以下を確認：

| ファイル          | 存在する場合 | 存在しない場合                 |
| ----------------- | ------------ | ------------------------------ |
| docs/PRD.md       | 内容を把握   | `/project:requirements` を促す |
| docs/DESIGN.md    | 内容を把握   | `/project:design` を促す       |
| docs/openapi.yaml | 内容を把握   | 必要に応じて作成               |
| src/              | 実装を継続   | 初回実装時に環境構築           |

---

## 3. コマンド一覧

以下のスラッシュコマンドが使用可能です：

| コマンド                         | 説明                                       |
| -------------------------------- | ------------------------------------------ |
| `/project:requirements`          | 要件定義を行う                             |
| `/project:design`                | 設計を行う                                 |
| `/project:api`                   | API設計を行う                              |
| `/project:setup`                 | 環境構築を行う                             |
| `/project:prototype`             | プロトタイプ実装（デザインコンセプト確定） |
| `/project:test-design`           | E2Eテスト設計を行う                        |
| `/project:implement <Issue番号>` | 本実装を行う（複数指定で並行開発）         |
| `/project:status`                | 現在の状況を確認                           |
| `/project:review`                | コードレビューと修正                       |
| `/project:deploy`                | デプロイを行う                             |
| `/project:cleanup`               | マージ済みブランチと worktree をクリーンアップ |
| `/project:update`                | vibe-coding-utils を最新化                 |

詳細は `.claude/commands/` 配下の各ファイルを参照。

---

## 4. 命名規則

| 対象           | 規則             | 例               |
| -------------- | ---------------- | ---------------- |
| コンポーネント | PascalCase       | `Button.tsx`     |
| フック         | camelCase + use  | `useSettings.ts` |
| ユーティリティ | camelCase        | `formatDate.ts`  |
| 型定義         | PascalCase       | `Settings.ts`    |
| 定数           | UPPER_SNAKE_CASE | `API_BASE_URL`   |

---

## 5. コーディング規約

### 基本ルール

- 関数コンポーネントを使用（クラスコンポーネント禁止）
- `any` 型は禁止、必ず型を定義する
- コンポーネントは1ファイル1コンポーネント
- named export を基本（default export はフレームワークのエントリファイルのみ）

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

## 6. ドキュメントテンプレート

テンプレートは `.claude/vibe-coding-utils/templates/` に配置されています。

| テンプレート                                                                             | 用途               |
| ---------------------------------------------------------------------------------------- | ------------------ |
| [COMPETITIVE_ANALYSIS.md](./.claude/vibe-coding-utils/templates/COMPETITIVE_ANALYSIS.md) | 競合調査レポート   |
| [PRD.md](./.claude/vibe-coding-utils/templates/PRD.md)                                   | 要件定義書         |
| [DESIGN.md](./.claude/vibe-coding-utils/templates/DESIGN.md)                             | 設計書             |
| [SCREEN.md](./.claude/vibe-coding-utils/templates/SCREEN.md)                             | 画面設計           |
| [COMPONENT.md](./.claude/vibe-coding-utils/templates/COMPONENT.md)                       | コンポーネント設計 |
| [DATA_MODEL.md](./.claude/vibe-coding-utils/templates/DATA_MODEL.md)                     | データモデル       |
| [TEST_CASES.md](./.claude/vibe-coding-utils/templates/TEST_CASES.md)                     | E2Eテストケース    |
| [DESIGN_CONCEPT.md](./.claude/vibe-coding-utils/templates/DESIGN_CONCEPT.md)             | デザインコンセプト |
| [openapi.yaml](./.claude/vibe-coding-utils/templates/openapi.yaml)                       | API定義            |

---

## 7. SSOT（Single Source of Truth）

各情報の正式な管理場所：

| 情報             | SSOT               | 備考                |
| ---------------- | ------------------ | ------------------- |
| 機能要件・制約   | docs/PRD.md        | 他では参照リンク    |
| 技術スタック     | docs/DESIGN.md     | README.mdは簡易版   |
| ディレクトリ構成 | docs/DESIGN.md     | -                   |
| データモデル     | docs/DATA_MODEL.md | バリデーション含む  |
| コンポーネント   | docs/COMPONENT.md  | -                   |
| 画面設計         | docs/SCREEN.md     | -                   |
| 実装状況         | GitHub Issues      | PRDにはチェック不要 |


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

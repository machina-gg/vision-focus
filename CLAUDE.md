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
- default export（app/ 配下以外）
- PRD.md の無断変更（確認必須）
- テストなしでの複雑なロジック実装
- Git コマンドの `&&` 連結（権限パターンがマッチしなくなるため、個別に実行すること）
- `#` を含むブランチ名を引用符なしで使用（シェルがコメントと解釈するため、必ず引用符で囲むこと）
  - ❌ `git checkout feature/#17`
  - ✅ `git checkout "feature/#17"`

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

## 3. 技術スタック

### 必須

| カテゴリ           | 技術                           |
| ------------------ | ------------------------------ |
| フレームワーク     | Next.js (App Router) 16.x      |
| 言語               | TypeScript 5.x                 |
| スタイリング       | Tailwind CSS 4.x               |
| バリデーション     | Zod                            |
| Linter / Formatter | ESLint / Prettier              |
| パッケージ管理     | npm                            |
| Node.js            | 24.x                           |
| 単体テスト         | Vitest + React Testing Library |
| E2Eテスト          | Playwright                     |
| コンポーネント管理 | Storybook                      |

### プロジェクトに応じて追加

| カテゴリ         | 選択肢                                                      |
| ---------------- | ----------------------------------------------------------- |
| データストレージ | Supabase（ローカル: Supabase Local / 本番: Supabase Cloud） |
| UIコンポーネント | shadcn/ui                                                   |
| アイコン         | Lucide                                                      |
| フォーム         | React Hook Form                                             |
| データフェッチ   | SWR / TanStack Query                                        |

---

## 4. コマンド一覧

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
| `/project:continue`              | 進捗確認・作業再開                         |
| `/project:review`                | コードレビューと修正                       |
| `/project:deploy`                | デプロイを行う                             |
| `/project:improvements`          | 改善リスト作成・Issue一括登録              |

詳細は `.claude/commands/` 配下の各ファイルを参照。

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

| 対象           | 規則             | 例               |
| -------------- | ---------------- | ---------------- |
| コンポーネント | PascalCase       | `Button.tsx`     |
| フック         | camelCase + use  | `useSettings.ts` |
| ユーティリティ | camelCase        | `formatDate.ts`  |
| 型定義         | PascalCase       | `Settings.ts`    |
| 定数           | UPPER_SNAKE_CASE | `API_BASE_URL`   |

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

## 8. ドキュメントテンプレート

テンプレートは `.claude/templates/` に配置されています。

| テンプレート                                                           | 用途               |
| ---------------------------------------------------------------------- | ------------------ |
| [COMPETITIVE_ANALYSIS.md](./.claude/templates/COMPETITIVE_ANALYSIS.md) | 競合調査レポート   |
| [PRD.md](./.claude/templates/PRD.md)                                   | 要件定義書         |
| [DESIGN.md](./.claude/templates/DESIGN.md)                             | 設計書             |
| [SCREEN.md](./.claude/templates/SCREEN.md)                             | 画面設計           |
| [COMPONENT.md](./.claude/templates/COMPONENT.md)                       | コンポーネント設計 |
| [DATA_MODEL.md](./.claude/templates/DATA_MODEL.md)                     | データモデル       |
| [TEST_CASES.md](./.claude/templates/TEST_CASES.md)                     | E2Eテストケース    |
| [DESIGN_CONCEPT.md](./.claude/templates/DESIGN_CONCEPT.md)             | デザインコンセプト |
| [IMPROVEMENTS.md](./.claude/templates/IMPROVEMENTS.md)                 | 改善リスト         |
| [openapi.yaml](./.claude/templates/openapi.yaml)                       | API定義            |

---

## 9. SSOT（Single Source of Truth）

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

## 10. 参照ドキュメント

- [README](./README.md)
- [開発フロー](./.claude/docs/DEVELOPMENT_FLOW.md)
- [GitHub MCP 設定](./.claude/docs/SETUP_GITHUB_MCP.md)
- [Vercel MCP 設定](./.claude/docs/SETUP_VERCEL_MCP.md)
- [権限設定](./.claude/docs/SETUP_PERMISSIONS.md)

### 環境構築手順（/project:setup 時に参照）

- [Next.js セットアップ](./.claude/docs/SETUP_NEXTJS.md)
- [Supabase セットアップ](./.claude/docs/SETUP_SUPABASE.md)

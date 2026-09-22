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
  - WXT の場合: `src/entrypoints/` 配下のエントリ（`background.ts`, `*.content.ts`, 各画面の `main.tsx`）
- PRD.md の無断変更（確認必須）
- テストなしでの複雑なロジック実装
- commit / push は HQ の git ラッパー経由で行い、素の `git add` / `git commit` / `git push` を書かない

---

## 2. プロジェクト概要

作業開始時に以下を確認：

| ファイル          | 存在する場合 | 存在しない場合               |
| ----------------- | ------------ | ---------------------------- |
| docs/PRD.md       | 内容を把握   | HQ の product 系スキルで作る |
| docs/DESIGN.md    | 内容を把握   | HQ の product 系スキルで作る |
| docs/openapi.yaml | 内容を把握   | 必要に応じて作成             |
| src/              | 実装を継続   | 初回実装時に環境構築         |

Issue → worktree → PR → レビュー → マージの流れと委譲手順は machina-gg/trillion-game の `.claude/skills/delegate-task/SKILL.md` が SSOT。

---

## 3. 命名規則

| 対象           | 規則             | 例               |
| -------------- | ---------------- | ---------------- |
| コンポーネント | PascalCase       | `Button.tsx`     |
| フック         | camelCase + use  | `useSettings.ts` |
| ユーティリティ | camelCase        | `formatDate.ts`  |
| 型定義         | PascalCase       | `Settings.ts`    |
| 定数           | UPPER_SNAKE_CASE | `API_BASE_URL`   |

---

## 4. コーディング規約

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

## 5. SSOT（Single Source of Truth）

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

## 6. 技術スタック

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

| フレームワーク | パッケージ管理 | 用途       |
| -------------- | -------------- | ---------- |
| WXT            | pnpm           | Chrome拡張 |

### プロジェクトに応じて追加

| カテゴリ         | 選択肢                        |
| ---------------- | ----------------------------- |
| データストレージ | Chrome Storage API / Supabase |
| UIコンポーネント | shadcn/ui                     |
| アイコン         | Lucide                        |
| フォーム         | React Hook Form               |
| データフェッチ   | SWR / TanStack Query          |

---

## 7. ディレクトリ構成

### WXT（Chrome拡張）プロジェクト

```
├── src/
│   ├── entrypoints/        # WXT のエントリ（探索起点は wxt.config.ts の srcDir: 'src'）
│   │   ├── newtab/         # 新しいタブページ（index.html + main.tsx + App.tsx）
│   │   ├── popup/          # ポップアップ
│   │   ├── options/        # オプションページ
│   │   ├── background.ts   # Service Worker（defineBackground）
│   │   └── *.content.ts    # コンテンツスクリプト（defineContentScript）
│   ├── background/         # Service Worker の実装（init / handlers / listeners）
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── lib/                # ユーティリティ関数
│   ├── types/              # 型定義
│   ├── constants/          # 定数
│   ├── stories/            # 画面単位の Storybook のストーリー（コンポーネント単位は各コンポーネントと同居）
│   ├── styles/             # グローバルCSS
│   └── assets/             # バンドルに含める画像（`?inline` で import）
├── public/                 # 出力へそのままコピーされる静的ファイル（_locales / icon / 背景画像）
├── scripts/                # ビルド・ユーティリティスクリプト
├── .storybook/             # Storybook 設定
├── docs/                   # ドキュメント
└── wxt.config.ts           # WXT のビルド設定（manifest を含む）
```

### コロケーションルール

- コンポーネント、テスト、stories は同じディレクトリに配置
- `ComponentName/` フォルダでグループ化

---

## 8. 参照ドキュメント

- [README](./README.md)

### 環境構築手順

- [WXT 公式ドキュメント](https://wxt.dev/)（ビルド設定は `wxt.config.ts`）

---
description: 実装を行う
---

以下の手順で本実装を行ってください：

## 引数

- Issue番号（必須）: 単一または複数指定可能
  - 単一: `30`
  - 複数: `30,31,32` または `30 31 32`
- **Issue番号が指定されていない場合は実行しない。以下を案内：**
  「Issue番号を指定してください。例: `/project:implement 30`
  Open な Issue 一覧は GitHub Issues で確認できます。」

## 前提条件の確認

1. プロトタイプ確認
   - `/project:prototype` が完了していること
   - デザインがユーザーに承認されていること
   - 未完了の場合は先に `/project:prototype` を実行

2. テスト設計確認
   - `/project:test-design` が完了していること
   - docs/TEST_CASES.md が存在すること
   - 未完了の場合は先に `/project:test-design` を実行

3. src/ が存在しない場合 → CLAUDE.md の「環境構築手順」を実行

## 実装フロー

以下のフローを Issue ごとに実行する。複数 Issue の場合は Task ツールで並列実行する。

### 1. worktree で作業ディレクトリを作成

```bash
git fetch origin
git worktree add ../プロジェクト名-XX -b feature/#XX origin/develop
```

### 2. 依存パッケージのインストール

package.json が存在する場合：

```bash
cd ../プロジェクト名-XX
npm install
```

### 3. GitHub Issue の内容を確認

- 指定された Issue 番号の内容を取得・確認する

### 4. コード実装

- CLAUDE.md のコーディング規約に従う
- ディレクトリ構成・命名規則を守る
- プロトタイプで作成したコンポーネントを活用

### 5. UIコンポーネントの場合

- Storybook に stories を追加

### 6. E2Eテスト実装

- docs/TEST_CASES.md を参照
- 実装した機能に対応するテストケースを実装
- テストファイルは `e2e/` ディレクトリに作成
- TEST_CASES.md のステータスを「実装済」に更新

### 7. lint / format / テスト実行

```bash
npm run format
npm run lint
npm run test
npm run test:e2e
```

### 8. ドキュメント更新（該当する場合）

- データモデル変更 → docs/DATA_MODEL.md を更新
- 新規コンポーネント追加 → docs/COMPONENT.md を更新
- 画面追加・変更 → docs/SCREEN.md を更新

### 9. コミット・プッシュ・PR作成

- コミットメッセージに `Closes #XX` を含める
- 例: `Prettier設定を変更 Closes #34`
- PR を作成する（PRマージ時にIssueが自動クローズされる）

### 10. GHA CI 結果を確認

```bash
gh pr checks <PR番号> --watch
```

- **成功**: 次のステップへ
- **失敗**: エラー内容を確認し、修正してプッシュ → 再度CIを待つ

### 11. worktree を削除

```bash
cd ../プロジェクト名
git worktree remove ../プロジェクト名-XX
```

## コミットメッセージ規則

- `Closes #XX` をメッセージに含める（PRマージ時にIssue自動クローズ）
- 1コミット1Issueを基本とする

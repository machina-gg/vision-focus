---
description: 実装を行う
---

以下の手順で本実装を行ってください：

## 引数

- Issue番号（必須）: 単一または複数指定可能
  - 単一: `30`
  - 複数: `30,31,32` または `30 31 32`

## 実装フロー

### 単一Issue の場合

1. develop から feature/#XX ブランチを作成
2. 実装
3. コミット（メッセージに `Closes #XX` を含める）
4. プッシュ・PR作成

### 複数Issue の場合（並行開発）

1. git worktree で各Issue用の作業ディレクトリを作成
   ```bash
   git fetch origin
   git worktree add ../プロジェクト名-XX -b feature/#XX origin/develop
   ```
2. Task ツールで各worktreeに対して並列で実装を実行
3. 各worktreeでコミット・プッシュ・PR作成
4. 完了後、worktree を削除
   ```bash
   git worktree remove ../プロジェクト名-XX
   ```

### コミットメッセージ規則

- `Closes #XX` をメッセージに含める（PRマージ時にIssue自動クローズ）
- 1コミット1Issueを基本とする

## 注意事項

- 並行開発時、各worktreeで `pnpm install` が必要
- worktree作成前に `git fetch origin` で最新化すること

---

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

## 実装手順

4. GitHub Issue を確認してタスク取得
   - Open な Issue から優先度の高いものを選択
   - 該当 Issue がなければユーザーに確認

5. コード実装
   - CLAUDE.md のコーディング規約に従う
   - ディレクトリ構成・命名規則を守る
   - プロトタイプで作成したコンポーネントを活用

6. UIコンポーネントの場合
   - Storybook に stories を追加

7. **E2Eテスト実装**
   - docs/TEST_CASES.md を参照
   - 実装した機能に対応するテストケースを実装
   - テストファイルは `e2e/` ディレクトリに作成
   - テスト実行: `npm run test:e2e`
   - TEST_CASES.md のステータスを「実装済」に更新

8. lint / format 実行
   - npm run format
   - npm run lint

9. テスト実行
   - npm run test（Vitest で単体テスト）
   - npm run test:e2e（Playwright でE2Eテスト）

10. **ドキュメント更新（該当する場合）**
    - データモデル変更 → docs/DATA_MODEL.md を更新
    - 新規コンポーネント追加 → docs/COMPONENT.md を更新
    - 画面追加・変更 → docs/SCREEN.md を更新

11. 実装完了したらコミット・push
    - コミットメッセージに `Closes #XX` を含める
    - 例: `Prettier設定を変更 Closes #34`
    - 既存のPRがあればpushで自動反映
    - PRがなければユーザーに確認（まとめてPR作成することがある）
    - PRマージ時にIssueが自動クローズされる

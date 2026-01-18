---
description: 実装を行う
---

以下の手順で本実装を行ってください：

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

10. 完了したら Issue を更新・クローズ

11. **【必須】reports/WORK_LOG.md に作業履歴を追記**
   - 日付（## YYYY-MM-DD 形式）※同日の場合は日付見出しを再利用
   - フェーズ名（### 実装）
   - 対応した Issue 番号とタイトル
   - 実施内容の概要
   - 主な変更ファイル一覧
   ※ 新しい履歴はファイル上部に追記
   ※ このステップを省略しないこと

---
description: 進捗確認・作業再開
---

以下の手順で状況を把握し、作業を再開してください：

1. docs/ 配下のドキュメントを確認
   - PRD.md
   - DESIGN.md
   - SCREEN.md
   - COMPONENT.md
   - openapi.yaml

2. 実装状況を確認
   - src/ が存在するか
   - src/components/ にUIコンポーネントがあるか
   - Storybook が設定されているか（.storybook/）
   - TOP画面が実装されているか

3. フェーズ判定
   - src/ なし → `/project:prototype` から開始
   - src/ あり、コンポーネントのみ → プロトタイプ確認中
   - src/ あり、機能実装中 → 本実装フェーズ

4. GitHub Issue の状態を確認
   - Open / In Progress / Closed の数
   - 直近の完了タスク
   - ブロッカーがあれば報告

5. 現状をサマリーしてユーザーに報告
   - プロジェクトの概要
   - 現在のフェーズ（プロトタイプ / 本実装）
   - 完了している作業
   - 残っているタスク

6. 次のタスクを提案し、作業を始めるか確認する

## 作業履歴について
- このコマンドは状況確認のみのため、**作業履歴の記録は不要**
- 実際の実装作業は `/project:implement` で行い、その際に履歴を記録する

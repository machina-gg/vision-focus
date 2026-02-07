---
description: 現在の状況を確認する
---

以下の手順で現在の状況を確認し、ユーザーに報告してください：

## 1. ドキュメント確認

以下の存在有無を確認：

- docs/INPUT.md
- docs/PRD.md
- docs/DESIGN.md
- docs/SCREEN.md
- docs/COMPONENT.md
- docs/DATA_MODEL.md
- docs/TEST_CASES.md
- docs/openapi.yaml

## 2. 実装状況確認

- src/ が存在するか
- src/components/ にUIコンポーネントがあるか
- Storybook が設定されているか（.storybook/）
- メイン画面が実装されているか

## 3. GitHub Issue の状態確認

- Open / Closed の数
- 直近の完了タスク
- ブロッカーがあれば報告

## 4. フェーズ判定

| 条件                    | フェーズ                                     |
| ----------------------- | -------------------------------------------- |
| docs/PRD.md なし        | 要件定義前（`/project:requirements`）        |
| docs/DESIGN.md なし     | 設計前（`/project:design`）                  |
| src/ なし               | 環境構築前（`/project:setup`）               |
| コンポーネントのみ      | プロトタイプ中（`/project:prototype`）       |
| docs/TEST_CASES.md なし | テスト設計前（`/project:test-design`）       |
| Open Issue あり         | 本実装中（`/project:implement <Issue番号>`） |
| 全 Issue Closed         | デプロイ可能（`/project:deploy`）            |

## 5. サマリー報告

以下をユーザーに報告：

- 現在のフェーズ
- 完了している作業
- 残っているタスク
- 推奨する次のコマンド

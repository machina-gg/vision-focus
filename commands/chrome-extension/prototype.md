---
description: プロトタイプ実装（デザインコンセプト確定）
---

デザインコンセプトを確定させるため、以下の手順でプロトタイプを実装してください：

## 前提条件

- docs/PRD.md が存在すること
- docs/DESIGN.md（SCREEN.md, COMPONENT.md 含む）が存在すること
- src/ が存在すること（なければ `/project:setup` を先に実行）

## 実装手順

1. 共通UIコンポーネントの実装
   - COMPONENT.md を参照し、共通コンポーネントを実装
   - 各コンポーネントに `.stories.tsx` を作成
   - 例: Button, Card, Input, Header など

2. Storybook で確認
   - `pnpm storybook` で起動
   - 各コンポーネントの見た目を確認

3. メイン画面のみ実装
   - SCREEN.md の Popup または NewTab 画面仕様に従って実装
   - 作成したコンポーネントを組み合わせる
   - ダミーデータで表示確認

4. Chrome拡張として確認
   - `pnpm dev` でビルド
   - Chrome の拡張機能管理画面（`chrome://extensions`）で読み込み
   - 拡張機能の動作を確認

5. docs/DESIGN_CONCEPT.md を作成
   - CLAUDE.md の「DESIGN_CONCEPT.md テンプレート」を使用
   - 実装したデザインを元にコンセプトを言語化
   - カラーパレット、タイポグラフィを整理
   - **必要な画像一覧を定義**:
     - PRD.md と SCREEN.md を参照し、このプロジェクトに必要な画像を洗い出す
     - テンプレートの画像リストは例なので、プロジェクトに応じて追加・削除する
     - 各画像に配置先パス（例: `assets/icons/logo.png`）を必ず定義する
     - 各画像に AI 生成用のプロンプトを記載

6. ユーザーにデザイン確認を依頼
   - Storybook URL と Chrome拡張の確認方法を案内
   - DESIGN_CONCEPT.md の内容を確認
   - 修正点があれば対応

## 完了条件

- 共通UIコンポーネントが Storybook で確認できる
- メイン画面のデザインがユーザーに承認される
- docs/DESIGN_CONCEPT.md が作成されている

## 次のステップ

デザインが確定したら `/project:test-design` でテスト設計を行う

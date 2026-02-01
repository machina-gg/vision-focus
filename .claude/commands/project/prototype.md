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
   - COMPONENT.md を参照し、ui/ 配下の汎用コンポーネントを実装
   - 各コンポーネントに `.stories.tsx` を作成
   - 例: Button, Card, Input, Header, Footer など

2. Storybook で確認
   - `npm run storybook` で起動
   - 各コンポーネントの見た目を確認

3. TOP画面（/）のみ実装
   - SCREEN.md のTOP画面仕様に従って実装
   - 作成したコンポーネントを組み合わせる
   - ダミーデータで表示確認

4. 開発サーバーで確認
   - `npm run dev` で起動
   - ブラウザで http://localhost:3000 を確認

5. docs/DESIGN_CONCEPT.md を作成
   - CLAUDE.md の「DESIGN_CONCEPT.md テンプレート」を使用
   - 実装したデザインを元にコンセプトを言語化
   - カラーパレット、タイポグラフィを整理
   - **必要な画像一覧を定義**:
     - PRD.md と SCREEN.md を参照し、このプロジェクトに必要な画像を洗い出す
     - テンプレートの画像リストは例なので、プロジェクトに応じて追加・削除する
     - 各画像に配置先パス（例: `/images/hero/main.jpg`）を必ず定義する
     - 各画像に AI 生成用のプロンプトを記載

6. ユーザーにデザイン確認を依頼
   - Storybook URL と開発サーバー URL を案内
   - DESIGN_CONCEPT.md の内容を確認
   - 修正点があれば対応

## 完了条件
- 共通UIコンポーネントが Storybook で確認できる
- TOP画面のデザインがユーザーに承認される
- docs/DESIGN_CONCEPT.md が作成されている

## 次のステップ
デザインが確定したら `/project:implement` で本実装を開始

---
description: 環境構築を行う
---

開発環境を構築するため、以下の手順を実行してください：

## 前提条件

- docs/PRD.md が存在すること
- docs/DESIGN.md が存在すること

## 実行条件

- src/ ディレクトリが存在しない場合のみ実行
- 既に src/ が存在する場合は「環境構築済みです」と案内し、`/project:prototype` を促す

## 実装手順

### 1. Plasmo 環境構築

.claude/vibe-coding-utils/docs/chrome-extension/SETUP_PLASMO.md を読み、手順に従って環境を構築：

- Plasmo プロジェクト作成（一時ディレクトリ経由）
- 追加パッケージのインストール
- 設定ファイル作成
- pnpm scripts 追加
- GitHub Actions 追加

### 2. 動作確認

- `pnpm dev` で開発ビルド起動確認
- Chrome の拡張機能管理画面（`chrome://extensions`）で読み込み確認
- `pnpm storybook` で Storybook 起動確認

## 完了条件

- 開発ビルドが起動できる
- Chrome拡張として読み込みできる
- Storybook が起動できる

## 次のステップ

環境構築が完了したら `/project:prototype` でデザインコンセプトを固める

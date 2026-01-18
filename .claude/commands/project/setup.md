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

1. CLAUDE.md の「環境構築手順」に従って環境を構築
   - Next.js プロジェクト作成（一時ディレクトリ経由）
   - 追加パッケージのインストール
   - 設定ファイル作成
   - npm scripts 追加
   - GitHub Actions 追加
   - Analytics 設定

2. **Supabase Local のセットアップ（データストレージ使用時）**
   - DESIGN.md の「データストレージ」を確認
   - Supabase を使用する場合:
     - Docker Desktop が起動していることを確認
     - CLAUDE.md の「4.7 Supabase Local 設定」に従ってセットアップ
     - `npx supabase start` でローカル環境を起動
     - 環境変数（.env.local）を設定
   - 使用しない場合: スキップ

3. 動作確認
   - `npm run dev` で起動確認
   - `npm run storybook` で Storybook 起動確認
   - Supabase 使用時: `http://127.0.0.1:54323` で Studio が開けることを確認

4. **【必須】reports/WORK_LOG.md に作業履歴を追記**
   - 日付（## YYYY-MM-DD 形式）
   - フェーズ名（### 環境構築）
   - 実施内容（セットアップ完了）
   - インストールしたパッケージ一覧
   ※ 新しい履歴はファイル上部に追記

## 完了条件
- 開発サーバーが起動できる
- Storybook が起動できる
- Supabase 使用時: Supabase Local が起動できる
- 作業履歴が記録されている

## 次のステップ
環境構築が完了したら `/project:prototype` でデザインコンセプトを固める

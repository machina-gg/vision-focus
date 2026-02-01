---
description: デプロイを行う
---

以下の手順でデプロイを行ってください：

1. Vercel MCP の設定確認
   - Vercel MCP が設定されていない場合 → 以下を案内：
     「Vercel MCP が設定されていません。
     .claude/docs/SETUP_VERCEL_MCP.md の手順に従って設定してください。
     設定後、再度 /project:deploy を実行してください」

2. デプロイ前の確認
   - `npm run build` でビルドが成功するか確認
   - エラーがあれば修正を提案

3. **Supabase Cloud の設定（Supabase 使用時）**
   - DESIGN.md の「データストレージ」を確認
   - Supabase を使用している場合:
     - [Supabase](https://supabase.com) でプロジェクトを作成
     - プロジェクトの URL と anon key を取得
     - ローカルのマイグレーションを本番に適用：
       ```bash
       npx supabase link --project-ref <project-id>
       npx supabase db push
       ```
     - 認証プロバイダーの設定（OAuth 使用時）
     - Storage バケットの作成（Storage 使用時）

4. 環境変数の確認
   - `.env.local` または `.env` が存在する場合
     → 本番環境に必要な環境変数をユーザーに確認
   - Supabase 使用時: 本番用の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
   - Vercel CLI で環境変数を設定（`vercel env add`）

5. デプロイ実行
   - Vercel MCP の `deploy_to_vercel` を使用
   - 初回の場合はプロジェクト設定を案内
   - デプロイ URL をユーザーに共有

6. デプロイ後の設定案内
   以下の手動設定が必要な項目をユーザーに案内：

   ### Analytics 有効化（推奨）
   - Vercel ダッシュボード → Project Settings → Analytics → Enable
   - 無料プランでも基本的な分析が可能

   ### カスタムドメイン（任意）
   - Vercel ダッシュボード → Project Settings → Domains
   - ドメインを追加して DNS 設定

   ### その他の設定（必要に応じて）
   - Speed Insights: パフォーマンス計測
   - Web Analytics: 詳細なアクセス解析
   - Firewall: セキュリティ設定

7. 動作確認
   - デプロイ URL にアクセスして動作確認
   - 問題があれば `get_deployment_build_logs` でログを確認

8. README.md を更新
   - デプロイ URL を追記
   - 本番環境の情報を追加

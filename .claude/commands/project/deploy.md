---
description: デプロイを行う
---

以下の手順で Chrome Web Store へのデプロイを行ってください：

1. Chrome Web Store デベロッパーアカウントの確認
   - デベロッパーアカウントが未登録の場合 → 以下を案内：
     「Chrome Web Store デベロッパーアカウントが必要です。
     .claude/vibe-coding-utils/docs/chrome-extension/SETUP_CHROME_WEB_STORE.md の手順に従って設定してください。
     設定後、再度 /project:deploy を実行してください」

2. デプロイ前の確認
   - `pnpm build` でビルドが成功するか確認
   - エラーがあれば修正を提案

3. ビルド・パッケージング
   - `pnpm build` でプロダクションビルド
   - Plasmo が `build/` ディレクトリに拡張機能ファイルを生成
   - `build/chrome-mv3-prod` ディレクトリの内容を確認

4. パッケージ作成
   - `pnpm package` で ZIP ファイルを作成
   - 生成されたZIPファイルのパスをユーザーに共有

5. Chrome Web Store へのアップロード案内
   以下の手順をユーザーに案内：
   - [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
   - 「新しいアイテム」または既存アイテムの更新
   - ZIPファイルをアップロード
   - ストアリスティング情報の入力（説明、スクリーンショット、アイコン）
   - 審査に提出

6. 動作確認
   - Chrome Web Store からインストールして動作確認
   - 問題があれば修正して再アップロード

7. README.md を更新
   - Chrome Web Store のリンクを追記
   - インストール方法を追加

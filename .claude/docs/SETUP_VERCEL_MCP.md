# Vercel MCP 設定ガイド

← [README に戻る](../../README.md#prerequisites)

このテンプレートで Vercel デプロイ連携を使うための設定手順です。

## 1. Vercel アカウント準備

1. [Vercel](https://vercel.com) でアカウントを作成（未作成の場合）
2. GitHub アカウントと連携しておく（推奨）

## 2. Claude Code に Vercel MCP を設定

`~/.claude.json` に以下を追加:

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.vercel.com/sse"
      ]
    }
  }
}
```

## 3. Claude Code を再起動

設定後、Claude Code を再起動します。

## 4. 認証

初回使用時に Vercel への認証が求められます：

1. Claude Code で `/project:deploy` を実行
2. 表示される認証 URL をブラウザで開く
3. Vercel アカウントでログイン
4. 認証を許可

## 5. 確認

AI に「Vercel のプロジェクト一覧を見せて」と伝えて、連携できていれば OK！

## 利用可能な機能

| 機能 | 説明 |
|------|------|
| デプロイ | プロジェクトを Vercel にデプロイ |
| デプロイ履歴 | 過去のデプロイ一覧を確認 |
| ビルドログ | デプロイ失敗時のログ確認 |
| 環境変数 | CLI 経由で環境変数を設定 |

## トラブルシューティング

### 認証エラーが出る場合

- ブラウザで https://vercel.com にログインできるか確認
- Claude Code を完全に再起動したか確認

### デプロイできない場合

- プロジェクトのルートディレクトリで実行しているか確認
- `package.json` が存在するか確認
- ビルドエラーがないか `npm run build` で確認

## 参考リンク

- [Vercel MCP 公式ドキュメント](https://vercel.com/docs/mcp/vercel-mcp)
- [Vercel MCP ツールリファレンス](https://vercel.com/docs/mcp/vercel-mcp/tools)

---

← [README に戻る](../../README.md#prerequisites)

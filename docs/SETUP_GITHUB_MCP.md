# GitHub MCP 設定ガイド

← [README に戻る](../README.md#%EF%B8%8F-事前準備)

このテンプレートで GitHub Issues 連携を使うための設定手順です。

## 1. Personal Access Token の作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 「Generate new token (classic)」をクリック
3. 必要な権限を付与:
   - `repo`（リポジトリへのフルアクセス）
4. トークンをコピーして保存

## 2. Claude Code に MCP を設定

`~/.claude/claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## 3. Claude Code を再起動

設定後、Claude Code を再起動すると GitHub 連携が有効になります。

## 4. 確認

AIに「GitHubのIssue一覧を見せて」と伝えて、連携できていればOK！

## トラブルシューティング

### 連携できない場合

- トークンの権限が `repo` になっているか確認
- JSON の形式が正しいか確認（カンマ忘れなど）
- Claude Code を完全に再起動したか確認

---

← [README に戻る](../README.md#%EF%B8%8F-事前準備)

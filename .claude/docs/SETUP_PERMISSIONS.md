# Claude Code 権限設定

## 概要

コミット・PR・Issue操作時の確認をスキップするための設定。

## 設定方法

`.claude/settings.local.json` に以下を設定：

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git fetch:*)",
      "Bash(git checkout:*)",
      "Bash(git branch:*)",
      "Bash(git worktree:*)",
      "Bash(gh pr create:*)",
      "Bash(gh pr edit:*)",
      "Bash(gh issue create:*)",
      "Bash(gh issue close:*)",
      "Bash(gh issue comment:*)",
      "Bash(gh issue list:*)"
    ]
  }
}
```

## 許可コマンド一覧

### 開発コマンド

| コマンド | 用途 |
|----------|------|
| `pnpm:*` | format, lint, test, build等 |

### Git操作

| コマンド | 用途 |
|----------|------|
| `git commit:*` | コミット |
| `git push:*` | プッシュ |
| `git fetch:*` | リモート最新化 |
| `git checkout:*` | ブランチ切り替え |
| `git branch:*` | ブランチ操作 |
| `git worktree:*` | 並行開発用worktree操作 |

### GitHub CLI

| コマンド | 用途 |
|----------|------|
| `gh pr create:*` | PR作成 |
| `gh pr edit:*` | PR編集 |
| `gh issue create:*` | Issue作成 |
| `gh issue close:*` | Issueクローズ |
| `gh issue comment:*` | Issueコメント |
| `gh issue list:*` | Issue一覧 |

## 補足

- `settings.local.json` はプロジェクトローカルの設定（.gitignoreに含まれている場合あり）
- `settings.json` に書くとリポジトリで共有可能

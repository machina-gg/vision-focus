---
description: マージ済みブランチと worktree をクリーンアップする
---

以下の手順でマージ済みブランチと worktree のクリーンアップを行ってください：

## 1. リモートの最新状態を取得

```bash
git fetch origin --prune
```

## 2. マージ済みブランチの検出

develop にマージ済みの `feature/#*` ブランチを一覧取得する：

```bash
git branch --merged origin/develop --list 'feature/#*'
```

## 3. 対象一覧の表示とユーザー確認

検出結果をユーザーに表示する：

- マージ済みブランチ一覧（削除対象）
- 対応する worktree の有無
- 未マージのブランチがあれば警告として表示（削除しない）

未マージブランチの確認：

```bash
git branch --no-merged origin/develop --list 'feature/#*'
```

**ユーザーの確認を得てから次のステップに進むこと。**

## 4. worktree の削除

マージ済みブランチに対応する worktree が存在する場合、削除する：

```bash
git worktree list
```

対応する worktree があれば：

```bash
git worktree remove ../プロジェクト名-XX
```

## 5. ローカルブランチの削除

マージ済みブランチを削除する：

```bash
git branch -d feature/#XX
```

## 6. 結果の報告

- 削除した worktree の一覧
- 削除したブランチの一覧
- 未マージのため残したブランチの一覧（該当する場合）

---
description: 改善リスト作成・Issue一括登録
---

以下の手順で改善リストを作成し、GitHub Issue に登録してください：

## 1. 改善リストの確認・作成

docs/IMPROVEMENTS.md を確認：

- 存在しない場合 → テンプレートから新規作成
- 存在する場合 → 内容を確認し、ユーザーに追加・編集を確認

### テンプレート

```markdown
# 改善リスト

## 使い方

1. 改善したい内容を下記に追記
2. `/project:improvements` を実行してIssue化
3. Issue化されたら「Issue化済み」セクションに移動

## 改善予定

### UI/UX

- [ ] 改善内容を記載

### パフォーマンス

- [ ] 改善内容を記載

### バグ修正

- [ ] 改善内容を記載

### その他

- [ ] 改善内容を記載

---

## Issue化済み

<!-- Issue化された項目はここに移動 -->
<!-- - [x] 改善内容 (#123) -->
```

## 2. ユーザーとの対話

改善リストを確認したら：

1. 現在の改善リストを表示
2. 追加・編集したい内容があるか確認
3. 変更があれば docs/IMPROVEMENTS.md を更新

## 3. Issue化する項目の選択

ユーザーに確認：

- どの項目をIssue化するか（全部 or 選択）
- ラベルの付与方針（カテゴリをラベルにするか）

## 4. GitHub Issue の一括作成

選択された項目について：

1. `gh issue create` コマンドでIssue作成

   ```bash
   gh issue create --title "改善: タイトル" --body "詳細" --label "improvement,カテゴリ"
   ```

2. 作成したIssueの番号を記録

3. docs/IMPROVEMENTS.md を更新
   - Issue化した項目を「Issue化済み」セクションに移動
   - Issue番号を付与: `- [x] 改善内容 (#123)`

## 5. Issue作業時のガイド

Issue化完了後、以下を案内：

```
## 作業方法

### 単独で作業する場合
1. Issue を選択
2. ブランチ作成: git checkout -b fix/issue-123
3. 実装 → PR作成（Closes #123）

### 複数Issueをまとめて作業する場合
1. 関連するIssue番号を選択（例: #10, #11, #12）
2. ブランチ作成: git checkout -b improve/ui-batch-1
3. 順次実装
4. PR作成時に複数Issueを参照:
   Closes #10, Closes #11, Closes #12
```

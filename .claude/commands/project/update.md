---
description: vibe-coding-utils を最新化する
---

以下の手順で vibe-coding-utils サブモジュールを最新化し、コマンドと CLAUDE.md を再生成してください：

## 1. サブモジュールの更新

```bash
git submodule update --remote .claude/vibe-coding-utils
```

## 2. 更新内容の確認

更新前後のコミット差分をユーザーに表示する：

```bash
git diff --submodule .claude/vibe-coding-utils
```

更新がない場合は「すでに最新です」と報告して終了。

## 3. フレームワークの判定

CLAUDE.md の技術スタックセクションからフレームワークを判定する：

- `Plasmo` → `chrome-extension`
- `Next.js` → `nextjs`

## 4. セットアップスクリプトの再実行

```bash
bash .claude/vibe-coding-utils/scripts/setup-framework.sh <framework>
```

## 5. 差分の確認

再生成されたファイルの差分を確認する：

```bash
git diff
```

変更内容をユーザーに報告する。

## 6. コミット

変更をコミットする：

- サブモジュールの更新と再生成ファイルをまとめて1コミット
- コミットメッセージ例: `chore: vibe-coding-utilsを最新化`

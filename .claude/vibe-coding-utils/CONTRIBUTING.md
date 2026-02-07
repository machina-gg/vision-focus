# Contributing

vibe-coding-utils へのコントリビューションガイドです。

## 新しいフレームワークの追加

新しいフレームワーク（例: `expo`）を追加する場合の手順です。

### 1. コマンドディレクトリを作成

```
commands/<framework>/
├── setup.md
├── design.md
├── prototype.md
├── implement.md
├── deploy.md
└── api.md
```

既存のフレームワーク（`commands/nextjs/` または `commands/chrome-extension/`）をコピーして、フレームワーク固有の内容に書き換えてください。

### 2. CLAUDE テンプレートを作成

`templates/CLAUDE_<FRAMEWORK>.md` を新規作成：

- セクション 8: 技術スタック（共通 + フレームワーク固有）
- セクション 9: ディレクトリ構成
- セクション 10: 参照ドキュメント

### 3. ドキュメントディレクトリを作成

```
docs/<framework>/
├── SETUP_<FRAMEWORK>.md    # 環境構築手順
└── SETUP_<DEPLOY>.md       # デプロイ手順
```

### 4. セットアップスクリプトを更新

`scripts/setup-framework.sh` に新しいフレームワークを追加：

1. バリデーションの `case` 文にフレームワーク名を追加
2. `CLAUDE_TEMPLATE` 変数の `case` 文にテンプレートファイル名を追加

### 5. ドキュメントを更新

- `README.md` にフレームワーク情報を追加（対応フレームワーク表、Commands 表、Documentation セクション）
- `CLAUDE_CODE_REFERENCE.md` の MCP セットアップにフレームワーク固有の項目を追加（デプロイ先 MCP 等）
- `docs/shared/SETUP_PERMISSIONS.md` にフレームワーク用の権限設定を追加

## ブランチ戦略

- `develop`: メインブランチ
- `feature/#<issue-number>`: 機能開発ブランチ

## コミット規則

- コミットメッセージは日本語で記述
- Issue に紐づく場合は `Closes #XX` を含める

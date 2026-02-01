# クイックスタート

人間向けのクイックリファレンスです。

## コマンド早見表

| やりたいこと | コマンド                      |
| ------------ | ----------------------------- |
| 要件定義     | `/project:requirements`       |
| 設計         | `/project:design`             |
| API設計      | `/project:api`                |
| 環境構築     | `/project:setup`              |
| プロトタイプ | `/project:prototype`          |
| テスト設計   | `/project:test-design`        |
| 実装（単一） | `/project:implement 30`       |
| 実装（複数） | `/project:implement 30,31,32` |
| 進捗確認     | `/project:continue`           |
| レビュー     | `/project:review`             |
| デプロイ     | `/project:deploy`             |
| 改善管理     | `/project:improvements`       |

### 実装コマンドの使い方

```bash
# 単一Issueの実装
/project:implement 30

# 複数Issueの並行実装（git worktree使用）
/project:implement 30,31,32
/project:implement 30 31 32
```

## 開発フロー

```
要件定義 → 設計 → (API設計) → 環境構築 → プロトタイプ → テスト設計 → 実装 → デプロイ
                                                                    ↓
                                                              改善サイクル
```

詳細: [開発フロー図](./.claude/docs/DEVELOPMENT_FLOW.md)

## ドキュメント構成

| ドキュメント       | 内容                         | SSOT |
| ------------------ | ---------------------------- | ---- |
| docs/PRD.md        | 機能要件・制約               | ✓    |
| docs/DESIGN.md     | 技術スタック・アーキテクチャ | ✓    |
| docs/SCREEN.md     | 画面設計                     | ✓    |
| docs/COMPONENT.md  | コンポーネント設計           | ✓    |
| docs/DATA_MODEL.md | データモデル                 | ✓    |
| docs/TEST_CASES.md | E2Eテストケース              |      |
| GitHub Issues      | 実装状況                     | ✓    |

## よく使う npm コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # ビルド
npm run storybook    # Storybook起動
npm run test         # 単体テスト
npm run test:e2e     # E2Eテスト
npm run format       # フォーマット
npm run lint         # Lint
```

### Supabase（使用時）

```bash
npm run supabase:start   # ローカル起動
npm run supabase:stop    # 停止
npm run supabase:status  # 状態確認
npm run supabase:reset   # DBリセット
```

## セットアップ

1. [GitHub MCP 設定](./.claude/docs/SETUP_GITHUB_MCP.md) - Issue管理に必要
2. [Vercel MCP 設定](./.claude/docs/SETUP_VERCEL_MCP.md) - デプロイに必要
3. [権限設定](./.claude/docs/SETUP_PERMISSIONS.md) - コミット・PR確認スキップ（任意）

## テンプレート

ドキュメント作成時のテンプレートは `.claude/templates/` にあります。

## 困ったら

- `/project:continue` で現状確認
- GitHub Issues で進捗確認
- [開発フロー図](./.claude/docs/DEVELOPMENT_FLOW.md) で次のステップ確認

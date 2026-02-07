# Claude Code リファレンス

開発者向けの Claude Code 操作リファレンスです。

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
| 状況確認     | `/project:status`             |
| レビュー     | `/project:review`             |
| デプロイ     | `/project:deploy`             |

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

詳細: [開発フロー図](./.claude/vibe-coding-utils/docs/shared/DEVELOPMENT_FLOW.md)

## テンプレート更新

テンプレートに更新が入った場合、以下で最新版を反映できます：

```bash
git submodule update --remote
bash .claude/vibe-coding-utils/scripts/setup-framework.sh <nextjs|chrome-extension>
```

詳細: [Submodule セットアップガイド](./.claude/vibe-coding-utils/docs/shared/SETUP_SUBMODULE.md)

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

## MCP セットアップ

1. [GitHub MCP 設定](./.claude/vibe-coding-utils/docs/shared/SETUP_GITHUB_MCP.md) - Issue管理に必要
2. [権限設定](./.claude/vibe-coding-utils/docs/shared/SETUP_PERMISSIONS.md) - コミット・PR確認スキップ（任意）

### Next.js の場合

3. [Vercel MCP 設定](./.claude/vibe-coding-utils/docs/nextjs/SETUP_VERCEL_MCP.md) - デプロイに必要

## 困ったら

- `/project:status` で現状確認
- GitHub Issues で進捗確認
- [開発フロー図](./.claude/vibe-coding-utils/docs/shared/DEVELOPMENT_FLOW.md) で次のステップ確認

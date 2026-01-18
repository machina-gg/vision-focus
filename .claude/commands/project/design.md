---
description: 設計を行う
---

以下の手順で設計を行ってください：

## 事前確認

0. **GitHub MCP の確認（必須）**
   - GitHub MCP が利用可能か確認する（Issue 作成に必要）
   - 利用可能な場合 → ステップ1へ進む
   - 利用不可の場合 → 以下を案内：
     「GitHub MCP が設定されていません。
      Issue 管理に必要なため、docs/SETUP_GITHUB_MCP.md の手順に従って設定してください。
      設定後、再度 /project:design を実行してください」
   - ※ ユーザーが「後で設定する」と言った場合のみ、Issue 作成をスキップして続行可

## 設計作成

1. docs/PRD.md を確認する

2. docs/DESIGN.md を作成
   - 技術スタック
   - ディレクトリ構成
   - 状態管理方針
   - データストレージ方針（ステップ9で決定後に追記）
   - データ通信方針（ステップ10で決定後に追記）

3. docs/SCREEN.md を作成
   - 画面一覧
   - 画面遷移図（Mermaid）
   - 各画面の詳細

4. docs/COMPONENT.md を作成
   - コンポーネント一覧
   - コンポーネント階層図（Mermaid）
   - 主要コンポーネント詳細（Props, 用途）

5. DB使用の場合、docs/ERD.md を作成
   - テーブル一覧
   - ER図（Mermaid）
   - テーブル詳細（カラム定義）

6. フォーマットは CLAUDE.md の各テンプレートに従う

7. README.md を更新
   - Tech Stack（使用技術を反映）
   - ディレクトリ構成（設計に基づいて更新）
   - ドキュメントリンク（作成したドキュメントへのリンク）
   ※ テンプレートの説明文は削除し、プロジェクト固有の内容に置き換える

8. 作成後、内容をユーザーに確認する

## 次のステップ判断

9. **データストレージ方針を決定し、DESIGN.md に記録する**
   - PRD.md の機能要件からデータ永続化の必要性を判断
   - ユーザーに以下の選択肢を提示：
     - **Supabase**: ユーザー認証、DBが必要な場合（ローカル: Supabase Local / 本番: Supabase Cloud）
     - **なし**: 静的サイト、ローカルストレージのみで十分な場合
   - Supabase を選択した場合、追加で確認：
     - **認証方式**: Email/Password, Magic Link, OAuth（Google, GitHub など）, なし
     - **ファイルストレージ**: 使用する（Supabase Storage）/ 使用しない
   - **【必須】決定後、docs/DESIGN.md の「データストレージ」セクションに記録**

10. **データ通信方針を決定し、DESIGN.md に記録する**
    - PRD.md と DESIGN.md の内容から判断
    - ユーザーに以下の選択肢を提示：
      - **Server Actions**: シンプルなデータ操作、Next.js 内で完結
      - **REST API（/project:api）**: 外部公開、モバイルアプリ連携、複雑なAPI
      - **なし**: 静的サイト、ローカルストレージのみ
    - 判断理由を説明し、ユーザーの承認を得る
    - **【必須】決定後、docs/DESIGN.md の「データ通信方針」セクションに記録：**
      - 選択した方針（Server Actions / REST API / なし）
      - 選定理由
      - 外部API連携がある場合はその情報も記載

    次のステップ：
    - REST API を選択 → `/project:api` → `/project:setup`
    - Server Actions または なし → `/project:setup`

    ※ src/ が既に存在する場合は `/project:prototype` へ直接進む

## GitHub Issue 作成

11. **ユーザー確認後、GitHub Issue を作成**
    - GitHub MCP を使用して Issue を作成
    - PRD.md の機能一覧から Issue を作成
    - 1機能 = 1 Issue を基本とする
    - 大きい機能は分割してサブタスク化（例: 「ログイン機能」→「UI作成」「API連携」「バリデーション」）
    - Issue タイトル: 機能名をそのまま使用
    - Issue 本文: PRD.md の該当機能の詳細を転記
    - ラベル: feature を付与
    - 優先度順に並べる（MVP → 将来対応）

    **Issue 作成に失敗した場合：**
    - エラー内容をユーザーに伝える
    - docs/SETUP_GITHUB_MCP.md を参照して設定を促す
    - 設定後、Issue 作成のみ再実行可能であることを案内

## 作業履歴

12. **【必須】reports/WORK_LOG.md に作業履歴を追記**
    - 日付（## YYYY-MM-DD 形式）
    - フェーズ名（### 設計）
    - 実施内容
    - 成果物へのリンク
    - 作成した Issue 番号一覧（または「Issue 未作成（GitHub MCP 未設定）」）
    ※ 新しい履歴はファイル上部に追記
    ※ このステップを省略しないこと

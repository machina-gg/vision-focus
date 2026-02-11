# Google Analytics 計測ドキュメント

## 概要

Vision Focus では Google Analytics 4 (GA4) の Measurement Protocol を使用して、匿名の使用統計を収集しています。
**すべての計測はオプトイン方式**であり、ユーザーが明示的に同意した場合のみ送信されます。

### プライバシー方針

- 個人を特定できる情報は一切収集しない
- ブロックしたドメイン名は収集しない
- 目標テキスト等の個人設定は収集しない
- 閲覧履歴は収集しない

### 技術的な仕組み

- **送信方式**: GA4 Measurement Protocol（`/mp/collect` エンドポイント）
- **クライアントID**: `crypto.randomUUID()` で生成した匿名ID（`chrome.storage.local` に保存）
- **セッション管理**: 30分の非アクティブでセッションリセット
- **実装ファイル**: `src/lib/analytics.ts`

---

## 計測イベント一覧

### 1. `daily_active` — デイリーアクティブユーザー

| 項目         | 内容                                            |
| ------------ | ----------------------------------------------- |
| **用途**     | DAU / WAU / MAU の算出                          |
| **トリガー** | `daily-cleanup` アラーム発火時（1日1回）        |
| **送信元**   | `src/background/index.ts` → `sendDailyActive()` |

| パラメータ  | 型     | 説明                                 |
| ----------- | ------ | ------------------------------------ |
| `version`   | string | 拡張機能のバージョン（例: `1.2.0`）  |
| `language`  | string | ユーザーの言語設定（例: `ja`, `en`） |
| `user_type` | string | `free` または `premium`              |

---

### 2. `use_feature` — 機能使用トラッキング

| 項目         | 内容                                   |
| ------------ | -------------------------------------- |
| **用途**     | 各機能の使用率を把握する               |
| **トリガー** | ユーザーが特定の機能を使用したとき     |
| **送信元**   | `trackFeatureUse(feature, isPremium?)` |

| パラメータ   | 型      | 説明                                 |
| ------------ | ------- | ------------------------------------ |
| `feature`    | string  | 機能名（下表参照）                   |
| `is_premium` | boolean | Premium限定機能の場合 `true`（任意） |

#### `feature` パラメータの値一覧

| feature値            | 説明                             | Premium | 送信元ファイル                                              |
| -------------------- | -------------------------------- | ------- | ----------------------------------------------------------- |
| `block_add`          | ブロックリストにドメインを追加   | -       | `src/hooks/useBlocklist.ts`                                 |
| `block_remove`       | ブロックリストからドメインを削除 | -       | `src/hooks/useBlocklist.ts`                                 |
| `schedule_create`    | スケジュールを新規作成           | -       | `src/hooks/useSchedules.ts`                                 |
| `schedule_toggle`    | スケジュールの有効/無効を切替    | -       | `src/hooks/useSchedules.ts`                                 |
| `preset_switch`      | プリセットを切替                 | -       | `src/hooks/usePresets.ts`                                   |
| `preset_create`      | プリセットを新規作成             | -       | `src/hooks/usePresets.ts`                                   |
| `csv_export`         | 分析データをCSVエクスポート      | Yes     | `src/components/options/analytics/AnalyticsExportBar.tsx`   |
| `image_upload`       | 背景画像をアップロード           | Yes     | `src/components/features/ImageUploader/ImageUploader.tsx`   |
| `wallpaper_download` | 壁紙をダウンロード               | Yes     | `src/components/features/DownloadButton/DownloadButton.tsx` |

---

### 3. `error` — エラートラッキング

| 項目         | 内容                 |
| ------------ | -------------------- |
| **用途**     | エラー発生率の監視   |
| **トリガー** | エラーが発生したとき |
| **送信元**   | `trackError(type)`   |

| パラメータ | 型     | 説明                   |
| ---------- | ------ | ---------------------- |
| `type`     | string | エラー種別（下表参照） |

#### `type` パラメータの値一覧

| type値                | 説明                   | 送信元ファイル                                            |
| --------------------- | ---------------------- | --------------------------------------------------------- |
| `image_upload_failed` | 画像アップロードの失敗 | `src/components/features/ImageUploader/ImageUploader.tsx` |

---

## 共通パラメータ

すべてのイベントには以下のパラメータが自動付与されます：

| パラメータ             | 説明                                       |
| ---------------------- | ------------------------------------------ |
| `session_id`           | セッションID（30分非アクティブでリセット） |
| `engagement_time_msec` | エンゲージメント時間（固定値 `100`）       |

---

## GA4 ダッシュボードで確認可能なレポート

### 標準レポート

| レポート     | 確認可能な指標             |
| ------------ | -------------------------- |
| リアルタイム | 現在アクティブなユーザー数 |
| ユーザー属性 | 地域、言語、デバイス       |
| テクノロジー | ブラウザ、OS               |

### カスタム分析（Explorations）

| 分析項目               | 使用イベント                 | 説明                       |
| ---------------------- | ---------------------------- | -------------------------- |
| DAU / WAU / MAU        | `daily_active`               | アクティブユーザー数の推移 |
| バージョン別ユーザー数 | `daily_active` → `version`   | 各バージョンの普及率       |
| 言語別ユーザー数       | `daily_active` → `language`  | 多言語対応の優先度判断     |
| Free/Premium 比率      | `daily_active` → `user_type` | コンバージョン率の把握     |
| 機能別使用率           | `use_feature` → `feature`    | 各機能の利用頻度           |
| Premium機能使用率      | `use_feature` → `is_premium` | Premium機能の価値検証      |
| エラー発生率           | `error` → `type`             | 品質監視・改善の優先度     |

---

## オプトイン管理

- **同意UI**: `src/components/options/modals/AnalyticsOptInModal.tsx`
- **設定保存先**: `chrome.storage.local` → `settings.analyticsOptIn.enabled`
- **チェック関数**: `isAnalyticsEnabled()`（`src/lib/analytics.ts`）
- 未同意 or 環境変数未設定の場合、すべてのイベント送信がスキップされる

---

## 今後追加を検討する計測項目

| 項目                                  | 目的                                 | 備考                       |
| ------------------------------------- | ------------------------------------ | -------------------------- |
| `preset_delete`                       | プリセット削除の頻度                 | UX改善の参考               |
| `schedule_delete`                     | スケジュール削除の頻度               | UX改善の参考               |
| `settings_export` / `settings_import` | 設定エクスポート・インポートの使用率 | 機能の需要把握             |
| `password_set` / `password_remove`    | パスワード機能の使用率               | セキュリティ機能の需要把握 |
| `time_limit_set`                      | 時間制限の設定頻度                   | 機能の需要把握             |
| `youtube_block_toggle`                | YouTube機能制限の使用率              | 機能の需要把握             |

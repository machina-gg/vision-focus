# 設計書

## 1. 技術スタック

### 必須

| カテゴリ           | 技術              | 備考                         |
| ------------------ | ----------------- | ---------------------------- |
| 拡張機能仕様       | Manifest V3       | Chrome拡張の最新仕様         |
| フレームワーク     | Plasmo            | Chrome拡張開発フレームワーク |
| 言語               | TypeScript 5.x    | 型安全性                     |
| UIライブラリ       | React 18          | Plasmoのデフォルト           |
| スタイリング       | Tailwind CSS 4.x  | ユーティリティファースト     |
| バリデーション     | Zod               | ランタイム型検証             |
| Linter / Formatter | ESLint / Prettier | コード品質                   |
| パッケージ管理     | pnpm              | Plasmo推奨                   |
| Node.js            | 24.x              | -                            |
| 単体テスト         | Vitest            | -                            |
| E2Eテスト          | Playwright        | -                            |

### Plasmoの利点

- **ファイルベースルーティング**: popup.tsx, newtab.tsx 等を配置するだけで自動認識
- **HMR（Hot Module Replacement）**: 開発中のリアルタイム反映
- **manifest.json 自動生成**: package.json の設定から自動生成
- **@plasmohq/storage**: chrome.storage の型安全なラッパー
- **@plasmohq/messaging**: コンテキスト間通信のシンプルなAPI

### Chrome拡張固有

| カテゴリ       | 技術                         | 用途                            |
| -------------- | ---------------------------- | ------------------------------- |
| データ保存     | @plasmohq/storage            | chrome.storage の型安全ラッパー |
| 多言語対応     | chrome.i18n API              | 英語/日本語の自動切替           |
| タブ監視       | chrome.tabs API              | 滞在時間計測                    |
| サイトブロック | chrome.declarativeNetRequest | Manifest V3準拠のブロック       |
| 新規タブ       | chrome.newtab override       | ダッシュボード表示              |
| アラーム       | chrome.alarms API            | 定期処理（データ集計等）        |
| メッセージング | @plasmohq/messaging          | Background↔UI間通信             |

### 決済関連（有料版）

| カテゴリ       | 技術             | 備考                           |
| -------------- | ---------------- | ------------------------------ |
| 課金           | ExtensionPay     | Stripe連携の決済サービス       |
| ライセンス検証 | ExtensionPay API | サブスクリプション状態確認     |
| 開発者モード   | ローカル検証     | 24時間限定のプレミアム機能解放 |

### プレミアム機能用ライブラリ

| カテゴリ   | 技術        | 備考                         |
| ---------- | ----------- | ---------------------------- |
| 分析グラフ | recharts    | React向けチャートライブラリ  |
| 壁紙生成   | html2canvas | DOM要素をCanvas化してPNG出力 |

## 2. ディレクトリ構成

Plasmoのファイルベース規約に従った構成。

```
vision-focus/
├── src/
│   ├── popup.tsx             # ポップアップUI（Plasmo自動認識）
│   ├── newtab.tsx            # 新規タブ/ダッシュボード（Plasmo自動認識）
│   ├── options.tsx           # オプション画面（Plasmo自動認識）
│   ├── tabs/                 # 追加タブページ
│   │   └── blocked.tsx       # ブロックページ
│   ├── background/           # Service Worker
│   │   ├── index.ts          # メインエントリ（Plasmo自動認識）
│   │   ├── blocker.ts        # declarativeNetRequestによるブロック
│   │   ├── tracker.ts        # 時間追跡（タブAPI経由）
│   │   └── messages/         # メッセージハンドラ
│   │       ├── add-block.ts
│   │       ├── remove-block.ts
│   │       ├── get-stats.ts
│   │       ├── toggle-lockdown.ts
│   │       ├── unblock-challenge.ts
│   │       ├── tracker-heartbeat.ts  # Content Scriptからのハートビート
│   │       └── set-site-category.ts  # サイトカテゴリ設定
│   ├── contents/             # Content Scripts（Plasmo自動認識）
│   │   └── tracker.ts        # ページ滞在時間計測（ユーザーアクティビティ検出）
│   ├── components/           # 共通コンポーネント
│   │   ├── ui/               # 汎用UI部品
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Toggle/
│   │   │   ├── Badge/
│   │   │   └── Tabs/
│   │   ├── features/         # 機能コンポーネント
│   │   │   ├── GoalCard/
│   │   │   ├── QuickBlockButton/
│   │   │   ├── UpgradePrompt/    # プレミアムアップグレード促進
│   │   │   ├── ImageUploader/    # 背景画像アップロード（Premium）
│   │   │   ├── FontPicker/       # フォントカスタマイズ（20種類以上）
│   │   │   ├── AnalyticsChart/   # 分析グラフ（recharts）
│   │   │   ├── ReportCard/       # 週次/月次レポート
│   │   │   ├── DownloadButton/   # 壁紙ダウンロード（Premium）
│   │   │   └── SiteCategoryManager/  # サイトカテゴリ管理
│   │   ├── newtab/           # 新規タブ用コンポーネント
│   │   │   ├── GoalDisplay/      # 目標表示・編集
│   │   │   └── MiniStats/        # ミニ統計カード
│   │   └── options/          # オプション画面用コンポーネント
│   │       ├── GeneralTab/       # 一般設定（プリセット管理）
│   │       ├── BlocklistTab/     # ブロックリスト管理
│   │       ├── SchedulesTab/     # スケジュール管理
│   │       ├── AnalyticsTab/     # 分析タブ
│   │       ├── PremiumTab/       # プレミアムタブ
│   │       └── modals/           # モーダル
│   │           ├── ScheduleModal/    # スケジュール編集（プリセット選択対応）
│   │           └── NewPresetModal/   # 新規プリセット作成
│   ├── hooks/                # カスタムフック
│   │   ├── index.ts          # エクスポート
│   │   ├── useBlocklist.ts   # ブロックリスト管理
│   │   ├── useSchedules.ts   # スケジュール管理
│   │   └── usePresets.ts     # プリセット管理
│   ├── lib/                  # ユーティリティ
│   │   ├── storage.ts        # @plasmohq/storage設定
│   │   ├── i18n.ts           # 多言語対応ヘルパー
│   │   ├── time.ts           # 時間計算・スケジュール判定
│   │   ├── domain.ts         # ドメイン抽出・マッチング
│   │   ├── license.ts        # ライセンス管理
│   │   ├── gumroad.ts        # Gumroad API連携
│   │   ├── devMode.ts        # 開発者モード
│   │   ├── image.ts          # 画像圧縮・検証
│   │   ├── reports.ts        # レポート生成
│   │   └── wallpaper.ts      # 壁紙キャプチャ
│   ├── types/                # 型定義
│   │   └── storage.ts        # 全ストレージスキーマ・型定義
│   ├── styles/               # グローバルCSS
│   │   └── globals.css
│   └── test/                 # テストセットアップ
│       └── setup.ts
├── assets/                   # 静的アセット（Plasmo規約）
│   ├── _locales/             # 多言語リソース
│   │   ├── en/
│   │   │   └── messages.json
│   │   └── ja/
│   │       └── messages.json
│   ├── icon.png              # 拡張アイコン（Plasmoが自動リサイズ）
│   └── images/               # 背景画像等
│       └── backgrounds/
│           ├── default-1.png
│           ├── default-2.png
│           └── default-3.png
├── .storybook/               # Storybook設定
├── e2e/                      # E2Eテスト（未実装）
├── docs/                     # ドキュメント
├── reports/                  # レポート
├── .plasmo/                  # Plasmoビルドキャッシュ（.gitignore）
├── build/                    # ビルド出力（.gitignore）
├── tailwind.config.ts        # Tailwind設定
├── vitest.config.ts          # Vitest設定
├── tsconfig.json             # TypeScript設定
└── package.json              # Plasmo設定含む
```

### Plasmoファイル規約

| ファイル/ディレクトリ | 役割                   |
| --------------------- | ---------------------- |
| `popup.tsx`           | ポップアップ画面       |
| `newtab.tsx`          | 新規タブオーバーライド |
| `options.tsx`         | オプション画面         |
| `tabs/*.tsx`          | 追加タブページ         |
| `background/index.ts` | Service Worker         |
| `contents/*.ts`       | Content Scripts        |
| `assets/`             | 静的アセット           |

## 3. 状態管理

### 方針

Chrome拡張機能の特性上、複数のコンテキスト（Background, Popup, Newtab等）間でデータを共有する必要があるため、`chrome.storage.local` を Single Source of Truth として使用する。

### 状態管理戦略

| コンテキスト                | 状態管理                         | 説明                                     |
| --------------------------- | -------------------------------- | ---------------------------------------- |
| Background (Service Worker) | @plasmohq/storage                | データの読み書き、他コンテキストへの通知 |
| Popup / Newtab / Options    | React useState + useStorage hook | UIローカル状態 + ストレージ同期          |

### @plasmohq/storage の使用

```typescript
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

// Background側
const storage = new Storage()
await storage.set("settings", { ... })

// UI側（React hook）
const [settings, setSettings] = useStorage<Settings>("settings")
```

### ストレージ構造

```typescript
interface StorageSchema {
  // 設定
  settings: AppSettings
  // ダッシュボード設定
  vision: VisionSettings
  // 分析データ
  analytics: AnalyticsData
}

// アプリ設定
interface AppSettings {
  blockList: BlockItem[] // ブロックリスト
  schedules: Schedule[] // 時間帯指定（プリセット連携対応）
}

// ダッシュボード表示設定（プリセットとデフォルトで共通）
interface DashboardDisplaySettings {
  goalText: string // 目標テキスト
  goalSubText: string // サブテキスト
  textColor: string // テキスト色
  backgroundType: 'image' | 'color'
  backgroundImage: string // 背景画像ID
  backgroundColor: string // 背景色
  customBackgroundData: string | null // Base64アップロード画像（Premium）
  fontSettings: FontSettings // フォント設定
}

// ダッシュボードプリセット
interface DashboardPreset extends DashboardDisplaySettings {
  id: string
  name: string
  createdAt: string
}

// ビジョン設定
interface VisionSettings {
  defaultSettings: DashboardDisplaySettings // デフォルト設定
  presets: DashboardPreset[] // ユーザー作成プリセット
  activePresetId: string | null // 現在有効なプリセットID
}

// フォント設定
interface FontSettings {
  family: FontFamily // フォントファミリー（20種類以上）
  size: 'sm' | 'md' | 'lg' | 'xl'
  weight: 'normal' | 'medium' | 'semibold' | 'bold'
}

// 分析データ
interface AnalyticsData {
  dailyStats: Record<string, DailyStat> // 日別統計
  siteTime: Record<string, SiteTime> // サイト別滞在時間
  siteCategories: Record<string, 'waste' | 'invest' | 'neutral'>
}

// スケジュール（プリセット連携）
interface Schedule {
  id: string
  name: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  days: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  enabled: boolean
  presetId?: string // このスケジュールで適用するプリセットID
}

// 機能制限
const FEATURE_LIMITS = {
  free: {
    maxBlockList: Infinity, // Unlimited for all users
    historyDays: 7,
    maxPresets: 1,
  },
  premium: {
    maxBlockList: Infinity,
    historyDays: Infinity,
    maxPresets: 5,
  },
}
```

### コンテキスト間通信

@plasmohq/messaging を使用したシンプルな通信。

```
┌─────────────┐    @plasmohq/messaging          ┌─────────────┐
│   Popup     │ <─────────────────────────────> │  Background │
└─────────────┘         sendToBackground        └─────────────┘
       ↑                                               ↑
       │          @plasmohq/storage (自動同期)          │
       ↓                                               ↓
┌─────────────┐                                 ┌─────────────┐
│   Newtab    │                                 │   Options   │
└─────────────┘                                 └─────────────┘
```

**メッセージング例**

```typescript
// background/messages/blocker.ts
import type { PlasmoMessaging } from '@plasmohq/messaging'

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { domain } = req.body
  // ブロック処理
  res.send({ success: true })
}
export default handler

// UI側（popup.tsx など）
import { sendToBackground } from '@plasmohq/messaging'

const result = await sendToBackground({
  name: 'blocker',
  body: { domain: 'twitter.com' },
})
```

## 4. データストレージ

### 方針

**なし（chrome.storage.local のみ）**

### 選定理由

- PRD で「全データをローカルに保持するプライバシーファースト設計」が明記されている
- サーバー通信なしの要件により外部DBは不要
- chrome.storage.local はChrome拡張の標準的なデータ保存先
- 同期が必要な場合は chrome.storage.sync（8KB制限）も使用可能

### 補足

- chrome.storage.local: 5MB以上の大容量データに対応
- 有料版のライセンス検証のみ、Chrome Web Store Payments API または Stripe との連携が必要

## 5. データ通信方針

### 方針

**なし（外部API通信なし）**

### 選定理由

- プライバシーファースト設計（サーバー通信なし）
- 全機能がローカルで完結
- APIコストゼロの実現

### 外部連携

| 機能 | API                                | 備考           |
| ---- | ---------------------------------- | -------------- |
| 決済 | Chrome Web Store Payments / Stripe | ライセンス管理 |

## 6. 主要コンポーネント

### コンポーネント設計方針

- Atomic Design を参考にした階層構造
- コンポーネントとテストの同一ディレクトリ配置
- Propsは必要最小限に

詳細は [COMPONENT.md](./COMPONENT.md) を参照。

## 7. セキュリティ考慮事項

### Content Security Policy (CSP)

Manifest V3 の CSP に準拠し、以下を遵守：

- インラインスクリプトの禁止
- eval() の禁止
- 外部スクリプトの読み込み禁止

### 権限の最小化

```json
{
  "permissions": [
    "storage", // データ保存
    "tabs", // タブ情報取得
    "declarativeNetRequest", // サイトブロック
    "alarms" // 定期処理
  ],
  "host_permissions": [
    "<all_urls>" // 滞在時間計測のため必要
  ]
}
```

### データ保護

- 全データをローカルに保持（chrome.storage.local）
- パスワード等の機密情報は扱わない
- 外部サーバーへのデータ送信なし

## 8. パフォーマンス最適化

### 目標値（PRDより）

| 指標                 | 目標                    |
| -------------------- | ----------------------- |
| 拡張機能のロード時間 | 100ms以下               |
| ブロックページ表示   | 即時                    |
| 分析データ更新       | リアルタイム（1秒単位） |
| メモリ使用量         | 50MB以下                |

### 最適化戦略

1. **Service Worker の軽量化**
   - 初期化処理の最小化
   - 遅延ロードの活用

2. **ストレージアクセスの効率化**
   - バッチ処理による書き込み回数削減
   - キャッシュの活用

3. **UI のパフォーマンス**
   - React.memo / useMemo の適切な使用
   - 仮想スクロール（大量データ表示時）

## 9. 多言語対応

### 対応言語

| 言語   | コード | 優先度     |
| ------ | ------ | ---------- |
| 英語   | en     | デフォルト |
| 日本語 | ja     | MVP        |

### 実装方式

chrome.i18n API を使用し、ブラウザ言語設定による自動切替。

### ファイル構成

```
assets/_locales/
├── en/
│   └── messages.json
└── ja/
    └── messages.json
```

### 使用例

```typescript
// messages.json
{
  "appName": {
    "message": "VisionFocus"
  },
  "blockPageTitle": {
    "message": "Focus on your goals"
  }
}

// 使用側
chrome.i18n.getMessage('blockPageTitle')
```

## 10. 決済・ライセンス管理

### 使用サービス

**ExtensionPay** (https://extensionpay.com)

- Stripe連携のChrome拡張向け決済サービス
- サーバー不要でサブスクリプション管理が可能
- npmパッケージ: `extpay`

### 環境変数

```bash
# .env
PLASMO_PUBLIC_EXTPAY_ID=visionfocus
```

### ユーザーステータス

ExtensionPayの `extpay.getUser()` で取得できる情報:

| フィールド             | 型                                     | 説明                     |
| ---------------------- | -------------------------------------- | ------------------------ |
| `paid`                 | `boolean`                              | 現在有効な支払いがあるか |
| `paidAt`               | `Date \| null`                         | 最後の支払い日時         |
| `installedAt`          | `Date`                                 | 拡張機能インストール日時 |
| `trialStartedAt`       | `Date \| null`                         | トライアル開始日時       |
| `subscriptionStatus`   | `"active" \| "past_due" \| "canceled"` | サブスクリプション状態   |
| `subscriptionCancelAt` | `Date \| null`                         | サブスク終了予定日時     |

### サブスクリプションキャンセル時の動作

**重要**: キャンセル後も請求期間終了までプレミアム機能が使える。

| タイミング     | `user.paid` | `subscriptionStatus` | `subscriptionCancelAt` |
| -------------- | ----------- | -------------------- | ---------------------- |
| キャンセル直後 | `true`      | `"active"`           | 終了日時がセット       |
| 請求期間終了後 | `false`     | `"canceled"`         | そのまま維持           |

現在の実装では `user.paid` をチェックしているため、キャンセル後も請求期間終了まで正しく動作する。

```typescript
// src/lib/extpay.ts
export async function isExtPayPremium(): Promise<boolean> {
  const user = await getExtPayUser()
  return user.paid // キャンセル後も請求期間終了まで true
}
```

### 参考資料

- [ExtPay - How Subscriptions Work](https://github.com/Glench/ExtPay/blob/main/docs/how_subscriptions_work.md)
- [ExtPay npm package](https://www.npmjs.com/package/extpay)
- [ExtensionPay公式サイト](https://extensionpay.com)

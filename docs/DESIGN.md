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

Plasmoのファイルベース規約に従った構成。詳細は実際のソースコードを参照。

```
vision-focus/
├── src/
│   ├── popup.tsx             # ポップアップUI
│   ├── newtab.tsx            # 新規タブ/ダッシュボード
│   ├── options.tsx           # オプション画面
│   ├── background/           # Service Worker
│   ├── contents/             # Content Scripts
│   ├── components/           # 共通コンポーネント
│   ├── hooks/                # カスタムフック
│   ├── lib/                  # ユーティリティ
│   ├── constants/            # 定数定義
│   └── types/                # 型定義
├── assets/                   # 静的アセット
│   ├── _locales/             # 多言語リソース
│   └── images/               # 画像
├── docs/                     # ドキュメント
└── package.json
```

### Plasmoファイル規約

| ファイル/ディレクトリ | 役割                   |
| --------------------- | ---------------------- |
| `popup.tsx`           | ポップアップ画面       |
| `newtab.tsx`          | 新規タブオーバーライド |
| `options.tsx`         | オプション画面         |
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

### データモデル

詳細は [DATA_MODEL.md](./DATA_MODEL.md) を参照。

### コンテキスト間通信

@plasmohq/messaging を使用。

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

## 4. データストレージ

### 方針

**chrome.storage.local をメインに使用**

### 選定理由

- ユーザーの設定・分析データはローカルに保持
- chrome.storage.local はChrome拡張の標準的なデータ保存先
- 同期が必要な場合は chrome.storage.sync（8KB制限）も使用可能

### 補足

- chrome.storage.local: 5MB以上の大容量データに対応
- ライセンス検証: ExtensionPay（Stripe連携）
- 使用統計: GA4（オプトイン、匿名データのみ）

## 5. データ通信方針

### 方針

**必要最小限の外部通信**

### 外部連携

| 機能             | API                   | 備考                       |
| ---------------- | --------------------- | -------------------------- |
| 決済・ライセンス | ExtensionPay (Stripe) | サブスクリプション管理     |
| 使用統計         | Google Analytics 4    | オプトイン、匿名データのみ |

### GA4で収集するデータ

- DAU / WAU / MAU
- 機能別使用率
- エラー発生率

### GA4で収集しないデータ

- ブロックしたドメイン名
- 目標テキスト等の個人設定
- 閲覧履歴

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

| 権限                         | 用途           |
| ---------------------------- | -------------- |
| storage                      | データ保存     |
| tabs                         | タブ情報取得   |
| declarativeNetRequest        | サイトブロック |
| alarms                       | 定期処理       |
| host_permissions: <all_urls> | 滞在時間計測   |

### データ保護

セキュリティ・プライバシー要件は [PRD.md](./PRD.md) の非機能要件を参照。

実装上の注意点：

- chrome.storage.local を使用（同期不要）
- パスワード等の機密情報は扱わない設計

## 8. パフォーマンス最適化

目標値は [PRD.md](./PRD.md) の非機能要件を参照。

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

対応言語・要件は [PRD.md](./PRD.md) の非機能要件を参照。

### 実装方式

- chrome.i18n API を使用
- ブラウザ言語設定による自動切替
- メッセージファイル: `assets/_locales/{lang}/messages.json`

## 10. 決済・ライセンス管理

### 使用サービス

**ExtensionPay** (https://extensionpay.com)

- Stripe連携のChrome拡張向け決済サービス
- サーバー不要でサブスクリプション管理が可能
- npmパッケージ: `extpay`

### ライセンス判定

- `user.paid` フラグでプレミアム判定
- キャンセル後も請求期間終了まで `paid: true` を維持

### 参考資料

- [ExtensionPay公式サイト](https://extensionpay.com)
- [ExtPay npm package](https://www.npmjs.com/package/extpay)

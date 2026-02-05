# デザインコンセプト

## 1. コンセプト

**"Focus with Vision"** - シンプルで力強いデザイン

- **トーン**: プロフェッショナル × モチベーショナル
- **テイスト**: モダン、クリーン、ミニマル
- **印象**: 信頼感、集中力、達成感

ユーザーが「目標に向かって進んでいる」という感覚を視覚的に強化するデザイン。派手さよりも、毎日使いたくなる落ち着きと、行動を促す力強さを両立。

## 2. カラーパレット

### 設計原則

- 各色は**1つの意味**にのみ割り当てる（衝突禁止）
- セマンティックカラーは Tailwind config にトークンとして定義し、直接の色名（`red-500` 等）ではなくトークン名（`danger-500` 等）で参照する
- ニュートラルカラーは Tailwind デフォルトの `gray-*` をそのまま使用

### メインカラー

| 用途         | カラー  | Tailwind | 意味             |
| ------------ | ------- | -------- | ---------------- |
| Primary      | #14B8A6 | teal-500 | 集中、信頼、行動 |
| Primary Dark | #0D9488 | teal-600 | ホバー状態       |

Primary を blue-500 → teal-500 に変更。宝石のエメラルドを思わせる青みがかったグリーンで、クールで知的な印象を与える。

### セマンティックカラー

| 用途           | カラー  | Tailwind   | 意味                         |
| -------------- | ------- | ---------- | ---------------------------- |
| Success/Invest | #06B6D4 | cyan-500   | 成長、生産的な時間           |
| Warning        | #F59E0B | amber-500  | 注意喚起、時間制限の警告     |
| Danger/Waste   | #F43F5E | rose-500   | 浪費した時間、エラー、削除   |
| Block          | #F97316 | orange-500 | ブロック機能、サイトブロック |
| Premium        | #8B5CF6 | violet-500 | プレミアム機能、特別感       |
| Info           | #0EA5E9 | sky-500    | 情報表示、統計値             |

#### 旧パレットからの変更理由

| 変更点         | 旧                         | 新         | 理由                                       |
| -------------- | -------------------------- | ---------- | ------------------------------------------ |
| Primary        | blue-500                   | teal-500   | エメラルドグリーン系。クールで知的な印象   |
| Success/Invest | green-500                  | cyan-500   | Primary(teal)との分離を確保                |
| Danger         | red-500                    | rose-500   | red よりも柔らかくミニマルなトーンに合う   |
| Block          | amber-500 (Warning と共用) | orange-500 | Warning と Block を明確に分離              |
| Premium        | amber-500 (Warning と共用) | violet-500 | 紫の高級感で特別感を演出。amber 衝突を解消 |
| Info           | blue-500 (Primary と共用)  | sky-500    | Primary(teal) と明確に分離                 |

### ニュートラルカラー

| 用途           | カラー  | Tailwind |
| -------------- | ------- | -------- |
| Background     | #FFFFFF | white    |
| Surface        | #F9FAFB | gray-50  |
| Text Primary   | #111827 | gray-900 |
| Text Secondary | #6B7280 | gray-500 |
| Text Tertiary  | #9CA3AF | gray-400 |
| Border         | #E5E7EB | gray-200 |
| Divider        | #F3F4F6 | gray-100 |

#### 変更点

- Text Primary を gray-800 → gray-900 に変更（コントラスト向上）
- Text Tertiary (gray-400) を新設（プレースホルダー、補足的な情報用）
- Divider (gray-100) を新設（セクション区切り用）

### Tailwind config でのトークン定義

```typescript
colors: {
  primary: { /* teal scale */ },
  success: { /* cyan scale */ },
  warning: { /* amber scale */ },
  danger: { /* rose scale */ },
  block: { /* orange scale */ },
  premium: { /* violet scale */ },
  info: { /* sky scale */ },
}
```

### 各色のバリエーション使用ガイド

| シェード | 用途                       | 例                                   |
| -------- | -------------------------- | ------------------------------------ |
| 50       | 薄い背景                   | Stats カードの背景 (`bg-success-50`) |
| 100      | Badge の背景               | `bg-danger-100`                      |
| 200      | ボーダー（アクセント）     | `border-primary-200`                 |
| 400      | アイコン（薄い）           | ダッシュボードのアイコン             |
| 500      | 標準（テキスト・アイコン） | `text-danger-500`, ボタン背景        |
| 600      | ホバー・強調テキスト       | `hover:bg-primary-600`               |
| 700      | Badge テキスト             | `text-success-700`                   |

## 3. タイポグラフィ

### フォントファミリー

- **UI**: システムフォント（font-sans）
- **ダッシュボード**: ユーザーカスタマイズ可能（20+ Google Fonts）

### タイポグラフィスケール

| 名称       | サイズ | ウェイト | Tailwind                | 用途                   |
| ---------- | ------ | -------- | ----------------------- | ---------------------- |
| Display    | 36px   | Bold     | text-4xl font-bold      | ダッシュボード目標     |
| H1         | 24px   | Bold     | text-2xl font-bold      | ページタイトル         |
| H2         | 20px   | Semibold | text-xl font-semibold   | セクション見出し       |
| H3         | 16px   | Semibold | text-base font-semibold | カード見出し           |
| Body       | 14px   | Normal   | text-sm                 | 本文、説明文           |
| Body Small | 13px   | Normal   | text-[13px]             | 補足テキスト           |
| Caption    | 12px   | Medium   | text-xs font-medium     | ラベル、Badge テキスト |
| Tiny       | 11px   | Normal   | text-[11px]             | タイムスタンプ等       |

### 使用ルール

- Chrome 拡張はポップアップ（360px幅）が主要UIのため、Body は `text-sm`（14px）を基準とする
- `text-[10px]` 以下は使用禁止（可読性の担保）
- ウェイトは `normal`, `medium`, `semibold`, `bold` の4段階のみ使用

## 4. スペーシング

### 基本スケール

Tailwind の 4px 単位スケールを使用。以下のサイズを**推奨値**として統一。

| 用途               | サイズ | Tailwind | 備考               |
| ------------------ | ------ | -------- | ------------------ |
| インライン要素間   | 4px    | gap-1    | アイコンとテキスト |
| テキスト間         | 8px    | gap-2    | 段落間、ラベルと値 |
| 要素間             | 12px   | gap-3    | フォーム要素間     |
| カード内余白       | 16px   | p-4      | 標準カード         |
| カード内余白（大） | 24px   | p-6      | メインコンテンツ   |
| セクション間       | 24px   | gap-6    | セクション区切り   |
| ページ余白         | 24px   | p-6      | コンテナ内側       |

### ポップアップ固有

- 幅: 360px（固定）
- 高さ: コンテンツに応じて可変
- パディング: p-4（16px）

### 使用ルール

- `gap-*` を優先（`space-y-*` より）
- `gap-1.5` や `gap-2.5` などの半端な値は避ける
- マージンよりも gap/padding で余白を制御

## 5. シャドウ

### シャドウスケール

| レベル | Tailwind    | 用途                         |
| ------ | ----------- | ---------------------------- |
| 0      | shadow-none | フラットな要素（デフォルト） |
| 1      | shadow-sm   | カード（デフォルト状態）     |
| 2      | shadow-md   | カード（ホバー・浮遊状態）   |
| 3      | shadow-lg   | ドロップダウン、ツールチップ |
| 4      | shadow-xl   | モーダル、オーバーレイ       |

### 使用ルール

- **ミニマルを維持**: 必要な箇所のみシャドウを適用
- カードのデフォルトは **shadow-sm**（現状の shadow なしから変更）
- ホバー時のシャドウ昇格: shadow-sm → shadow-md

## 6. 角丸（Border Radius）

| 要素         | Tailwind     | サイズ | 備考                    |
| ------------ | ------------ | ------ | ----------------------- |
| ボタン       | rounded-lg   | 8px    |                         |
| 入力フォーム | rounded-lg   | 8px    | rounded-md → lg に統一  |
| カード       | rounded-xl   | 12px   |                         |
| Badge        | rounded-full | full   | ピル型                  |
| モーダル     | rounded-2xl  | 16px   | rounded-xl → 2xl に変更 |
| トグル       | rounded-full | full   |                         |

### 変更点

- Input の角丸を `rounded-md` → `rounded-lg` に統一（ボタンと揃える）
- モーダルを `rounded-xl` → `rounded-2xl` に変更（よりモダンな印象）

## 7. コンポーネントスタイル

### ボタン

| バリアント | 背景        | テキスト | ホバー      | 用途               |
| ---------- | ----------- | -------- | ----------- | ------------------ |
| Primary    | primary-500 | white    | primary-600 | メインアクション   |
| Secondary  | white       | gray-700 | gray-50     | サブアクション     |
| Danger     | danger-500  | white    | danger-600  | 削除・危険操作     |
| Ghost      | transparent | gray-600 | gray-100    | 最小限のアクション |

- フォーカス: `ring-2 ring-offset-2 ring-primary-500`
- サイズ: sm / md / lg の3段階

### カード

| バリアント | スタイル                                                | 用途     |
| ---------- | ------------------------------------------------------- | -------- |
| Default    | bg-white, border border-gray-200, shadow-sm, rounded-xl | 標準     |
| Outlined   | bg-white, border border-gray-200, rounded-xl            | フラット |
| Elevated   | bg-white, shadow-md, rounded-xl                         | 強調     |

- ホバー可能なカード: `hover:shadow-md hover:border-primary-200 transition-shadow`

### Stats カード

| タイプ  | 背景色     | テキスト色  | アイコン色  |
| ------- | ---------- | ----------- | ----------- |
| Waste   | danger-50  | danger-600  | danger-500  |
| Invest  | success-50 | success-600 | success-500 |
| Block   | block-50   | block-600   | block-500   |
| Neutral | gray-50    | gray-600    | gray-500    |

### Badge

| バリアント | 背景        | テキスト    |
| ---------- | ----------- | ----------- |
| Default    | gray-100    | gray-700    |
| Success    | success-100 | success-700 |
| Warning    | warning-100 | warning-700 |
| Danger     | danger-100  | danger-700  |
| Info       | info-100    | info-700    |
| Premium    | premium-100 | premium-700 |

### 入力フォーム

- ボーダー: `border-gray-300`
- フォーカス: `ring-2 ring-primary-500 border-transparent`
- エラー: `border-danger-500 ring-danger-500`
- 角丸: `rounded-lg`

### モーダル

- 背景オーバーレイ: `bg-black/50 backdrop-blur-sm`
- コンテナ: `bg-white rounded-2xl shadow-xl`
- ヘッダー: `px-6 py-4 border-b border-gray-200`

### プレミアム機能の表現

- Crown アイコン + **premium-500**（violet 系）
- バナー: `bg-premium-50 border-premium-200`
- グラデーション: `from-premium-500 to-premium-400`
- ロック状態: 薄いオーバーレイ + ロックアイコン

## 8. トランジション

| 対象     | Tailwind                       |
| -------- | ------------------------------ |
| 色の変化 | transition-colors duration-150 |
| シャドウ | transition-shadow duration-200 |
| 全体     | transition-all duration-200    |

## 9. アセット

### アイコン

**Lucide React** を使用。アイコン選定は一貫性を重視。

### 背景画像

`assets/images/backgrounds/` を参照。

- デフォルト背景（default-1〜5）
- 曜日別背景（monday〜sunday）

### ブランド

`assets/` を参照。

- icon.png（128x128）- Plasmoが自動リサイズ

### Chrome Web Store用

`assets/store/` を参照（実装後に作成）。

## 10. 必要な画像一覧

### 画像スタイルガイド

VisionFocus は Chrome 拡張であり、LP やウェブサイトではないため、必要な画像は以下に限定される。

- **スタイル**: 写真（背景画像）、フラットアイコン（ブランド）
- **トーン**: 落ち着いた、集中を促す
- **配色**: ニュートラル基調。背景画像はテキストを載せるため暗めまたはオーバーレイ対応

### ブランド

| ファイル名 | パス             | サイズ  | 背景 | 備考                        |
| ---------- | ---------------- | ------- | ---- | --------------------------- |
| icon.png   | /assets/icon.png | 128x128 | 透過 | 既存。Plasmo が自動リサイズ |

### ダッシュボード背景画像

既存の背景画像を使用。追加画像は不要。

| カテゴリ   | ファイル            | パス                        | サイズ    | 備考 |
| ---------- | ------------------- | --------------------------- | --------- | ---- |
| デフォルト | default-1〜5.webp   | /assets/images/backgrounds/ | 1920x1080 | 既存 |
| 曜日別     | monday〜sunday.webp | /assets/images/backgrounds/ | 1920x1080 | 既存 |

### Chrome Web Store 用（本実装で追加）

| ファイル名             | パス           | サイズ   | 背景 | プロンプト                             |
| ---------------------- | -------------- | -------- | ---- | -------------------------------------- |
| screenshot-popup.png   | /assets/store/ | 1280x800 | あり | ポップアップ画面のスクリーンショット   |
| screenshot-newtab.png  | /assets/store/ | 1280x800 | あり | ダッシュボード画面のスクリーンショット |
| screenshot-options.png | /assets/store/ | 1280x800 | あり | 設定画面のスクリーンショット           |
| promo-small.png        | /assets/store/ | 440x280  | あり | ストア用プロモーション画像（小）       |
| promo-marquee.png      | /assets/store/ | 1400x560 | あり | ストア用マーキー画像                   |

### 画像生成時の注意

- ストア用スクリーンショットはデザイン刷新後に撮影
- プロモーション画像はブランドカラー（primary: teal）を基調に作成

## 11. アクセシビリティ

- コントラスト比: WCAG AA 準拠（4.5:1 以上）
- フォーカス表示: `ring-2 ring-offset-2 ring-primary-500`
- インタラクティブ要素: role属性、tabIndex の適切な設定
- アイコン単独使用時: aria-label の付与
- 色のみに依存しない: アイコン・テキストを併用

## 12. 参考サイト

- **Notion**: ミニマルで機能的なUI、ニュートラルカラーの使い方
- **Linear**: プロフェッショナルな色使い、シャープなデザイン
- **Raycast**: 拡張機能的なコンパクトUI、効率的な情報配置
- **Forest App**: モチベーショナルなビジュアル、達成感の演出

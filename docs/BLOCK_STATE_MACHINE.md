# ブロック状態管理 - ステートマシーン図

このドキュメントはブロック機能の状態遷移を定義しています。

## 概要

VisionFocusのブロック機能は、複数の条件を組み合わせてドメインのブロック状態を判定します。

## ブロック判定フロー

```mermaid
flowchart TD
    Start["URL アクセス"] --> A{"グローバル一時停止？<br/>settings.paused"}

    A -->|Yes| Unblocked["✅ 許可"]
    A -->|No| B{"ブロックリストに存在？<br/>findBlockItemForDomain()"}

    B -->|No| Unblocked
    B -->|Yes| C{"サイト別ブロック有効？<br/>blockItem.enabled"}

    C -->|No| Unblocked
    C -->|Yes| D{"スケジュール設定あり？<br/>schedules.length > 0"}

    D -->|No| E{"時間制限設定あり？<br/>blockItem.timeLimit"}
    D -->|Yes| F{"現在スケジュール内？<br/>isWithinSchedule()"}

    F -->|No| Unblocked
    F -->|Yes| E

    E -->|No| Blocked["🚫 ブロック<br/>reason: always_blocked"]
    E -->|Yes| G{"時間制限タイプ？"}

    G -->|Daily| H{"日次リセット必要？<br/>needsDailyReset()"}
    G -->|Hourly| I{"時間リセット必要？<br/>needsHourlyReset()"}

    H -->|Yes| J["使用時間をリセット<br/>dailyUsedSeconds = 0"]
    H -->|No| K{"使用時間 >= 制限？"}

    I -->|Yes| L["使用時間をリセット<br/>hourlyUsedSeconds = 0"]
    I -->|No| K

    J --> K
    L --> K

    K -->|Yes| TimeLimitExceeded["🚫 ブロック<br/>reason: time_limit_exceeded"]
    K -->|No| Unblocked
```

## 状態遷移図

```mermaid
stateDiagram-v2
    [*] --> Unknown: ドメイン初期状態

    Unknown --> NotInBlocklist: ブロックリストに未登録
    Unknown --> InBlocklist: add-block で追加

    state InBlocklist {
        [*] --> Enabled

        Enabled: ブロック有効
        Disabled: ブロック無効（一時停止）

        Enabled --> Disabled: toggle-block(enabled=false)
        Disabled --> Enabled: toggle-block(enabled=true)

        state Enabled {
            [*] --> CheckSchedule

            CheckSchedule --> OutOfSchedule: スケジュール外
            CheckSchedule --> InSchedule: スケジュール内
            CheckSchedule --> AlwaysActive: スケジュール未設定

            AlwaysActive --> CheckTimeLimit
            InSchedule --> CheckTimeLimit
            OutOfSchedule --> [*]: 許可

            CheckTimeLimit --> AlwaysBlocked: timeLimit なし
            CheckTimeLimit --> WithinLimit: timeLimit あり & 時間内
            CheckTimeLimit --> Exceeded: timeLimit あり & 超過

            AlwaysBlocked --> [*]: ブロック
            WithinLimit --> [*]: 許可
            Exceeded --> [*]: ブロック（time_limit_exceeded）
        }
    }

    InBlocklist --> NotInBlocklist: remove-block で削除
    NotInBlocklist --> InBlocklist: add-block で追加

    NotInBlocklist --> [*]: 許可（常に）
```

## ブロック理由（BlockReason）

| 理由 | 説明 | 条件 |
|------|------|------|
| `always_blocked` | 常時ブロック | timeLimit が未設定 |
| `time_limit_exceeded` | 時間制限超過 | 使用時間 >= 制限時間 |
| `null` | ブロックされていない | 上記以外 |

## 状態を決定する要素

| 要素 | 保存場所 | 型 | 説明 |
|------|----------|-----|------|
| グローバル一時停止 | `settings.paused` | `boolean` | 拡張機能全体の一時停止 |
| ブロックリスト | `settings.blockList` | `BlockItem[]` | ブロック対象ドメインリスト |
| サイト別有効/無効 | `blockItem.enabled` | `boolean` | 個別サイトのブロック ON/OFF |
| サイト別時間制限 | `blockItem.timeLimit` | `TimeLimit \| null` | 「1日30分まで」などの設定 |
| スケジュール | `settings.schedules` | `Schedule[]` | ブロック有効時間帯 |
| 時間制限使用量 | `analytics.timeLimitUsage` | `Record<string, TimeLimitUsage>` | 実際の消費時間 |

## リセットタイミング

### 日次リセット（Daily）
- 条件: `lastDailyReset !== 今日の日付`
- 処理: `dailyUsedSeconds = 0`, `lastDailyReset = 今日`
- トリガー: `recordTimeLimitUsage()` または `resetExpiredUsage()`

### 時間リセット（Hourly）
- 条件: `lastHourlyReset !== 現在の時間キー`
- 処理: `hourlyUsedSeconds = 0`, `lastHourlyReset = 現在の時間キー`
- トリガー: `recordTimeLimitUsage()` または `resetExpiredUsage()`

## 通知フロー

```mermaid
flowchart LR
    A["時間使用記録<br/>recordTimeLimitUsage()"] --> B["通知チェック<br/>checkTimeLimitNotification()"]
    B --> C{"通知設定有効？"}
    C -->|No| End["終了"]
    C -->|Yes| D{"時間制限あり？"}
    D -->|No| End
    D -->|Yes| E{"今回の期間で<br/>通知済み？"}
    E -->|Yes| End
    E -->|No| F{"残り時間 <= 通知分数？"}
    F -->|No| End
    F -->|Yes| G["デスクトップ通知送信"]
    G --> H["通知済みフラグを設定"]
    H --> End
```

## 関連ファイル

| ファイル | 責務 |
|---------|------|
| `src/background/blocker.ts` | メインのブロック判定、ルール更新 |
| `src/background/time-limit.ts` | 時間制限の判定と記録 |
| `src/background/notifications.ts` | 通知判定と送信 |
| `src/background/index.ts` | アラームによるリセット処理 |
| `src/lib/blockService.ts` | ブロック状態の一元管理（新規） |

/** ポップアップが表示中のタブのドメインと残り時間を取り直す間隔（ms） */
export const DOMAIN_POLLING_MS = 10_000;

/** 週間カレンダーの現在時刻の表示を更新する間隔（ms） */
export const CURRENT_TIME_REFRESH_MS = 60_000;

/** 保存の変化を受けてからブロックのルールを作り直すまで待つ時間（ms） */
export const STORAGE_SETTLE_DELAY_MS = 100;

/** 新しいタブで保存済みの目標・表示の設定が見つからなくても、読み込み済みとして扱うまでの時間（ms） */
export const STORAGE_LOADED_TIMEOUT_MS = 100;

/** 滞在の記録で、ハートビートが途絶えたページを忘れるまでの時間（ms） */
export const STALE_ENTRY_TIMEOUT_MS = 60 * 1_000;

/** daily-cleanup アラームの周期（分） */
export const ALARM_DAILY_CLEANUP_MINUTES = 60;

/** check-schedule アラーム（ブロックのルールの作り直し）の周期（分） */
export const ALARM_CHECK_SCHEDULE_MINUTES = 1;

/** 行動の記録を残す日数（これより古い日付の記録は daily-cleanup で消す） */
export const MAX_HISTORY_DAYS_FALLBACK = 365;

/** 1 日のミリ秒数 */
export const MS_PER_DAY = 1_000 * 60 * 60 * 24;

/** パスワード設定の結果表示を消してフォームを戻すまでの時間（ms） */
export const STATUS_RESET_DELAY_MS = 2_000;

/** 分析の再読み込みの後もスピナーを出し続ける時間（ms） */
export const REFRESH_SPINNER_DELAY_MS = 500;

/** 設定のエクスポートの結果表示を消すまでの時間（ms） */
export const EXPORT_STATUS_DELAY_MS = 3_000;

/** 設定のインポートの結果メッセージを消すまでの時間（ms） */
export const SHARE_MESSAGE_DELAY_MS = 5_000;

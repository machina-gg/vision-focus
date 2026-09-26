import { getAnalytics, setAnalytics } from '~/lib/storage';
import { sendDailyActive } from '~/lib/analytics';
import {
  ALARM_DAILY_CLEANUP_MINUTES,
  ALARM_CHECK_SCHEDULE_MINUTES,
  MAX_HISTORY_DAYS_FALLBACK
} from '~/constants/intervals';
import { updateBlockRules } from '../blocker';
import { clearExpiredNotifications } from '../notifications';
import { pruneBefore } from '~/lib/activityService';
import { toDateKey } from '~/lib/time';

/**
 * 保持期間を超えた analytics データをクリーンアップする
 */
async function cleanupOldAnalytics(): Promise<void> {
  const analytics = await getAnalytics();

  const maxDays = MAX_HISTORY_DAYS_FALLBACK;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDays);
  const cutoffKey = cutoffDate.toISOString().slice(0, 10);

  const cleanedDailyStats: typeof analytics.dailyStats = {};
  for (const [key, value] of Object.entries(analytics.dailyStats)) {
    if (key >= cutoffKey) {
      cleanedDailyStats[key] = value;
    }
  }

  if (
    Object.keys(cleanedDailyStats).length !==
    Object.keys(analytics.dailyStats).length
  ) {
    await setAnalytics({
      ...analytics,
      dailyStats: cleanedDailyStats
    });
  }
}

/**
 * 保持期間を超えた事実の行を消す。
 * 事実の表の日付はローカル日付なので、境界もローカル日付で作る
 */
async function pruneOldActivity(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS_FALLBACK);
  await pruneBefore(toDateKey(cutoff));
}

/**
 * アラームリスナーを登録する
 * - daily-cleanup: 古いデータの削除と日次アクティブ送信
 * - check-schedule: ブロックルールの再計算。スケジュールの切り替わりと、日付が変わって
 *   時間制限の使用量（今日の行）が 0 に戻ったことをルールに反映する
 */
export function setupAlarmHandlers(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'daily-cleanup') {
      await cleanupOldAnalytics();
      await pruneOldActivity();
      clearExpiredNotifications();
      await sendDailyActive();
    }
    if (alarm.name === 'check-schedule') {
      await updateBlockRules();
    }
  });
}

/**
 * 定期実行アラームを作成する
 */
export function createAlarms(): void {
  chrome.alarms.create('daily-cleanup', {
    periodInMinutes: ALARM_DAILY_CLEANUP_MINUTES
  });
  chrome.alarms.create('check-schedule', {
    periodInMinutes: ALARM_CHECK_SCHEDULE_MINUTES
  });
}

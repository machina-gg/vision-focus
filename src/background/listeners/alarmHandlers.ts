import { getAnalytics, setAnalytics } from '~/lib/storage';
import { sendDailyActive } from '~/lib/analytics';
import { getFeatureLimits } from '~/lib/license';
import {
  ALARM_DAILY_CLEANUP_MINUTES,
  ALARM_CHECK_SCHEDULE_MINUTES,
  ALARM_TIME_LIMIT_RESET_MINUTES,
  MAX_HISTORY_DAYS_FALLBACK
} from '~/constants/intervals';
import { updateBlockRules } from '../blocker';
import { resetExpiredUsage } from '../time-limit';
import { clearExpiredNotifications } from '../notifications';

/**
 * tier 制限に基づいて古い analytics データをクリーンアップする
 */
async function cleanupOldAnalytics(): Promise<void> {
  const analytics = await getAnalytics();
  const limits = await getFeatureLimits();

  // Determine max days based on tier
  const maxDays =
    limits.historyDays === Infinity
      ? MAX_HISTORY_DAYS_FALLBACK
      : limits.historyDays;
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
 * アラームリスナーを登録する
 * - daily-cleanup: 古いデータの削除と日次アクティブ送信
 * - check-schedule: スケジュール変更のチェック
 * - time-limit-reset: 期限切れ時間制限のリセット
 */
export function setupAlarmHandlers(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'daily-cleanup') {
      await cleanupOldAnalytics();
      await sendDailyActive();
    }
    if (alarm.name === 'check-schedule') {
      // Update block rules every minute to handle schedule changes
      await updateBlockRules();
    }
    if (alarm.name === 'time-limit-reset') {
      // Reset expired time limit usage
      await resetExpiredUsage();
      // Clear notification state for domains that have reset
      clearExpiredNotifications();
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
  chrome.alarms.create('time-limit-reset', {
    periodInMinutes: ALARM_TIME_LIMIT_RESET_MINUTES
  });
}

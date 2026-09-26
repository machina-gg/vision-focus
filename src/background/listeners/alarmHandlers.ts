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

// 事実の表の日付はローカル日付なので、境界もローカル日付で作る
async function pruneOldActivity(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS_FALLBACK);
  await pruneBefore(toDateKey(cutoff));
}

/** アラームを処理する（daily-cleanup で古い記録と通知済みの記憶を消して日次の利用を送り、check-schedule でブロックのルールを作り直す） */
export function setupAlarmHandlers(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'daily-cleanup') {
      await pruneOldActivity();
      clearExpiredNotifications();
      await sendDailyActive();
    }
    if (alarm.name === 'check-schedule') {
      await updateBlockRules();
    }
  });
}

/** daily-cleanup と check-schedule のアラームを周期付きで作る */
export function createAlarms(): void {
  chrome.alarms.create('daily-cleanup', {
    periodInMinutes: ALARM_DAILY_CLEANUP_MINUTES
  });
  chrome.alarms.create('check-schedule', {
    periodInMinutes: ALARM_CHECK_SCHEDULE_MINUTES
  });
}

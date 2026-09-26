import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/analytics', () => ({
  sendDailyActive: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

vi.mock('../../notifications', () => ({
  clearExpiredNotifications: vi.fn()
}));

vi.mock('~/lib/activityService', () => ({
  pruneBefore: vi.fn()
}));

import { sendDailyActive } from '~/lib/analytics';
import { pruneBefore } from '~/lib/activityService';
import { toDateKey } from '~/lib/time';
import { updateBlockRules } from '../../blocker';
import { clearExpiredNotifications } from '../../notifications';
import {
  setupAlarmHandlers,
  createAlarms
} from '../../listeners/alarmHandlers';
import {
  ALARM_DAILY_CLEANUP_MINUTES,
  ALARM_CHECK_SCHEDULE_MINUTES,
  MAX_HISTORY_DAYS_FALLBACK
} from '~/constants/intervals';

function setupChrome() {
  let handler: ((alarm: chrome.alarms.Alarm) => Promise<void>) | null = null;
  const create = vi.fn();

  (globalThis as Record<string, unknown>).chrome = {
    runtime: { id: 'test-extension-id' },
    alarms: {
      create,
      onAlarm: {
        addListener: vi.fn((fn) => {
          handler = fn;
        })
      }
    }
  };

  return {
    create,
    fire: async (name: string) => {
      if (!handler) throw new Error('リスナーが未登録');
      await handler({ name } as chrome.alarms.Alarm);
    }
  };
}

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createAlarms', () => {
  it('2 種類の定期アラームを作成する', () => {
    createAlarms();

    expect(harness.create).toHaveBeenCalledWith('daily-cleanup', {
      periodInMinutes: ALARM_DAILY_CLEANUP_MINUTES
    });
    expect(harness.create).toHaveBeenCalledWith('check-schedule', {
      periodInMinutes: ALARM_CHECK_SCHEDULE_MINUTES
    });
    expect(harness.create).toHaveBeenCalledTimes(2);
  });
});

describe('setupAlarmHandlers', () => {
  describe('daily-cleanup', () => {
    it('事実の表から保持期間を超えた日の行を消す（境界はローカル日付）', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 26, 0, 30));
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      const cutoff = new Date(2026, 8, 26, 0, 30);
      cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS_FALLBACK);
      expect(pruneBefore).toHaveBeenCalledOnce();
      expect(pruneBefore).toHaveBeenCalledWith(toDateKey(cutoff));
    });

    it('前日以前の通知済みの記録を消す', async () => {
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      expect(clearExpiredNotifications).toHaveBeenCalledOnce();
    });

    it('日次アクティブを送信する', async () => {
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      expect(sendDailyActive).toHaveBeenCalledOnce();
    });
  });

  describe('check-schedule', () => {
    it('ブロックルールを更新する', async () => {
      setupAlarmHandlers();

      await harness.fire('check-schedule');

      expect(updateBlockRules).toHaveBeenCalledOnce();
    });

    it('クリーンアップや通知処理は行わない', async () => {
      setupAlarmHandlers();

      await harness.fire('check-schedule');

      expect(pruneBefore).not.toHaveBeenCalled();
      expect(clearExpiredNotifications).not.toHaveBeenCalled();
    });
  });

  it('未知のアラーム名では何も実行しない', async () => {
    setupAlarmHandlers();

    await harness.fire('unknown-alarm');

    expect(pruneBefore).not.toHaveBeenCalled();
    expect(sendDailyActive).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
  });
});

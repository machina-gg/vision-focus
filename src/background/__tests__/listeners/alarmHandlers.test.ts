import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

vi.mock('~/lib/analytics', () => ({
  sendDailyActive: vi.fn()
}));

vi.mock('~/lib/license', () => ({
  getFeatureLimits: vi.fn()
}));

vi.mock('../../blocker', () => ({
  updateBlockRules: vi.fn()
}));

vi.mock('../../time-limit', () => ({
  resetExpiredUsage: vi.fn()
}));

vi.mock('../../notifications', () => ({
  clearExpiredNotifications: vi.fn()
}));

import { getAnalytics, setAnalytics } from '~/lib/storage';
import { sendDailyActive } from '~/lib/analytics';
import { getFeatureLimits } from '~/lib/license';
import { updateBlockRules } from '../../blocker';
import { resetExpiredUsage } from '../../time-limit';
import { clearExpiredNotifications } from '../../notifications';
import {
  setupAlarmHandlers,
  createAlarms
} from '../../listeners/alarmHandlers';
import { DEFAULT_ANALYTICS } from '~/types/storage';
import {
  ALARM_DAILY_CLEANUP_MINUTES,
  ALARM_CHECK_SCHEDULE_MINUTES,
  ALARM_TIME_LIMIT_RESET_MINUTES,
  MAX_HISTORY_DAYS_FALLBACK
} from '~/constants/intervals';
import type { DailyStat } from '~/types/storage';

/** アラームリスナーを捕捉できる chrome モックを構築する */
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
    /** 登録済みリスナーへアラームを流す */
    fire: async (name: string) => {
      if (!handler) throw new Error('リスナーが未登録');
      await handler({ name } as chrome.alarms.Alarm);
    }
  };
}

/** 指定日数前の日付キー（YYYY-MM-DD）を作る */
function dateKeyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const stat = (date: string): DailyStat => ({
  date,
  wasteTime: 60,
  investTime: 0,
  blockCount: 1,
  unblockCount: 0
});

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
  vi.mocked(getAnalytics).mockResolvedValue({
    ...DEFAULT_ANALYTICS,
    dailyStats: {}
  });
  vi.mocked(getFeatureLimits).mockResolvedValue({
    maxBlockList: Infinity,
    historyDays: 7,
    maxPresets: 3
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createAlarms', () => {
  it('3 種類の定期アラームを作成する', () => {
    createAlarms();

    expect(harness.create).toHaveBeenCalledWith('daily-cleanup', {
      periodInMinutes: ALARM_DAILY_CLEANUP_MINUTES
    });
    expect(harness.create).toHaveBeenCalledWith('check-schedule', {
      periodInMinutes: ALARM_CHECK_SCHEDULE_MINUTES
    });
    expect(harness.create).toHaveBeenCalledWith('time-limit-reset', {
      periodInMinutes: ALARM_TIME_LIMIT_RESET_MINUTES
    });
  });
});

describe('setupAlarmHandlers', () => {
  describe('daily-cleanup', () => {
    it('保持期間を超えた日次データを削除する', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          [dateKeyDaysAgo(0)]: stat(dateKeyDaysAgo(0)),
          [dateKeyDaysAgo(3)]: stat(dateKeyDaysAgo(3)),
          [dateKeyDaysAgo(30)]: stat(dateKeyDaysAgo(30))
        }
      });
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      const saved = vi.mocked(setAnalytics).mock.calls[0][0];
      expect(Object.keys(saved.dailyStats)).toContain(dateKeyDaysAgo(0));
      expect(Object.keys(saved.dailyStats)).toContain(dateKeyDaysAgo(3));
      expect(Object.keys(saved.dailyStats)).not.toContain(dateKeyDaysAgo(30));
    });

    it('削除対象が無ければ保存しない（無駄な書き込みを避ける）', async () => {
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          [dateKeyDaysAgo(0)]: stat(dateKeyDaysAgo(0))
        }
      });
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      expect(setAnalytics).not.toHaveBeenCalled();
    });

    it('履歴無制限（有料版）でも上限日数までは保持する', async () => {
      vi.mocked(getFeatureLimits).mockResolvedValue({
        maxBlockList: Infinity,
        historyDays: Infinity,
        maxPresets: 10
      });
      vi.mocked(getAnalytics).mockResolvedValue({
        ...DEFAULT_ANALYTICS,
        dailyStats: {
          [dateKeyDaysAgo(30)]: stat(dateKeyDaysAgo(30)),
          [dateKeyDaysAgo(MAX_HISTORY_DAYS_FALLBACK + 10)]: stat(
            dateKeyDaysAgo(MAX_HISTORY_DAYS_FALLBACK + 10)
          )
        }
      });
      setupAlarmHandlers();

      await harness.fire('daily-cleanup');

      const saved = vi.mocked(setAnalytics).mock.calls[0][0];
      // 無料版の 7 日より長く保持される
      expect(Object.keys(saved.dailyStats)).toContain(dateKeyDaysAgo(30));
      // ただしフォールバック上限を超えたものは削除される
      expect(Object.keys(saved.dailyStats)).not.toContain(
        dateKeyDaysAgo(MAX_HISTORY_DAYS_FALLBACK + 10)
      );
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

      expect(setAnalytics).not.toHaveBeenCalled();
      expect(resetExpiredUsage).not.toHaveBeenCalled();
      expect(clearExpiredNotifications).not.toHaveBeenCalled();
    });
  });

  describe('time-limit-reset', () => {
    it('期限切れの使用量をリセットし、通知状態も消す', async () => {
      setupAlarmHandlers();

      await harness.fire('time-limit-reset');

      expect(resetExpiredUsage).toHaveBeenCalledOnce();
      expect(clearExpiredNotifications).toHaveBeenCalledOnce();
    });

    it('ブロックルールの更新は行わない', async () => {
      setupAlarmHandlers();

      await harness.fire('time-limit-reset');

      expect(updateBlockRules).not.toHaveBeenCalled();
    });
  });

  it('未知のアラーム名では何も実行しない', async () => {
    setupAlarmHandlers();

    await harness.fire('unknown-alarm');

    expect(setAnalytics).not.toHaveBeenCalled();
    expect(sendDailyActive).not.toHaveBeenCalled();
    expect(updateBlockRules).not.toHaveBeenCalled();
    expect(resetExpiredUsage).not.toHaveBeenCalled();
  });
});

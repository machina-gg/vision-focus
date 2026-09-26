import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn()
}));

vi.mock('~/lib/i18n', () => ({
  getMessage: vi.fn((key: string) => key)
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

import { getSettings } from '~/lib/storage';
import { isExtensionContextValid } from '~/lib/chromeApi';
import {
  checkTimeLimitNotification,
  resetNotificationState,
  clearExpiredNotifications
} from '../notifications';
import {
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS
} from '~/types/storage';
import type { AppSettings } from '~/types/storage';
import type { SiteBlockStatus } from '~/lib/blockService';

function setupChrome(
  withNotifications = true,
  manifest: { icons?: Record<string, string> } = {
    icons: { '128': 'icon/128.png' }
  }
) {
  const create = vi.fn().mockResolvedValue(undefined);
  const getURL = vi.fn((p: string) => `chrome-extension://test/${p}`);

  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      id: 'test-extension-id',
      getURL,
      getManifest: vi.fn(() => manifest)
    },
    ...(withNotifications ? { notifications: { create } } : {})
  };

  return { create, getURL };
}

const LIMIT_SECONDS = 1800;

function status(overrides: Partial<SiteBlockStatus> = {}): SiteBlockStatus {
  return {
    site: 'example.com',
    rule: {
      enabled: true,
      timeLimit: { type: 'daily', limitSeconds: LIMIT_SECONDS }
    },
    state: { blocked: false, reason: null, remainingSeconds: 120 },
    ...overrides
  };
}

const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...DEFAULT_SETTINGS,
  notifications: {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    timeLimitEnabled: true,
    timeLimitMinutes: 5
  },
  ...overrides
});

let harness: ReturnType<typeof setupChrome>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = setupChrome();
  resetNotificationState();
  vi.mocked(getSettings).mockResolvedValue(settings());
  vi.mocked(isExtensionContextValid).mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkTimeLimitNotification', () => {
  it('残り時間が閾値以下なら、サイトキーを表示名にして通知する', async () => {
    await checkTimeLimitNotification(status());

    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.create).toHaveBeenCalledWith(
      expect.stringContaining('time-limit-example.com-'),
      expect.objectContaining({ type: 'basic', priority: 2 })
    );
  });

  it('youtube.com も同じ関数で通知する', async () => {
    await checkTimeLimitNotification(status({ site: 'youtube.com' }));

    expect(harness.create).toHaveBeenCalledWith(
      expect.stringContaining('time-limit-youtube.com-'),
      expect.objectContaining({ type: 'basic' })
    );
  });

  it('同じ日に二重通知しない', async () => {
    await checkTimeLimitNotification(status());
    await checkTimeLimitNotification(status());

    expect(harness.create).toHaveBeenCalledOnce();
  });

  it('残り時間が閾値より多ければ通知しない', async () => {
    await checkTimeLimitNotification(
      status({ state: { blocked: false, reason: null, remainingSeconds: 600 } })
    );

    expect(harness.create).not.toHaveBeenCalled();
  });

  describe('通知しない条件', () => {
    it('通知設定が無効', async () => {
      vi.mocked(getSettings).mockResolvedValue(
        settings({
          notifications: {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            timeLimitEnabled: false
          }
        })
      );

      await checkTimeLimitNotification(status());

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('時間制限が設定されていないサイト', async () => {
      await checkTimeLimitNotification(
        status({
          rule: { enabled: true, timeLimit: null },
          state: { blocked: true, reason: 'always_blocked' }
        })
      );

      expect(harness.create).not.toHaveBeenCalled();
    });

    it.each([
      ['判定が残り時間を持たない', undefined],
      ['既に制限を超過している', 0],
      ['残り時間が負数', -60]
    ])('%s', async (_label, remainingSeconds) => {
      await checkTimeLimitNotification(
        status({ state: { blocked: false, reason: null, remainingSeconds } })
      );

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('拡張機能コンテキストが無効', async () => {
      vi.mocked(isExtensionContextValid).mockReturnValue(false);

      await checkTimeLimitNotification(status());

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('chrome.notifications API が利用できない環境では何もしない', async () => {
      harness = setupChrome(false);

      await expect(
        checkTimeLimitNotification(status())
      ).resolves.toBeUndefined();
    });
  });
});

describe('通知アイコン', () => {
  it('manifest の icons["128"] を通知アイコンに使う', async () => {
    await checkTimeLimitNotification(status());

    expect(harness.getURL).toHaveBeenCalledWith('icon/128.png');
    expect(harness.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        iconUrl: 'chrome-extension://test/icon/128.png'
      })
    );
  });

  it('manifest の icons["128"] が別のパスならそれに追随する', async () => {
    harness = setupChrome(true, { icons: { '128': 'images/app-128.png' } });

    await checkTimeLimitNotification(status());

    expect(harness.getURL).toHaveBeenCalledWith('images/app-128.png');
    expect(harness.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        iconUrl: 'chrome-extension://test/images/app-128.png'
      })
    );
  });

  it.each([
    ['icons が無い', {}],
    ['icons に 128 が無い', { icons: { '48': 'icon/48.png' } }]
  ])('manifest の %s なら icon/128.png にフォールバックする', async (_l, m) => {
    harness = setupChrome(true, m);

    await checkTimeLimitNotification(status());

    expect(harness.getURL).toHaveBeenCalledWith('icon/128.png');
    expect(harness.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        iconUrl: 'chrome-extension://test/icon/128.png'
      })
    );
  });
});

describe('通知済み状態の管理', () => {
  it('resetNotificationState 後は再度通知される', async () => {
    await checkTimeLimitNotification(status());
    resetNotificationState();
    await checkTimeLimitNotification(status());

    expect(harness.create).toHaveBeenCalledTimes(2);
  });

  it('ローカル時刻の 0 時を過ぎると再度通知される', async () => {
    vi.useFakeTimers();
    // UTC の日付で区切ると、UTC より東のタイムゾーンではこの 2 時刻が同じ日になり再通知されない
    vi.setSystemTime(new Date(2026, 7, 11, 23, 59));

    await checkTimeLimitNotification(status());
    expect(harness.create).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date(2026, 7, 12, 0, 1));
    await checkTimeLimitNotification(status());

    expect(harness.create).toHaveBeenCalledTimes(2);
  });

  it('clearExpiredNotifications は期限切れの記録のみ削除する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 11, 10, 0));

    await checkTimeLimitNotification(status());
    expect(harness.create).toHaveBeenCalledOnce();

    clearExpiredNotifications();
    await checkTimeLimitNotification(status());
    expect(harness.create).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date(2026, 7, 13, 10, 0));
    clearExpiredNotifications();
    await checkTimeLimitNotification(status());
    expect(harness.create).toHaveBeenCalledTimes(2);
  });
});

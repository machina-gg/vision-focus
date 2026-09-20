import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn()
}));

vi.mock('~/lib/blockService', () => ({
  findEnabledBlockItemForDomain: vi.fn()
}));

vi.mock('~/lib/timeLimitService', () => ({
  getRemainingTime: vi.fn()
}));

vi.mock('~/lib/youtubeBlockService', async () => {
  // isYouTubeTimeLimitActive は純粋な判定関数なので実物を使い、
  // ストレージに触る getYouTubeRemainingTime だけ差し替える
  const actual = await vi.importActual<
    typeof import('~/lib/youtubeBlockService')
  >('~/lib/youtubeBlockService');
  return {
    isYouTubeTimeLimitActive: actual.isYouTubeTimeLimitActive,
    getYouTubeRemainingTime: vi.fn()
  };
});

vi.mock('~/lib/i18n', () => ({
  getMessage: vi.fn((key: string) => key)
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

import { getSettings } from '~/lib/storage';
import { findEnabledBlockItemForDomain } from '~/lib/blockService';
import { getRemainingTime } from '~/lib/timeLimitService';
import { getYouTubeRemainingTime } from '~/lib/youtubeBlockService';
import { isExtensionContextValid } from '~/lib/chromeApi';
import {
  checkTimeLimitNotification,
  checkYouTubeTimeLimitNotification,
  resetNotificationState,
  clearExpiredNotifications
} from '../notifications';
import {
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_YOUTUBE_SETTINGS
} from '~/types/storage';
import type { AppSettings } from '~/types/storage';

/**
 * 通知 API を差し替えた chrome モックを構築する。
 * manifest は通知アイコンのパスの参照元なので、テストごとに差し替えられるようにする
 */
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

const blockItem = (limitSeconds = 1800) => ({
  id: 'item-1',
  domain: 'example.com',
  isWildcard: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  timeLimit: { type: 'daily' as const, limitSeconds }
});

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
  // モジュールレベルの通知済み状態をテスト間で持ち越さない
  resetNotificationState();
  vi.mocked(getSettings).mockResolvedValue(settings());
  vi.mocked(findEnabledBlockItemForDomain).mockResolvedValue(blockItem());
  vi.mocked(getRemainingTime).mockResolvedValue(120); // 残り 2 分
  vi.mocked(getYouTubeRemainingTime).mockResolvedValue(120);
  vi.mocked(isExtensionContextValid).mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkTimeLimitNotification', () => {
  it('残り時間が閾値以下なら通知する', async () => {
    await checkTimeLimitNotification('example.com');

    expect(harness.create).toHaveBeenCalledOnce();
    expect(harness.create).toHaveBeenCalledWith(
      expect.stringContaining('time-limit-example.com-'),
      expect.objectContaining({ type: 'basic', priority: 2 })
    );
  });

  it('同じ期間内に二重通知しない', async () => {
    await checkTimeLimitNotification('example.com');
    await checkTimeLimitNotification('example.com');

    expect(harness.create).toHaveBeenCalledOnce();
  });

  it('残り時間が閾値より多ければ通知しない', async () => {
    vi.mocked(getRemainingTime).mockResolvedValue(600); // 残り 10 分 > 閾値 5 分

    await checkTimeLimitNotification('example.com');

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

      await checkTimeLimitNotification('example.com');

      expect(findEnabledBlockItemForDomain).not.toHaveBeenCalled();
      expect(harness.create).not.toHaveBeenCalled();
    });

    it('ブロック対象として有効でないドメイン', async () => {
      vi.mocked(findEnabledBlockItemForDomain).mockResolvedValue(null);

      await checkTimeLimitNotification('example.com');

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('時間制限が設定されていないドメイン', async () => {
      vi.mocked(findEnabledBlockItemForDomain).mockResolvedValue({
        ...blockItem(),
        timeLimit: null
      });

      await checkTimeLimitNotification('example.com');

      expect(harness.create).not.toHaveBeenCalled();
    });

    it.each([
      ['残り時間が取得できない', null],
      ['既に制限を超過している', 0],
      ['残り時間が負数', -60]
    ])('%s', async (_label, remaining) => {
      vi.mocked(getRemainingTime).mockResolvedValue(remaining);

      await checkTimeLimitNotification('example.com');

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('拡張機能コンテキストが無効', async () => {
      vi.mocked(isExtensionContextValid).mockReturnValue(false);

      await checkTimeLimitNotification('example.com');

      expect(harness.create).not.toHaveBeenCalled();
    });

    it('chrome.notifications API が利用できない環境では何もしない', async () => {
      harness = setupChrome(false);

      await expect(
        checkTimeLimitNotification('example.com')
      ).resolves.toBeUndefined();
    });
  });
});

describe('checkYouTubeTimeLimitNotification', () => {
  beforeEach(() => {
    vi.mocked(getSettings).mockResolvedValue(
      settings({
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: true,
          blockAccess: true,
          timeLimit: { type: 'daily', limitSeconds: 3600 }
        }
      })
    );
  });

  it('残り時間が閾値以下なら通知する', async () => {
    await checkYouTubeTimeLimitNotification();

    expect(harness.create).toHaveBeenCalledWith(
      expect.stringContaining('time-limit-youtube.com-'),
      expect.objectContaining({ type: 'basic' })
    );
  });

  it('同じ期間内に二重通知しない', async () => {
    await checkYouTubeTimeLimitNotification();
    await checkYouTubeTimeLimitNotification();

    expect(harness.create).toHaveBeenCalledOnce();
  });

  it('YouTube 機能が無効なら通知しない', async () => {
    vi.mocked(getSettings).mockResolvedValue(
      settings({
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: false,
          blockAccess: true,
          timeLimit: { type: 'daily', limitSeconds: 3600 }
        }
      })
    );

    await checkYouTubeTimeLimitNotification();

    expect(harness.create).not.toHaveBeenCalled();
  });

  it('YouTube に時間制限が無ければ通知しない', async () => {
    vi.mocked(getSettings).mockResolvedValue(
      settings({
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: true,
          blockAccess: true,
          timeLimit: null
        }
      })
    );

    await checkYouTubeTimeLimitNotification();

    expect(harness.create).not.toHaveBeenCalled();
  });

  it('アクセスブロックが無効なら通知しない', async () => {
    vi.mocked(getSettings).mockResolvedValue(
      settings({
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: true,
          blockAccess: false,
          timeLimit: { type: 'daily', limitSeconds: 3600 }
        }
      })
    );

    await checkYouTubeTimeLimitNotification();

    expect(harness.create).not.toHaveBeenCalled();
    expect(getYouTubeRemainingTime).not.toHaveBeenCalled();
  });

  it('通知設定が無効なら残り時間を問い合わせない', async () => {
    vi.mocked(getSettings).mockResolvedValue(
      settings({
        notifications: {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          timeLimitEnabled: false
        },
        youtube: {
          ...DEFAULT_YOUTUBE_SETTINGS,
          enabled: true,
          blockAccess: true,
          timeLimit: { type: 'daily', limitSeconds: 3600 }
        }
      })
    );

    await checkYouTubeTimeLimitNotification();

    expect(getYouTubeRemainingTime).not.toHaveBeenCalled();
  });
});

describe('通知アイコン', () => {
  /** YouTube の時間制限を有効にした設定を返す */
  const youtubeSettings = () =>
    settings({
      youtube: {
        ...DEFAULT_YOUTUBE_SETTINGS,
        enabled: true,
        blockAccess: true,
        timeLimit: { type: 'daily', limitSeconds: 3600 }
      }
    });

  it('manifest の icons["128"] を通知アイコンに使う', async () => {
    await checkTimeLimitNotification('example.com');

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

    await checkTimeLimitNotification('example.com');

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

    await checkTimeLimitNotification('example.com');

    expect(harness.getURL).toHaveBeenCalledWith('icon/128.png');
    expect(harness.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        iconUrl: 'chrome-extension://test/icon/128.png'
      })
    );
  });

  it('YouTube の通知も同じ解決結果のアイコンを使う', async () => {
    harness = setupChrome(true, { icons: { '128': 'images/app-128.png' } });
    vi.mocked(getSettings).mockResolvedValue(youtubeSettings());

    await checkYouTubeTimeLimitNotification();

    expect(harness.create).toHaveBeenCalledWith(
      expect.stringContaining('time-limit-youtube.com-'),
      expect.objectContaining({
        iconUrl: 'chrome-extension://test/images/app-128.png'
      })
    );
  });
});

describe('通知済み状態の管理', () => {
  it('resetNotificationState 後は再度通知される', async () => {
    await checkTimeLimitNotification('example.com');
    resetNotificationState();
    await checkTimeLimitNotification('example.com');

    expect(harness.create).toHaveBeenCalledTimes(2);
  });

  it('日付が変わると再度通知される（daily）', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    await checkTimeLimitNotification('example.com');
    expect(harness.create).toHaveBeenCalledOnce();

    // 翌日になれば通知済み判定がリセットされる
    vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
    await checkTimeLimitNotification('example.com');

    expect(harness.create).toHaveBeenCalledTimes(2);
  });

  it('clearExpiredNotifications は期限切れの記録のみ削除する', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    // 当日分として通知済みにする
    await checkTimeLimitNotification('example.com');
    expect(harness.create).toHaveBeenCalledOnce();

    // 同日内では記録が保持されるため、再通知されない
    clearExpiredNotifications();
    await checkTimeLimitNotification('example.com');
    expect(harness.create).toHaveBeenCalledOnce();

    // 日付が変われば期限切れとして削除され、再通知される
    vi.setSystemTime(new Date('2026-08-13T10:00:00.000Z'));
    clearExpiredNotifications();
    await checkTimeLimitNotification('example.com');
    expect(harness.create).toHaveBeenCalledTimes(2);
  });
});

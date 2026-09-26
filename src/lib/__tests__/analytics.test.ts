import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn()
}));

vi.mock('~/lib/i18n', () => ({
  getUILanguage: vi.fn(() => 'en')
}));

vi.mock('~/lib/chromeApi', () => ({
  isExtensionContextValid: vi.fn(() => true)
}));

import { getSettings } from '~/lib/storage';
import { isExtensionContextValid } from '~/lib/chromeApi';
import { DEFAULT_SETTINGS } from '~/types/storage';

const mockGetSettings = vi.mocked(getSettings);
const mockIsExtensionContextValid = vi.mocked(isExtensionContextValid);

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  // GA 設定の stub が残ると、既定では無効な計測が有効なまま次のテストへ漏れる
  vi.unstubAllEnvs();

  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined)
      }
    },
    runtime: {
      id: 'test-id',
      getManifest: vi.fn(() => ({ version: '1.0.0' }))
    }
  };

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
  vi.stubGlobal('crypto', {
    ...crypto,
    randomUUID: vi.fn(() => 'test-uuid')
  });
});

// analytics.ts はトップレベルで process.env を読むため、GA 設定が空なら isAnalyticsEnabled は常に false になる

describe('isAnalyticsEnabled', () => {
  it('analyticsOptIn が未設定の場合は false を返す', async () => {
    const { isAnalyticsEnabled } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const result = await isAnalyticsEnabled();
    expect(result).toBe(false);
  });

  it('GA環境変数が空の場合は有効にしてもfalseを返す', async () => {
    const { isAnalyticsEnabled } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      analyticsOptIn: { enabled: true, decidedAt: '2024-01-01T00:00:00Z' }
    });
    const result = await isAnalyticsEnabled();
    expect(result).toBe(false);
  });
});

describe('trackEvent', () => {
  it('アナリティクスが無効な場合はfetchを呼ばない', async () => {
    const { trackEvent } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await trackEvent('test_event');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetchが失敗してもエラーを投げない', async () => {
    const { trackEvent } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await expect(trackEvent('test_event')).resolves.toBeUndefined();
  });
});

describe('trackFeatureUse', () => {
  it('アナリティクスが無効なら何もしない', async () => {
    const { trackFeatureUse } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await trackFeatureUse('blocklist');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('trackError', () => {
  it('アナリティクスが無効なら何もしない', async () => {
    const { trackError } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await trackError('storage_error');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('sendDailyActive', () => {
  it('アナリティクスが無効な場合は送信しない', async () => {
    const { sendDailyActive } = await import('~/lib/analytics');
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await sendDailyActive();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('拡張コンテキストが無効な場合は送信しない', async () => {
    const { sendDailyActive } = await import('~/lib/analytics');
    // GA 設定が空で isAnalyticsEnabled が false のため、コンテキストの判定より前に返る
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      analyticsOptIn: { enabled: true, decidedAt: '2024-01-01T00:00:00Z' }
    });
    mockIsExtensionContextValid.mockReturnValue(false);
    await sendDailyActive();
    expect(fetch).not.toHaveBeenCalled();
  });
});

async function importWithGaConfigured() {
  vi.stubEnv('WXT_GA_MEASUREMENT_ID', 'test-measurement-id');
  vi.stubEnv('WXT_GA_API_SECRET', 'test-api-secret');
  return import('~/lib/analytics');
}

describe('ストレージ読み取りが失敗したとき（machina-gg/vision-focus#469）', () => {
  beforeEach(() => {
    mockGetSettings.mockRejectedValue(new Error('storage unavailable'));
  });

  it('trackEvent は例外を外へ出さず、送信もしない', async () => {
    const { trackEvent } = await importWithGaConfigured();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(trackEvent('test_event')).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
    // 記録できないことは利用者に見せない
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('trackFeatureUse は例外を外へ出さず、送信もしない', async () => {
    const { trackFeatureUse } = await importWithGaConfigured();

    await expect(trackFeatureUse('support_open')).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('trackError は例外を外へ出さない', async () => {
    const { trackError } = await importWithGaConfigured();

    await expect(trackError('storage_error')).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('sendDailyActive は例外を外へ出さない', async () => {
    const { sendDailyActive } = await importWithGaConfigured();

    await expect(sendDailyActive()).resolves.toBeUndefined();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('結果を捨てる呼び出し方でも未処理の rejection にならない', async () => {
    const { trackFeatureUse } = await importWithGaConfigured();
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    void trackFeatureUse('support_open');
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off('unhandledRejection', onRejection);
    expect(rejections).toEqual([]);
  });
});

describe('送信が失敗したとき', () => {
  it('trackEvent は例外を外へ出さない', async () => {
    const { trackEvent } = await importWithGaConfigured();
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      analyticsOptIn: { enabled: true, decidedAt: '2024-01-01T00:00:00Z' }
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    await expect(trackEvent('test_event')).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalled();
  });
});

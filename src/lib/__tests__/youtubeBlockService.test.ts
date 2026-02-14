import { describe, expect, it, vi, beforeEach } from 'vitest';

// storage モジュールをモック
vi.mock('~/lib/storage', () => ({
  getSettings: vi.fn(),
  getAnalytics: vi.fn(),
  setAnalytics: vi.fn()
}));

// time モジュールをモック
vi.mock('~/lib/time', () => ({
  getTodayKey: vi.fn(() => '2024-06-12'),
  getCurrentHourKey: vi.fn(() => '2024-06-12-12'),
  needsDailyReset: vi.fn(() => false),
  needsHourlyReset: vi.fn(() => false),
  isWithinSchedule: vi.fn(() => true)
}));

// timeLimitService をモック
vi.mock('~/lib/timeLimitService', () => ({
  checkTimeLimitExceeded: vi.fn(),
  calculateRemainingTime: vi.fn()
}));

import { getSettings, getAnalytics, setAnalytics } from '~/lib/storage';
import {
  checkTimeLimitExceeded,
  calculateRemainingTime
} from '~/lib/timeLimitService';
import {
  YOUTUBE_DOMAIN,
  recordYouTubeTimeLimitUsage,
  hasYouTubeExceededTimeLimit,
  getYouTubeRemainingTime,
  incrementYouTubeBlockCount
} from '~/lib/youtubeBlockService';
import { DEFAULT_SETTINGS, DEFAULT_ANALYTICS } from '~/types/storage';

const mockGetSettings = vi.mocked(getSettings);
const mockGetAnalytics = vi.mocked(getAnalytics);
const mockSetAnalytics = vi.mocked(setAnalytics);
const mockCheckTimeLimitExceeded = vi.mocked(checkTimeLimitExceeded);
const mockCalculateRemainingTime = vi.mocked(calculateRemainingTime);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('YOUTUBE_DOMAIN', () => {
  it('youtube.comが定義されている', () => {
    expect(YOUTUBE_DOMAIN).toBe('youtube.com');
  });
});

describe('recordYouTubeTimeLimitUsage', () => {
  it('0以下の秒数では何もしない', async () => {
    await recordYouTubeTimeLimitUsage(0);
    expect(mockGetSettings).not.toHaveBeenCalled();
  });

  it('YouTube機能が無効の場合は何もしない', async () => {
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    await recordYouTubeTimeLimitUsage(60);
    expect(mockSetAnalytics).not.toHaveBeenCalled();
  });

  it('タイムリミットなしの場合は何もしない', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: { ...DEFAULT_SETTINGS.youtube, enabled: true, timeLimit: null }
    });
    await recordYouTubeTimeLimitUsage(60);
    expect(mockSetAnalytics).not.toHaveBeenCalled();
  });

  it('使用量を記録する', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: {
        ...DEFAULT_SETTINGS.youtube,
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 3600 }
      }
    });
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockSetAnalytics.mockResolvedValue(undefined);

    await recordYouTubeTimeLimitUsage(60);

    expect(mockSetAnalytics).toHaveBeenCalledTimes(1);
    const savedAnalytics = mockSetAnalytics.mock.calls[0][0];
    expect(savedAnalytics.timeLimitUsage[YOUTUBE_DOMAIN].dailyUsedSeconds).toBe(
      60
    );
    expect(
      savedAnalytics.timeLimitUsage[YOUTUBE_DOMAIN].hourlyUsedSeconds
    ).toBe(60);
  });

  it('既存の使用量に追加する', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: {
        ...DEFAULT_SETTINGS.youtube,
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 3600 }
      }
    });
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      timeLimitUsage: {
        [YOUTUBE_DOMAIN]: {
          domain: YOUTUBE_DOMAIN,
          dailyUsedSeconds: 100,
          hourlyUsedSeconds: 50,
          lastDailyReset: '2024-06-12',
          lastHourlyReset: '2024-06-12-12'
        }
      }
    });
    mockSetAnalytics.mockResolvedValue(undefined);

    await recordYouTubeTimeLimitUsage(30);

    const savedAnalytics = mockSetAnalytics.mock.calls[0][0];
    expect(savedAnalytics.timeLimitUsage[YOUTUBE_DOMAIN].dailyUsedSeconds).toBe(
      130
    );
    expect(
      savedAnalytics.timeLimitUsage[YOUTUBE_DOMAIN].hourlyUsedSeconds
    ).toBe(80);
  });
});

describe('hasYouTubeExceededTimeLimit', () => {
  it('YouTube機能が無効の場合はfalse', async () => {
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const result = await hasYouTubeExceededTimeLimit();
    expect(result).toBe(false);
  });

  it('タイムリミットなしの場合はfalse', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: { ...DEFAULT_SETTINGS.youtube, enabled: true, timeLimit: null }
    });
    const result = await hasYouTubeExceededTimeLimit();
    expect(result).toBe(false);
  });

  it('タイムリミット超過の場合はtrue', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: {
        ...DEFAULT_SETTINGS.youtube,
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 3600 }
      }
    });
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockCheckTimeLimitExceeded.mockReturnValue(true);
    const result = await hasYouTubeExceededTimeLimit();
    expect(result).toBe(true);
  });
});

describe('getYouTubeRemainingTime', () => {
  it('YouTube機能が無効の場合はnull', async () => {
    mockGetSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const result = await getYouTubeRemainingTime();
    expect(result).toBeNull();
  });

  it('タイムリミットなしの場合はnull', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: { ...DEFAULT_SETTINGS.youtube, enabled: true, timeLimit: null }
    });
    const result = await getYouTubeRemainingTime();
    expect(result).toBeNull();
  });

  it('残り時間を返す', async () => {
    mockGetSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      youtube: {
        ...DEFAULT_SETTINGS.youtube,
        enabled: true,
        timeLimit: { type: 'daily', limitSeconds: 3600 }
      }
    });
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockCalculateRemainingTime.mockReturnValue(2400);
    const result = await getYouTubeRemainingTime();
    expect(result).toBe(2400);
  });
});

describe('incrementYouTubeBlockCount', () => {
  it('ブロックカウントをインクリメントする', async () => {
    mockGetAnalytics.mockResolvedValue(DEFAULT_ANALYTICS);
    mockSetAnalytics.mockResolvedValue(undefined);

    await incrementYouTubeBlockCount();

    expect(mockSetAnalytics).toHaveBeenCalledTimes(1);
    const saved = mockSetAnalytics.mock.calls[0][0];
    expect(saved.siteBlockCounts[YOUTUBE_DOMAIN].count).toBe(1);
  });

  it('既存カウントに加算する', async () => {
    mockGetAnalytics.mockResolvedValue({
      ...DEFAULT_ANALYTICS,
      siteBlockCounts: {
        [YOUTUBE_DOMAIN]: {
          domain: YOUTUBE_DOMAIN,
          count: 5,
          lastBlocked: '2024-06-12T00:00:00Z'
        }
      }
    });
    mockSetAnalytics.mockResolvedValue(undefined);

    await incrementYouTubeBlockCount();

    const saved = mockSetAnalytics.mock.calls[0][0];
    expect(saved.siteBlockCounts[YOUTUBE_DOMAIN].count).toBe(6);
  });
});
